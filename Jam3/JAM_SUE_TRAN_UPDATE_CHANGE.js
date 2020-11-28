/*******************************************************************
 *
 *
 * Name: JAM_SUE_TRAN_UPDATE_CHANGE.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Tracks changes on any transaction
 * Script: The script record id
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/record', 'N/search', 'N/log'],
  function(record, search, log) {

    function beforeSubmit(context) {
      if (context.type !== context.UserEventType.CREATE && context.newRecord.orderstatus !== 'F' && context.type !== context.UserEventType.APPROVE) {
        var id = context.newRecord.id;
        log.debug('id', id);

        var amountentry = context.oldRecord.getValue({
          fieldId: 'total'
        });
        log.debug('amountentry', amountentry);

        var amountexit = context.newRecord.getValue({
          fieldId: 'total'
        });
        log.debug('amountexit', amountexit);

        var type = context.newRecord.type;
        log.debug('type', type);

        if (amountentry != amountexit) {
          var tempeditapproved = context.newRecord.setValue({
            fieldId: 'custbody9',
            value: true
          });
          var tempstatus = context.newRecord.setValue({
            fieldId: 'orderstatus',
            value: 'A'
          });
          log.debug('The field change has been triggered.');
        }
      } else if (context.type == context.UserEventType.APPROVE) {
        var tempeditapprove = context.newRecord.setValue({
          fieldId: 'custbody9',
          value: false
        });
      }
      return true;
    }
    return {
      beforeSubmit: beforeSubmit
    };
  });
