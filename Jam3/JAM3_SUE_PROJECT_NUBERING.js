/**
 * This script sets the project ID on Jam3 project records
 * Author : Nicolas Bean (Houseblend.io)
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record', 'N/log'], function(currentRecord, record, log) {

  var projectnumbering = {
    32: 2,
    27: 0,
    5: 1,
    29: 1,
    31: 1,
    3: 1,
    33: 1,
    34: 1,
    36: 1
  };

  var projectvalidation = {
    32: 3,
    27: 1,
    5: 2,
    29: 2,
    31: 2,
    3: 2,
    33: 2,
    34: 2,
    36: 2
  };

  function saveRecord(context) {

    log.debug({
      title: 'saveRecord initiated'
    });

    var recCurrent = currentRecord.get();
    log.debug('recCurrent has been set ' + recCurrent);

    var id = recCurrent.getValue({
      fieldId: 'entityid'
    });

    var projectstatus = recCurrent.getValue({fieldId:'entitystatus'});
    log.debug('The project status is: ', projectstatus);

    tempid = id.substring(0,1);
    log.debug('The tempid is: ', tempid);

    if (projectvalidation[projectstatus] != tempid) {

      var jobSearchObj = search.create({
        type: "job",
        filters: [
          [
            ["status", "anyof", "32"], "AND", ["entityid", "startswith", "3"]
          ],
          "OR",
          [
            ["status", "anyof", "27"], "AND", ["entityid", "startswith", "1"]
          ],
          "OR",
          [
            ["status", "anyof", "5", "29", "31", "3", "33", "36", "34"], "AND", ["entityid", "startswith", "2"]
          ]
        ],
        columns: [
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula: "CASE WHEN {status} = 'Internal' THEN 'Internal' WHEN {status} = 'Pitching' THEN 'Pitching' ELSE 'Other' END",
            label: "Status"
          }),
          search.createColumn({
            name: "entityid",
            summary: "MAX",
            sort: search.Sort.ASC,
            label: "ID"
          })
        ]
      });

      var searchResultCount = jobSearchObj.run().getRange({
        start: 0,
        end: 10
      });

      var tempprojectid = projectnumbering[projectstatus];
      log.debug('The current project id is: ', id);
      var nextinteger = searchResultCount[tempprojectid].id + 1;
      log.debug('The next project ID is: ', nextinteger);

      var chart_no = recCurrent.getValue({
        fieldId: 'custentity_nlfc_chart_number_custom_enti'
      });

      try {

        var projectid = recCurrent.setValue({
          fieldId: 'entityid',
          value: nextinteger
        });

        log.debug('The new project id is: ', projectid);

        return true;

      } catch (e) {

        log.debug('Error reads: ', e.name + e.message);

        return false;

      }
    }
  }

  return {

    saveRecord: saveRecord

  };

});
