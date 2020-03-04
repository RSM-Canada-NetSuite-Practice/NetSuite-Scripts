/*******************************************************************
 *
 *
 * Name: DAL_SUE_MASS_DELETE_CELIGO_AMAZON_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to delete Celigo Amazon Settlement Transactions and their corresponding Fees & Prices
 * Script: DAL_SUE_MASS_DELETE_CELIGO_AMAZON_TRAN
 * Deploy: customdeployrsm_dal_sue_mass_delete_celi
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var customrecord_celigo_amzio_settle_transSearchObj = search.create({
      type: "customrecord_celigo_amzio_settle_trans",
      filters: [
        ["custrecord_celigo_amzio_set_amz_account", "anyof", "103"],
        "AND",
        ["custrecord_celigo_amzio_set_settlemnt_id", "startswith", "12460042831"]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_posted_date",
          label: "Posted Date"
        }),
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name"
        }),
        search.createColumn({
          name: "scriptid",
          label: "Script ID"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_tran_type",
          label: "Transaction Type"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_order_id",
          label: "Order Id"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_settlemnt_id",
          label: "Settlement Id"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_recon_status",
          label: "Status"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_parent_tran",
          label: "NetSuite Transaction (Original)"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_trans_to_rec",
          label: "NetSuite Transaction (To Apply)"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_recond_trans",
          label: "NetSuite Transaction (Applied)"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_tran_sub_tot",
          label: "Net Revenue"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_tran_amount",
          label: "Transaction Amount"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_exp_to_io",
          label: "Exported to IO"
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_CELIGO_AMZIO_SET_F_PAR_TRANS",
          label: "Fee Internal ID"
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_CELIGO_AMZIO_SET_IP_PAR_TRANS",
          label: "Price Internal ID"
        })
      ]
    });

    var searchResultCount = customrecord_celigo_amzio_settle_transSearchObj.runPaged().count;
    log.debug("customrecord_celigo_amzio_settle_transSearchObj result count", searchResultCount);
    customrecord_celigo_amzio_settle_transSearchObj.run().each(function(result) {
      // .run().each has a limit of 4,000 results
      return true;
    });

    var res = customrecord_celigo_amzio_settle_transSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecord_celigo_amzio_settle_transSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var cus_rec_celigo_amzio_settle_internalid = res.values['internalid'].value;

    log.debug('The Settlement Transaction internal ID is: ', cus_rec_celigo_amzio_settle_internalid);

    var recCurrent = record.load({
      type: 'customrecord_celigo_amzio_settle_trans',
      id: cus_rec_celigo_amzio_settle_internalid,
      isDynamic: true,
    });

    var numLinesFees = recCurrent.getLineCount({
      sublistId: 'recmachcustomrecord_celigo_amzio_sett_fee',
    });

    log.debug('The number of settlement fee lines on this transaction is: ', numLinesFees);

    for (var i = 0; i < numLinesFees; i++) {

      var transactionFees = recCurrent.getSublistValue({
        sublistId: 'recmachcustomrecord_celigo_amzio_sett_fee',
        fieldId: 'internalid',
        line: i
      });

      log.debug('The internal id of the transaction fee is: ', transactionFees);

      var transactionFeesDeleted = record.delete({
        type: 'customrecord_celigo_amzio_sett_fee',
        id: transactionFees,
      });

    }

    var numLinesPrice = recCurrent.getLineCount({
      sublistId: 'recmachcustomrecord_celigo_amzio_set_item_price',
    });

    for (var f = 0; i < numLinesPrice; f++) {

      var transactionPrices = recCurrent.getSublistValue({
        sublistId: 'recmachcustomrecord_celigo_amzio_set_item_price',
        fieldId: 'internalid',
        line: f
      });

      log.debug('The internal id of the transaction price is: ', transactionPrices);

      var transactionPricesDeleted = record.delete({
        type: 'customrecord_celigo_amzio_set_item_price',
        id: transactionPrices,
      });

    }

    var cus_rec_celigo_amzio_settle = record.delete({
      type: 'customrecord_celigo_amzio_settle_trans',
      id: cus_rec_celigo_amzio_settle_internalid,
    });

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
