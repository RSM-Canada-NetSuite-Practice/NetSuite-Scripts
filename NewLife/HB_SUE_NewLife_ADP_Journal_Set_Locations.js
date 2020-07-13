/**
 * This script sets the location on journal line items for ADP payroll
 * Author : Nicolas Bean (Houseblend.io)
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record', 'N/log'], function(currentRecord, record, log) {

  function saveRecord(context) {

    log.debug({
      title: 'saveRecord initiated'
    });

    var recCurrent = currentRecord.get();

    log.debug({
      title: 'recCurrent has been set ' + recCurrent
    });

    try {

      var memo = recCurrent.getValue({
        fieldId: 'memo'
      });

      if (memo == 'Payroll Journal from ADP') {

        var lines = recCurrent.getLineCount({
          sublistId: 'line'
        });
        log.debug('The lines are:', lines);

        for (var i = 0; i < lines; i++) {
          log.debug('For loop has been entered ', i);
          var templine = recCurrent.selectLine({
            sublistId: 'line',
            line: i
          });
          log.debug('Looping on line: ', i);

          var account = recCurrent.getCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'account'
          });

          if (account == 293) {
            recCurrent.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'location',
              value: 12
            });
            recCurrent.setCurrentSublistValue({
              sublistId: 'line',
              fieldId: 'department',
              value: 8
            });
          }

          recCurrent.commitLine({
            sublistId: 'line'
          });
        }
      }
    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

    }
  }

  return {

    saveRecord: saveRecord

  };

});
