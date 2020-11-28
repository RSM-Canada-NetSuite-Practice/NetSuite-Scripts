/*******************************************************************
 *
 *
 * Name: CER_MRS_NETFLOW_PO.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to create purchase orders from the NetFlow raw data
 * Script: CER_MRS_NETFLOW_PO.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/format'], function(file, search, record, format) {

  function getInputData() {

    var customrecord_netflow_rawSearchObj = search.create({
      type: "customrecord_netflow_raw",
      filters: [
        ["custrecordcert_netflow_po", "anyof", "@NONE@"]
      ],
      columns: [
        search.createColumn({
          name: "custrecord_production_date",
          label: "Production Date"
        }),
        search.createColumn({
          name: "custrecordjob_number",
          label: "Job Number"
        }),
        search.createColumn({
          name: "custrecordprs",
          label: "PRS"
        }),
        search.createColumn({
          name: "custrecord_total_volume_mcf",
          label: "Total Volume - mcf"
        }),
        search.createColumn({
          name: "custrecord_invoice_mcf",
          label: "Invoice MCF"
        }),
        search.createColumn({
          name: "custrecord_invoice_mmbtu",
          label: "Invoice mmBTU"
        }),
        search.createColumn({
          name: "custrecord_invoice_gj",
          label: "Invoice GJ"
        }),
        search.createColumn({
          name: "custrecord_invoice_del",
          label: "Invoice DEL"
        }),
        search.createColumn({
          name: "custrecord_invoice_pel",
          label: "Invoice PEL"
        }),
        search.createColumn({
          name: "custrecord_invoice_kg",
          label: "Invoice KG"
        }),
        search.createColumn({
          name: "custrecord_invoice_dge",
          label: "Invoice DGE"
        }),
        search.createColumn({
          name: "custrecord_invoice_pge",
          label: "Invoice PGE"
        }),
        search.createColumn({
          name: "custrecord_invoice_lbs",
          label: "Invoice LBS"
        }),
        search.createColumn({
          name: "custrecord_del_heating_value_btu",
          label: "DEL Heating Value Setpoint - BTU/L"
        }),
        search.createColumn({
          name: "custrecord_pel_heating_value_btu",
          label: "PEL Heating Value Setpoint - BTU/L"
        }),
        search.createColumn({
          name: "custrecord_bge_heating_value_btu_gal",
          label: "DGE Heating Value Setpoint - BTU/Gal"
        }),
        search.createColumn({
          name: "custrecord_pge_heating_value_btu_gal",
          label: "PGE Heating Value Setpoint - BTU/Gal"
        }),
        search.createColumn({
          name: "custrecord_shrinkage_factor",
          label: "Shrinkage Factor"
        }),
        search.createColumn({
          name: "custrecord_mass_kg",
          label: "Mass KG"
        }),
        search.createColumn({
          name: "created",
          label: "Date Created"
        }),
        search.createColumn({
          name: "displaynametranslated",
          label: "Display Name (Translated)"
        }),
        search.createColumn({
          name: "custrecord_mass_tonne",
          label: "Mass Tonne"
        }),
        search.createColumn({
          name: "custrecordcert_netflow_po",
          label: "Purchase Order"
        })
      ]
    });
    var res = customrecord_netflow_rawSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecord_netflow_rawSearchObj;
  }

  function map(context) {
    log.debug('Map', context.value);
    var res = JSON.parse(context.value);
    var cusrecordid = res.id;
    log.debug('cusrecordid', cusrecordid);
    var job = res.values.custrecordjob_number;
    log.debug('job', job);
    var jobres = getProjectInformation(job);
    log.debug('jobres', jobres);
    var jobid = jobres[0].id;
    log.debug('jobid', jobid);

    var billingtype = jobres[0].getText({
      name: 'custentitycert_billing_uom'
    });
    billingtype.trim();
    log.debug('billingtype', billingtype);

    var billingid = jobres[0].getValue({
      name: 'custentitycert_billing_uom'
    });
    log.debug('billingid', billingid);

    var cusid = jobres[0].getValue({
      name: "internalid",
      join: "customer",
    });
    log.debug('cusid', cusid);

    var joblocation = jobres[0].getValue({
      name: 'custentitycert_proj_location'
    });
    log.debug('joblocation', joblocation);

    var tempinvoiceuom = getInvoiceBillingUnit(billingtype);
    var invoiceuom = tempinvoiceuom[0].getValue({
      name: 'custrecordcert_cus_map_invoice_del'
    });
    log.debug('invoiceuom', invoiceuom);

    var poinformation = getpovendorandrate(joblocation, billingid);
    log.debug('poinformation', poinformation);

    var porate = poinformation[0].getValue({
      name: 'custrecord_cost_price'
    });
    log.debug('porate', porate);
    var povendor = poinformation[0].getValue({
      name: 'custrecord_cost_vendor'
    });
    log.debug('povendor', povendor);

    // Get the volume to be invoiced from the custom record
    var cusrecord = record.load({
      type: 'customrecord_netflow_raw',
      id: cusrecordid
    });
    var invoiceqty = cusrecord.getValue({
      fieldId: invoiceuom
    });
    log.debug('invoiceqty', invoiceqty);
    var proddate = cusrecord.getValue({
      fieldId: 'custrecord_production_date'
    });
    log.debug('proddate', proddate);


    try {

      // Create PO
      var temppo = record.create({
        type: 'purchaseorder',
        isDynamic: true,
      });

      temppo.setValue({
        fieldId: 'entity',
        value: povendor
      }).setValue({
        fieldId: 'trandate',
        value: proddate
      }).setValue({
        fieldId: 'location',
        value: joblocation
      });

      temppo.selectNewLine({
          sublistId: 'item'
        }).setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: 39
        }).setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: invoiceqty
        }).setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'rate',
          value: porate
        })
        /*.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                value: 14
              })*/
        .setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'isbillable',
          value: true,
        }).setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'customer',
          value: jobid,
        }).commitLine({
          sublistId: 'item'
        });
      log.debug('temppo', temppo);

      // Save record
      var poid = temppo.save();
      log.debug('poid', poid);

      var tempporate = temppo.getSublistValue({
        sublistId: 'item',
        fieldId: 'itemrate',
        line: 0
      });

      // Create item receipt
      var tempir = record.transform({
        fromType: 'purchaseorder',
        fromId: poid,
        toType: 'itemreceipt'
      });

      tempir.setValue({
        fieldId: 'trandate',
        value: proddate
      });

      var irid = tempir.save();

      // Set PO and IR to cus record
      cusrecord.setValue({
        fieldId: 'custrecordcert_netflow_po',
        value: poid
      }).setValue({
        fieldId: 'custrecordcer_netflow_item_receipt',
        value: irid
      }).setValue({
        fieldId: 'custrecordcert_cus_netflow_project',
        value: jobid
      });

      cusrecord.save();

    } catch (e) {

      log.debug('Error reads: ', e.name + e.message);

    }

    // Get project information - invoice billing UoM
    function getProjectInformation(project) {
      var jobSearchObj = search.create({
        type: "job",
        filters: [
          ["entityid", "contains", project]
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            join: "customer",
            label: "Customer Internal ID"
          }),
          search.createColumn({
            name: "custentitycert_billing_uom",
            label: "Invoice Billing Unit of Measure"
          }),
          search.createColumn({
            name: "custentitycert_proj_location",
            label: "Location"
          })
        ]
      });

      var projectdata = jobSearchObj.run().getRange(0, 999);
      return projectdata;
    }

    // Map the project invoice billing UoM to the corrsponding custom field ID for the NetFlow custom record
    function getInvoiceBillingUnit(invoice) {
      var customrecordcert_invoice_billing_uomSearchObj = search.create({
        type: "customrecordcert_invoice_billing_uom",
        filters: [
          ["name", "contains", invoice]
        ],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name"
          }),
          search.createColumn({
            name: "custrecordcert_cus_map_invoice_del",
            label: "Custom Field Alias"
          })
        ]
      });

      var invoicebillingtype = customrecordcert_invoice_billing_uomSearchObj.run().getRange(0, 999);
      return invoicebillingtype;
    }

    // Map the vendor and gas cost
    function getpovendorandrate(location, uom) {
      var customrecord_gas_costSearchObj = search.create({
        type: "customrecord_gas_cost",
        filters: [
          ["custrecord_cost_location", "anyof", location],
          "AND",
          ["custrecord_cost_uom", "anyof", uom]
        ],
        columns: [
          search.createColumn({
            name: "custrecord_cost_date",
            sort: search.Sort.DESC,
            label: "Date"
          }),
          search.createColumn({
            name: "custrecord_cost_location",
            label: "Location"
          }),
          search.createColumn({
            name: "custrecord_cost_vendor",
            label: "Vendor"
          }),
          search.createColumn({
            name: "custrecord_cost_uom",
            label: "UOM"
          }),
          search.createColumn({
            name: "custrecord_cost_price",
            label: "Price"
          })
        ]
      });

      var poinformation = customrecord_gas_costSearchObj.run().getRange(0, 1);
      return poinformation;
    }
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

    // Use the context object's output iterator to gather the key/value pairs saved
    // at the end of the reduce stage. Also, tabulate the number of key/value pairs
    // that were saved. This number represents the total number of unique letters
    // used in the original string.
    var text = '';
    var totalKeysSaved = 0;
    context.output.iterator().each(function(key, value) {
      text += (key + ' ' + value + '\n');
      totalKeysSaved++;
      return true;
    });

    // Log details about the total number of pairs saved.
    log.audit({
      title: 'Unique number of letters used in string',
      details: totalKeysSaved
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
