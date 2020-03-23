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

    var customrecord_opp_anticipated_revSearchObj = search.create({
      type: "customrecord_opp_anticipated_rev",
      filters: [
        ["custrecordrsm_opp_rev_fore_cons_fore", "anyof", "@NONE@"]
      ],
      columns: [
        search.createColumn({
          name: "custrecord_opportunity",
          label: "Opportunity"
        }),
        search.createColumn({
          name: "custrecordrsm_opp_rev_for_period_start",
          label: "Period Start Date"
        }),
        search.createColumn({
          name: "custrecord_period",
          label: "Period"
        }),
        search.createColumn({
          name: "custrecord_percent_anticipated_rev",
          label: "Revenue Percent Forecast"
        }),
        search.createColumn({
          name: "custrecord3",
          label: "Opportunity Currency"
        }),
        search.createColumn({
          name: "custrecord1",
          label: "Opportunity Exchange Rate"
        }),
        search.createColumn({
          name: "custrecord2",
          label: "Opportunity Amount (CAD)"
        }),
        search.createColumn({
          name: "custrecord5",
          label: "Opportunity Probability"
        }),
        search.createColumn({
          name: "custrecordrsm_opp_rev_fore_cons_fore",
          label: "Consolidation Forecast Record"
        }),
        search.createColumn({
          name: "entity",
          join: "CUSTRECORD_OPPORTUNITY",
          label: "Client"
        })
      ]
    });
    // var searchResultCount = customrecord_opp_anticipated_revSearchObj.runPaged().count;
    // log.debug("customrecord_opp_anticipated_revSearchObj result count", searchResultCount);
    // customrecord_opp_anticipated_revSearchObj.run().each(function(result) {
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

    var oppforecastid = res.id;
    log.debug('The opportunity forecast plan id is: ', oppforecastid);
    var oppforecastclient = res.values['custrecord_opportunity.entity'];
    log.debug('The opportunity forecast client is: ', oppforecastclient);
    var revarrangementnumber = (revenuearrangement.replace(/[^0-9\,]/g, ""));
    log.debug('The revenue arrangement id is: ', revarrangementnumber);

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

        log.debug('The source client has been set on record: ', revplanObj);

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
