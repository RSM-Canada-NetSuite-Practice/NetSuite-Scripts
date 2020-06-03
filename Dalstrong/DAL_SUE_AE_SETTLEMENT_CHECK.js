/*******************************************************************
 *
 *
 * Name: DAL_SUE_AE_SETTLEMENT_CHECK.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version: 0.0.1
 *
 *
 * Author: Nicolas Bean
 * Purpose: Sets correct date on Amazon AE Settlement Transactions
 * Script: DAL_SUE_AE_SETTLEMENT_CHECK.js
 * Deploy: The script deployment record id
 *
 *
 * ******************************************************************* */

define(['N/record', 'N/search', 'N/log', 'N/format'],
  function(record, search, log, format) {
    function beforeSubmit(context) {

      var aesettlementRec = context.newRecord;
      var aesettlementRecdate = aesettlementRec.getValue({
        fieldId: 'custrecord_celigo_amzio_set_post_date_ti'
      });
      var aeSettlementRecMarketplace = aesettlementRec.getValue({fieldId:'custrecordrsm_marketplace_cus_tran_settl'});

      log.debug('Settlement transaction: ', aesettlementRec);
      log.debug('The posted date is: ', aesettlementRecdate);
      log.debug('The settlement marketplace is: ', aeSettlementRecMarketplace);

      if (aeSettlementRecMarketplace == 13) {

        var year = aesettlementRecdate.substring(6,10);
        var month = aesettlementRecdate.substring(3,5);
        var day = aesettlementRecdate.substring(0,2);

        var date = year + "-" + month + "-" + day;
        var parsedate = format.parse({value:date,type:format.Type.DATE});

        log.debug('The new date is: ',parsedate);

        aesettlementRec.setValue({fieldId:'custrecord_celigo_amzio_set_posted_date',value:parsedate});
        aesettlementRec.setValue({fieldId:'custrecord_celigo_amzio_set_amz_account',value:501});

        log.debug('The posted date has been set: ', date);
        }
    }

    return {
      beforeSubmit: beforeSubmit
    };
  });
