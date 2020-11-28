/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var transactionSearchObj = search.create({
       type: "transaction",
       filters:
       [
          ["mainline","is","T"],
          "AND",
          ["applyingtransaction.type","anyof","FxReval"],
          "AND",
          ["applyingtransaction.cseg1","anyof","@NONE@"]
       ],
       columns:
       [
          search.createColumn({name: "trandate", label: "Date"}),
          search.createColumn({name: "type", label: "Type"}),
          search.createColumn({name: "tranid", label: "Document Number"}),
          search.createColumn({name: "createdfrom", label: "Created From"}),
          search.createColumn({name: "account", label: "Account"}),
          search.createColumn({name: "memo", label: "Memo"}),
          search.createColumn({name: "amount", label: "Amount"}),
          search.createColumn({
             name: "cseg1",
             sort: search.Sort.ASC,
             label: "Marketplace"
          }),
          search.createColumn({name: "applyingtransaction", label: "Applying Transaction"}),
          search.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"})
       ]
    });

    var res = transactionSearchObj.run().getRange(0, 999);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return transactionSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var tranid = res.values["GROUP(internalid)"].value;
    log.debug('Transaction internal id is: ', tranid);

    var trandate = res.values["MAX(formuladate)"];
    log.debug('New transaction date is: ', trandate);

    var trantype = res.values["GROUP(type)"].value;
    log.debug('The transaction type is: ', trantype);

    var id = record.submitFields({
      type: trantypemap[trantype],
      id: tranid,
      values: {
        trandate: trandate
      }
    });

    log.debug('Date successfully changed on transaction: ', id);

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
