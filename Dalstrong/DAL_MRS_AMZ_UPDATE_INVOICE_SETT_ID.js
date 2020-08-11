/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var invoiceSearchObj = search.create({
       type: "invoice",
       filters:
       [
          ["type","anyof","CustInvc"],
          "AND",
          ["custbody_celigo_amzio_settlement_id","isempty",""],
          "AND",
          ["mainline","is","T"]
       ],
       columns:
       [
          search.createColumn({name: "internalid", label: "Internal ID"}),
          search.createColumn({name: "trandate", label: "Date"}),
          search.createColumn({name: "postingperiod", label: "Period"}),
          search.createColumn({name: "type", label: "Type"}),
          search.createColumn({name: "tranid", label: "Document Number"}),
          search.createColumn({name: "entity", label: "Name"}),
          search.createColumn({name: "account", label: "Account"}),
          search.createColumn({name: "memo", label: "Memo"}),
          search.createColumn({name: "amount", label: "Amount"}),
          search.createColumn({name: "custbody_celigo_amzio_settlement_id", label: "Amazon Settlement Id"}),
          search.createColumn({
             name: "custrecord_celigo_amzio_set_settlemnt_id",
             join: "CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN",
             label: "Settlement Id"
          })
       ]
    });
    // var searchResultCount = invoiceSearchObj.runPaged().count;
    // log.debug("invoiceSearchObj result count",searchResultCount);
    // invoiceSearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });

    var res = invoiceSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return invoiceSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var invoiceID = res.id;

    log.debug('Invoice internal id is: ', invoiceID);

    var invoiceSettID = res.values[CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN.custrecord_celigo_amzio_set_settlemnt_id];

    log.debug('New invoice settlement id is: ', invoiceSettID);

    var id = record.submitFields({
      type: 'invoice',
      id: invoiceID,
      values: {
        custbody_celigo_amzio_settlement_id: invoiceSettID
      }
    });

    log.debug('Sett ID successfully changed on invoice: ', id);

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
