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

      //Create the account object
      var accountObject = {
        date: '',
        //  account : '',
        destinationAccount: '',
        currency: '',
        marketplace: '',
        amountDebit: '',
        amountCredit: '',
      };

      //Create JSON object out of the context passed through
      var res = JSON.parse(context.value);
      var accountObjectID = res.values['GROUP(account)'].value;
      log.debug('The Account Object ID is: ', accountObjectID);

      accountObject.date = res.values['GROUP(trandate)'];
      //accountObject.account = res.values.account.value;
      accountObject.destinationAccount = res.values['GROUP(custrecord_rsm_destination_account.account)'].value;
      accountObject.currency = res.values['GROUP(currency)'].value;
      accountObject.marketplace = res.values['GROUP(cseg1)'].value;
      accountObject.amountDebit = res.values['SUM(debitfxamount)'];
      accountObject.amountCredit = res.values['SUM(creditfxamount)'];

      log.debug('The Account Object is: ', JSON.stringify(accountObject));

      //Pass through to the reduce stage the account ID and the account object
      context.write({
        key: accountObjectID,
        value: accountObject
      });

    }

    function reduce(context) {

      //Pass consolidation account key
      var accountObjectID = context.key;
      var results = context.values;
      log.debug('Reduce', results);

      var errors = [];

      //Loop through the accounts passed through
      for (var i = 0; i < results.length; i++) {
        var res = JSON.parse(results[i]);

        log.debug('For loop has been entered.', res);

        try {

          var jdate = format.parse({
            value: res['date'],
            type: format.Type.DATE
          });
          log.debug('Date is: ', jdate);

          var jdestinationAccount = res['destinationAccount'];
          log.debug('Destination account is: ', jdestinationAccount);

          var jcurrency = res['currency'];
          log.debug('Currency is: ', jcurrency);

          var jmarketplace = res['marketplace'];
          log.debug('Marketplace is: ', jmarketplace);

          var jamountDebit = res['amountDebit'];
          log.debug('Debit is: ', jamountDebit);

          var jamountCredit = res['amountCredit'];
          log.debug('Credit is: ', jamountCredit);

          //Create journal entry to move the amounts from the consolidation account to the bank accounts
          var journalObj = record.create({
            type: 'journalentry',
            isDynamic: true
          });

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
             fieldId: 'memo',
             value: ('Transfer for :' + jdate + 'to ' + jdestinationAccount)
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

          journalObj.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'credit',
            value: jamountDebit
          });

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

          journalObj.setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'debit',
            value: jamountDebit
          });

          journalObj.commitLine({
            sublistId: 'line'
          });

          log.debug('Line 2 has been set. ', journalObj);

          //Save the journal entry
          var journalID = journalObj.save();
          log.debug('The Journal has been successfully saved: ', journalID);

        } catch (e) {
          log.debug('error', e.name + e.message);
          var temp = {
            'error': (e.name + ' ' + e.message)
          };
          errors.push(temp);
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
