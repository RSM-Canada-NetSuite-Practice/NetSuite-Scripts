/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var searchObj = search.load({
      id: 'customsearch1562'
    });
    return searchObj;
  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var depositdate = res.values.trandate;
    log.debug('depositdate', depositdate);

    var tranid = res.values.appliedtotransaction.value;
    log.debug('tranid', tranid);

    var trantype = res.values["type.appliedToTransaction"].value;
    log.debug('trantype',trantype);

    if (trantype == 'CashRfnd') {
      record.submitFields({
        type: 'cashrefund',
        id: tranid,
        values: {
          trandate: depositdate
        }
      });
      log.debug('trandate updated', depositdate);
    }


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
