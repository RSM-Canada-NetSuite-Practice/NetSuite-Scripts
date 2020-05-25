/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var salesorderSearchObj = search.create({
      type: "salesorder",
      filters: [
        ["type", "anyof", "SalesOrd"],
        "AND",
        ["applyinglinktype", "anyof", "ShipRcpt"],
        "AND",
        ["cogs", "is", "F"],
        "AND",
        ["shipping", "is", "F"],
        "AND",
        ["taxline", "is", "F"],
        "AND",
        ["custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_tran_type", "anyof", "1"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["max(formulanumeric: CASE WHEN max({custrecord_celigo_amzio_set_parent_tran.custrecord_celigo_amzio_set_posted_date}) <> max({applyingtransaction.trandate}) THEN 1 ELSE 0 END)", "equalto", "1"]
      ],
      columns: [
        search.createColumn({
          name: "trandate",
          summary: "GROUP",
          label: "Date"
        }),
        search.createColumn({
          name: "type",
          summary: "GROUP",
          label: "Type"
        }),
        search.createColumn({
          name: "tranid",
          summary: "GROUP",
          label: "Document Number"
        }),
        search.createColumn({
          name: "entity",
          summary: "GROUP",
          label: "Name"
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN",
          summary: "GROUP",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_order_id",
          join: "CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN",
          summary: "GROUP",
          label: "Order Id"
        }),
        search.createColumn({
          name: "custrecord_celigo_amzio_set_posted_date",
          join: "CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN",
          summary: "MAX",
          label: "Posted Date"
        }),
        search.createColumn({
          name: "internalid",
          join: "applyingTransaction",
          summary: "GROUP",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "tranid",
          join: "applyingTransaction",
          summary: "GROUP",
          label: "Document Number"
        }),
        search.createColumn({
          name: "trandate",
          join: "applyingTransaction",
          summary: "MAX",
          label: "Date"
        })
      ]
    });
    // var searchResultCount = salesorderSearchObj.runPaged().count;
    // log.debug("salesorderSearchObj result count",searchResultCount);
    // salesorderSearchObj.run().each(function(result){
    //    // .run().each has a limit of 4,000 results
    //    return true;
    // });
    var res = salesorderSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return salesorderSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);

    var res = JSON.parse(context.value);

    var fulfillmentID = res.values["GROUP(internalid.applyingTransaction)"].value;

    log.debug('Fulfillment internal id is: ', fulfillmentID);

    var fulfillmentDate = res.values["MAX(custrecord_celigo_amzio_set_posted_date.CUSTRECORD_CELIGO_AMZIO_SET_PARENT_TRAN)"];

    log.debug('New fulfillment date is: ', fulfillmentDate);

    var id = record.submitFields({
      type: 'itemfulfillment',
      id: fulfillmentID,
      values: {
        trandate: fulfillmentDate
      }
    });

    log.debug('Date successfully changed on fulfillment: ', id);

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
