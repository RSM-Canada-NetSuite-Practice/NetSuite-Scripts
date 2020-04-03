/*******************************************************************
 *
 *
 * Name: DAL_MRS_CREATE_FULFILLMENT_MFN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to create item fulfillments for SO's from MFN
 * Script: DAL_MRS_CREATE_FULFILLMENT_MFN.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record'], function(file, search, record) {

  function getInputData() {

    var salesorderSearchObj = search.create({
      type: "salesorder",
      filters: [
        ["type", "anyof", "SalesOrd"],
        "AND",
        ["status", "anyof", "SalesOrd:B"],
        "AND",
        ["mainline", "is", "T"]
      ],
      columns: [
        search.createColumn({
          name: "datecreated",
          label: "Date Created"
        }),
        search.createColumn({
          name: "trandate",
          label: "Date"
        }),
        search.createColumn({
          name: "tranid",
          label: "Document Number"
        }),
        search.createColumn({
          name: "postingperiod",
          label: "Period"
        }),
        search.createColumn({
          name: "entity",
          label: "Name"
        }),
        search.createColumn({
          name: "memo",
          label: "Memo"
        }),
        search.createColumn({
          name: "amount",
          label: "Amount"
        }),
        search.createColumn({
          name: "custbody1",
          label: "SHORTEST ETAIL ESTIMATED SHIP DATE"
        }),
        search.createColumn({
          name: "custbodyrsm_so_est_ship_date",
          label: "LONGEST ETAIL ESTIMATED SHIP DATE"
        })
      ]
    });
    // var searchResultCount = salesorderSearchObj.runPaged().count;
    // log.debug("salesorderSearchObj result count", searchResultCount);
    // salesorderSearchObj.run().each(function(result) {
    //   // .run().each has a limit of 4,000 results
    //   return true;
    // });

    var res = salesorderSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return salesorderSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var so_id = res.id;
    log.debug('The Sales Order internal ID is: ', so_id);

    var sodate = res.values.trandate;
    log.debug('The Sales Order date is: ', sodate);

    var shortest_date = res.values.custbody1;
    log.debug('The shortest shipping date is: ', shortest_date);

    var longest_date = res.values.custbodyrsm_so_est_ship_date;
    log.debug('The longest shipping date is: ', longest_date);

    var tempdate = new date();

    var tempRec = record.transform({
      fromType: 'salesorder',
      fromId: so_id,
      toType: 'itemfulfillment',
      isDynamic: true
    });

    if (tempdate == sodate) {
      tempRec.setValue({
        fieldId: 'date',
        value: longest_date
      });
    }
    var fulfillmentid = tempRec.save();
    log.debug('The item fulfillment has been saved with id: ', fulfillmentid);
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
