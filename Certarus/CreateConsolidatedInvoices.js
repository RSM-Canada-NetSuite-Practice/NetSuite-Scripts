
// Global variables used throughout the Suitelet
var ROW_SEPARATOR = 'RSF';
var FIELD_SEPARATOR = 'FSF';
var CURRENCY = '1';
var EXCHANGE_RATE = '1.00';
var ACCOUNT_NUM = '';
var SUBSIDIARY = '1';
var PRINT_FORM_DEFAULT = '1';
var USAGE_LIMIT = 500;

/********************************************************************************************
 * CreateConsolidatedInvoices.js
 * Creates Consolidated Invoices and checks Invoice Consolidated on the Invoices passed
 * through the parameters
 ********************************************************************************************/

function run(){
	try{
		var context = nlapiGetContext();
		var recordData = context.getSetting('SCRIPT', 'custscript_ci_invoice_data');
		var otherData = context.getSetting('SCRIPT', 'custscript_ci_header_data');
		var authorEmail = context.getSetting('SCRIPT', 'custscript_consoidated_inv_author');
		var user = nlapiGetUser();

		nlapiLogExecution('audit', 'run', 'record data - '+recordData);
		nlapiLogExecution('audit', 'run', 'other data - '+otherData);

		if(!isEmpty(otherData)) {
			otherData = JSON.parse(otherData);
		}

		var trackingNum = otherData.trackingNum;
		var invoiceIds = otherData.invoiceIds;
		var consolidatedInvIds = [];

		if(!isEmpty(recordData)) {
			recordData = JSON.parse(recordData);
		}

		//Looping through and creating a consolidated invoice per customer
		for(customer in recordData) {

					try {
						var consolidatedInvId = createCustomTransaction(recordData[customer], customer, trackingNum);

						if(!isEmpty(consolidatedInvId)) {
							consolidatedInvIds.push(consolidatedInvId);
						}

						checkGovernance(context);
					} catch(e) {
						nlapiLogExecution('error', 'Loop Error', e.message);
						nlapiSendEmail(authorEmail, user, 'Error Occurred when Consolidating Invoices', 'Error occurred when processing invoices for Customer ID '+customer+': '+e.message+'');
					}

		}

		var recordsList = '';
		nlapiLogExecution('audit', 'run', 'consolidated invoice IDs - '+JSON.stringify(consolidatedInvIds));
		for(r = 0; r < consolidatedInvIds.length; r++) {
							var link = nlapiResolveURL('RECORD','customrecord_consolidated_inv_header', consolidatedInvIds[r]);
							var text = getTranId(consolidatedInvIds[r]);
							recordsList += '<a href='+link+'>'+text+'</a><br>';

					nlapiLogExecution('debug','run','created the list of records');
		}

		//Checking invoices as consolidated if they were processed.
		nlapiLogExecution('Debug','run', 'Invoice Ids - ' +JSON.stringify(invoiceIds));
		if(!isEmptyArray(invoiceIds)) {

			//Emailing User with List of Processed Invoices and Consolidated invoices
			nlapiSendEmail(authorEmail, user, 'Consolidated Invoices are Created', 'Your Invoice(s) have successfully consolidated.<br><br><b>List of Consolidated Invoices created:</b><br>'+recordsList+'');


				for(var i = 0; i < invoiceIds.length; i++) {
						try {

							var loadInvoice = nlapiLoadRecord('invoice', invoiceIds[i]);
							loadInvoice.setFieldValue('custbody_ci_invoice_consolidated', 'T');
							nlapiSubmitRecord(loadInvoice, false, true);
							checkGovernance(context);

						}catch(e) {
							nlapiSendEmail(authorEmail, user, 'Error Occurred when checking Invoices as Consolidated', 'Error: '+e.message+'');
							nlapiLogExecution('error', 'run', 'Error when checking Invoices as Consolidated: '+e.message);
						}

				}


		}


	}catch(e){
		nlapiLogExecution('Error', 'run', 'Unexpected error - ' + e.message);
	}
}


