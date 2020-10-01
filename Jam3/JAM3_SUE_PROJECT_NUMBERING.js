/**
 * This script sets the project ID on Jam3 project records
 * Author : Nicolas Bean (Houseblend.io)
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/record', 'N/log', 'N/search'], function(record, log, search) {

  var projectstatusmap = {
    5: 1,
    29: 1,
    31: 1,
    3: 1,
    32: 2,
    33: 1,
    27: 0,
    34: 1,
    36: 1,
    35: 2
  };

  function beforeSubmit(context) {

    if (context.type == context.UserEventType.CREATE) {

      log.debug({
        title: 'beforeSubmit initiated'
      });

      var recCurrent = context.newRecord;
      log.debug('recCurrent has been set ', recCurrent);

      var jobID = recCurrent.id;
      log.debug('The project id is: ', jobID);

      var autoname = recCurrent.setValue({
        fieldId: 'autoname',
        value: false
      });

      var projectstatus = recCurrent.getValue({
        fieldId: 'entitystatus'
      });
      log.debug('The project status is: ', projectstatus);

      var searchresultid = projectstatusmap[projectstatus];
      log.debug('The search result id is: ', searchresultid);

      var jobSearchObj = search.create({
        type: "job",
        filters: [
          [
            ["status", "anyof", "27"], "AND", ["entityid", "startswith", "1"]
          ],
          "OR",
          [
            ["status", "anyof", "32"], "AND", ["entityid", "startswith", "3"]
          ],
          "OR",
          [
            ["status", "anyof", "5", "29", "31", "3", "33", "34", "36"], "AND", ["entityid", "startswith", "2"]
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
      log.debug('The search result count is: ', searchResultCount);

      var tempprojectid = searchResultCount[searchresultid].getValue({
        name: 'MAX(entityid)'
      });
      log.debug('The temp project id is: ', tempprojectid);

      var tempnextinteger = parseFloat(searchResultCount[searchresultid].getValue({
        name: 'entityid',
        summary: 'MAX'
      })).toFixed(0);
      var nextinteger = parseInt(tempnextinteger) + 1;
      var tempnewid = "" + nextinteger;
      log.debug('The next project ID is: ', nextinteger);
      log.debug('The new project id in string is: ', tempnewid);


      try {

        var projectid = recCurrent.setValue({
          fieldId: 'entityid',
          value: tempnewid
        });
        log.debug('The new project id is: ', projectid);

        return true;

      } catch (e) {

        log.debug('Error reads: ', e.name + e.message);

        return false;

      }
    } else {
      return true;
    }
  }

  return {

    beforeSubmit: beforeSubmit

  };

});
