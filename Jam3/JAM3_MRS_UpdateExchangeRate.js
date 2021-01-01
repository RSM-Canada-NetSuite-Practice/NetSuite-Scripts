/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/search', 'N/record', 'N/currency'], function(file, search, record, currency) {



  function getInputData() {
    var revPlans = [];
    var filters = [
      ['revenueplancurrency', 'doesnotcontain', 'CAD'], "AND", ["status", "anyof", "INPROGRESS", "NOTSTARTED", "ONHOLD"]
    ];
    var columns = [search.createColumn({
        name: 'internalid',
        summary: 'GROUP'
      }),
      search.createColumn({
        name: 'recordnumber',
        summary: 'GROUP'
      }),
      search.createColumn({
        name: 'revenueplancurrency',
        summary: 'MAX'
      }), search.createColumn({
        name: "subsidiary",
        join: "revenueElement",
        summary: "MAX"
      }), search.createColumn({
        name: "formulatext",
        summary: "MAX",
        formula: "{revenueelement.subsidiary.id}"
      })
    ];
    var revPlanSearch = search.create({
      type: 'revenueplan',
      filters: filters,
      columns: columns
    });

    //var res = revPlanSearch.run().getRange(0,100);
    //log.debug("revenueplanSearchObj result count",res.length + ' ' + JSON.stringify(res));
    return revPlanSearch;
  }

  function map(context) {
    var res = JSON.parse(context.value);
    var currentDate = new Date();
    log.debug('The current date is: ', currentDate);
    // var currentDatefuture = new Date(currentDate.setMonth(currentDate.getMonth()));
    // log.debug('The next date is: ', currentDatefuture);
    var periodStartDate = (('0' + (currentDate.getMonth() + 1)).slice(-2)) + '/01/' + currentDate.getFullYear();
    log.debug('The period start date is: ', periodStartDate);
    var nextDateFuture = getCurrentDate(periodStartDate);
    log.debug('nextDateFuture', nextDateFuture);


    try {
      var consolidatedExchangeRateRes = getConsolidatedExchangeRate(nextDateFuture);
      log.debug('consolidatedExchangeRateRes', JSON.stringify(consolidatedExchangeRateRes));

      if (consolidatedExchangeRateRes != null && consolidatedExchangeRateRes != '') {

        for (var i = 0; i < consolidatedExchangeRateRes.length; i++) {
          var revPlanSub = res.values["MAX(formulatext)"];
          var sub = consolidatedExchangeRateRes[i].getValue({
            name: 'internalid',
            join: 'fromsubsidiary'
          });

          if (revPlanSub == sub) {
            var exchangeRate = consolidatedExchangeRateRes[i].getValue('currentrate');

            var rec = record.load({
              type: 'revenueplan',
              id: (res.values["GROUP(internalid)"].value)
            });
            rec.setValue('custrecordrsm_exchange_rate_rev_rec_plan', exchangeRate);
            rec.save();
            break;
          }
        }
      }
    } catch (e) {
      log.debug('error', e.name + ' ' + e.message);
    }

  }

  function getConsolidatedExchangeRate(startDate) {
    var res = '';
    var accountingPeriod = getCurrentAccountingPeriod(startDate);
    log.debug('The accounting period being used is: ', accountingPeriod);

    if (accountingPeriod != null && accountingPeriod != '') {

      var consolidatedFXRateSearch = search.create({
        type: "consolidatedexchangerate",
        filters: [
          ["period", "anyof", accountingPeriod], "AND", ["fromsubsidiary.currency", "noneof", "1"], "AND", ["tosubsidiary", "anyof", "1"]
        ],
        columns: [
          search.createColumn({
            name: "periodstartdate",
            sort: search.Sort.DESC,
            label: "Period Start Date"
          }),
          search.createColumn({
            name: "internalid",
            join: "fromSubsidiary"
          }), search.createColumn({
            name: "currentrate"
          })
        ]
      });

      res = consolidatedFXRateSearch.run().getRange(0, 999);
    }

    return res;
  }

  function getCurrentDate(today) {
    var accountingperiodSearchObj = search.create({
      type: "accountingperiod",
      filters: [
        ["startdate", "on", today]
      ],
      columns: [
        search.createColumn({
          name: "formuladate",
          summary: "MAX",
          formula: "(add_months(trunc({today},'Q'),6))-1",
          label: "Formula (Date)"
        })
      ]
    });
    // log.debug('accountingperiodSearchObj', accountingperiodSearchObj);


    var res = accountingperiodSearchObj.run().getRange(0, 1);
    log.debug('res', JSON.stringify(res));

    var date = res[0].getValue({
      name: "formuladate",
      summary: "MAX"
    });
    // log.debug('date');

    return date;

  }

  function getCurrentAccountingPeriod(startDate) {
    var periodId = '';

    var periodSearch = search.create({
      type: "accountingperiod",
      filters: [
        ["enddate", "on", startDate],
        "AND",
        ["periodname", "contains", "Q"]
      ],
      columns: [
        search.createColumn({
          name: "periodname",
          sort: search.Sort.DESC,
          label: "Name"
        }),
        search.createColumn({
          name: "internalid",
          label: "Internal ID"
        })
      ]
    });

    var res = periodSearch.run().getRange(0, 1);
    log.debug('res', JSON.stringify(res));
    if (res.length > 0) {
      periodId = res[0].id;
    }
    return periodId;
  }

  function reduce(context) {


  }


  function summarize(context) {

    // Log details about the script's execution.
    log.audit({
      title: 'Usage units consumed',
      details: context.usage
    });
    log.audit({
      title: 'Concurrency',
      details: context.concurrency
    });
    log.audit({
      title: 'Number of yields',
      details: context.yields
    });

  }

  // Link each entry point to the appropriate function.
  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  };
});
