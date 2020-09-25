/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  var trantypemap = {
    'CustInvc': 'invoice',
    'CustRfnd': 'customerrefund',
    'CustCred': 'creditmemo'
  };

  function getInputData() {

    var transactionSearchObj = search.create({
       type: "transaction",
       filters:
       [
          [["type","anyof","CustInvc"],"AND",["mainline","is","T"],"AND",["cogs","is","F"],"AND",["taxline","is","F"],"AND",["shipping","is","F"],"AND",["createdfrom","anyof","@NONE@"],"AND",["custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_tran_type","anyof","1"],"AND",["custbodyrsm_manual_inv_date_change","is","F"]],
          "OR",
          [["type","anyof","CustCred","CustRfnd"],"AND",["mainline","is","T"],"AND",["custbody_celigo_amzio_order_tran_link.custrecord_celigo_amzio_set_tran_type","anyof","2"],"AND",["trandate","onorafter","2020-09-01"]],
          "AND",
          ["max(formulanumeric: CASE WHEN max({custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_posted_date}) <> max({trandate}) OR max({custbody_celigo_amzio_order_tran_link.custrecord_celigo_amzio_set_posted_date}) <> max({trandate}) THEN 1 ELSE 0 END)","equalto","1"]
       ],
       columns:
       [
          // search.createColumn({
          //    name: "datecreated",
          //    summary: "GROUP",
          //    label: "Date Created"
          // }),
          search.createColumn({
             name: "internalid",
             summary: "GROUP",
             label: "Internal ID"
          }),
          search.createColumn({
             name: "trandate",
             summary: "GROUP",
             label: "Tran Date"
          }),
          search.createColumn({
             name: "formulatext",
             summary: "GROUP",
             formula: "CASE WHEN {custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_tran_type} IS NULL THEN {custbody_celigo_amzio_order_tran_link.custrecord_celigo_amzio_set_tran_type} ELSE {custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_tran_type} END",
             label: "Type"
          }),
          search.createColumn({
             name: "formuladate",
             summary: "MAX",
             formula: "CASE WHEN max({custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_posted_date}) IS NULL THEN max({custbody_celigo_amzio_order_tran_link.custrecord_celigo_amzio_set_posted_date}) ELSE max({custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_posted_date}) END",
             label: "Formula (Date)"
          }),
          search.createColumn({
             name: "type",
             summary: "GROUP",
             label: "Type"
          }),
          // search.createColumn({
          //    name: "tranid",
          //    summary: "GROUP",
          //    label: "Document Number"
          // }),
          // search.createColumn({
          //    name: "entity",
          //    summary: "GROUP",
          //    label: "Name"
          // }),
          // search.createColumn({
          //    name: "cseg1",
          //    summary: "GROUP",
          //    label: "Marketplace"
          // }),
          // search.createColumn({
          //    name: "amount",
          //    summary: "SUM",
          //    label: "Amount"
          // })
       ]
    });
    // var searchResultCount = transactionSearchObj.runPaged().count;
    // log.debug("transactionSearchObj result count",searchResultCount);
    // transactionSearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });

    var res = transactionSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return transactionSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.values["GROUP(internalid)"].value;
    log.debug('Transaction internal id is: ', tranid);

    var trandate = res.values["MAX(formuladate)"];
    log.debug('New transaction date is: ', trandate);

    var trantype = res.values["GROUP(type)"].value;
    log.debug('The transaction type is: ', trantype);

    var id = record.submitFields({
      type: trantypemap[trantype],
      id: tranid,
      values: {
        trandate: trandate
      }
    });

    log.debug('Date successfully changed on transaction: ', id);

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
