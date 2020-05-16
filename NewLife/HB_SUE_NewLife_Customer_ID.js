/**
 * This script sets the customer ID on NewLife client records
 * Author : Nicolas Bean (Houseblend.io)
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
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

    var chart_no = recCurrent.getValue({
      fieldId: 'custentity_nlfc_chart_number_custom_enti'
    });
    var lastname = recCurrent.getValue({
      fieldId: 'lastname'
    });
    var firstname = recCurrent.getValue({
      fieldId: 'firstname'
    });

    var clientid = chart_no + " " + lastname + "," + firstname;

    var customerid = recCurrent.setValue({
      fieldId: 'entityid',
      value: clientid
    });

    log.debug('The new customer id is: ',customerid);

  }
  return {

    saveRecord: saveRecord

  };

});
