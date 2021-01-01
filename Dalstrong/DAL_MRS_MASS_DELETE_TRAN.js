/*******************************************************************
 *
 *
 * Name: DAL_SUE_MASS_DELETE_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to delete Transactions
 * Script: DAL_SUE_MASS_DELETE_TRAN
 * Deploy: DAL_SUE_MASS_DELETE_TRAN
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var searchObj = search.load({
      id: 'customsearch1590'
    });
    return searchObj;
  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.id;

    log.debug('The Transaction internal ID is: ', tranid);

    var recordtype = res.recordType;

    log.debug('The record type is: ', recordtype);

    try {

      if (recordtype == 'creditmemo') {
        var credit_memo = record.load({
          type: 'creditmemo',
          id: tranid,
          isDynamic: true
        });

        var lines = credit_memo.getLineCount({
          sublistId: 'apply'
        });
        log.debug('The lines are:', lines);

        for (var i = 0; i < lines; i++) {
          log.debug('For loop has been entered ', i);
          var templine = credit_memo.selectLine({
            sublistId: 'apply',
            line: i
          });
          log.debug('Looping on line: ', i);
          var tempsublistvalue = credit_memo.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'apply',
            value: false,
            ignoreFieldChange: true
          });

          credit_memo.setCurrentSublistValue({
            sublistId: 'apply',
            fieldId: 'amount',
            value: 0
          });

          log.debug('Set sublist value: ', tempsublistvalue);
          credit_memo.commitLine({
            sublistId: 'apply'
          });
        }

        credit_memo.save();
        log.debug('The record has been saved', credit_memo);

        var id = record.delete({
          type: 'creditmemo',
          id: tranid,
        });
        log.debug('The Transaction has been deleted: ', id);

      } else {

        var id = record.delete({
          type: recordtype,
          id: tranid,
        });

        log.debug('The Transaction has been deleted: ', id);
      }

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
