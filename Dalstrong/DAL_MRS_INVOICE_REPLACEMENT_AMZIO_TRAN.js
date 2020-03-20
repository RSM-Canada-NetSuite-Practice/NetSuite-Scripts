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
    2: 318225,
    3: 318226,
    4: 318227,
    6: 318334,
    7: 318328,
    8: 318329,
    9: 318330,
    10: 318333,
    11: 318331,
    13: 1234,
    15: 318335,
    18: 318332
  };

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

    var customrecord_celigo_amzio_settle_transSearchObj = search.create({
      type: "customrecord_celigo_amzio_settle_trans",
      filters: [
        ["custrecord_celigo_amzio_set_recond_trans", "anyof", "@NONE@"],
        "AND",
        [
          ["custrecord_celigo_amzio_set_mer_order_id", "startswith", "CONSUMER"], "OR", ["custrecord_celigo_amzio_set_mer_order_id", "startswith", "S"]
        ],
        "AND",
        ["custrecord_celigo_amzio_set_posted_date", "notonorbefore", "2020-01-31"],
        "AND",
        ["custrecord_celigo_amzio_set_parent_tran", "anyof", "@NONE@"],
        "AND",
        ["custrecord_celigo_amzio_set_trans_to_rec", "anyof", "@NONE@"]
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
          name: "custrecord_celigo_amzio_set_amz_account",
          label: "Amazon Account"
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
        log.debug('The Settlement Transaction SKU is: ', JSON.stringify(amzioSettleTranInvoice[i].sku));
        log.debug('The Settlemetn Transaction Type is: ', JSON.stringify(amzioSettleTranInvoice[i].misctype));

        if (amzioSettleTranInvoice[i].sku != "" && amzioSettleTranInvoice[i].misctype != "ShipmentFees") {
        log.debug('The If statement has been entered: ', JSON.stringify(amzioSettleTranInvoice[i].sku));

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
      }

      var invoiceAmount = invoiceObj.getValue({
        fieldId: 'amount'
      });
      log.debug('The invoice amount is: ', invoiceAmount);
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

      if (invoiceAmount == 0 || invoiceAmount == null) {

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
