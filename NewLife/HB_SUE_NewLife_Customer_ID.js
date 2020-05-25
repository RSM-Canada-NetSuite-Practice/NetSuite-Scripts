/**
 * This script sets the customer ID on NewLife client records
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

    var chart_no = recCurrent.getValue({
      fieldId: 'custentity_nlfc_chart_number_custom_enti'
    });

    log.debug('Chart no: ', chart_no);

    var lastname = recCurrent.getValue({
      fieldId: 'lastname'
    });

    log.debug('Last name: ', lastname);

    var firstname = recCurrent.getValue({
      fieldId: 'firstname'
    });

    log.debug('First name: ', firstname);

    var upcasefirstname = firstname.toUpperCase();
    var upcaselastname = lastname.toUpperCase();

    log.debug('Name is: ', upcasefirstname + " " + upcaselastname);

    var clientid = chart_no + " " + upcaselastname + ", " + upcasefirstname;

    log.debug('Client id is: ', clientid);

    try {

      var customerid = recCurrent.setValue({
        fieldId: 'entityid',
        value: clientid
      });

      log.debug('The new customer id is: ', customerid);

      return true;

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

      return false;

    }
  }

  return {

    saveRecord: saveRecord

  };

});
