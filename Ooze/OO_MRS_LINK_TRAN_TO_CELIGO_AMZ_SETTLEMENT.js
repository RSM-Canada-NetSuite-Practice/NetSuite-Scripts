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

    var searchObj = search.load({
      id: 'customsearch3669'
    });
    return searchObj;
  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);
    var id = res.id;
    var type = res.recordType;
    var orderid = res.values.custrecord_celigo_amzio_set_order_id;
    log.debug('orderid', orderid);


    try {

      var invoiceinternalid = getInvoiceID(orderid);

      if (invoiceinternalid != '') {

        var celigotran = record.load({
          type: 'customrecord_celigo_amzio_settle_trans',
          id: id
        });

        celigotran.setValue({
          fieldId: 'custrecord_celigo_amzio_set_parent_tran',
          value: invoiceinternalid
        }).setValue({
          fieldId: 'custrecord_celigo_amzio_set_exp_to_io',
          value: 'T'
        });

        celigotran.save();
      }

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

    }

    function getInvoiceID(etailorderid) {
      var invoiceSearchObj = search.create({
        type: "invoice",
        filters: [
          ["custbody_celigo_etail_order_id", "startswith", etailorderid],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", "CustInvc"]
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            label: "Internal ID"
          })
        ]
      });

      var tempid = invoiceSearchObj.run().getRange(0, 1);
      log.debug('tempid', tempid);
      var internalid = tempid[0].getValue({
        name: 'internalid'
      });
      log.debug('internalid', internalid);
      return internalid;
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
