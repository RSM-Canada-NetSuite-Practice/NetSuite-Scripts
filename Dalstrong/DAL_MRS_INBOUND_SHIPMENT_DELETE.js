/*******************************************************************
 *
 *
 * Name: DAL_MRS_INBOUND_SHIPMENT_DELETE.js
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Deletes Related Records on Inbound Shipment Records
 * Script: The script record id
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record'], function(file, search, record) {

  function getInputData() {

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["type", "anyof", "ItemRcpt", "OwnTrnsf"],
        "AND",
        ["shipmentnumber", "noneof", "@NONE@"],
        "AND",
        ["mainline", "is", "T"]
      ],
      columns: [
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
        }),
        search.createColumn({
          name: "shipmentnumber",
          label: "Shipment Number"
        })
      ]
    });
    var searchResultCount = transactionSearchObj.runPaged().count;
    log.debug("transactionSearchObj result count", searchResultCount);
    transactionSearchObj.run().each(function(result) {
      // .run().each has a limit of 4,000 results
      return true;
    });
  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    try {

      var ot_id = res.id;
      log.debug('The Ownership Transfer internal ID is: ', ot_id);

      var shipmentnumber = res.values.shipmentnumber;
      log.debug('The Shipment Number is: ', shipmentnumber);

      if (shipmentnumber == "INBSHIP6") {

        record.delete({
          type: "bulkownershiptransfer",
          id: ot_id
        });
      }
    } catch (e) {
      log.debug('Error', e.name + ' ' + e.message);
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
