/**
 * This script verifies that the allow expenses checkbox is unchecked and returns a user message
 * Author : Nicolas Bean
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record', 'N/log'], function(currentRecord, record, log) {

    function beforeSubmit(context) {

      log.debug({
        title: 'saveRecord initiated'
      });

      var recCurrent = currentRecord.get();
      log.debug({
        title: 'recCurrent has been set ' + recCurrent
      });

      var projectexp = recCurrent.getValue({
        fieldId: 'custbody_jam3_project.allowexpenses'
      });
      log.debug('Allow Expenses is: ' + projectexp);

      try {

        if (projectexp == F) {

          alert('Allow project expenses must be checked on the project for this expense report to be approved.');

          log.debug({
            details: 'Revenue projection was not equal to: ' + total
          });

          return false;

        }

      } catch (e) {

        log.debug('Error reads: ', e.name + e.message);

      }

    }

return {

  beforeSubmit: beforeSubmit

};

});
