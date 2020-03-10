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

    var cus_rec_celigo_amzio_marketplace = res.custrecordrsm_marketplace_cus_tran_settl;
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

    var amzioSettleTranInvoice = {};

    for (var i = 0; i < amzioLineItemCount; i++) {

      amzioSettleTranInvoice[i] = {
        'date': cus_rec_celigo_amzio_posted_date,
        'customer': "",
        'marketplace': cus_rec_celigo_amzio_marketplace,
        'ponumber': cus_rec_celigo_amzio_settle_order_id,
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

      if (amzioSettleTranInvoice[i].marketplace == 2) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 3) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 4) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 6) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 7) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 8) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 9) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 10) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 11) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 13) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 15) {
        amzioSettleTranInvoice[i].customer = '1234';
      } else if (amzioSettleTranInvoice[i].marketplace == 18) {
        amzioSettleTranInvoice[i].customer = '1234';
      }

      var invoiceObj = record.create({
        type: 'invoice',
        isDynamic: true,
        defaultValues: 123
      });

      amzioSettleTran.selectNewLine('recmachcustrecord_celigo_amzio_set_ip_par_trans');

    }





    amzioSettleTran.save();


    // var invoiceSearchObj = search.create({
    //   type: "invoice",
    //   filters: [
    //     ["type", "anyof", "CustInvc"],
    //     "AND",
    //     ["mainline", "is", "T"],
    //     "AND",
    //     ["otherrefnum", "equalto", "TBD"]
    //   ],
    //   columns: [
    //     search.createColumn({
    //       name: "trandate",
    //       label: "Date"
    //     }),
    //     search.createColumn({
    //       name: "postingperiod",
    //       label: "Period"
    //     }),
    //     search.createColumn({
    //       name: "type",
    //       label: "Type"
    //     }),
    //     search.createColumn({
    //       name: "tranid",
    //       label: "Document Number"
    //     }),
    //     search.createColumn({
    //       name: "otherrefnum",
    //       label: "PO/Cheque Number"
    //     }),
    //     search.createColumn({
    //       name: "entity",
    //       label: "Name"
    //     }),
    //     search.createColumn({
    //       name: "memo",
    //       label: "Memo"
    //     }),
    //     search.createColumn({
    //       name: "amount",
    //       label: "Amount"
    //     })
    //   ]
    // });
    //var searchResultCount = invoiceSearchObj.runPaged().count;
    //log.debug("invoiceSearchObj result count", searchResultCount);
    //invoiceSearchObj.run().each(function(result) {
    // .run().each has a limit of 4,000 results
    //  return true;
    //});

    // var invoiceResults = invoiceSearchObj.run().getRange(0, 100);
    // log.debug('Invoice Search', invoiceResults.length + ' ' + JSON.stringify(invoiceResults));
    //
    // var cus_rec_invoice_internal_id = invoiceResults[0].id;
    //
    // log.debug('The Invoice Internal ID is: ', cus_rec_invoice_internal_id);

    // var cashSaleRec = record.load({type: 'cashsale', id: cus_rec_cash_sale_internal_id});
    //
    // log.debug('The Cash Sale has been successfully loaded: ', cus_rec_cash_sale_internal_id);
    //
    // cashSaleRec.setValue({fieldId:custbodyrsm_celigo_sett_tran,value:cus_rec_celigo_amzio_settle_internalid});
    //
    // cashSaleRec.save();

    // log.debug('The Cash Sale has been successfully saved with Settlement Transaction: ', cus_rec_celigo_amzio_settle_internalid);

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
