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
    var accountObject = {},
      date = [],
      account = [],
      destinationAccount = [],
      currency = [],
      marketplace = [],
      amountDebit = '',
      amountCredit = '';
    var accountObjectID = res.id;

    accountObject.date = res.values.trandate;
    accountObject.account = res.values.account.value;
    accountObject.destinationAccount = res.values.custrecord_rsm_destination_account.value;
    accountObject.currency = res.values.currency.value;
    accountObject.marketplace = res.values.cseg1.value;
    accountObject.amountDebit = res.debitfxamount;
    accountObject.amountCredit = res.creditfxamount;

    log.debug('The Account Object is: ', JSON.stringify(accountObject));

    context.write({
      key: accountObjectID,
      value: accountObject
    });

  }
  function reduce(context) {

    var accountObjectID = context.key;
    var res = JSON.parse(context.values[0]);
    log.debug('Reduce', context.values[0]);
    log.debug('Reduce all', context.value);

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
