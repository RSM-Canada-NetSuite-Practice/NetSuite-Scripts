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

  var invoiceLocationMap = {
    201: 6,
    101: 3,
    301: 15,
    302: 17,
    303: 16,
    304: 19,
    102: 13,
    401: 4,
    103: 2,
  };


  function getInputData() {

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["account", "anyof", "1199", "1200", "1201", "1208", "1209", "1210", "1211", "1205", "1203", "1204"],
        "AND",
        ["custbody_rsm_rec_proc_daily", "is", "F"]
      ],
      columns: [
        search.createColumn({
          name: "trandate",
          summary: "GROUP",
          label: "Date"
        }),
        search.createColumn({
          name: "account",
          summary: "GROUP",
          label: "Account"
        }),
        search.createColumn({
          name: "custrecord_rsm_destination_account",
          join: "account",
          summary: "GROUP",
          label: "Destination Account"
        }),
        search.createColumn({
          name: "postingperiod",
          summary: "GROUP",
          label: "Period"
        }),
        search.createColumn({
          name: "currency",
          summary: "GROUP",
          label: "Currency"
        }),
        search.createColumn({
          name: "cseg1",
          summary: "GROUP",
          label: "Marketplace"
        }),
        search.createColumn({
          name: "debitfxamount",
          summary: "SUM",
          label: "Amount (Debit) FX"
        }),
        search.createColumn({
          name: "debitamount",
          summary: "SUM",
          label: "Amount (Debit)"
        }),
        search.createColumn({
          name: "creditfxamount",
          summary: "SUM",
          label: "Amount (Credit) FX"
        }),
        search.createColumn({
          name: "creditamount",
          summary: "SUM",
          label: "Amount (Credit)"
        })
      ]
    });
    //var searchResultCount = transactionSearchObj.runPaged().count;
    //log.debug("transactionSearchObj result count",searchResultCount);
    //transactionSearchObj.run().each(function(result){
    // .run().each has a limit of 4,000 results
    //   return true;
    //});

    var res = transactionSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return transactionSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);
    var res = JSON.parse(context.value);
    var accountObject = {}, date = [], account = [], destinationAccount = [], currency = [], marketplace = [], amountDebit = '', amountCredit = '';
    var accountObjectID = res.id;

    



    var journalDate = res.Date;
    log.debug('The Journal Date is: ', cus_rec_celigo_amzio_settle_internalid);

    var cus_rec_celigo_amzio_settle_order_id = res.values.custrecord_celigo_amzio_set_order_id;
    log.debug('The Settlement Order ID is: ', cus_rec_celigo_amzio_settle_order_id);

    var cus_rec_celigo_amzio_posted_date = res.values.custrecord_celigo_amzio_set_posted_date;
    log.debug('The Settlement Posted Date is: ', cus_rec_celigo_amzio_posted_date);

    var cus_rec_celigo_amzio_marketplace = res.values.custrecordrsm_marketplace_cus_tran_settl.value;
    log.debug('The Settlement Marketplace is: ', cus_rec_celigo_amzio_marketplace);

    var cus_rec_celigo_amzio_amz_acct = res.values.custrecord_celigo_amzio_set_amz_account.value;
    log.debug('The Settlement Amazon Account is: ', cus_rec_celigo_amzio_amz_acct);

    var amzioSettleTran = record.load({
      type: 'customrecord_celigo_amzio_settle_trans',
      id: cus_rec_celigo_amzio_settle_internalid,
      isDynamic: true
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

    try {

      var invoiceObj = record.create({
        type: 'invoice',
        isDynamic: true,
      });

      log.debug('The Invoice has been successfully created: ', invoiceObj);

      invoiceObj.setValue({
        fieldId: 'trandate',
        value: cus_rec_celigo_amzio_posted_date
      });
      invoiceObj.setValue({
        fieldId: 'saleseffectivedate',
        value: cus_rec_celigo_amzio_posted_date
      });
      invoiceObj.setValue({
        fieldId: 'duedate',
        value: cus_rec_celigo_amzio_posted_date
      });
      invoiceObj.setValue({
        fieldId: 'entity',
        value: marketplaceMap[cus_rec_celigo_amzio_marketplace]
      });
      invoiceObj.setValue({
        fieldId: 'cseg1',
        value: cus_rec_celigo_amzio_marketplace
      });
      invoiceObj.setValue({
        fieldId: 'otherrefnum',
        value: cus_rec_celigo_amzio_settle_order_id
      });
      invoiceObj.setValue({
        fieldId: 'location',
        value: invoiceLocationMap[cus_rec_celigo_amzio_amz_acct]
      });

      log.debug('The header values have been set: ', invoiceObj);

      var amzioSettleTranInvoice = {};

      for (var i = 0; i < amzioLineItemCount; i++) {

        amzioSettleTran.selectLine({
          sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
          line: i
        });

        log.debug('Looping on line: ', i);

        amzioSettleTranInvoice[i] = {
          'sku': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_ord_sku'
          }),
          'qty': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_quantity'
          }),
          'orderid': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_or_it_id'
          }),
          'amount': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_principal'
          }),
          'misctype': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_mis_am_ty'
          }),
          'miscamount': amzioSettleTran.getCurrentSublistValue({
            sublistId: 'recmachcustrecord_celigo_amzio_set_ip_par_trans',
            fieldId: 'custrecord_celigo_amzio_set_ip_mis_amt'
          }),

        };

        log.debug('The Settlement Transaction Item is: ', JSON.stringify(amzioSettleTranInvoice[i]));

        //if (amzioSettleTranInvoice[i].sku == "" && amzioSettleTranInvoice[i].misctype == 'ShipmentFees') {

        //  amzioSettleTranInvoice[i].skuinternalid = 66;
        //  amzioSettleTranInvoice[i].amount = Math.abs(amzioSettleTranInvoice[i].miscamount);

        //} else {

        //Lookup SKU InternalId
        var itemSearchObj = search.create({
          type: "item",
          filters: [
            ["name", "contains", amzioSettleTranInvoice[i].sku]
          ],
          columns: [
            search.createColumn({
              name: "internalid",
              label: "Internal ID"
            }),
            search.createColumn({
              name: "itemid",
              label: "Name"
            })
          ]
        });

        var searchResultCount = itemSearchObj.run().getRange({
          start: 0,
          end: 10
        });
        amzioSettleTranInvoice[i].skuinternalid = searchResultCount[0].id;

        //}

        log.debug('Sku Internal ID is: ', amzioSettleTranInvoice[i].skuinternalid);

        invoiceObj.selectNewLine({
          sublistId: 'item'
        });
        invoiceObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: amzioSettleTranInvoice[i].skuinternalid
        });
        invoiceObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: amzioSettleTranInvoice[i].qty
        });
        invoiceObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_celigo_etail_order_line_id',
          value: amzioSettleTranInvoice[i].orderid
        });
        invoiceObj.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'amount',
          value: amzioSettleTranInvoice[i].amount
        });
        invoiceObj.commitLine({
          sublistId: 'item'
        });


      }

      var invoiceAmount = invoiceObj.getValue({
        fieldId: 'amount'
      });
      var invoiceinternalID = invoiceObj.save();

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

    }

    log.debug('The Invoice has been successfully saved: ', invoiceinternalID);

    if (invoiceinternalID != null) {

      amzioSettleTran.setValue({
        fieldId: 'custrecord_celigo_amzio_set_parent_tran',
        value: invoiceinternalID
      });
      amzioSettleTran.setValue({
        fieldId: 'custrecord_celigo_amzio_set_trans_to_rec',
        value: invoiceinternalID
      });

      if (invoiceAmount == 0) {

        amzioSettleTran.setValue({
          fieldId: 'custrecord_celigo_amzio_set_recond_trans',
          value: invoiceinternalID
        });
        amzioSettleTran.setValue({
          fieldId: 'custrecord_celigo_amzio_set_exp_to_io',
          value: true
        });
        amzioSettleTran.setValue({
          fieldId: 'custrecord_celigo_amzio_set_recon_status',
          value: 5
        });
      }

    }

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
