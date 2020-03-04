/**
 * This script verifies that at the revenue projection totals 100% on the custom sub-record Revenue Projection on the opportunity
 * Author : Nicolas Bean (RSM Canada)
 */

 /**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record', 'N/log'], function(currentRecord, record, log) {

	function saveRecord(context) {

		log.debug({title: 'saveRecord initiated'});

	    var recCurrent = currentRecord.get();

	    log.debug({title: 'recCurrent has been set ' + recCurrent})

		var numLines = recCurrent.getLineCount({

				sublistId: 'recmachcustrecord_opportunity',

	      });

		log.debug({details: 'number of lines is = ' + numLines});

	      if (numLines <= 0) {

	            alert('You must enter a Revenue Projectiong totaling 100%.');

	            log.debug({details: 'No Revenue Projection was entered.'});

	            return false;

	      } else {

	    	  	var total = 0;

	    	  	var revenuepercent = 0;

	    	  	log.debug({details: 'About to enter loop with ' + numLines});

	    	  	for (var i = 0; i < numLines; i++) {

	    	  				revenuepercent = recCurrent.getSublistValue({

	    	  				sublistId: 'recmachcustrecord_opportunity',

	    	  				fieldId: 'custrecord_percent_anticipated_rev',

	    	  				line: i

	    	  			});

	    	  				total += revenuepercent

	    	  				log.debug({details: 'Looping on line: ' + i + '. Current quantity is : ' + revenuepercent + '. Current total is : ' + total});

	    	  	}

	    	  	log.debug({details: 'Current total is : ' + total})

	            if (total == 100) {

	            	return true;

		            log.debug({details: 'Revenue projection is equal to 100%'});

	            } else {

		            alert('Your total Revenue Projection is ' + total + '%' + '. The total of your revenue projection must be 100%.');

	            	log.debug({details: 'Revenue projection was not equal to: ' + total});

	            	return false;
	            }

		      }

		}

		return {

		    saveRecord: saveRecord

		};

});
