/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'],
  function(record, search, log) {
    function beforeSubmit_updatePaypalAccount(context) {
      if (context.type == context.UserEventType.CREATE) {

        var cashSaleRec = context.newRecord;
        var oldTotal = cashSaleRec.getValue('total');
        var marketplace = cashSaleRec.getValue({
          fieldId: 'cseg1'
        });
        log.debug('oldTotal', oldTotal + ' ' + typeof oldTotal);
        var lineCount = cashSaleRec.getLineCount('item');
        var lineTotal = 0;

        if (marketplace != 2) {

          for (var i = 0; i < lineCount; i++) {
            var eTailLinetax = cashSaleRec.getSublistValue('item', 'custcol_celigo_etail_order_line_tax', i);
            log.debug('The eTailLinetax is: ', eTailLinetax);
            var taxRate = cashSaleRec.setSublistValue('item', 'taxrate1', i);
            log.debug('The tax rate is: ', taxRate);
            var amount = cashSaleRec.getSublistValue('item', 'amount', i);
            log.debug('The line item amount is: ', amount);

            if (eTailLinetax == 0 || eTailLinetax == '') {

              if (taxRate == '' || taxRate != 0) {
                cashSaleRec.setSublistValue('item', 'taxrate1', i, 0);
              }
            } else {
              var taxtotal = 0;

              if (taxRate != '') {
                taxtotal = parseFloat(taxRate) * parseFloat(amount);
                log.debug('taxtotal', taxtotal + ' ' + typeof taxtotal);
              }

              if (taxtotal != parseFloat(eTailLinetax)) {
                var newTxrate = (parseFloat(eTailLinetax) / parseFloat(amount)) * 100;
                log.debug('newTxrate', newTxrate + ' ' + typeof newTxrate);
                cashSaleRec.setSublistValue('item', 'taxrate1', i, newTxrate.toFixed(2));

              }
            }
          }
          var newTotal = cashSaleRec.getValue('total');
          log.debug('newTotal', newTotal + ' ' + typeof newTotal);
        }
      }
    }


    return {
      beforeSubmit: beforeSubmit_updatePaypalAccount
    };
  });
