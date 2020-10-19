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

		var revByPeriodSearch = search.create({
			type : 'transaction',
			filters : [["posting","is","T"], "AND",["account","anyof","344","954","1862","1863","1864","1865","955"]],
			columns : [search.createColumn({
				name: "postingperiod",
				summary: "GROUP"
			}),search.createColumn({
				name: "internalid",
				join: "accountingPeriod",
				summary: "GROUP"
			}),search.createColumn({
				name: "amount",
				summary: "SUM"
			})]
		});
		var res = revByPeriodSearch.run().getRange(0,999);
		//var searchResultCount = revenueplanSearchObj.runPaged().count;
		log.debug("revenueplanSearchObj result count",res.length + ' ' + JSON.stringify(res));
		return revByPeriodSearch;
    }

	/**
	 * iterates through each search result and create object conatining information to create PO
	 *
	 * @returns  object: Object containing all the information regarding custom record

	 * @governance 2 units
	 */
    function map(context) {
		var res = JSON.parse(context.value);
		var accountingPeriod = res.values['GROUP(postingperiod)'].value;
		var periodRevenue = parseFloat(res.values['SUM(amount)']).toFixed(2);
		//log.debug('periodRevenue', periodRevenue);
		var actualRevenueData = getActualRevenueByPeriod(accountingPeriod);
    //log.debug('actualRevenueData', actualRevenueData);
		var actualRevenueForPeriod = 0;

		if(actualRevenueData.length > 0){

			for(var i=0; i<actualRevenueData.length; i++){
				actualRevenueForPeriod = actualRevenueForPeriod + parseFloat(actualRevenueData[i].getValue('custrecord13'));
			}
		}
		//log.debug('actualRevenueForPeriod', actualRevenueForPeriod);
		//log.debug('actualRevenueForPeriod', actualRevenueForPeriod.toFixed(2));

		var actualRevenueForPeriodPlus1 = actualRevenueForPeriod + 0.01;
		actualRevenueForPeriodPlus1 = actualRevenueForPeriodPlus1.toFixed(2);
		//log.debug('actualRevenueForPeriodPlus1', actualRevenueForPeriodPlus1);

		var actualRevenueForPeriodPlus2 = actualRevenueForPeriod + 0.02;
		actualRevenueForPeriodPlus2 = actualRevenueForPeriodPlus2.toFixed(2);
		//log.debug('actualRevenueForPeriodPlus2', actualRevenueForPeriodPlus2);

		var actualRevenueForPeriodMinus1 = actualRevenueForPeriod - 0.01;
		actualRevenueForPeriodMinus1 = actualRevenueForPeriodMinus1.toFixed(2);
		//log.debug('actualRevenueForPeriodMinus1', actualRevenueForPeriodMinus1);

		var actualRevenueForPeriodMinus2 = actualRevenueForPeriod - 0.02;
		actualRevenueForPeriodMinus2 = actualRevenueForPeriodMinus2.toFixed(2);
		//log.debug('actualRevenueForPeriodMinus2', actualRevenueForPeriodMinus2);


		if(periodRevenue != actualRevenueForPeriod.toFixed(2)){
			if(periodRevenue != actualRevenueForPeriodPlus1){
				if(periodRevenue != actualRevenueForPeriodPlus2){
					if(periodRevenue != actualRevenueForPeriodMinus1){
						if(periodRevenue !=actualRevenueForPeriodMinus2){
              log.debug('The periodRevenue != The Actual', 'There is a Revenue mismatch for the period of: ', accountingPeriod + '.' + 'The Period Revenue is: ' + periodRevenue + ' .' + 'The Actual Revenue is: ' + actualRevenueForPeriod + '.');
							deleteActualRevenueRecordsForPeriod(actualRevenueData);
							context.write(accountingPeriod);
						}
					}
				}
			}
		}
		else{
			log.debug('equal');
		}
    }

	function deleteActualRevenueRecordsForPeriod(actualRevenueData){

		if(actualRevenueData.length > 0){
			for(var i=0; i<actualRevenueData.length; i++){
				log.debug('period', actualRevenueData[i].getValue('custrecord12'));
				record.delete({
					type : 'customrecord_actual_rev_by_client',
					id : actualRevenueData[i].id,
				});
			}
		}
	}

	function getActualRevenueByPeriod(periodId){

		var actualRevByPeriodSearch = search.create({
			type: "customrecord_actual_rev_by_client",
			filters: [["custrecord12","anyof",periodId]],
			columns:['custrecord12', 'custrecord13', 'custrecord17', 'custrecord14']
		});

		var res = actualRevByPeriodSearch.run().getRange(0,999);
		return res;
	}

    /**
	 * Iterates through each map context to create PO for Custom record
	 *
	 * @returns {void}

	 * @governance 13 + (30*N) units, where N = no. of Vendors to create PO for.
	 */
    function reduce(context) {
		var period = context.key;
		var revenueData = getRevenueData(period);

		if(revenueData.length >0){

			for(var i=0; i<revenueData.length ; i++){
				createActualRevenueRecord(revenueData[i], period);
			}
		}
    }

	function createActualRevenueRecord(res, period){
		var project = res.getValue({
			name : 'internalid',
			join : 'customer' ,
          	summary: "GROUP"
		});
		var client = res.getValue({
			name: "formulanumeric",
			summary: "GROUP",
			formula: "{customer.parent.id}"
		});
		var revenueForPeriod = res.getValue({
			name: "amount",
			summary: "SUM"
		});

		try{
			var actualRevRec = record.create({
				type : 'customrecord_actual_rev_by_client',
				isDynamic : true
			});
			actualRevRec.setValue('custrecord12', period);
			actualRevRec.setValue('custrecord13', revenueForPeriod);

          	if(project == client){
              actualRevRec.setValue('custrecord17', client);
            }
            else{
              if(project != null && project != ''){
					actualRevRec.setValue('custrecord14', project);
			   }
				if(client != null && client != ''){
					actualRevRec.setValue('custrecord17', client);
				}
            }
			actualRevRec.save();
		}
		catch(e){
			log.debug('error', e.name + ' ' + e.message);
		}
	}

	function getRevenueData(period){

		var revSearch = search.create({
			type : 'transaction',
			filters : [["posting","is","T"], "AND",["account","anyof","344","954","1862","1863","1864","1865","955"], "AND", ["postingperiod","is", period]],
			columns : [search.createColumn({
				name: "postingperiod",
				summary: "GROUP"
			}),search.createColumn({
				name: "internalid",
				join: "customer",
				summary: "GROUP"
			}),search.createColumn({
				name: "formulanumeric",
				summary: "GROUP",
				formula: "{customer.parent.id}"
			}),search.createColumn({
				name: "amount",
				summary: "SUM"
			})]
		});

		var res = revSearch.run().getRange(0,999);
		//log.debug('res', res.length + JSON.stringify(res));
		return res;
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
