/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var searchObj = search.load({
      id: 'customsearch1571'
    });
    return searchObj;
  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var missingtranid = res.values["GROUP(internalid)"].value;
    log.debug('missingtranid', missingtranid);
    var trantype = res.values["GROUP(custrecord_celigo_shpf_payout_tran_type)"];
    log.debug('trantype', trantype);
    var depositdate = res.values["GROUP(trandate.CUSTRECORD_CELIGO_SHPF_TRANS_DEPOSIT_ID)"];
    log.debug('depositdate', depositdate);
    var tranetailid = res.values["GROUP(custrecord_celigo_shpf_tran_src_ordr_id)"];
    log.debug('tranetailid', tranetailid);
    var depositid = res.values["GROUP(internalid.CUSTRECORD_CELIGO_SHPF_TRANS_DEPOSIT_ID)"].value;
    log.debug('depositid', depositid);

    if (trantype == 'charge') {
      searchtrantype = 'cashsale';
    } else if (trantype == 'refund') {
      searchtrantype = 'cashrefund';
    }
    log.debug('searchtrantype', searchtrantype);

    var tranid = getTransaction(searchtrantype, tranetailid);
    log.debug('tranid', tranid);

    var trandata = search.lookupFields({
      type: searchtrantype,
      id: tranid,
      columns: ['trandate', 'amount']
    });
    log.debug('trandata', trandata);

    if (trandata.trandate > depositdate) {

      record.submitFields({
        type: searchtrantype,
        id: tranid,
        values: {
          trandate: depositdate
        }
      });
      log.debug('Date updated', 'New transaction date is: ' + depositdate);

    }

    var deposit = record.load({
      type: 'deposit',
      id: depositid
    });
    log.debug('Deposit loaded');

    var depositlinecount = deposit.getLineCount({
      sublistId: 'payment'
    });
    log.debug('depositlinecount', depositlinecount);

    for (var i = 1; i <= depositlinecount; i++) {

      var sublistid = deposit.getSublistValue({
        sublistId: 'payment',
        fieldId: 'id',
        line: i
      });
      // log.debug('sublistid', sublistid);

      var sublistdate = deposit.getSublistValue({
        sublistId: 'payment',
        fieldId: 'docdate',
        line: i
      });
      // log.debug('sublistdate', sublistdate);

      var sublistcheck = deposit.getSublistValue({
        sublistId: 'payment',
        fieldId: 'deposit',
        line: i
      });
      // log.debug('sublistcheck',sublistcheck);

      if (sublistid == tranid) {
        deposit.setSublistValue({
          sublistId: 'payment',
          fieldId: 'deposit',
          line: i,
          value: true
        });
        log.debug('Deposit line set true', i);
      } else if (sublistdate > depositdate) {
        deposit.setSublistValue({
          sublistId: 'payment',
          fieldId: 'deposit',
          line: i,
          value: false
        });
        log.debug('Deposit line set false', i);
      }
    }

    // One the transaction has been assigned to the deposit, delete the missing transaction
    // record.delete({
    //   type: 'customrecord_celigo_shpf_payout_var_tran',
    //   id: missingtranid
    // });
    // log.debug('payout variance transaction deleted');

    var cashbackdepositlinecount = deposit.getLineCount({
      sublistId: 'cashback'
    });
    log.debug('cashbackdepositlinecount', cashbackdepositlinecount);
    var otherdepositlinecount = deposit.getLineCount({
      sublistId: 'other'
    });
    log.debug('otherdepositlinecount', otherdepositlinecount);

    var newdepositvariance = getDepositVariance(depositid);
    log.debug('newdepositvariance', newdepositvariance);

    var cashbackdeposit = (-1 * parseFloat(newdepositvariance)).toFixed(2);
    log.debug('cashbackdeposit', cashbackdeposit);

    if (newdepositvariance < 0) {

      for (var j = 0; j < cashbackdepositlinecount; j++) {

        var cashbackaccount = deposit.getSublistValue({
          sublistId: 'cashback',
          fieldId: 'account',
          line: j
        });
        log.debug('cashbackaccount', cashbackaccount);

        if (cashbackaccount == 1258) {
          deposit.setSublistValue({
            sublistId: 'cashback',
            fieldId: 'amount',
            line: j,
            value: cashbackdeposit
          });
          log.debug('New deposit variance set: ', cashbackdeposit);
          return true;
        } else if (j == cashbackdepositlinecount && cashbackaccount != 1258) {
          deposit.selectNewLine({
            sublistId: 'cashback'
          }).setCurrentSublistValue({
            sublistId: 'cashback',
            fieldId: 'amount',
            value: cashbackdeposit
          }).setCurrentSublistValue({
            sublistId: 'cashback',
            fieldId: 'account',
            value: 1258
          }).setCurrentSublistValue({
            sublistId: 'cashback',
            fieldId: 'memo',
            value: 'Variance Amount'
          }).commitLine({
            sublistId: 'cashback'
          });
          log.debug('New deposit variance set: ', cashbackdeposit);
        }
      }
    } else if (newdepositvariance > 0) {

      for (var k = 0; k < otherdepositlinecount; k++) {

        var otheraccount = deposit.getSublistValue({
          sublistId: 'other',
          fieldId: 'account',
          line: k
        });
        log.debug('otheraccount', otheraccount);

        if (otheraccount == 1258) {
          deposit.setSublistValue({
            sublistId: 'other',
            fieldId: 'amount',
            line: k,
            value: newdepositvariance
          });
          log.debug('New deposit variance set: ', newdepositvariance);
        } else if (k == otherdepositlinecount && otheraccount != 1258) {
          deposit.selectNewLine({
            sublistId: 'other'
          }).setCurrentSublistValue({
            sublistId: 'other',
            fieldId: 'amount',
            value: newdepositvariance
          }).setCurrentSublistValue({
            sublistId: 'other',
            fieldId: 'account',
            value: 1258
          }).setCurrentSublistValue({
            sublistId: 'other',
            fieldId: 'memo',
            value: 'Variance Amount'
          }).commitLine({
            sublistId: 'other'
          });
          log.debug('New deposit variance set: ', newdepositvariance);
        }
      }
    }

    var tempdepid = deposit.save();
    log.debug('tempdepid',tempdepid);

    function getDepositVariance(varianceid) {
      var num_amount = 0;

      var customrecord_celigo_shpf_payout_var_tranSearchObj = search.create({
        type: "customrecord_celigo_shpf_payout_var_tran",
        filters: [
          ["custrecord_celigo_shpf_trans_deposit_id", "anyof", varianceid]
        ],
        columns: [
          search.createColumn({
            name: "custrecord_celigo_shpf_trans_var_amnt",
            label: "Variance Amount"
          })
        ]
      });

      var searchResultCount = customrecord_celigo_shpf_payout_var_tranSearchObj.runPaged().count;
      log.debug("transactionSearchObj result count", searchResultCount);

      customrecord_celigo_shpf_payout_var_tranSearchObj.run().each(function(result) {
        num_amount += parseFloat(result.getValue({
          name: 'custrecord_celigo_shpf_trans_var_amnt',
        }));
        log.debug('The amount of the current account balance is: ', num_amount);
        return true;
      });

      return num_amount;
    }

    function getTransaction(transactiontype, transactionid) {
      if (transactiontype == 'cashsale') {
        searchfilter = 'CashSale';
      } else if (transactiontype == 'cashrefund') {
        searchfilter = 'CashRfnd';
      }
      log.debug('searchfilter', searchfilter);

      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [
          ["custbody_celigo_etail_order_id", "contains", transactionid],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", searchfilter]
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            label: "Internal ID"
          })
        ]
      });

      var tempsearchresults = transactionSearchObj.run().getRange(0, 1);
      var temptranid = tempsearchresults[0].id;
      log.debug('temptranid', temptranid);

      return temptranid;

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
