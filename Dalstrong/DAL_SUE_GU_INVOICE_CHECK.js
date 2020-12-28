/*******************************************************************
 *
 *
 * Name: DAL_SUE_GU_INVOICE_CHECK.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Sets correct taxes on Guam invoices
 * Script: The script record id
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/record', 'N/search', 'N/log'],
  function(record, search, log) {
    function beforeSubmit(context) {

      var invoiceRec = context.newRecord;
      var invoiceShipState = invoiceRec.getValue({
        fieldId: 'shipstate'
      });

      log.debug('Invoice: ', invoiceRec);
      log.debug('The ship state is: ', invoiceShipState);
      log.debug('The length of the ship state is: ', invoiceShipState.length);

      if (invoiceShipState == "GU") {

        var numLines = invoiceRec.getLineCount({
          sublistId: 'item',
        });

        log.debug({
          details: 'number of lines is = ' + numLines
        });

        for (var i = 0; i < numLines; i++) {

          taxline = invoiceRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'taxcode',
            line: i,
            value: 14
          });

          log.debug('The tax code has been set for line: ', i);

          if (invoiceShipState.length > 30) {
            var newinvoiceShipState = invoiceShipState.substring(0, 30);
            log.debug('newinvoiceShipState', newinvoiceShipState);
            record.setValue({
              fieldId: 'shipstate',
              value: newinvoiceShipState
            });
            log.debug('new ship state set');
          }
        }
      }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
