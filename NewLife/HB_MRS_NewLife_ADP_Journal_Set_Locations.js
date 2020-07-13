/*******************************************************************
 *
 *
 * Name: HB_MRS_NewLife_ADP_Journal_Set_Locations.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to update the Location and Department of ADP Journal Entries
 * Script: HB_MRS_NewLife_ADP_Journal_Set_Locations
 * Deploy: HB_MRS_NewLife_ADP_Journal_Set_Locations
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var journalentrySearchObj = search.create({
       type: "journalentry",
       filters:
       [
          ["type","anyof","Journal"],
          "AND",
          ["memomain","contains","Payroll Journal from ADP"],
          "AND",
          ["account","anyof","293"],
          "AND",
          [["department","noneof","8"],"OR",["location","noneof","12"]]
       ],
       columns:
       [
          search.createColumn({name: "internalid", label: "Internal ID"}),
          search.createColumn({name: "tranid", label: "Document Number"}),
          search.createColumn({name: "account", label: "Account"}),
          search.createColumn({name: "memo", label: "Memo"}),
          search.createColumn({name: "amount", label: "Amount"}),
          search.createColumn({name: "location", label: "Location"}),
          search.createColumn({name: "department", label: "Department"}),
          search.createColumn({name: "line", label: "Line ID"})
       ]
    });
    // var searchResultCount = journalentrySearchObj.runPaged().count;
    // log.debug("journalentrySearchObj result count",searchResultCount);
    // journalentrySearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });

    var res = journalentrySearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return journalentrySearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    try {

      var id = res.id;
      var lineid = res.values.line;

      log.debug('The line is:', lineid);

      var journal = record.load({
        type: 'journalentry',
        id: id,
        isDynamic: true
      });
      log.debug('Record has been loaded: ', journal);

      var linenumber = journal.findSublistLineWithValue({
        sublistId: 'line',
        fieldId: 'line',
        value: lineid
      });
      log.debug('The line number is: ', linenumber);

      var templine = journal.selectLine({
        sublistId: 'line',
        line: linenumber
      });
      log.debug('Setting line: ', templine );

      var templocation = journal.setCurrentSublistValue({
        sublistId: 'line',
        fieldId: 'location',
        value: 12,
      });

      var tempdepartment = journal.setCurrentSublistValue({
        sublistId: 'line',
        fieldId: 'department',
        value: 8,
      });

      log.debug('Set sublist value: ', templocation + " " + tempdepartment);

      journal.commitLine({
        sublistId: 'line'
      });

      journal.save();
      log.debug('The record has been saved', journal);

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