/******************************************************************
 * Creates the Consolidated Invoice and adds the body fields to
 * the transaction. Calls the function that adds the lines to the
 * transaction.
 *
 * @param recordData
 * @param custId
 * @param trackingNum
 ******************************************************************/
function createCustomTransaction(recordData,custId,trackingNum){

		var invoicesConsolidated = []; //stores all invoices that were consolidated
		nlapiLogExecution('Debug', 'createCustomTransaction', 'Record Data - ' + JSON.stringify(recordData));
		nlapiLogExecution('Debug', 'createCustomTransaction', 'Customer - ' + custId + ', Tracking # - '+trackingNum);

		var customTrans = nlapiCreateRecord('customrecord_consolidated_inv_header');
		// Load the customer record
		var customerRecord = nlapiLoadRecord('customer',custId)
		customTrans.setFieldValue('custrecord_ci_customer', custId);
		if(trackingNum != null && trackingNum != undefined) {
			customTrans.setFieldValue('custrecord_ci_tracking_number',trackingNum);
		}
		customTrans.setFieldValue('custrecord_ci_currency',CURRENCY);
		customTrans.setFieldValue('custrecord_ci_incoterms',customerRecord.getFieldValue('custentity_incotermsource'));
		customTrans.setFieldValue('custrecord_ci_subsidiary',customerRecord.getFieldValue('subsidiary'));

		var invoice = nlapiLoadRecord('invoice', recordData[0].invId);

		customTrans.setFieldValue('custrecord_ci_due_date',isNull(invoice.getFieldValue('duedate')));
		customTrans.setFieldValue('custrecord_ci_shipping_method',isNull(invoice.getFieldValue('shipmethod')));
		customTrans.setFieldValue('custrecord_ci_exchange_rate',isNull(invoice.getFieldValue('exchangerate')));
		customTrans.setFieldValue('custrecord_ci_terms',isNull(invoice.getFieldValue('terms')));

		nlapiLogExecution('Debug', 'createCustomTransaction', 'custom transaction - ' + JSON.stringify(customTrans));
		var id = nlapiSubmitRecord(customTrans, true);
		nlapiLogExecution('Debug', 'createCustomTransaction', 'Header Record Submitted - ' + id);

		//Assigning Document Number
		var docNum = 'CI';

		var loadNewRec = nlapiLoadRecord('customrecord_consolidated_inv_header', id);

		if(id.length < 4) {
			var zeroLength = 4 - parseFloat(id.length);

			for(var n = 0; n < zeroLength; n++) {
				docNum += '0';

				if(n == zeroLength -1) {
					docNum += id;
				}

			}
		} else {
			docNum += id;
		}

		nlapiLogExecution('audit', 'createCustomTransaction', 'docnum - '+docNum);

		var totalTrans = 0;
		var totalTax = 0;
		var totalShipCosts = 0;

		// For each invoice, Line records are created and linked to header record
		for(var j = 0; j < recordData.length; j++){
			var invoice = nlapiLoadRecord('invoice', recordData[j].invId);
			var tax = invoice.getFieldValue('taxtotal');
			var shipCost = invoice.getFieldValue('shippingcost');
			var total = addLines(id, recordData[j].invId, invoice);
			invoicesConsolidated.push(recordData[j].invId);

			nlapiLogExecution('audit', 'createCustomTransaction', 'tax - '+tax+', ship cost - '+shipCost);

			if(shipCost == null) {
				shipCost = 0;
			}

			if(tax == '') {
				tax = 0;
			}

			totalTax = parseFloat(totalTax) + parseFloat(tax);
			totalShipCosts = parseFloat(totalShipCosts) + parseFloat(shipCost);
			totalTrans = parseFloat(totalTrans) + parseFloat(total);
		}

		nlapiLogExecution('audit', 'createCustomTransaction', 'total ship cost - '+totalShipCosts+', total tax - '+totalTax+', subtotal - '+totalTrans);

		loadNewRec.setFieldValue('custrecord_ci_shipping_cost', totalShipCosts);
		loadNewRec.setFieldValue('custrecord_ci_tax', totalTax);
		loadNewRec.setFieldValue('custrecord_ci_subtotal', totalTrans);
		var extTotal = parseFloat(totalTrans) + parseFloat(totalTax) + parseFloat(totalShipCosts);
		loadNewRec.setFieldValue('custrecord_ci_amount', extTotal);

		loadNewRec.setFieldValue('custrecord_ci_doc_num', docNum);
		nlapiSubmitRecord(loadNewRec);

		return id;

}


