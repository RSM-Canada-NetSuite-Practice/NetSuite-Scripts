/*******************************************************************
 *
 *
 * Name: HB_MRS_Ooze_Remove_Blank_Package_Lines.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to remove blank package lines from Item Fulfillments (no tracking nubmer)
 * Script: HB_MRS_Ooze_Remove_Blank_Package_Lines
 * Deploy: HB_MRS_Ooze_Remove_Blank_Package_Lines
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var itemfulfillmentSearchObj = search.create({
      type: "itemfulfillment",
      filters: [
        ["type", "anyof", "ItemShip"],
        "AND",
        ["packagecount", "greaterthan", "1"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["cogs", "is", "F"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["trandate", "within", "thisfiscalyear"],
        "AND",
        ["shipping", "is", "T"],
        "AND",
        ["custbody_celigo_etail_channel", "anyof", "101"],
        "AND",
        ["formulanumeric: CASE WHEN MAX({packagecount}) > COUNT({shipmentpackage.trackingnumber}) THEN 1 ELSE 0 END", "is", "1"]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "trandate",
          sort: search.Sort.DESC,
          label: "Date"
        }),
        search.createColumn({
          name: "postingperiod",
          label: "Period"
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

    var res = itemfulfillmentSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return itemfulfillmentSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);
    var id = res.id;
    var type = res.recordType;

    try {

      objRecord = record.load({
        type: 'itemfulfillment',
        id: id,
        isDynamic: true,
      });
      log.debug('objRecord', objRecord);

      var upslines = objRecord.getLineCount({
        sublistId: 'packageups'
      });
      log.debug('upslines', upslines);
      var fedexlines = objRecord.getLineCount({
        sublistId: 'packagefedex'
      });
      log.debug('fedexlines', fedexlines);
      var packagelines = objRecord.getLineCount({
        sublistId: 'package'
      });
      log.debug('packagelines', packagelines);
      var uspslines = objRecord.getLineCount({
        sublistId: 'packageusps'
      });
      log.debug('uspslines', uspslines);

      var lines = '';
      var packagesublist = '';

      if (upslines > 1) {
        lines = upslines;
        packagesublist = 'packageups';
        trackingnumber = 'packagetrackingnumberups';
      } else if (fedexlines > 1) {
        lines = fedexlines;
        packagesublist = 'packagefedex';
        trackingnumber = 'packagetrackingnumberfedex';
      } else if (packagelines > 1) {
        lines = upslines;
        packagesublist = 'package';
        trackingnumber = 'packagetrackingnumber';
      } else if (uspslines > 1) {
        lines = uspslines;
        packagesublist = 'packageusps';
        trackingnumber = 'packagetrackingnumberusps';
      }

      log.debug('lines', lines);
      log.debug('packagesublist', packagesublist);
      log.debug('trackingnumber', trackingnumber);

      for (var i = lines-1; i >= 0; i--) {
        var temptracking = objRecord.getSublistValue({
          sublistId: packagesublist,
          fieldId: trackingnumber,
          line: i
        });
        log.debug('Looping on line: ' + i, 'Tracking number on line ' + i + 'is: ' + temptracking);

        if (!temptracking) {
          objRecord.removeLine({
            sublistId: packagesublist,
            line: i,
            ignoreRecalc: true
          });
          log.debug('Line: ' + i, 'has been removed');
        }
      }

      objRecord.save();


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
