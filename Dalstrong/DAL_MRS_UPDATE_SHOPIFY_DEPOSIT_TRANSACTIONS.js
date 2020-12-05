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

    var depositid = res.id;

    var refundid = res.values.appliedtotransaction.value;
    log.debug('refundid', refundid);

    var refundetail = res.values["custbody_celigo_etail_order_id.appliedToTransaction"];
    log.debug('refundetail', refundetail);

    var payoutid = res.values["internalid.CUSTBODY_CELIGO_SHOPIFY_NS_PAYOUT_ID"].value;
    log.debug('payoutid', payoutid);

    var shopifyid = res.values["custbody_celigo_shpfy_transaction_ids.appliedToTransaction"];
    log.debug('shopifyid',shopifyid);

    var temprefund = record.submitFields({
      type: 'cashrefund',
      id: refundid,
      values: {
        memo: shopifyid,
        custbody_celigo_etail_order_id: ''
      }
    });
    log.debug('temprefund',temprefund);

    record.delete({
      type: 'deposit',
      id: depositid
    }).delete({
      type: 'customrecord_celigo_shopify_payout',
      id: payoutid
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
