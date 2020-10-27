/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/format', 'N/record', 'N/search'],
  /**
   * @param{format} FORMAT
   * @param{record} RECORD
   * @param{search} SEARCH
   */
  function(FORMAT, RECORD, SEARCH) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
      //Search to get unique Currency with date
      let search_celigo_amzio_sett_fee = SEARCH.create({
        type: "customrecord_celigo_amzio_sett_fee",
        filters: [
          ["formuladate: last_day(add_months({custrecordhb_amz_fee_posted_date}, 0))", "onorafter", "2020-02-01"]
        ],
        columns: [
          SEARCH.createColumn({
            name: "formuladate",
            summary: "GROUP",
            formula: "last_day(add_months({custrecordhb_amz_fee_posted_date}, 0))",
            sort: SEARCH.Sort.ASC,
            label: "Posted Day"
          }),
          SEARCH.createColumn({
            name: "custrecordrsm_marketplace_cus_tran_settl",
            join: "CUSTRECORD_CELIGO_AMZIO_SET_F_PAR_TRANS",
            summary: "GROUP",
            label: "Marketplace"
          }),
          SEARCH.createColumn({
            name: "custrecordhb_fee_currency",
            summary: "GROUP",
            label: "Currency"
          })
        ]
      });

      return search_celigo_amzio_sett_fee;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
      //log.debug('Map', context.value);
      let object_current = JSON.parse(context.value),
        str_trandate = object_current["values"]["GROUP(formuladate)"],
        int_currency_id = object_current["values"]["GROUP(custrecordhb_fee_currency)"]["value"],
        marketplace_id = object_current["values"]["GROUP(custrecordrsm_marketplace_cus_tran_settl.CUSTRECORD_CELIGO_AMZIO_SET_F_PAR_TRANS)"]["value"],
        temp_date = FORMAT.parse({
          value: str_trandate,
          type: FORMAT.Type.DATE,
          timezone: FORMAT.Timezone.AMERICA_NEW_YORK
        }),
        date_reversal = new Date(temp_date.setDate(temp_date.getDate() + 1)),
        columns = [];

      log.debug({
        title: 'Current Object',
        details: `${str_trandate}  ${int_currency_id} ${new Date(str_trandate)}`
      });

      //search to get all the Accounts for the current Posted day and Marketplace

      let search_celigo_amzio_sett_fee = SEARCH.create({
        type: "customrecord_celigo_amzio_sett_fee",
        filters: [
          ["formuladate: last_day(add_months({custrecordhb_amz_fee_posted_date}, 0))", "on", str_trandate],
          "AND",
          ["custrecord_celigo_amzio_set_f_par_trans.custrecordrsm_marketplace_cus_tran_settl", "anyof", marketplace_id]
        ],
        columns: [
          columns[0] = SEARCH.createColumn({
            name: "custrecordhb_amz_fee_account",
            summary: "GROUP",
            label: "Account"
          }),
          columns[1] = SEARCH.createColumn({
            name: "formuladate",
            summary: "GROUP",
            formula: "last_day(add_months({custrecordhb_amz_fee_posted_date}, 0))",
            sort: SEARCH.Sort.ASC,
            label: "Posted Day"
          }),
          columns[2] = SEARCH.createColumn({
            name: "exchangerate",
            join: "CUSTRECORDHB_FEE_CURRENCY",
            summary: "GROUP",
            label: "Exchange Rate"
          }),
          columns[3] = SEARCH.createColumn({
            name: "custrecord_celigo_amzio_set_f_amount",
            summary: "SUM",
            label: "Amount"
          }),
          columns[4] = SEARCH.createColumn({
            name: "formulacurrency",
            summary: "SUM",
            formula: "{custrecord_celigo_amzio_set_f_amount}*{custrecordhb_fee_currency.exchangerate}",
            label: "Formula (Currency)"
          }),
          columns[5] = SEARCH.createColumn({
            name: "custrecordrsm_marketplace_cus_tran_settl",
            join: "CUSTRECORD_CELIGO_AMZIO_SET_F_PAR_TRANS",
            summary: "GROUP",
            label: "Marketplace"
          })
        ]
      });

      search_celigo_amzio_sett_fee.run().each(function(result) {
        log.debug('account', result.getValue(columns[0]));
        log.debug('marketplace', result.getValue(columns[5]));
        log.debug('exch rate', result.getValue(columns[2]));
        log.debug('amount', result.getValue(columns[3]));
      });



      if (search_celigo_amzio_sett_fee.runPaged().count > 0) {
        //create Journal

        try {
          let record_journal = RECORD.create({
            type: RECORD.Type.JOURNAL_ENTRY,
            isDynamic: true
          });

          record_journal.setValue({
            fieldId: 'trandate',
            value: FORMAT.parse({
              value: str_trandate,
              type: FORMAT.Type.DATE
            })
          }).setValue({
            fieldId: 'currency',
            value: int_currency_id
          }).setValue({
            fieldId: 'reversaldate',
            value: date_reversal
          }).setValue({
            fieldId: 'custbodyrsm_journal_type',
            value: 5
          }).setValue({
            fieldId: 'cseg1',
            value: marketplace_id
          });
          //log.debug('The journal has been created: ', record_journal);

          let num_exchangeRate = '',
            amazon_account = '',
            ns_account_for_fee_type = '',
            total_amount = 0,
            fee_type_account_error = false,
            amazon_account_error = false;


          log.debug('Reversal date', `${record_journal.getValue('reversaldate')}`);


          //Add Fee Type to lines
          let search_PagedData = search_celigo_amzio_sett_fee.runPaged({
            pageSize: 1000
          });

          search_PagedData.pageRanges.forEach(function(pageRange) {
            let currPage = search_PagedData.fetch({
              index: pageRange.index
            });
            currPage.data.forEach(function(result) {
              !amazon_account ? amazon_account = result.getValue(columns[0]) : '';
              log.debug('The amazon account to be set on the journal line is: ', amazon_account);
              log.debug('The search result for amazon account is: ', result.getValue(columns[0]));
              !num_exchangeRate ? num_exchangeRate = result.getValue(columns[2]) : '';
              //total_amount += parseFloat(result.getValue(columns[3]));

              //ns_account_for_fee_type = getFeeTypeAccount(result.getValue(columns[1]));
              let num_current_account_balance = getCurrentAccountBalance(result.getValue(columns[0]), marketplace_id, str_trandate);

              log.audit('Amount', `Actual ${result.getValue(columns[3])} Account ${num_current_account_balance}`);

              total_amount += ((-1 * parseFloat(result.getValue(columns[3]))) - num_current_account_balance);
              log.debug('The total amount is: ', total_amount);

              if (!amazon_account) {
                account_type_account_error = true;
                log.error({
                  title: 'Invalid Account Type',
                  details: `No account found for ${result.getValue(columns[0])} and marketplace ${result.getValue(columns[1])}`
                });
              }

              // Add Debit line
              record_journal.selectNewLine({
                sublistId: 'line'
              }).setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: result.getValue(columns[0]) //account as per fee type
                /*}).setCurrentSublistValue({
                  sublistId: 'line',
                  fieldId: 'memo',
                  value: result.getValue(columns[1])*/ //fee type as memo
              }).setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: ((-1 * parseFloat(result.getValue(columns[3]))) - num_current_account_balance).toFixed(2)
              }).commitLine({
                sublistId: 'line'
              });
            });
          });

          log.debug('The marketplace id is: ', marketplace_id);
          let ns_amazon_account_results = getAmazonAccount(marketplace_id);
          let ns_account_for_amazon_account = ns_amazon_account_results.account;
          let ns_marketplace_for_amazon_account = ns_amazon_account_results.marketplace;

          log.debug('Total', `${total_amount.toFixed(2)} `);
          log.debug('Amazon Account', `${amazon_account}  ${ns_account_for_amazon_account}`);

          if (!ns_account_for_amazon_account) {
            log.error({
              title: 'Invalid Amazon Account',
              details: `No account found for ${amazon_account}`
            });

            amazon_account_error = true;
          }

          //Add Credit Line
          record_journal.selectNewLine({
            sublistId: 'line'
          }).setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'account',
            value: ns_account_for_amazon_account //account as per amazon account
          }).setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'memo',
            value: ''
          }).setCurrentSublistValue({
            sublistId: 'line',
            fieldId: 'credit',
            value: total_amount.toFixed(2) //total credit amount
          }).commitLine({
            sublistId: 'line'
          });

          log.debug('exch rate', num_exchangeRate);

          //Exchange Rate
          record_journal.setValue({
            fieldId: 'exchangerate',
            value: num_exchangeRate
          });

          //Marketplace
          record_journal.setValue({
            fieldId: 'cseg1',
            value: ns_marketplace_for_amazon_account
          });

          //Save the Journal
          if (!fee_type_account_error && !amazon_account_error) {
            record_journal.save({
              enableSourcing: true,
              ignoreMandatoryFields: false
            });
          }

        } catch (e) {
          log.error({
            title: `Posting Date: ${str_trandate} Currency ID: ${int_currency_id}`,
            details: e
          });
        }

      }

    }

    function getAmazonAccount(marketplace_id) {
      let account = '';
      let customrecord_dal_amzn_ns_acct_mappingSearchObj = SEARCH.create({
        type: "customrecord_dal_amzn_ns_acct_mapping",
        filters: [
          ["custrecordhb_cus_marketplace", "anyof", marketplace_id],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          SEARCH.createColumn({
            name: "custrecordhb_cus_marketplace",
            label: "Marketplace"
          }),
          SEARCH.createColumn({
            name: "custrecord_dal_ns_account",
            label: "Account"
          })
        ]
      });

      //var searchResultCount = customrecord_dal_amzn_ns_acct_mappingSearchObj.runPaged().count;
      //log.debug("customrecord_dal_amzn_ns_acct_mappingSearchObj result count",searchResultCount);

      customrecord_dal_amzn_ns_acct_mappingSearchObj.run().each(function(result) {
        account = result.getValue({
          name: 'custrecord_dal_ns_account'
        });
        marketplace = result.getValue({
          name: 'custrecordhb_cus_marketplace'
        });
        return false;
      });

      return {
        account,
        marketplace
      };
    }

    /* Get Current balance as per account, date and currency */
    function getCurrentAccountBalance(account, amazonMarketplace, date) {
      let num_amount = 0;
      let first_date = date.slice(0, -2) + '01';
      log.debug('The first date is: ', first_date);
      log.debug('The date is: ', date);
      log.debug('Amazon marketplace is: ', amazonMarketplace);
      log.debug('The account is: ', account);

      //JE Search
      let transactionSearchObj = SEARCH.create({
   type: "transaction",
   filters:
   [
      ["systemnotes.type","is","T"],
      "AND",
      ["posting","is","T"],
      "AND",
      ["trandate","within",first_date,date],
      "AND",
      ["account","anyof", account],
      "AND",
      ["custbodyrsm_journal_type","noneof","5"],
      "AND",
      ["cseg1","anyof", amazonMarketplace]
   ],
   columns:
   [
      SEARCH.createColumn({
         name: "account",
         summary: "GROUP",
         label: "Account"
      }),
      SEARCH.createColumn({
         name: "amount",
         summary: "SUM",
         label: "Amount (CAD)"
      }),
      SEARCH.createColumn({
         name: "fxamount",
         summary: "SUM",
         label: "Amount (FX)"
      }),
      SEARCH.createColumn({
         name: "currency",
         summary: "GROUP",
         label: "Currency"
      }),
      SEARCH.createColumn({
         name: "cseg1",
         summary: "GROUP",
         label: "Marketplace"
      })
   ]
});

      let searchResultCount = transactionSearchObj.runPaged().count;
      log.debug("transactionSearchObj result count", searchResultCount);

      transactionSearchObj.run().each(function(result) {
        num_amount += parseFloat(result.getValue({
          name: 'fxamount',
          summary: "SUM"
        }));
        log.debug('The amount of the current account balance is: ', num_amount);
        return true;
      });

      return num_amount;
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    };

  });
