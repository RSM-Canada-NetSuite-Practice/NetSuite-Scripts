/*******************************************************************
 *
 *
 * Name: CER_MRS_SET_INVOICE_TIME.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to set invoices on time records (time that has been invoiced)
 * Script: CER_MRS_SET_INVOICE_TIME.js
 * Deploy: CER_MRS_SET_INVOICE_TIME.js
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var searchObj = search.load({
      id: 'customsearch_time_entry_invoices'
    });
    return searchObj;
  }

  function map(context) {

    log.debug('Map', context.value);
    var res = JSON.parse(context.value);

    var tranid = res.id;
    log.debug('The Transaction internal ID is: ', tranid);
    var timeid = res.values.custcol_internal_time_ticket.value;
    log.debug('timeid', timeid);

    try {

      var temp = record.submitFields({
        type: 'timebill',
        id: timeid,
        values: {
          custcol_time_invoice: tranid
        }
      });
      log.debug('temp', temp);

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
