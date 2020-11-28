/*******************************************************************
 *
 *
 * Name: DAL_SUE_CUSTOMER_LASTNAME.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Sets correct last name on customers where the last name is missing
 * Script: The script record id
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/record', 'N/search', 'N/log'],
  function(record, search, log) {
    function beforeSubmit(context) {

      var oldcus = context.oldRecord;
      var newcus = context.newRecord;
      var newlastname = newcus.getValue({
        fieldId: 'lastname'
      });
      var oldlastname = oldcus.getValue({
        fieldId: 'lastname'
      });

      log.debug('oldcus', oldcus);
      log.debug('newcus', newcus);
      log.debug('newlastname', newlastname);
      log.debug('oldlastname', oldlastname);

      if (newlastname == "" || newlastname == null) {

        if (oldlastname != "" || oldlastname != null) {
          context.newRecord.setValue({
            fieldId: 'lastname',
            value: oldlastname
          });
        } else {
          context.newRecord.setValue({
            fieldId: 'lastname',
            value: 'Missing'
          });
        }
      }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
