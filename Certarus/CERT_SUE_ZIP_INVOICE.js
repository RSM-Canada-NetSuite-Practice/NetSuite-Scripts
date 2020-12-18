/*******************************************************************
 *
 *
 * Name: CERT_SUE_ZIP_INVOICE.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Sets correct taxes on project invoices
 * Script: The script record id
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/record', 'N/search', 'N/log'],
  function(record, search, log) {
    function beforeSubmit(context) {

      var invoiceRec = context.newRecord;
      var invoicejob = invoiceRec.getValue({
        fieldId: 'job'
      });

      log.debug('invoiceRec', invoiceRec);
      log.debug('invoicejob', invoicejob);

      // If the project is empty, do not trigger
      if (invoicejob) {

        // Fetch project zip & city
        var tempproject = search.lookupFields({
          type: search.Type.JOB,
          id: invoicejob,
          columns: ['custentity_certarus_zip', 'custentity_certarus_city']
        });
        log.debug('tempproject', tempproject);

        var invoicezip = tempproject.custentity_certarus_zip;
        log.debug('invoicezip', invoicezip);

        var invoicecity = tempproject.custentity_certarus_city;
        log.debug('invoicecity',invoicecity);

        // If the zip is empty, do not replace
        if (invoicezip != null || invoicezip != '') {
          invoiceRec.setValue({
            fieldId: 'shipcity',
            value: invoicecity
          }).setValue({
            fieldId: 'shipzip',
            value: invoicezip
          });
        }
      }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
