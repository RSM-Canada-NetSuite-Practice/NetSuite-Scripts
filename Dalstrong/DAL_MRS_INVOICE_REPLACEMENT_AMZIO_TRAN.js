/*******************************************************************
 *
 *
 * Name: DAL_MRS_SHOPIFY_CASHSALE_AMZIO_TRAN.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to associate Shopify Cash Sale Transactions to the corresponding Celigo Amazon Settlement Transaction
 * Script: DAL_MRS_INVOICE_REPLACEMENT_AMZIO_TRAN
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record'], function(file, search, record) {

  var marketplaceMap = {
    2: 1234,
    3: 1234,
    4: 1234,
    6: 1234,
    7: 1234,
    8: 1234,
    9: 1234,
    10: 1234,
    11: 1234,
    13: 1234,
    15: 1234,
    18: 1234
  };

  function getInputData() {

    var customrecord_celigo_amzio_settle_transSearchObj = search.create({
      type: "customrecord_celigo_amzio_settle_trans",
      filters: [
        ["custrecord_celigo_amzio_set_mer_order_id", "contains", "CONSUMER"]
      ],
      columns: [
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_posted_date",
          label: "Posted Date"
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
          name: "custrecord_celigo_amzio_set_mer_order_id",
          label: "Merchant Order Id"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_marketplace",
          label: "Marketplace Name"
        }),
        search.createColumn({
          name: "custrecordrsm_marketplace_cus_tran_settl",
          label: "Marketplace"
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
          name: "custrecord_celigo_amzio_set_tran_sub_tot",
          label: "Net Revenue"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_tran_amount",
          label: "Transaction Amount"
        })
      ]
    });
    //var searchResultCount = customrecord_celigo_amzio_settle_transSearchObj.runPaged().count;
    //log.debug("customrecord_celigo_amzio_settle_transSearchObj result count", searchResultCount);
    //customrecord_celigo_amzio_settle_transSearchObj.run().each(function(result) {
    // .run().each has a limit of 4,000 results
    //  return true;
    //});

    var res = customrecord_celigo_amzio_settle_transSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecord_celigo_amzio_settle_transSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var cus_rec_celigo_amzio_settle_internalid = res.id;
    log.debug('The Settlement Transaction internal ID is: ', cus_rec_celigo_amzio_settle_internalid);

    var cus_rec_celigo_amzio_settle_order_id = res.values.custrecord_celigo_amzio_set_order_id;
    log.debug('The Settlement Order ID is: ', cus_rec_celigo_amzio_settle_order_id);

    var cus_rec_celigo_amzio_posted_date = res.values.custrecord_celigo_amzio_set_posted_date;
    log.debug('The Settlement Posted Date is: ', cus_rec_celigo_amzio_posted_date);

    var cus_rec_celigo_amzio_marketplace = res.values.custrecordrsm_marketplace_cus_tran_settl.value;
    log.debug('The Settlement Marketplace is: ', cus_rec_celigo_amzio_marketplace);

    var amzioSettleTran = record.load({
      type: 'customrecord_celigo_amzio_settle_trans',
      id: cus_rec_celigo_amzio_settle_internalid
    });

    log.debug('The Settlement Transaction has been successfully loaded: ', cus_rec_celigo_amzio_settle_internalid);

    var amzioLineItemCount = amzioSettleTran.getLineCount({
      sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans'
    });

    log.debug('The Settlement Transaction line count is: ', amzioLineItemCount);

    // var amzioSettleTranInvoice = {
    //   'date': cus_rec_celigo_amzio_posted_date,
    //   'customer': marketplaceMap[cus_rec_celigo_amzio_marketplace],
    //   'marketplace': cus_rec_celigo_amzio_marketplace,
    //   'ponumber': cus_rec_celigo_amzio_settle_order_id,
    // };

    var invoiceObj = record.create({
      type: 'invoice',
      isDynamic: true,
    });

    invoiceObj.setValue({
      fieldId: 'tranDate',
      value: amzioSettleTranInvoice.date
    });
    invoiceObj.setValue({
      fieldId: 'entity',
      value: amzioSettleTranInvoice.customer
    });
    invoiceObj.setValue({
      fieldId: 'cseg1',
      value: amzioSettleTranInvoice.marketplace
    });
    invoiceObj.setValue({
      fieldId: 'otherrefnum',
      value: amzioSettleTranInvoice.ponumber
    });

    for (var i = 0; i < amzioLineItemCount; i++) {

      amzioSettleTran.selectLine({
        sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
        line: i
      });

      amzioSettleTranInvoice['items'][i] = {
        'sku': amzioSettleTran.getCurrentSublistValue({
          sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
          fieldId: custrecord_celigo_amzio_set_ip_ord_sku
        }),
        'qty': amzioSettleTran.getCurrentSublistValue({
          sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
          fieldId: custrecord_celigo_amzio_set_ip_ord_sku
        }),
        'orderid': amzioSettleTran.getCurrentSublistValue({
          sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
          fieldId: custrecord_celigo_amzio_set_ip_or_it_id
        }),
        'amount': amzioSettleTran.getCurrentSublistValue({
          sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
          fieldId: custrecord_celigo_amzio_set_ip_or_it_id
        }),

      };

      log.debug(JSON.stringify(amzioSettleTranInvoice[i]));

      invoiceObj.selectNewLine({
        sublistId: 'item'
      });
      invoiceObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: amzioSettleTranInvoice.items[i].sku
      });
      invoiceObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: amzioSettleTranInvoice.items[i].qty
      });
      invoiceObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_celigo_etail_order_line_id',
        value: amzioSettleTranInvoice.items[i].orderid
      });
      invoiceObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'amount',
        value: amzioSettleTranInvoice.items[i].amount
      });
      invoiceObj.commitLine({
        sublistId: 'item'
      });


    }

    var invoiceinternalID = invoiceObj.save();

    log.debug('The Invoice has been successfully saved: ', invoiceinternalID);

    amzioSettleTran.setValue({fieldId: 'custrecord_celigo_amzio_set_parent_tran', value:invoiceinternalID});
    amzioSettleTran.setValue({fieldId: 'custrecord_celigo_amzio_set_trans_to_rec', value:invoiceinternalID});
    amzioSettleTran.setValue({fieldId: 'custrecord_celigo_amzio_set_recond_trans', value:invoiceinternalID});
    amzioSettleTran.setValue({fieldId: 'custrecord_celigo_amzio_set_exp_to_io' ,value: true});
    amzioSettleTran.setValue({fieldId: 'custrecord_celigo_amzio_set_recon_status', value: '5'});

    amzioSettleTran.save();

    log.debug('The Settlement Transaction has been successfully saved with Invoice: ', cus_rec_cash_sale_internal_id);


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
