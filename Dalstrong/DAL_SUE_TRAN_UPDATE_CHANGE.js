/*******************************************************************
 *
 *
 * Name: DAL_SUE_TRAN_UPDATE_CHANGE.js
 * @NApiVersion 2.x
 * @NScriptType ClientScript
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

define(['N/currentRecord', 'N/search', 'N/log'],
  function(currentRecord, search, log) {
    function fieldChanged(context) {

      	var recCurrent = currentRecord.get();
        var temp = recCurrent.setValue({fieldId:'custbodyhb_tran_field_change',value: true, ignoreFieldChange: true});
        log.debug('The field change has been trigerred.');
        return true;

    }

    return {
      fieldChanged: fieldChanged
    };
  });
