/*******************************************************************
 *
 *
 * Name: DAL_MRS_UPDATE_CREDIT_MEMO_QTY.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to update the Credit Memo quantities with the invoice quantities
 * Script: DAL_MRS_UPDATE_CREDIT_MEMO_QTY.js
 * Deploy: DAL_MRS_UPDATE_CREDIT_MEMO_QTY.js
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var creditmemoSearchObj = search.create({
      type: "creditmemo",
      filters: [
        ["type", "anyof", "CustCred"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["account", "anyof", "434"],
        "AND",
        ["custbody_celigo_etail_channel", "anyof", "101"],
        "AND",
        ["quantity", "equalto", "0"]
      ],
      columns: [
        search.createColumn({
          name: "trandate",
          label: "Date"
        }),
        search.createColumn({
          name: "postingperiod",
          label: "Period"
        }),
        search.createColumn({
          name: "type",
          label: "Type"
        }),
        search.createColumn({
          name: "tranid",
          label: "Document Number"
        }),
        search.createColumn({
          name: "entity",
          label: "Name"
        }),
        search.createColumn({
          name: "item",
          label: "Item"
        }),
        search.createColumn({
          name: "quantity",
          label: "Quantity"
        }),
        search.createColumn({
          name: "account",
          label: "Account"
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
          name: "line",
          label: "Line ID"
        }),
        search.createColumn({
          name: "lineuniquekey",
          label: "Line Unique Key"
        }),
        search.createColumn({
          name: "linesequencenumber",
          label: "Line Sequence Number"
        }),
        search.createColumn({
          name: "line",
          join: "createdFrom",
          label: "Invoice Line ID"
        }),
        search.createColumn({
          name: "lineuniquekey",
          join: "createdFrom",
          label: "Invoice Line Unique Key"
        }),
        search.createColumn({
          name: "linesequencenumber",
          join: "createdFrom",
          label: "Invoice Line Sequence Number"
        }),
        search.createColumn({
          name: "internalid",
          join: "createdFrom",
          label: "Invoice Internal ID"
        })
      ]
    });
    // var searchResultCount = creditmemoSearchObj.runPaged().count;
    // log.debug("creditmemoSearchObj result count",searchResultCount);
    // creditmemoSearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });

    var res = creditmemoSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return creditmemoSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.id;
    var lineid = res.values.linesequencenumber;
    var invoiceid = res.values['internalid.createdFrom'].value;

    log.debug('The transaction informations are: ', tranid + " " + lineid + " " + invoiceid);

    try {

      var invoiceSearchObj = search.create({
        type: "invoice",
        filters: [
          ["type", "anyof", "CustInvc"],
          "AND",
          ["internalidnumber", "anyof", invoiceid],
          "AND",
          ["cogs", "is", "F"],
          "AND",
          ["taxline", "is", "F"],
          "AND",
          ["shipping", "is", "F"],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["linesequencenumber", "equalto", lineid]
        ],
        columns: [
          search.createColumn({
            name: "trandate",
            label: "Date"
          }),
          search.createColumn({
            name: "postingperiod",
            label: "Period"
          }),
          search.createColumn({
            name: "type",
            label: "Type"
          }),
          search.createColumn({
            name: "tranid",
            label: "Document Number"
          }),
          search.createColumn({
            name: "entity",
            label: "Name"
          }),
          search.createColumn({
            name: "item",
            label: "Item"
          }),
          search.createColumn({
            name: "quantity",
            label: "Quantity"
          }),
          search.createColumn({
            name: "account",
            label: "Account"
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
            name: "lineuniquekey",
            label: "Line Unique Key"
          }),
          search.createColumn({
            name: "line",
            label: "Line ID"
          }),
          search.createColumn({
            name: "linesequencenumber",
            label: "Line Sequence Number"
          })
        ]
      });

      var searchResultCount = invoiceSearchObj.run().getRange({
        start: 0,
        end: 10
      });
      log.debug('The search result is: ', searchResultCount);

      invoiceqty = searchResultCount[0].values.quantity;
      log.debug('The new credit memo quantity is: ', invoiceqty);

      var credit_memo = record.load({
        type: 'creditmemo',
        id: tranid,
        isDynamic: true
      });

      var linenumber = credit_memo.findSublistLineWithValue({
        sublistId: 'item',
        fieldId: 'linesequencenumber',
        value: lineid
      });

      var templine = credit_memo.selectLine({
        sublistId: 'item',
        line: linenumber
      });
      log.debug('Setting line: ', lineid);

      var tempsublistvalue = credit_memo.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: invoiceqty,
      });
      log.debug('Set sublist value: ', tempsublistvalue);

      credit_memo.commitLine({
        sublistId: 'item'
      });

      credit_memo.save();
      log.debug('The record has been saved', credit_memo);

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

    }

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
