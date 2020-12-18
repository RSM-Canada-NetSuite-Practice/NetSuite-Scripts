/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', './Search-20'],
    function(record, search, searchScript) {

      /*************************************************************
      Populates Item JSON field after submit so data in field
      can be used to print out line items
      *************************************************************/
        function afterSubmit(context) {
            try{
              log.debug('afterSubmit', 'starting lines process');
              var newRecord = context.newRecord;
              var headerId = newRecord.id;

              if(newRecord.type == 'customrecord_consolidated_inv_header') {
                log.audit('afterSubmit', 'record type - '+newRecord.type);
                setItemsOnHeaderRec(newRecord, headerId, search, searchScript);
              }

              if(newRecord.type == 'customrecord_consolidated_inv_line') {
                log.audit('afterSubmit', 'record type - '+newRecord.type);
                updateItemsOnHeaderRec(newRecord, search);
              }


            }catch(e) {
              log.error('afterSubmit', e.message);
            }
        }

        /*************************************************************
        Sets items to Item JSON field when header is edited or created
        *************************************************************/
        function setItemsOnHeaderRec(newRecord, headerId, search, searchScript) {

          var data = '';
          var columns = [{
              name: 'custrecord_ci_item'
          }, {
              name: 'custrecord_ci_qty'
          }, {
              name: 'custrecord_ci_notes'
          }, {
              name: 'custrecord_ci_rate'
          }, {
              name: 'custrecord_consolidated_line_amount'
          }];

          var filters = [{
              name: 'custrecord_linked_header',
              operator: 'is',
              values: headerId
          }];

        var lineSearch = searchScript.init('customrecord_consolidated_inv_line', null, filters, columns);
        var lineResults = lineSearch.getResults();

        if(lineResults != null && lineResults.length > 0) {

            for(var n = 0; n < lineResults.length; n++) {

                  data += lineResults[n].getText({name: 'custrecord_ci_item'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_ci_qty'})+',';
              	  data += lineResults[n].getValue({name: 'custrecord_ci_notes'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_ci_rate'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_consolidated_line_amount'});

                  if(n < lineResults.length - 1) {
                     data += '|';
                  }

            }

            log.audit('afterSubmit', 'line data - '+data);
            log.audit('afterSubmit', 'header id - '+headerId);

            var loadHeaderRec = record.load({type:'customrecord_consolidated_inv_header', id: headerId});
            loadHeaderRec.setValue('custrecord_ci_lines_json', data);
            loadHeaderRec.save();

        }

      }


        /*************************************************************
        Updates Item JSON field when line records are edited
        *************************************************************/
        function updateItemsOnHeaderRec(newRecord, search, searchScript) {

          var data = '';
          var headerId = newRecord.getValue('custrecord_linked_header');

          var columns = [{
              name: 'custrecord_ci_item'
          }, {
              name: 'custrecord_ci_qty'
          }, {
              name: 'custrecord_ci_notes'
          }, {
              name: 'custrecord_ci_rate'
          }, {
              name: 'custrecord_consolidated_line_amount'
          }];

          var filters = [{
              name: 'custrecord_linked_header',
              operator: 'is',
              values: headerId
          }];

        var lineSearch = searchScript.init('customrecord_consolidated_inv_line', null, filters, columns);
        var lineResults = lineSearch.getResults();

        if(lineResults != null && lineResults.length > 0) {

            for(var n = 0; n < lineResults.length; n++) {

                  data += lineResults[n].getText({name: 'custrecord_ci_item'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_ci_qty'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_ci_notes'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_ci_rate'})+',';
                  data += lineResults[n].getValue({name: 'custrecord_consolidated_line_amount'});

                  if(n < lineResults.length - 1) {
                     data += '|';
                  }

            }

            log.audit('afterSubmit', 'line data - '+data);
            log.audit('afterSubmit', 'header id - '+headerId);

            var loadHeaderRec = record.load({type:'customrecord_consolidated_inv_header', id: headerId});
            loadHeaderRec.setValue('custrecord_ci_lines_json', data);
            loadHeaderRec.save();

        }

      }

        return {
            afterSubmit: afterSubmit
        };
    });
