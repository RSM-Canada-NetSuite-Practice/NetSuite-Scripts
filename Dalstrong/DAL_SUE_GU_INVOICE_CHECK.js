/*******************************************************************
 *
 *
 * Name: DAL_SUE_GU_INVOICE_CHECK.js
 * @NApiVersion 2.x
 * Script Type: UserEventScript
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

      if (invoiceShipState == "GU") {

        var numLines = invoiceRec.getLineCount({
          sublistId: 'items',
        });

        log.debug({
          details: 'number of lines is = ' + numLines
        });

        for (var i = 0; i < numLines; i++) {

          taxline = invoiceRec.setSublistValue({
            sublistId: 'items',
            fieldId: 'taxcode',
            line: i,
            value: 16
          });
        }
      }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
