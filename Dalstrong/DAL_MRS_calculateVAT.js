/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/error', 'N/runtime', 'N/email'], function(search, record, error, runtime, email) {

   /**
	 * Calls all the searches used to get the required information
	 *
	 * @returns search.search object: Object containing all the information regarding custom record

	 * @governance 0 units
	 */
    function getInputData() {

		var invoiceSearch = search.create({
			type : 'invoice',
			filters : [["mainline","is","T"], "AND", ["cseg1","anyof","8","7","9","10","6"], "AND", ["taxline","is","F"], "AND", ["cogs","is","F"], "AND", ["shipping","is","F"], "AND", ["anylineitem","noneof","940","941","639","942","943","1624"]], 
			columns : ['internalid']
		});
		var res = invoiceSearch.run().getRange(0,999);
		//var searchResultCount = revenueplanSearchObj.runPaged().count;
		log.debug("revenueplanSearchObj result count",res.length + ' ' + JSON.stringify(res));
		return invoiceSearch;
    }

	/**
	 * iterates through each search result and create object conatining information to create PO
	 *
	 * @returns  object: Object containing all the information regarding custom record

	 * @governance 2 units
	 */
    function map(context) {
		var res = JSON.parse(context.value);
		var invId = res.id;

		try{
			var tranRec = record.load({
				type : 'invoice',
				id: invId,
				isDynamic : true
			});

			var marketPlace = tranRec.getValue('cseg1');
			var taxData = getTaxData(marketPlace);

			if(taxData != null && taxData != ''){
				var taxItem = taxData.getValue('custrecord_vat_tax_item');
				calculateTaxForTransaction(tranRec, taxItem);
			}
			tranRec.save();
		}
		catch(e){
			log.debug('error', e.name + ' ' + e.message);
		}

    }

	function getTaxData(marketPlace){

		var euVATSearch = search.create({
			type: 'customrecord_amz_eu_vat',
			filters : [['custrecord1', 'anyof', marketPlace]],
			columns : ['custrecord_vat', 'custrecord_vat_tax_item']
		});

		res = euVATSearch.run().getRange(0,100);
		return res[0];
	}

	function calculateTaxForTransaction(tranRec, taxItem){
		var items = tranRec.getLineCount('item');
		var taxTotal = 0;

		for(var i=0; i<items; i++){
			tranRec.selectLine('item', i);
			var etailLineTax = tranRec.getCurrentSublistValue('item', 'custcol_celigo_etail_order_line_tax');

			if(etailLineTax != null && etailLineTax != '' && etailLineTax != 0){
				var itemAmount = tranRec.getCurrentSublistValue('item', 'amount');
				var newAmount = parseFloat(itemAmount) - parseFloat(etailLineTax);
				log.debug('newAmount', newAmount);
				tranRec.setCurrentSublistValue('item', 'amount', newAmount.toFixed(2));
				tranRec.commitLine('item');
				taxTotal = taxTotal + etailLineTax;
			}
		}
		tranRec.selectNewLine('item');
		tranRec.setCurrentSublistValue('item', 'item', taxItem);
		tranRec.setCurrentSublistValue('item', 'quantity', 1);
		tranRec.setCurrentSublistValue('item', 'rate', taxTotal.toFixed(2));
		//tranRec.setCurrentSublistValue('item', 'amount', items, tranTax.toFixed(2));
		tranRec.commitLine('item');
	}



    /**
	 * Iterates through each map context to create PO for Custom record
	 *
	 * @returns {void}

	 * @governance 13 + (30*N) units, where N = no. of Vendors to create PO for.
	 */
    function reduce(context) {
    }

	// The summarize stage is a serial stage, so this function is invoked only one
    // time.
    function summarize(context) {
		handleErrorIfAny(context);
        // Log details about the script's execution.
        log.audit({
            title: 'Usage units consumed',
            details: context.usage
        });
        log.audit({
            title: 'Concurrency',
            details: context.concurrency
        });
        log.audit({
            title: 'Number of yields',
            details: context.yields
        });

    }
	 function handleErrorAndSendNotification(e, stage){
        log.error('Stage: ' + stage + ' failed', e);

        var author = -5;
        var recipients = runtime.getCurrentScript().getParameter('custscript1');
        var subject = 'Map/Reduce script ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +
                   'Error code: ' + e.name + '\n' +
                   'Error msg: ' + e.message;

        email.send({
            author: author,
            recipients: recipients,
            subject: subject,
            body: body
        });
    }

    function handleErrorIfAny(summary){
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error)
        {
            var e = error.create({
                name: 'INPUT_STAGE_FAILED',
                message: inputSummary.error
            });
            //handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary){
        var errorMsg = [];
        summary.errors.iterator().each(function(key, value){
            var msg = 'Failure to create PO from Custom record id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0)
        {
            var e = error.create({
                name: 'PO Creation Failed',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }
    // Link each entry point to the appropriate function.
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
