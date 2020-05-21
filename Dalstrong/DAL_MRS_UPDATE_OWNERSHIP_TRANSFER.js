/*******************************************************************
 *
 *
 * Name: DAL_SUE_MASS_DELETE_CELIGO_AMAZON_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to delete Celigo Amazon Settlement Transactions and their corresponding Fees & Prices
 * Script: DAL_SUE_MASS_DELETE_CELIGO_AMAZON_TRAN
 * Deploy: customdeployrsm_dal_sue_mass_delete_celi
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var bulkownershiptransferSearchObj = search.create({
      type: "bulkownershiptransfer",
      filters: [
        ["type", "anyof", "OwnTrnsf"],
        "AND",
        ["shipmentnumber", "noneof", "@NONE@"],
        "AND",
        ["mainline", "is", "T"],
        "AND",
        ["trandate", "onorbefore", "2020-01-31"]
      ],
      columns: [
        search.createColumn({
          name: "shipmentnumber",
          label: "Shipment Number"
        }),
        search.createColumn({
          name: "trandate",
          label: "Date"
        }),
        search.createColumn({
          name: "type",
          label: "Type"
        }),
        search.createColumn({
          name: "tranid",
          label: "Document Number"
        })
      ]
    });
    // var searchResultCount = bulkownershiptransferSearchObj.runPaged().count;
    // log.debug("bulkownershiptransferSearchObj result count", searchResultCount);
    // bulkownershiptransferSearchObj.run().each(function(result) {
    //   // .run().each has a limit of 4,000 results
    //   return true;
    // });

    var res = bulkownershiptransferSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return bulkownershiptransferSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var ow_id = res.id;

    log.debug('The Ownership Transfer internal ID is: ', ow_id);

    try {

      var currentRec = record.load({
        type: 'bulkownershiptransfer',
        id: ow_id,
      });

      currentRec.setValue({
        fieldId: 'exchangerate',
        value: 1.3233
      });

      currentRec.save();

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
