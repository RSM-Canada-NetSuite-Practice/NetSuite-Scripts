/*******************************************************************
 *
 *
 * Name: JAM3_MRS_OPP_FORECASE_SOURCE_CUS.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to create the consolidation custom records for opportunity forecast records
 * Script: JAM3_MRS_OPP_FORECASE_SOURCE_CUS.js
 * Deploy:
 *
 *
 * ******************************************************************* */
define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {

  function getInputData() {

    var customrecord_opp_anticipated_revSearchObj = search.create({
      type: "customrecord_opp_anticipated_rev",
      filters: [
        ["custrecordrsm_opp_rev_fore_cons_fore", "anyof", "@NONE@"],
        "OR",
        ["custrecordrsm_opp_rev_fore_cons_fore.custrecordrsm_cons_fore_trans_type", "anyof", "@NONE@"]
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

    var res = customrecord_opp_anticipated_revSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecord_opp_anticipated_revSearchObj;

  }

  function map(context) {

    log.debug('Map', context.value);
    var res = JSON.parse(context.value);

    var oppforecastid = res.id;
    log.debug('The opportunity forecast plan id is: ', oppforecastid);
    var oppforecastclient = res.values['entity.CUSTRECORD_OPPORTUNITY'].value;
    log.debug('The opportunity forecast client is: ', oppforecastclient);
    var oppconsrecordid = res.values.custrecordrsm_opp_rev_fore_cons_fore.value;
    log.debug('The consolidation record id is: ', oppconsrecordid);

    try {

      var tempfore = search.lookupFields({
        type: 'customrecord_opp_anticipated_rev',
        id: oppforecastid,
        columns: 'custrecordrsm_opp_rev_fore_cons_fore'
      });
      // var temptrantype = search.lookupFields({
      //   type: 'customrecordrsm_cons_rev_forecast',
      //   id: oppconsrecordid,
      //   columns: 'custrecordrsm_cons_fore_trans_type'
      // });

      log.debug('The opportunity forecast field is: ', tempfore.custrecordrsm_opp_rev_fore_cons_fore);
      // log.debug('The consolidation transaction type is: ', temptrantype);

      if (tempfore.custrecordrsm_opp_rev_fore_cons_fore == null || tempfore.custrecordrsm_opp_rev_fore_cons_fore == '') {
        var tempcusrecord = record.create({
          type: 'customrecordrsm_cons_rev_forecast',
          isDynamic: true
        });
        log.debug('The consolidation record has been created: ', tempcusrecord);

        tempcusrecord.setValue({
          fieldId: 'custrecordrsm_cons_fore_client',
          value: oppforecastclient
        });
        tempcusrecord.setValue({
          fieldId: 'custrecordrsm_cons_fore_opp_fore',
          value: oppforecastid
        });
        tempcusrecord.setValue({
          fieldId: 'custrecordrsm_cons_fore_trans_type',
          value: 1,
        });
        log.debug('The custom record has been created with the following values: ', tempcusrecord);
        var tempcusrecordid = tempcusrecord.save();
        var tempOppForecastRecord = record.load({
          type: 'customrecord_opp_anticipated_rev',
          id: oppforecastid,
          isDynamic: true
        });
        tempOppForecastRecord.setValue({
          fieldId: 'custrecordrsm_opp_rev_fore_cons_fore',
          value: tempcusrecordid
        });
        var id2 = tempOppForecastRecord.save();
        log.debug('The custom record has been saved with id: ', id2);
      }
      // else if (temptrantype.custrecordrsm_cons_fore_trans_type == null || temptrantype.custrecordrsm_cons_fore_trans_type == '') {
      //   var tempconsrecord = record.load({
      //     type: 'customrecordrsm_cons_rev_forecast',
      //     id: oppconsrecordid,
      //     isDynamic: true
      //   });
      //   tempconsrecord.setValue({
      //     fieldId: 'custrecordrsm_cons_fore_trans_type',
      //     value: 1,
      //   });
      //   var id3 = tempconsrecord.save();
      //   log.debug('The custom record has been saved with id: ', id3);
      // }

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
