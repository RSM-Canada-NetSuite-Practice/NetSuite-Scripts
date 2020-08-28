/*******************************************************************
 *
 *
 * Name: JAM3_MRS_REV_PLAN_SOURCE_CUS.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to keep the source customer updated on rev plans
 * Script: JAM3_MRS_REV_PLAN_SOURCE_CUS.js
 * Deploy:
 *
 *
 * ******************************************************************* */
define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var revenueplanSearchObj = search.create({
      type: "revenueplan",
      filters: [
        ["custrecordrsm_rev_plan_soure_client", "anyof", "@NONE@"],
        "OR",
        ["custrecordrsm_rev_plan_cons_fore", "anyof", "@NONE@"],
        "OR",
        ["custrecordrev_plan_exec_producer", "anyof", "@NONE@"],
      ],
      columns: [
        search.createColumn({
          name: "custrecordrsm_rev_plan_soure_client",
          label: "Source Client"
        }),
        search.createColumn({
          name: "recordnumber",
          sort: search.Sort.ASC,
          label: "Number"
        }),
        search.createColumn({
          name: "amount",
          label: "Amount"
        }),
        search.createColumn({
          name: "item",
          label: "Item"
        }),
        search.createColumn({
          name: "exchangerate",
          label: "Exchange Rate"
        }),
        search.createColumn({
          name: "lineexchangerate",
          label: "Line Exchange Rate"
        }),
        search.createColumn({
          name: "status",
          label: "Status"
        }),
        search.createColumn({
          name: "custrecordrsm_rev_plan_cons_fore",
          label: "Consolidation Forecast Record"
        }),
        search.createColumn({
          name: "revenuearrangement",
          join: "revenueElement",
          label: "Revenue Arrangement"
        }),
        search.createColumn({
          name: "custentity_jam3_exec_producer",
          join: "customer",
          label: "Executive Producer"
        }),
      ]
    });
    // var searchResultCount = revenueplanSearchObj.runPaged().count;
    // log.debug("revenueplanSearchObj result count", searchResultCount);
    // revenueplanSearchObj.run().each(function(result) {
    //   // .run().each has a limit of 4,000 results
    //   return true;
    // });

    var res = revenueplanSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return revenueplanSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);
    var res = JSON.parse(context.value);

    var revplanid = res.id;
    log.debug('The revenue recognition plan id is: ', revplanid);
    var revenuearrangement = res.values['revenuearrangement.revenueElement'];
    var revarrangementnumber = (revenuearrangement.replace(/[^0-9\,]/g, ""));
    log.debug('The revenue arrangement id is: ', revarrangementnumber);
    var clientexecproducer = res.values['custentity_jam3_exec_producer.customer'].value;
    log.debug('The executive producer is: ', clientexecproducer);

    var revenuearrangementSearchObj = search.create({
      type: "revenuearrangement",
      filters: [
        ["type", "anyof", "RevArrng"],
        "AND",
        ["numbertext", "is", revarrangementnumber],
        "AND",
        ["mainline", "is", "T"]
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        }),
        search.createColumn({
          name: "tranid",
          label: "Document Number"
        }),
        search.createColumn({
          name: "entityid",
          join: "customerMain",
          label: "Name"
        }),
        search.createColumn({
          name: "internalid",
          join: "customerMain",
          label: "Internal ID"
        })
      ]
    });

    var searchResultCount = revenuearrangementSearchObj.run().getRange({
      start: 0,
      end: 10
    });

    var revarrangementid = searchResultCount[0].id;
    log.debug('The revenue arrangement internal id is: ', revarrangementid);

    var revarrangementclientid = searchResultCount[0].getValue({
      name: 'internalid',
      join: 'customerMain'
    });
    log.debug('The client internal id is: ', revarrangementclientid);

    var sourceclient = search.lookupFields({
      type: 'revenueplan',
      id: revplanid,
      columns: 'custrecordrsm_rev_plan_soure_client'
    }).values;
    log.debug('The current revenue recognition plan source client is: ', sourceclient);

    try {

      if (sourceclient == null || sourceclient == '' || sourceclient != revarrangementclientid) {
        var revplanObj = record.load({
          type: 'revenueplan',
          id: revplanid,
          isDynamic: true
        });
        revplanObj.setValue({
          fieldId: 'custrecordrsm_rev_plan_soure_client',
          value: revarrangementclientid
        });
        revplanObj.setValue({fieldId:'custrecordrev_plan_exec_producer',value:clientexecproducer});

        log.debug('The source client and executive producer has been set on record: ', revplanObj);

        var tempfore = revplanObj.getValue({
          fieldId: 'custrecordrsm_rev_plan_cons_fore'
        });

        if (tempfore == null || tempfore == '') {
          var tempcusrecord = record.create({
            type: 'customrecordrsm_cons_rev_forecast',
            isDynamic: true
          });
          tempcusrecord.setValue({
            fieldId: 'custrecordrsm_cons_fore_client',
            value: revarrangementclientid
          });
          tempcusrecord.setValue({
            fieldId: 'custrecordcons_fore_rev_plan',
            value: revplanid
          });
          tempcusrecord.setValue({
            fieldId: 'custrecordrsm_cons_fore_trans_type',
            value: 2,
          });
          log.debug('The custom record has been created: ', tempcusrecord);
          var tempcusrecordid = tempcusrecord.save();
          revplanObj.setValue({
            fieldId: 'custrecordrsm_rev_plan_cons_fore',
            value: tempcusrecordid
          });
          log.debug('The custom record has been saved with id: ', tempcusrecordid);
        }
        revplanObj.save();
      }
    } catch (e) {
      log.debug('Error', e.name + ' ' + e.message);
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
