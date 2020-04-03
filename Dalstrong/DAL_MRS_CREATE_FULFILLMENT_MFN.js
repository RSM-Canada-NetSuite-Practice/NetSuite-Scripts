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
 * Purpose: The purpose of this script is to associate Shopify Cash Sale Transactions to the corresponding Celigo Amazon Settlement Transaction
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

    var shortest_date = res.values.custbody1;
    log.debug('The shortest shipping date is: ', shortest_date);

    var longest_date = res.values.custbodyrsm_so_est_ship_date;
    log.debug('The longest shipping date is: ', longest_date);

    var cashsaleSearchObj = search.create({
      type: "cashsale",
      filters: [
        ["type", "anyof", "CashSale"],
        "AND",
        ["mainline", "is", "T"],
        "AND",
        ["poastext", "is", cus_rec_celigo_amzio_settle_merchant_order_id]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "tranid",
          label: "Document Number"
        }),
        search.createColumn({
          name: "otherrefnum",
          label: "PO/Cheque Number"
        })
      ]
    });

    var cashSaleResults = cashsaleSearchObj.run().getRange(0, 100);
    log.debug('Cash Sale Search', cashSaleResults.length + ' ' + JSON.stringify(cashSaleResults));

    var cus_rec_cash_sale_internal_id = cashSaleResults[0].id;

    log.debug('The Cash Sale Internal ID is: ', cus_rec_cash_sale_internal_id);

    // var cashSaleRec = record.load({type: 'cashsale', id: cus_rec_cash_sale_internal_id});
    //
    // log.debug('The Cash Sale has been successfully loaded: ', cus_rec_cash_sale_internal_id);
    //
    // cashSaleRec.setValue({fieldId:custbodyrsm_celigo_sett_tran,value:cus_rec_celigo_amzio_settle_internalid});
    //
    // cashSaleRec.save();

    // log.debug('The Cash Sale has been successfully saved with Settlement Transaction: ', cus_rec_celigo_amzio_settle_internalid);

    var amzioSettleTran = record.load({
      type: 'customrecord_celigo_amzio_settle_trans',
      id: cus_rec_celigo_amzio_settle_internalid
    });

    log.debug('The Settlement Transaction has been successfully loaded: ', cus_rec_celigo_amzio_settle_internalid);

    amzioSettleTran.setValue({
      fieldId: 'custrecord_celigo_amzio_set_parent_tran',
      value: cus_rec_cash_sale_internal_id
    });
    amzioSettleTran.setValue({
      fieldId: 'custrecord_celigo_amzio_set_trans_to_rec',
      value: cus_rec_cash_sale_internal_id
    });
    amzioSettleTran.setValue({
      fieldId: 'custrecord_celigo_amzio_set_recond_trans',
      value: cus_rec_cash_sale_internal_id
    });
    amzioSettleTran.setValue({
      fieldId: 'custrecord_celigo_amzio_set_exp_to_io',
      value: true
    });
    amzioSettleTran.setValue({
      fieldId: 'custrecord_celigo_amzio_set_recon_status',
      value: 5
    });

    amzioSettleTran.save();

    log.debug('The Settlement Transaction has been successfully saved with Cash Sale Transaction: ', cus_rec_cash_sale_internal_id);


  }

  function reduce(context) {

    //   var cus_rec_celigo_amzio_settlement_reduce_internalid = context.key;
    //
    //   try {
    //
    //     var transactionSettlement = record.delete({
    //       type: 'customrecord_celigo_amzio_settle_trans',
    //       id: cus_rec_celigo_amzio_settlement_reduce_internalid,
    //     });
    //
    //   } catch (e) {
    //
    //     log.debug('Error reads: ', e.name + e.message);
    //
    //   }
    //
    //   log.debug('Reduce');
    //
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