/******************************************************************
 * Adds the line items to the Consolidated Invoice.
 *
 * @param customTrans
 * @param invId
 ******************************************************************/
function addLines(headerId,invId, invoice){

		//nlapiLogExecution('debug','addLines','order of record = '+recordOrder+' and last record # = '+lastRecord);

		var transTotal = invoice.getFieldValue('subtotal');

		for(var i = 1; i <= invoice.getLineItemCount('item'); i++){

			var item = isNull(invoice.getLineItemValue('item','item',i));
			var qty = isNull(invoice.getLineItemValue('item','quantity',i));
			var rate = isNull(invoice.getLineItemValue('item','rate',i));
			var amount = isNull(invoice.getLineItemValue('item','amount',i));
		    var notes = isNull(invoice.getLineItemValue('item','description', i));

				createLineRecord(item, qty, rate, amount, notes, headerId, invId);
		}

		return transTotal;

}


/******************************************************************
 * Creates the Line records for each invoice
 *
 * @param item
 * @param qty
 * @param rate
 * @param amount
 * @param notes
 * @param headerId
 * @param invoiceId
 ******************************************************************/

 function createLineRecord(item, qty, rate, amount, notes, headerId, invoiceId) {
 	try{
 		var lineRec = nlapiCreateRecord('customrecord_consolidated_inv_line');

		lineRec.setFieldValue('custrecord_ci_item', item);
		lineRec.setFieldValue('custrecord_ci_qty', qty);
		lineRec.setFieldValue('custrecord_ci_rate', rate);
		lineRec.setFieldValue('custrecord_ci_notes', notes);
		lineRec.setFieldValue('custrecord_linked_header', headerId);
		lineRec.setFieldValue('custrecord_ci_invoice_num', invoiceId);

		if(amount) {
			lineRec.setFieldValue('custrecord_consolidated_line_amount', amount);
		}

		var lineId = nlapiSubmitRecord(lineRec, true);
		nlapiLogExecution('audit', 'createLineRecord', 'Line Record was created and ID is '+lineId);


 	}catch(e){
 		nlapiLogExecution('Error', 'createLineRecord', 'error - ' + e.message);
 	}

 }


 /***********************************************
 	Checks governance and yields if governance is
	less than usage limit
 ***********************************************/
function checkGovernance(context){
		nlapiLogExecution('debug','checkGovernance','checking governance');

	 if( context.getRemainingUsage() < USAGE_LIMIT ){

	  var state = nlapiYieldScript();

	  if( state.status == 'FAILURE'){
	      nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
	   throw "Failed to yield script";
	  }
	  else if ( state.status == 'RESUME' ){
	   nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
	  }

	 }
}

/***********************************************
	Getting Consolidated Invoice Tran Id
***********************************************/

function getTranId(recordId) {
	nlapiLogExecution('debug','getTranId','getting TranID for record id '+recordId);
	var record = nlapiLoadRecord('customrecord_consolidated_inv_header', recordId);
	var tranId = record.getFieldValue('custrecord_ci_doc_num');
	return tranId;
}

/*************************************************************
 * If the value sent in is null or an empty string it returns
 * true.
 *
 * @param value
 ************************************************************/
function isEmpty(value){
	if(value == null || value == ''){
		return true;
	}else{
		return false
	}
}

/*************************************************************
 * If the value sent in is null it returns an empty string
 *
 * @param value
 ************************************************************/
function isNull(value){
	if(value == null){
		return value = '';
	}else{
		return value;
	}
}


/*************************************************************
 * If the array is empty, it returns true
 *
 * @param array
 ************************************************************/
function isEmptyArray(array) {
    return array != null && array.length <= 0;
}
