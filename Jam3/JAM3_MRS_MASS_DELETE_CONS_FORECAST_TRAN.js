/*******************************************************************
 *
 *
 * Name: JAM3_MRS_MASS_DELETE_CONS_FORECAST_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to delete Jam3 consolidated forecast records
 * Script: JAM3_MRS_MASS_DELETE_CONS_FORECAST_TRAN.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var customrecordrsm_cons_rev_forecastSearchObj = search.create({
      type: "customrecordrsm_cons_rev_forecast",
      filters: [
        [
          ["custrecordrsm_cons_fore_trans_type", "anyof", "1"], "AND", ["custrecordrsm_cons_fore_opp_fore", "anyof", "@NONE@"]
        ],
        "OR",
        [
          ["custrecordrsm_cons_fore_trans_type", "anyof", "2"], "AND", ["custrecordcons_fore_rev_plan", "anyof", "@NONE@"]
        ],
        "OR",
        [
          ["custrecordrsm_cons_fore_trans_type", "anyof", "3"], "AND", ["custrecordrsm_cons_fore_rev_client", "anyof", "@NONE@"]
        ]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "custrecordrsm_cons_fore_client",
          label: "Client"
        }),
        search.createColumn({
          name: "custrecordrsm_cons_fore_opp_fore",
          label: "Opportunity Revenue Forecast"
        }),
        search.createColumn({
          name: "custrecordcons_fore_rev_plan",
          label: "Revenue Recognition Plan"
        })
      ]
    });
    var searchResultCount = customrecordrsm_cons_rev_forecastSearchObj.runPaged().count;
    log.debug("customrecordrsm_cons_rev_forecastSearchObj result count", searchResultCount);
    customrecordrsm_cons_rev_forecastSearchObj.run().each(function(result) {
      // .run().each has a limit of 4,000 results
      return true;
    });

    var res = customrecordrsm_cons_rev_forecastSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecordrsm_cons_rev_forecastSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var cons_rec_id = res.id;

    log.debug('The Consolidated Transaction internal ID is: ', cons_rec_id);

    try {

      var cons_rec_deleted = record.delete({
        type: 'customrecordrsm_cons_rev_forecast',
        id: cons_rec_id,
      });

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
