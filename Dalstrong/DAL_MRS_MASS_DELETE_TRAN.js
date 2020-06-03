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

    var customerpaymentSearchObj = search.create({
   type: "customerpayment",
   filters:
   [
      ["type","anyof","CustPymt"],
      "AND",
      ["cseg1","anyof","5","8","7","9","10","6"],
      "AND",
      ["mainline","is","T"]
   ],
   columns:
   [
      search.createColumn({
         name: "ordertype",
         sort: search.Sort.ASC,
         label: "Order Type"
      }),
      search.createColumn({name: "mainline", label: "*"}),
      search.createColumn({name: "trandate", label: "Date"}),
      search.createColumn({name: "asofdate", label: "As-Of Date"}),
      search.createColumn({name: "postingperiod", label: "Period"}),
      search.createColumn({name: "taxperiod", label: "Tax Period"}),
      search.createColumn({name: "type", label: "Type"}),
      search.createColumn({name: "tranid", label: "Document Number"}),
      search.createColumn({name: "entity", label: "Name"}),
      search.createColumn({name: "account", label: "Account"}),
      search.createColumn({name: "memo", label: "Memo"}),
      search.createColumn({name: "amount", label: "Amount"}),
      search.createColumn({name: "custbody_11187_pref_entity_bank", label: "Preferred Entity Bank"}),
      search.createColumn({name: "custbody_11724_pay_bank_fees", label: "Vendor Bank Fees"}),
      search.createColumn({name: "custbody_11724_bank_fee", label: "Bank Fee"})
   ]
});
// var searchResultCount = customerpaymentSearchObj.runPaged().count;
// log.debug("customerpaymentSearchObj result count",searchResultCount);
// customerpaymentSearchObj.run().each(function(result){
//    // .run().each has a limit of 4,000 results
//    return true;
// });

    var res = customerpaymentSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customerpaymentSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.id;

    log.debug('The Transaction internal ID is: ', tranid);

    try {

      var id = record.delete({
        type: 'customerpayment',
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
