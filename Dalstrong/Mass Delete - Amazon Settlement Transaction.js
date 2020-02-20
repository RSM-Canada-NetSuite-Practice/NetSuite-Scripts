/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

    function getInputData() {

    	var customrecord_celigo_amzio_settle_transSearchObj = search.create({
    		   type: "customrecord_celigo_amzio_settle_trans",
    		   filters:
    		   [
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "internalid", label: "Internal ID"}),
    		      search.createColumn({
    		         name: "name",
    		         sort: search.Sort.ASC,
    		         label: "Name"
    		      }),
    		      search.createColumn({name: "scriptid", label: "Script ID"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_tran_type", label: "Transaction Type"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_order_id", label: "Order Id"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_settlemnt_id", label: "Settlement Id"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_recon_status", label: "Status"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_tran_sub_tot", label: "Net Revenue"}),
    		      search.createColumn({name: "custrecord_celigo_amzio_set_tran_amount", label: "Transaction Amount"})
    		   ]
    		});
    		var searchResultCount = customrecord_celigo_amzio_settle_transSearchObj.runPaged().count;
    		log.debug("customrecord_celigo_amzio_settle_transSearchObj result count",searchResultCount);
    		customrecord_celigo_amzio_settle_transSearchObj.run().each(function(result){
    		   // .run().each has a limit of 4,000 results
    		   return true;
    		});

		var res = customrecord_celigo_amzio_settle_transSearchObj.run().getRange(0,100);
		log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
		return customrecord_celigo_amzio_settle_transSearchObj;

    }

    function map(context) {

    	log.debug('Map', context.value);

    	var res = JSON.parse(context.value);

		var cus_rec_celigo_amzio_settle_internalid = res.values['internalid'].value;

		log.debug('The Settlement Transaction internal ID is: ', cus_rec_celigo_amzio_settle_internalid);

		var cus_rec_celigo_amzio_settle = record.delete({
			type: 'customrecord_celigo_amzio_settle_trans',
			id: cus_rec_celigo_amzio_settle_internalid,
		});

    }

    function reduce(context) {

    log.debug('Reduce');

    }

    function summarize(context) {

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

        // Use the context object's output iterator to gather the key/value pairs saved
        // at the end of the reduce stage. Also, tabulate the number of key/value pairs
        // that were saved. This number represents the total number of unique letters
        // used in the original string.
        var text = '';
        var totalKeysSaved = 0;
        context.output.iterator().each(function(key, value) {
            text += (key + ' ' + value + '\n');
            totalKeysSaved++;
            return true;
        });

        // Log details about the total number of pairs saved.
        log.audit({
            title: 'Unique number of letters used in string',
            details: totalKeysSaved
        });
    }

    // Link each entry point to the appropriate function.
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
