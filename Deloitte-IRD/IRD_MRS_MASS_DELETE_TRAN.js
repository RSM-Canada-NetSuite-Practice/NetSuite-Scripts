/*******************************************************************
 *
 *
 * Name: IRD_SUE_MASS_DELETE_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to delete Transactions
 * Script: IRD_SUE_MASS_DELETE_TRAN
 * Deploy: IRD_SUE_MASS_DELETE_TRAN
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["subsidiary", "anyof", "27", "23", "24", "26", "25", "28", "7"]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          summary: "GROUP",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "type",
          summary: "GROUP",
          label: "Type"
        }),
        search.createColumn({
          name: "formulatext",
          summary: "GROUP",
          formula: "{recordType}",
          label: "Record Type"
        })
      ]
    });
    // var searchResultCount = customerpaymentSearchObj.runPaged().count;
    // log.debug("customerpaymentSearchObj result count",searchResultCount);
    // customerpaymentSearchObj.run().each(function(result){
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

    var tranid = res["values"]["GROUP(internalid)"]["value"];

    log.debug('The Transaction internal ID is: ', tranid);

    var recordtype = res["values"]["GROUP(formulatext)"];

    log.debug('The record type is: ', recordtype);

    try {

      var id = record.delete({
        type: recordtype,
        id: tranid,
      });

      log.debug('The Transaction has been deleted: ', id);

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

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
