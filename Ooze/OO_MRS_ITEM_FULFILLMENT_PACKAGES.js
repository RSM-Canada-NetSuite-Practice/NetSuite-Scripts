/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/format', 'N/record', 'N/search'],
/**
 * @param{format} format
 * @param{record} record
 * @param{search} search
 */
function(FORMAT, RECORD, SEARCH) {

  /**
   * Marks the beginning of the Map/Reduce process and generates input data.
   *
   * @typedef {Object} ObjectRef
   * @property {number} id - Internal ID of the record instance
   * @property {string} type - Record type id
   *
   * @return {Array|Object|Search|RecordRef} inputSummary
   * @since 2015.1
   */
  function getInputData() {
    //Search to get unique Fulfillment with more than one package and that has at least one empty tracking number
    var itemfulfillmentSearchObj = SEARCH.create({
      type: "itemfulfillment",
      filters: [
        ["type", "anyof", "ItemShip"],
        "AND",
        ["packagecount", "greaterthan", "1"],
        "AND",
        ["shipmentpackage.trackingnumber", "isempty", ""]
      ],
      columns: [
        SEARCH.createColumn({
          name: "internalid",
          summary: "GROUP",
          label: "Internal ID"
        }),
        SEARCH.createColumn({
          name: "trandate",
          summary: "GROUP",
          label: "Date"
        }),
        SEARCH.createColumn({
          name: "type",
          summary: "GROUP",
          label: "Type"
        }),
        SEARCH.createColumn({
          name: "tranid",
          summary: "GROUP",
          label: "Document Number"
        }),
        SEARCH.createColumn({
          name: "weightinlbs",
          join: "shipmentPackage",
          summary: "COUNT",
          label: "Package Count"
        }),
        SEARCH.createColumn({
          name: "contentsdescription",
          join: "shipmentPackage",
          summary: "GROUP",
          label: "Contents Description"
        }),
        SEARCH.createColumn({
          name: "weightinlbs",
          join: "shipmentPackage",
          summary: "SUM",
          label: "Weight In Pounds"
        }),
        SEARCH.createColumn({
          name: "trackingnumber",
          join: "shipmentPackage",
          summary: "GROUP",
          label: "Tracking Number"
        })
      ]
    });

    return itemfulfillmentSearchObj;
  }

  /**
   * Executes when the map entry point is triggered and applies to each key/value pair.
   *
   * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
   * @since 2015.1
   */
  function map(context) {
    //log.debug('Map', context.value);
    var object_current = JSON.parse(context.value),
      internalid = object_current["values"]["internalid"];
    packagecount = object_current["values"]["COUNT(shipmentPackage.weightinlbs)"];
    log.debug('The package count is:', packagecount);

    log.debug('The current object is:', object_current);

    try {

      //loop through package lines
      rec = record.load({
        type: 'itemfulfillment',
        isDynamic: true
      });
      var templines = rec.getLineCount({
        sublistId: 'package'
      });
      log.debug('The package sublist line count is:', templines);
      var templinesusps = rec.getLineCount({
        sublistId: 'packageusps'
      });
      log.debug('The package usps line count is: ', templinesusps);

      for (var i = 0; i < packagecount.length; i++) {
        rec.selectLine({
          sublistId: 'package',
          line: i
        });
        var trackingother = rec.getCurrentSublistValue({
          sublistId: 'package',
          fieldId: 'packagetrackingnumberusps'
        });
        var trackingusps = rec.getCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagetrackingnumberusps'
        });

        if (trackingother == '') {
          rec.removeLine({
            sublistId: 'package',
            line: i
          });
        } else if (trackingusps == '') {
          rec.removeLine({
            sublistId: 'packageusps',
            line: i
          });
        }
      }

      //rec.save();

    } catch (e) {
      log.debug('Error reads: ', e.name + e.message);
    }

  }

/**
 * Executes when the reduce entry point is triggered and applies to each group.
 *
 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
 * @since 2015.1
 */
function reduce(context) {

}


/**
 * Executes when the summarize entry point is triggered and applies to the result set.
 *
 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
 * @since 2015.1
 */
function summarize(summary) {

}

return {
  getInputData: getInputData,
  map: map,
  reduce: reduce,
  summarize: summarize
};

});
