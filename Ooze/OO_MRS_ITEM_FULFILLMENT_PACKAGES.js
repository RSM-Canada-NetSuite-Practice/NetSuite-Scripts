/*******************************************************************
 *
 *
 * Name: OO_MRS_ITEM_FULFILLMENT_PACKAGES.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to remove blank package lines
 * Script: OO_MRS_ITEM_FULFILLMENT_PACKAGES.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/format', 'N/record', 'N/search'],

    function getInputData() {
      //Search to get unique Fulfillment with more than one package and that has at least one empty tracking number
      var itemfulfillmentSearchObj = search.create({
        type: "itemfulfillment",
        filters: [
          ["type", "anyof", "ItemShip"],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["trandate", "onorafter", "10/1/2020"],
          "AND",
          ["packagecount", "greaterthan", "1"],
          "AND",
          ["max(formulanumeric: CASE WHEN MAX({packagecount}) > COUNT({shipmentpackage.trackingnumber}) THEN 1 ELSE 0 END)", "equalto", "1"]
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            summary: "GROUP",
            label: "Internal ID"
          }),
          search.createColumn({
            name: "trandate",
            summary: "GROUP",
            sort: search.Sort.DESC,
            label: "Date"
          }),
          search.createColumn({
            name: "type",
            summary: "GROUP",
            label: "Type"
          }),
          search.createColumn({
            name: "tranid",
            summary: "GROUP",
            label: "Document Number"
          }),
          search.createColumn({
            name: "packagecount",
            summary: "MAX",
            label: "Package Count"
          }),
          search.createColumn({
            name: "contentsdescription",
            join: "shipmentPackage",
            summary: "GROUP",
            label: "Contents Description"
          }),
          search.createColumn({
            name: "weightinlbs",
            join: "shipmentPackage",
            summary: "SUM",
            label: "Weight In Pounts"
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
      internalid = object_current["values"]["GROUP(internalid)"];
      packagecount = object_current["values"]["MAX(packagecount)"];
      log.debug('The package count is:', packagecount);
      log.debug('The current object is:', object_current);

      try {

        //loop through package lines
        rec = record.load({
          type: 'itemfulfillment',
          id: internalid,
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
