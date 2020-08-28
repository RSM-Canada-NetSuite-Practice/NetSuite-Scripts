/*******************************************************************
 *
 *
 * Name: DAL_MRS_UPDATE_CASH_REFUND_QTY_AMOUNT.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to update the Credit Memo quantities with the invoice quantities
 * Script: DAL_MRS_UPDATE_CASH_REFUND_QTY_AMOUNT.js
 * Deploy: DAL_MRS_UPDATE_CASH_REFUND_QTY_AMOUNT.js
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var cashrefundSearchObj = search.create({
      type: "cashrefund",
      filters: [
        ["type", "anyof", "CashRfnd"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["shipping", "is", "F"],
        "AND",
        ["cogs", "is", "F"],
        "AND",
        ["item", "anyof", "636"],
        "AND",
        ["formulanumeric: CASE WHEN ({createdfrom.amount}*0.5) <= ({amount}*-1) THEN 1 ELSE 0 END", "equalto", "1"],
        "AND",
        ["numbertext", "contains", "CR901"]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "line",
          label: "Line ID"
        }),
        search.createColumn({
          name: "saleseffectivedate",
          sort: search.Sort.ASC,
          label: "Sales Effective Date"
        }),
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
          name: "accountmain",
          label: "Account (Main)"
        }),
        search.createColumn({
          name: "amount",
          label: "Refund Amount"
        }),
        search.createColumn({
          name: "item",
          label: "Item"
        }),
        search.createColumn({
          name: "amount",
          join: "createdFrom",
          label: "Amount"
        }),
        search.createColumn({
          name: "internalid",
          join: "createdFrom",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "line",
          join: "createdFrom",
          label: "Line ID"
        }),
        search.createColumn({
          name: "linesequencenumber",
          join: "createdFrom",
          label: "Line Sequence Number"
        }),
        search.createColumn({
          name: "item",
          join: "createdFrom",
          label: "Item"
        })
      ]
    });
    // var searchResultCount = cashrefundSearchObj.runPaged().count;
    // log.debug("cashrefundSearchObj result count",searchResultCount);
    // cashrefundSearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });

    var res = cashrefundSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return cashrefundSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.id;
    var tranamount = res.values.amount * -1;
    var cashsaleid = res.values['internalid.createdFrom'].value;

    log.debug('The transaction informations are: ', tranid + " " + tranamount + " " + invoiceid);

    try {

      var cashsale = record.load({
        type: 'cashsale',
        id: cashsaleid,
        isDynamic: true
      });

      log.debug('The Cash Sale has been successfully loaded: ', cashsaleid);

      var cashsalelinecount = caashsale.getLineCount({
        sublistId: 'item'
      });

      log.debug('The Cash Sale line count is: ', cashsalelinecount);

      var cashsaletran = {};

      for (var i = 0; i < cashsalelinecount; i++) {

        cashsaleid.selectLine({
          sublistId: 'item',
          line: i
        });

        log.debug('Looping on line: ', i);

        cashsaletran[i] = {
          'sku': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item'
          }),
          'qty': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity'
          }),
          'orderid': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_celigo_etail_order_line_id'
          }),
          'amount': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'amount'
          }),
          'taxcode': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'taxcode'
          }),
          'taxrate': cashsaletran.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'taxrate1'
          }),
        };
      }

      log.debug('The Cash Sale Item is: ', JSON.stringify(cashsaletran[i]));
      log.debug('The Cash Sale SKU is: ', JSON.stringify(cashsaletran[i].sku));
      log.debug('The Cash Sale Tax Code is: ', JSON.stringify(cashsaletran[i].taxcode));

      log.debug('The new cash refund quantity is: ', JSON.stringify(cashsaletran[i].qty));

      var cash_refund = record.load({
        type: 'cashrefund',
        id: tranid,
        isDynamic: true
      });
      log.debug('Record has been loaded: ', cash_refund);

      var cashrefundlinecount = cash_refund.getLineCount({
        sublistId: 'item'
      });

      log.debug('The Cash Refund line count is: ', cashrefundlinecount);

      for (var j = 0; j < cashrefundlinecount; j++) {

        cash_refund.removeLine({
          sublistId: 'item',
          line: j
        });

        log.debug('Looping on line: ', j);

      }

      for (var k = 0; k < cashrefundlinecount; k++) {

        var linenumber = cash_refund.selectNewLine({
          sublistId: 'item'
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: cashsaletran[k].sku
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: cashsaletran[k].qty
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_celigo_etail_order_line_id',
          value: cashsaletran[k].orderid
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'amount',
          value: cashsaletran[k].amount
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'taxcode',
          value: cashsaletran[k].taxcode
        });
        cash_refund.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'taxrate1',
          value: cashsaletran[k].taxrate1
        });
        cash_refund.commitLine({
          sublistId: 'item'
        });

      }

      var newcashrefundamount = cash_refund.getValue({
        fieldId: 'amount'
      });
      var adjustmentamount = tranamonut - (newcashrefundamount * -1);

      var linenumberadjustment = cash_refund.selectNewLine({
        sublistId: 'item'
      });

      cash_refund.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: 1602
      });

      cash_refund.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 1
      });

      cash_refund.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'amount',
        value: linenumberadjustment
      });

      cash_refund.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'taxcode',
        value: cashsaletran[i].taxcode
      });

      cash_refund.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'taxrate1',
        value: cashsaletran[i].taxrate1
      });

      cash_refund.commitLine({
        sublistId: 'item'
      });

      cash_refund.save();
      log.debug('The record has been saved', cash_refund);

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
