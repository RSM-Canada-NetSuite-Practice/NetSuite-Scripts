/*******************************************************************
*
*
* Name: DAL_SUE_updateBankAcct.js
* @NApiVersion 2.x
* Script Type: UserEventScript
* Version: 0.0.1
*
*
* Author: Author Name
* Purpose: A description of the purpose of this script
* Script: The script record id
* Deploy: The script deployment record id
*
*
* ******************************************************************* */

define(['N/record', 'N/search', 'N/log'],
    function(record, search, log) {
        function beforeSubmit_updateJournalAccount(context) {
			       if(context.type == context.UserEventType.CREATE){

				     var journalRec = context.newRecord;

				//check for AMazon Journal
				var amazon_settlement_id = journalRec.getValue({
          fieldId: "custbody_celigo_amzio_settlement_id"});

				if(amazon_settlement_id != '' || amazon_settlement_id != null){
					var paypalOccurence = memo.indexOf('PayPal');

					if(paypalOccurence != -1){
						updateCustomerCurrency(cashSaleRec.getValue('entity'), cashSaleRec.getValue('currency'));
						cashSaleRec.setValue('paymentmethod', 12);
					}
				}

				var paymentMethod = cashSaleRec.getValue('paymentmethod');
				var billAddress = cashSaleRec.getValue('billaddress').split('\n');
				var billingCountry = billAddress[(billAddress.length) - 1];

				if(paymentMethod == 7 || paymentMethod == 12){

					var data = buildMap(billingCountry);
					var accountMap = data[0];
					var currencyMap = data[1];

					var paypalAccount = accountMap[billingCountry];

					cashSaleRec.setValue('currency', currencyMap[billingCountry]);
					cashSaleRec.setValue('undepfunds', 'F');
					cashSaleRec.setValue('account', paypalAccount);
				}
			}
        }

		/**
		* Builds an associative array of Country Name to internal Id.
		*
		* @returns {Object.<String, String>} Mapping of ISOCode:InternalId for all countries
		* @governance 10 per batch of 1000 records
		*/
		function buildMap() {
			var accountMap = {};
			var currencyMap = {};
			var filters = [['isinactive', 'is', 'F']];
			var columns = ['custrecord_paypal_acc', 'custrecord_country', 'custrecord_currency', 'custrecord_country_code'];

			var customrecord_paypal_accountSearchObj = search.create({
				type: "customrecord_paypal_account",
				filters: filters,
				columns: columns
			});
			var searchResult = customrecord_paypal_accountSearchObj.run().getRange(0,999);
			//log.debug("customrecord_paypal_accountSearchObj result count",JSON.stringify(searchResult));
			customrecord_paypal_accountSearchObj.run().each(function(result){
				accountMap[result.getText('custrecord_country')] = result.getValue('custrecord_paypal_acc');
				currencyMap[result.getText('custrecord_country')] = result.getValue('custrecord_currency');
				return true;
			});
			return [accountMap,currencyMap];
		}

		/**
		* Builds an associative array of Country Name to internal Id.
		*
		* @returns {Object.<String, String>} Mapping of ISOCode:InternalId for all countries
		* @governance 10 per batch of 1000 records
		*/
		function updateCustomerCurrency(customer, currency) {
			var currencies = ['1', '2', '3', '4', '5', '6', '7', '8'];

			var customerRec = record.load({
				type: 'customer',
				id: customer,
				isDynamic: true
			});
			var customerCurrencies = customerRec.getLineCount('currency');

			if(customerCurrencies != 8){
				for(var i=0; i<currencies.length; i++){

					if(currency == currencies[i]){
						continue;
					}
					customerRec.selectNewLine('currency');
					customerRec.setCurrentSublistValue('currency', 'currency', currencies[i]);
					customerRec.commitLine('currency');
				}
			}
			customerRec.save();
		}

        return {
            beforeSubmit: beforeSubmit_updatePaypalAccount
        };
    });
