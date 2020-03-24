/*******************************************************************
 *
 *
 * Name: DAL_MRS_AMZ_CONSOLIDATION_JOURNALS.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to move money from the consolidation account for each marketplace to the corresponding bank account
 * Script: DAL_MRS_AMZ_CONSOLIDATION_JOURNALS.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/format'], function(file, search, record, format) {

  function getInputData() {

    var transactionObj = createTransactionObject();
    return transactionObj;
  }

  function createTransactionObject() {
    var transactionObject = {};

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["account", "anyof", "1199", "1200", "1201", "1208", "1209", "1210", "1211", "1205", "1203", "1204"], "AND", ["custbody_rsm_rec_proc_daily", "is", "F"], "AND", ["type", "noneof", "Journal"]
      ],
      columns: ["trandate", "account", "account.custrecord_rsm_destination_account", "currency", "cseg1", "debitfxamount", "debitamount", "creditfxamount", "creditamount"],
    });

    var res = transactionSearchObj.run().getRange(0, 999);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));

    if (res != null && res != '') {
      transactionObject = populateTransactionObject(transactionObject, res);
    }
    return transactionObject;
  }

  function populateTransactionObject(tranObj, res) {

    for (var i = 0; i < res.length; i++) {

      var consolidationAccount = res[i].getValue('account');
      var tranDate = res[i].getValue('trandate');
      var tranDebitAmount = res[i].getValue('debitfxamount');
      var tranCreditAmount = res[i].getValue('creditfxamount');
      var destAccount = res[i].getValue({
        name: 'custrecord_rsm_destination_account',
        join: 'account'
      });

      if (tranObj[consolidationAccount] == null || tranObj[consolidationAccount] == '' || tranObj[consolidationAccount] == undefined) {
        tranObj[consolidationAccount] = {};
      }

      if (tranObj[consolidationAccount][tranDate] == null || tranObj[consolidationAccount][tranDate] == '' || tranObj[consolidationAccount][tranDate] == undefined) {
        tranObj[consolidationAccount][tranDate] = {
          'paymentids': [res[i].id],
          'destacct': destAccount,
          'currency': (res[i].getValue('currency')),
          'marketplace': (res[i].getValue('cseg1')),
          'debitamount': tranDebitAmount,
          'creditamount': tranCreditAmount
        };
      } else {
        var debitAmount = parseFloat(tranObj[consolidationAccount][tranDate].debitamount) + parseFloat(tranDebitAmount);
        tranObj[consolidationAccount][tranDate].debitamount = debitAmount;

        var creditAmount = parseFloat(tranObj[consolidationAccount][tranDate].creditamount) + parseFloat(tranCreditAmount);
        tranObj[consolidationAccount][tranDate].creditamount = creditAmount;

        var paymentIdArr = tranObj[consolidationAccount][tranDate].paymentids;
        paymentIdArr.push(res[i].id);
        tranObj[consolidationAccount][tranDate].paymentids = paymentIdArr;
      }
      log.debug('object', JSON.stringify(tranObj));
    }
    log.debug('Final object', JSON.stringify(tranObj));
    return tranObj;
  }

  function map(context) {
    var consolidationAccount = context.key;
    var journalInfo = JSON.parse(context.value);
    log.debug('result', journalInfo);

    for (var date in journalInfo) {
      if (journalInfo.hasOwnProperty(date)) {
        try {

          var journalId = createJournal(consolidationAccount, journalInfo[date], date);
          context.write(journalId, journalInfo[date].paymentids);
        } catch (e) {
          log.debug('Error', e.name + ' ' + e.message);
        }
      }
    }


  }

  function createJournal(consolidationAccount, journalInfo, journalDate) {

    var journalRec = record.create({
      type: 'journalentry',
      isDynamic: true
    });
    var date = format.parse({
      value: journalDate,
      type: format.Type.DATE
    });
    //set header data
    journalRec.setValue('currency', journalInfo.currency);
    journalRec.setValue('trandate', date);
    journalRec.setValue('cseg1', journalInfo.marketplace);
    journalRec.setValue('department', 4);
    journalRec.setValue('custbodyrsm_journal_type', 1);

    var consolidationAccountName = search.lookupFields({
      type: 'account',
      id: consolidationAccount,
      columns: ['name']
    }).name;
    var destinationaccttName = search.lookupFields({
      type: 'account',
      id: journalInfo.destacct,
      columns: ['name']
    }).name;
    var marketplaceName = search.lookupFields({
      type: 'customrecord_cseg1',
      id: journalInfo.marketplace,
      columns: ['name']
    }).name;
    journalRec.setValue('memo', ('Transfer from : ' + consolidationAccountName + ' to ' + destinationaccttName + ' for ' + marketplaceName));

    //set line data
    journalRec.selectNewLine('line');
    journalRec.setCurrentSublistValue('line', 'account', consolidationAccount);

    if ((journalInfo.debitamount) != null && (journalInfo.debitamount) != '') {
      journalRec.setCurrentSublistValue('line', 'debit', (journalInfo.debitamount).toFixed(2));
    } else {
      journalRec.setCurrentSublistValue('line', 'credit', (journalInfo.creditamount).toFixed(2));
    }
    journalRec.commitLine('line');

    journalRec.selectNewLine('line');
    journalRec.setCurrentSublistValue('line', 'account', journalInfo.destacct);

    if ((journalInfo.debitamount) != null && (journalInfo.debitamount) != '') {
      journalRec.setCurrentSublistValue('line', 'credit', (journalInfo.debitamount).toFixed(2));
    } else {
      journalRec.setCurrentSublistValue('line', 'debit', (journalInfo.creditamount).toFixed(2));
    }
    journalRec.commitLine('line');

    journalId = journalRec.save();
    return journalId;
  }

  function reduce(context) {
    var journalID = context.key;
    var results = JSON.stringify(context.values);
    var paymentIds = (results.replace(/[^0-9\,]/g, "")).split(",");

    for (var i = 0; i < paymentIds.length; i++) {
      var recordType = search.lookupFields({
        type: search.Type.TRANSACTION,
        id: paymentIds[i],
        columns: 'type'
      }).type[0].text;

      if (recordType == 'Payment') {
        record.submitFields({
          type: 'customerpayment',
          id: paymentIds[i],
          values: {
            custbody_rsm_rec_proc_daily: true,
            custbodyrsm_cus_pay_jour_entry: journalID
          }
        });
      } else {
        record.submitFields({
          type: 'customerrefund',
          id: paymentIds[i],
          values: {
            custbody_rsm_rec_proc_daily: true,
            custbodyrsm_cus_pay_jour_entry: journalID
          }
        });
      }
    }
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
  }

  // Link each entry point to the appropriate function.
  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  };
});
