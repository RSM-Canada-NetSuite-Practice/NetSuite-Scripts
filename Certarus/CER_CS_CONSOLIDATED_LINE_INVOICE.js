/*******************************************************************
 *
 *
 * Name: CER_CS_CONSOLIDATED_LINE_INVOICE.js
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

      var oldRec = context.oldRecord;
      var newRec = context.newRecord;
      log.debug('oldRec', oldRec);
      log.debug('newRec', newRec);

      var oldinvoice = context.oldRecord.getValue({
        fieldId: 'custrecord_ci_invoice_num'
      });
      log.debug('oldinvoice', oldinvoice);
      var newinvoice = context.newRecord.getValue({
        fieldId: 'custrecord_ci_invoice_num'
      });
      log.debug('newinvoice', newinvoice);
      var linkedheader = context.newRecord.getValue({
        fieldId: 'custrecord_linked_header'
      });
      log.debug('linkedheader', linkedheader);

      try {

        record.submitFields({
          type: 'invoice',
          id: oldinvoice,
          values: {
            custbody_consolidated_invoice_number: null,
            custbody_ci_invoice_consolidated: false
          }
        });
        log.debug('consolidated set to false');
        /*.submitFields({
                type: 'invoice',
                id: oldinvoice,
                values: {
                  custbody_consolidated_invoice_number: null
                }
              })*/

        if (newinvoice != '') {
          record.submitFields({
            type: 'invoice',
            id: newinvoice,
            values: {
              custbody_consolidated_invoice_number: linkedheader,
              custbody_ci_invoice_consolidated: true
            }
          });
          log.debug('new invoice values set');
        }

      } catch (e) {

        log.debug('Error reads: ', e.name + e.message);

      }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
