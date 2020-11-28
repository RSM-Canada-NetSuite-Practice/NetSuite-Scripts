/**
 *    Copyright 2016 NetSuite Inc. User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/**
 * @module SteUeTransactionTransactiontype
 */
define(function (require) {
  var NRecord = require('N/record');
  var NServerWidget = require('N/ui/serverWidget');
  var NCache = require('N/cache');
  var ModelTaxtype = require('../../../model/ste_model_taxtype');
  var ModelTransactionType = require('../../../model/ste_model_transaction_type');
  var ModelLookup = require('../../../model/ste_model_lookup');
  var ModelNexus = require('../../../model/ste_model_nexus');
  var ModelCountry = require('../../../model/ste_model_country');
  var GeneralFunctions = require('../../../general/ste_general_functions');
  var Transactiontype = require('./ste_transactiontype');
  var LibEconomicUnion = require('../../../general/lib_economicUnion');
  var Translator = require('../../../translations/ste_translator');
  var ServerSideFunctions = require('../../../general/ste_server_side_functions');

  /**
   * @type {SteServerSideFunctions}
   */
  var serverSideFunctions = null;
  /**
   * @returns {SteServerSideFunctions}
   */
  var getServerSideFunctions = function () {
    if (serverSideFunctions === null) {
      serverSideFunctions = new ServerSideFunctions();
    }
    return serverSideFunctions;
  };

  var script = {
    saleTransactions: ['salesorder', 'invoice', 'cashsale', 'creditmemo', 'cashrefund', 'opportunity', 'estimate'],
    purchaseTransactions: ['purchaseorder', 'vendorbill', 'expensereport', 'vendorcredit', 'creditcardcharge'],

    /**
     * @private
     * @param recordType
     * @return {boolean} True if the provided record type is a supported sale transaction type.
     */
    isSupportedSaleTransaction: function (recordType) {
      return script.saleTransactions.indexOf(recordType) > -1;
    },

    /**
     * @private
     * @param recordType
     * @return {boolean} True if the provided record type is a supported purchase transaction type.
     */
    isSupportedPurchaseTransaction: function (recordType) {
      return script.purchaseTransactions.indexOf(recordType) > -1;
    },

    /**
     * @private
     * @param recordType
     * @return {boolean} True if the provided record type is a supported transaction type (either sale or purchase).
     */
    isSupportedTransaction: function (recordType) {
      return script.isSupportedSaleTransaction(recordType) || script.isSupportedPurchaseTransaction(recordType);
    },

    /**
     * Check whether module is applicable
     * @param {Object} scriptContext
     * @return {boolean}
     * @private
     */
    isModuleApplicable: function (scriptContext) {
      var recordType = script.getTransactionType(scriptContext.newRecord);
      return scriptContext.type !== 'print' && script.isSupportedTransaction(recordType);
    },

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {serverWidget.Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    beforeLoad: function (scriptContext) {
      if (!script.isModuleApplicable(scriptContext)) {
        script.hideTransactionTypeField(scriptContext);
        return;
      }

      var form = scriptContext.form;
      var recordType = script.getTransactionType(scriptContext.newRecord);

      script.moveTransactionTypeField({ form: form });
      script.addInlineScript({ form: form, type: scriptContext.type });

      switch (scriptContext.type) {
        case 'create':
        case 'edit':
        case 'copy':
          script.addAuxiliaryFields({ form: form, recordType: recordType });
          script.initializeCache({ form: form });
          break;
      }
    },

    /**
     * @param form
     * @return Transaction Type field
     */
    getTransactionTypeField: function (form) {
      return form.getField({
        id: 'custbody_ste_transaction_type'
      });
    },

    /**
     * Hides the Transaction Type field.
     * @param scriptContext
     */
    hideTransactionTypeField: function (scriptContext) {
      var form = scriptContext.form;
      var field = script.getTransactionTypeField(form);

      field.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });
    },

    /**
     * Shows the Transaction Type field and moves it to the correct tab: Tax Details.
     * @param input
     */
    moveTransactionTypeField: function (input) {
      var form = input.form;
      var field = script.getTransactionTypeField(form);

      field.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.NORMAL
      });

      field.updateLayoutType({
        layoutType: NServerWidget.FieldLayoutType.NORMAL
      });

      form.insertField({
        field: field,
        nextfield: 'subsidiarytaxregnum'
      });
    },

    addAuxiliaryFields: function (input) {
      var form = input.form;
      var recordType = input.recordType;

      var transactionTypes = script.getTransactionTypes(recordType);

      var fieldTransactionTypes = form.addField({
        id: 'custpage_transaction_types',
        type: NServerWidget.FieldType.LONGTEXT,
        label: Translator.STE_TRANSACTION_TYPE()
      });

      fieldTransactionTypes.defaultValue = JSON.stringify(transactionTypes);

      fieldTransactionTypes.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      var lookupID = script.getTransactionTypeLookup();
      var fieldLookup = form.addField({
        id: 'custpage_transaction_lookupid',
        type: NServerWidget.FieldType.TEXT,
        label: Translator.STE_TRANSACTION_TYPE_LOOKUP()
      });
      fieldLookup.defaultValue = lookupID;

      fieldLookup.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      var transactionDirection = '';
      if (script.isSupportedSaleTransaction(recordType)) {
        transactionDirection = 'sales';
      } else if (script.isSupportedPurchaseTransaction(recordType)) {
        transactionDirection = 'purchases';
      }

      var fieldTransactionRedirection = form.addField({
        id: 'custpage_transaction_transactiondirection',
        type: NServerWidget.FieldType.TEXT,
        label: Translator.STE_TRANSACTION_DIRECTION()
      });
      fieldTransactionRedirection.defaultValue = transactionDirection;

      fieldTransactionRedirection.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      var nexusObj = new ModelNexus();
      var allNexuses = nexusObj.getAllNexuses();

      var fieldAllNexuses = form.addField({
        id: 'custpage_allnexuses',
        type: NServerWidget.FieldType.LONGTEXT,
        label: Translator.STE_NEXUSES()
      });

      fieldAllNexuses.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      fieldAllNexuses.defaultValue = JSON.stringify(allNexuses);

      var countryObj = new ModelCountry();
      var allCountries = countryObj.findDynamic({
        columns: ['countryCode']
      });

      var economicUnionObj = new LibEconomicUnion();
      var economicUnionCountries = economicUnionObj.getEconomicUnionMembersArray({});

      allCountries.forEach(function (input) {
        input.economicUnionMember = economicUnionCountries.indexOf(input.countryCode) > -1;
      });

      var fieldAllCountries = form.addField({
        id: 'custpage_allcountries',
        type: NServerWidget.FieldType.LONGTEXT,
        label: Translator.STE_COUNTRIES()
      });

      fieldAllCountries.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      fieldAllCountries.defaultValue = JSON.stringify(allCountries);
    },

    initializeCache: function (input) {
      var time = new Date().getTime();
      var randNumber = Math.floor((Math.random() * 10000) + 1);

      var cacheID = time + '_' + randNumber;

      var field = input.form.addField({
        id: 'custpage_ste_cache_id',
        type: NServerWidget.FieldType.LONGTEXT,
        label: 'Cache ID'
      });

      field.defaultValue = cacheID;

      field.updateDisplayType({
        displayType: NServerWidget.FieldDisplayType.HIDDEN
      });

      NCache.getCache({
        name: cacheID,
        scope: NCache.Scope.PUBLIC
      });
    },

    getTransactionTypeLookup: function () {
      var lookupObj = new ModelLookup();
      var results = lookupObj.findDynamic({
        columns: ['id'],
        filters: [lookupObj.columns.lookupID, 'is', 'ste_lookup_VAT']
      });

      return results[0].id;
    },

    getTransactionTypes: function (type) {
      var transactionTypeObj = new ModelTransactionType();

      var filters = [];

      if (script.isSupportedSaleTransaction(type)) {
        filters = [transactionTypeObj.columns.sales, 'is', true];
      } else if (script.isSupportedPurchaseTransaction(type)) {
        filters = [transactionTypeObj.columns.purchases, 'is', true];
      }

      var results = transactionTypeObj.findDynamic({
        columns: ['id', 'name', 'intracommunity', 'code'],
        filters: filters
      });

      return results;
    },

    addInlineScript: function (input) {
      var field = input.form.addField({
        id: 'custpage_inline_script',
        type: NServerWidget.FieldType.INLINEHTML,
        label: Translator.STE_INLINE_SCRIPT()
      });

      var nsselectModificationUrl = getServerSideFunctions().getFileUrlForAppFilePath('/src/library/netsuite/lib_nsselect_modification.js');
      var csTransactionTransactiontypeInlineUrl = getServerSideFunctions().getFileUrlForAppFilePath('/src/component/lookup/transaction_type/ste_cs_transaction_transactiontype_inline.js');

      var data = '<script type="text/javascript">var actionType = "' + input.type + '"</script>';
      data += '<script type="text/javascript" src="' + nsselectModificationUrl + '"></script>';
      data += '<script type="text/javascript" src="' + csTransactionTransactiontypeInlineUrl + '"></script>';

      field.defaultValue = data;
    },

    isRcsApplicable: function (currentRecord) {
      var stringifiedRecord = JSON.parse(JSON.stringify(currentRecord));
      var taxDetailsSublist = stringifiedRecord.sublists['taxdetails'];

      var taxTypeIds = script._getValuesOfSublistColumn({
        sublist: taxDetailsSublist,
        column: 'taxtype'
      });

      if (taxTypeIds.length < 2) {
        return false;
      }

      var rcsRecords = new ModelTaxtype().findReverseChargeForSalesRecordsByTaxationTypeIds(taxTypeIds);

      return rcsRecords.length > 0;
    },

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {record.Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    beforeSubmit: function (scriptContext) {

    },

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {record.Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    afterSubmit: function (scriptContext) {
      var newRecord = scriptContext.newRecord;
      var cacheID = newRecord.getValue('custpage_ste_cache_id');
      var transactiontypeObj = new Transactiontype();

      switch (scriptContext.type) {
        case 'create':
        case 'edit':

          var transactionType = script.getTransactionType(newRecord);
          var savedRecord = NRecord.load({
            type: transactionType,
            id: newRecord.id
          });

          var taxdetailsoverride = savedRecord.getValue('taxdetailsoverride');
          var nexus = savedRecord.getValue('nexus');

          if (!GeneralFunctions.getBooleanValue(taxdetailsoverride) && nexus) {
            var cacheData = transactiontypeObj.getCache({ cacheID: cacheID });
            if (cacheData) {
              var transactionTypes = JSON.parse(newRecord.getValue('custpage_transaction_types'));

              var foundTransactionTypes = script._searchInArray(transactionTypes, { code: cacheData });
              if (foundTransactionTypes.length > 0) {
                NRecord.submitFields({
                  type: transactionType,
                  id: newRecord.id,
                  values: {
                    custbody_ste_transaction_type: foundTransactionTypes[0].id
                  }
                });
              }
            }
          }

          var isRcsApplicable = script.isRcsApplicable(savedRecord);

          NRecord.submitFields({
            type: transactionType,
            id: newRecord.id,
            values: {
              custbody_ste_rcs_applicable: isRcsApplicable
            }
          });

          break;
      }

      if (cacheID) {
        transactiontypeObj.removeCache({ cacheID: cacheID });
      }
    },

    _searchInArray: function (inputArray, searchCondition) {
      return inputArray.filter(function (obj) {
        return Object.keys(searchCondition).every(function (key) {
          return obj[key] === searchCondition[key];
        });
      });
    },

    _getValuesOfSublistColumn: function (input) {
      var output = [];
      for (var i in input.sublist) {
        var value = input.sublist[i];
        output.push(value[input.column]);
      }
      return output;
    },

    /**
     * @private
     * @param {record.Record} record
     * @return {string}
     */
    getTransactionType: function (record) {
      var transactionType = record.getValue('trantype');
      switch (transactionType) {
        case 'CardChrg':
          return 'creditcardcharge';
        case 'CardRfnd':
          return 'creditcardrefund';
        default:
          return record.type;
      }
    }
  };

  return {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @function module:SteUeTransactionTransactiontype.beforeLoad
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {serverWidget.Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    beforeLoad: script.beforeLoad,
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @function module:SteUeTransactionTransactiontype.beforeSubmit
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {record.Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    beforeSubmit: script.beforeSubmit,
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @function module:SteUeTransactionTransactiontype.afterSubmit
     * @param {Object} scriptContext
     * @param {record.Record} scriptContext.newRecord - New record
     * @param {record.Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    afterSubmit: script.afterSubmit,
    _userevent: script
  };
});
