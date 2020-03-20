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

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["account", "anyof", "1199", "1200", "1201", "1208", "1209", "1210", "1211", "1205", "1203", "1204"],
        "AND",
        ["custbody_rsm_rec_proc_daily", "is", "F"],
        "AND",
        ["type", "noneof", "Journal"]
      ],
      columns: [
        search.createColumn({
          name: "trandate",
          // summary: "GROUP",
          label: "Date"
        }),
        search.createColumn({
          name: "account",
          // summary: "GROUP",
          label: "Account"
        }),
        search.createColumn({
          name: "custrecord_rsm_destination_account",
          join: "account",
          // summary: "GROUP",
          label: "Destination Account"
        }),
        search.createColumn({
          name: "postingperiod",
          // summary: "GROUP",
          label: "Period"
        }),
        search.createColumn({
          name: "currency",
          // summary: "GROUP",
          label: "Currency"
        }),
        search.createColumn({
          name: "cseg1",
          // summary: "GROUP",
          label: "Marketplace"
        }),
        search.createColumn({
          name: "debitfxamount",
          // summary: "SUM",
          label: "Amount (Debit) FX"
        }),
        search.createColumn({
          name: "debitamount",
          // summary: "SUM",
          label: "Amount (Debit)"
        }),
        search.createColumn({
          name: "creditfxamount",
          // summary: "SUM",
          label: "Amount (Credit) FX"
        }),
        search.createColumn({
          name: "creditamount",
          // summary: "SUM",
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

    // var accountObject = {
    //   originalAccount: '',
    //   journalInfo: {
    //     paymentId: '',
    //     date: '',
    //     destinationAccount: '',
    //     currency: '',
    //     marketplace: '',
    //     amountDebit: '',
    //     amountCredit: '',
    //   }
    // };

    var accountObject = {};

    var res = transactionSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));

    if (res != null && res != '') {

      log.debug('res is Not Null. ', JSON.stringify(res));

      try {

        for (var i = 0; i < res.length; i++) {

          log.debug('For loop has been entered. ', JSON.stringify(res));

          var tempOrigAcct = res[i].getValue({
            name: 'account'
          });
          log.debug('Original account is: ', tempOrigAcct);

          var tempPaymentId = res[i].id;
          log.debug('Payment id is: ', tempPaymentId);

          var tempDate = res[i].getValue({
            name: 'trandate'
          });
          log.debug('Date is: ', tempDate);

          var tempDestAcct = res[i].getValue({
            name: 'custrecord_rsm_destination_account',
            join: 'account'
          });
          log.debug('Destination account is: ', tempDestAcct);

          var tempCurrency = res[i].getValue({
            name: 'currency'
          });
          log.debug('Currency is: ', tempCurrency);

          var tempMarketplace = res[i].getValue({
            name: 'cseg1'
          });
          log.debug('Marketplace is: ', tempMarketplace);

          var tempDebit = res[i].getValue({
            name: 'debitfxamount'
          });
          log.debug('Debit amount is: ', tempDebit);

          var tempCredit = res[i].getValue({
            name: 'creditfxamount'
          });
          log.debug('Credit amount is: ', tempCredit);

          if (accountObject[tempOrigAcct] == null || accountObject[tempOrigAcct] == '' || accountObject[tempOrigAcct] == undefined) {

            log.debug('Object account is null: ', JSON.stringify(accountObject[tempOrigAcct]));

            accountObject[tempOrigAcct] = {
              "date": {}
            };

            var temp = [];
            temp.push(tempPaymentId);

            accountObject[tempOrigAcct].date[tempDate].paymentid = temp;
            // accountObject[tempOrigAcct].date = tempDate;
            accountObject[tempOrigAcct].date[tempDate].destacct = tempDestAcct;
            accountObject[tempOrigAcct].date[tempDate].currency = tempCurrency;
            accountObject[tempOrigAcct].date[tempDate].marketplace = tempMarketplace;
            accountObject[tempOrigAcct].date[tempDate].debitamount = tempDebit;
            accountObject[tempOrigAcct].date[tempDate].creditamount = tempCredit;
            log.debug('New object has been created and looks like this: ', JSON.stringify(accountObject[tempOrigAcct]));

          } else {

            if (accountObject[tempOrigAcct].date == tempDate && accountObject[tempOrigAcct].currency == tempCurrency) {

              log.debug('Object account is not null: ', JSON.stringify(accountObject[tempOrigAcct]));

              var tempdebitamount = parseFloat(accountObject[tempOrigAcct].debitamount) + parseFloat(tempDebit);
              var tempcreditamount = parseFloat(accountObject[tempOrigAcct].creditamount) + parseFloat(tempCredit);

              accountObject[tempOrigAcct].debitamount = tempdebitamount;
              accountObject[tempOrigAcct].creditamount = tempcreditamount;

              var temp3 = accountObject[tempOrigAcct].paymentid;
              temp3.push(tempPaymentId);
              accountObject[tempOrigAcct].paymentid = temp3;
              log.debug('Object has summed up the debits & credits: ', JSON.stringify(accountObject[tempOrigAcct]));

            } else {

              log.debug('Object account is not null but date and currency do not match: ', JSON.stringify(accountObject[tempOrigAcct]));

              var temp2 = {};
              var key = tempDate;
              log.debug('Print key: ', key);

              accountObject[tempOrigAcct].date[tempDate].push({
                'paymentid': temp2,
                'date': tempDate,
                'destacct': tempDestAcct,
                'currency': tempCurrency,
                'marketplace': tempMarketplace,
                'debitamount': tempDebit,
                'creditamount': tempCredit
              });

              log.debug('Print temp2 key: ', JSON.stringify(temp2[key]));

              // temp2.push(tempPaymentId);

              // accountObject[tempOrigAcct].paymentid = temp2;
              // accountObject[tempOrigAcct].date = tempDate;
              // accountObject[tempOrigAcct].destacct = tempDestAcct;
              // accountObject[tempOrigAcct].currency = tempCurrency;
              // accountObject[tempOrigAcct].marketplace = tempMarketplace;
              // accountObject[tempOrigAcct].debitamount = tempDebit;
              // accountObject[tempOrigAcct].creditamount = tempCredit;
              log.debug('Object new date looks like this: ', JSON.stringify(accountObject[tempOrigAcct]));

            }
          }
        }
      } catch (e) {

        log.debug('Error reads: ', e.name + e.message);

      }
    }

    return accountObject;

  }

  function map(context) {

    log.debug('Map', context.value);
    log.debug('Key', context.key);

    //Pass consolidation account key
    var accountObjectID = context.key;
    var result = JSON.parse(context.value);
    log.debug('Map', result);

    var errors = [],
      jdate = '',
      jcurrency = '',
      jdestinationAccount = '',
      jmarketplace = '',
      jamountDebit = '',
      jamountCredit = '';

    //Create journal entry to move the amounts from the consolidation account to the bank accounts
    var journalObj = record.create({
      type: 'journalentry',
      isDynamic: true
    });

    //Loop through the accounts passed through
    for (var values in result) {

      log.debug('For loop has been entered.', result);

      if (values == 'date') {
        jdate = format.parse({
          value: result['date'],
          type: format.Type.DATE
        });
        log.debug('Date is: ', jdate);
      } else if (values == 'destacct') {
        jdestinationAccount = result['destacct'];
        log.debug('Destination account is: ', jdestinationAccount);
      } else if (values == 'currency') {
        jcurrency = result['currency'];
        log.debug('Currency is: ', jcurrency);
      } else if (values == 'marketplace') {
        jmarketplace = result['marketplace'];
        log.debug('Marketplace is: ', jmarketplace);
      } else if (values == 'debitamount') {
        jamountDebit = result['debitamount'];
        log.debug('Debit is: ', jamountDebit);
      } else if (values == 'creditamount') {
        jamountCredit = result['creditamount'];
        log.debug('Credit is: ', jamountCredit);
      }
    }
    try {

      log.debug('The Journal has been successfully created: ', journalObj);

      //Set journal header values
      journalObj.setValue({
        fieldId: 'currency',
        value: jcurrency
      });
      journalObj.setValue({
        fieldId: 'trandate',
        value: jdate
      });
      journalObj.setValue({
        fieldId: 'cseg1',
        value: jmarketplace
      });
      journalObj.setValue({
        fieldId: 'department',
        value: 4
      });
      journalObj.setValue({
        fieldId: 'custbodyrsm_journal_type',
        value: 1
      });

      var acctName = search.lookupFields({
        type: search.Type.ACCOUNT,
        id: accountObjectID,
        columns: ['name']
      });
      var destinationaccttName = search.lookupFields({
        type: search.Type.ACCOUNT,
        id: jdestinationAccount,
        columns: ['name']
      });
      var marketplaceName = search.lookupFields({
        type: 'customrecord_cseg1',
        id: jmarketplace,
        columns: ['name']
      });

      journalObj.setValue({
        fieldId: 'memo',
        value: ('Transfer from : ' + acctName.name + ' to ' + destinationaccttName.name + ' for ' + marketplaceName.name)
      });

      log.debug('Header fields have been set. ', journalObj);

      //Set journal original account and amounts
      journalObj.selectNewLine({
        sublistId: 'line',
      });

      journalObj.setCurrentSublistValue({
        sublistId: 'line',
        fieldId: 'account',
        value: accountObjectID
      });

      log.debug('The debit amount is: ', jamountDebit);
      log.debug('The credit amount is: ', jamountCredit);

      if (jamountDebit != null && jamountDebit != '') {
        journalObj.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'debit',
          value: jamountDebit
        });
      } else {
        journalObj.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'credit',
          value: jamountCredit

      });
    }

      journalObj.commitLine({
        sublistId: 'line'
      });

      log.debug('Line 1 has been set. ', journalObj);

      //Set journal destination account and amounts
      journalObj.selectNewLine({
        sublistId: 'line',
      });

      journalObj.setCurrentSublistValue({
        sublistId: 'line',
        fieldId: 'account',
        value: jdestinationAccount
      });

      if (jamountDebit != null && jamountDebit != '') {
        journalObj.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'credit',
          value: jamountDebit
        });
      } else {
        journalObj.setCurrentSublistValue({
          sublistId: 'line',
          fieldId: 'debit',
          value: jamountCredit

      });
    }

      journalObj.commitLine({
        sublistId: 'line'
      });

      log.debug('Line 2 has been set. ', journalObj);

      //Save the journal entry
      var journalID = journalObj.save();
      log.debug('The Journal has been successfully saved: ', journalID);
      context.write(journalID, result.paymentid);

    } catch (e) {
      log.debug('error', e.name + e.message);
      var temp = {
        'error': (e.name + ' ' + e.message)
      };
      errors.push(temp);
    }
  }

  function reduce(context) {

    //Pass consolidation account key
    var journalID = context.key;
    log.debug('Reduce key: ', context.key);
    var results = JSON.stringify(context.values);
    log.debug('Reduce values: ', results + " " + typeof results);

    try {

      var temppayment = results.replace(/[^0-9\,]/g, "");
      log.debug('Temp Payment ids 3 are: ', temppayment);
      var paymentids = temppayment.split(',');
      log.debug('Temp Payment ids 3 are: ', paymentids);

      for (var i = 0; i < paymentids.length; i++) {

        try {

          var temprecordtype = search.lookupFields({
            type: search.Type.TRANSACTION,
            id: paymentids[i],
            columns: 'type'
          });

          log.debug('The temp record type is: ', temprecordtype);

          var temprecordtype2 = temprecordtype.type[0].text;
          log.debug('The record type is: ', temprecordtype2);

          if (temprecordtype2 == 'Payment') {
            record.submitFields({
              type: 'customerpayment',
              id: paymentids[i],
              values: {
                custbody_rsm_rec_proc_daily: true,
                custbodyrsm_cus_pay_jour_entry: journalID
              }
            });
          } else if (temprecordtype2 == 'Customer Refund') {
            record.submitFields({
              type: 'customerrefund',
              id: paymentids[i],
              values: {
                custbody_rsm_rec_proc_daily: true,
                custbodyrsm_cus_pay_jour_entry: journalID
              }
            });
          }
        } catch (e) {
          log.debug('error', e.name + e.message);
          var temp2 = {
            'error': (e.name + ' ' + e.message)
          };
        }
      }
    } catch (e) {
      log.debug('error', e.name + e.message);
      var temp = {
        'error': (e.name + ' ' + e.message)
      };
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
