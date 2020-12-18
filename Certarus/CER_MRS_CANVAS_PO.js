/*******************************************************************
 *
 *
 * Name: CER_MRS_CANVAS_PO.js
 * @NScriptType MapReduceScript
 * @NApiVersion 2.x
 * Version: 0.0.2
 *
 *
 * Author: Nicolas Bean
 * Purpose: The purpose of this script is to create purchase orders from the Canvas raw data
 * Script: CER_MRS_CANVAS_PO.js
 * Deploy:
 *
 *
 * ******************************************************************* */

define(['N/file', 'N/search', 'N/record', 'N/format'], function(file, search, record, format) {

  function getInputData() {

    var customrecord_canvas_csvSearchObj = search.create({
      type: "customrecord_canvas_csv",
      filters: [
        ["custrecordcert_cus_canvas_po", "anyof", "@NONE@"]
      ],
      columns: [
        search.createColumn({
          name: "custrecord_date",
          label: "Date"
        }),
        search.createColumn({
          name: "custrecord_submission_number",
          label: "Submission Number"
        }),
        search.createColumn({
          name: "custrecord_item",
          label: "Item"
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_ITEM",
          label: "Item Internal ID"
        }),
        search.createColumn({
          name: "custrecord_location",
          label: "Location"
        }),
        search.createColumn({
          name: "custrecord_prs_number",
          label: "PRS Number"
        }),
        search.createColumn({
          name: "custrecord_job_number",
          label: "Job Number"
        }),
        search.createColumn({
          name: "custrecord_total_hours",
          label: "Total Hours"
        }),
        search.createColumn({
          name: "custrecord_vendor",
          label: "Vendor"
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_VENDOR",
          label: "Vendor Internal ID"
        }),
        search.createColumn({
          name: "custrecord_is_billable",
          label: "Billable"
        })
      ]
    });
    var res = customrecord_canvas_csvSearchObj.run().getRange(0, 100);
    log.debug('getInputData', res.length + ' ' + JSON.stringify(res));
    return customrecord_canvas_csvSearchObj;
  }

  function map(context) {
    log.debug('Map', context.value);
    var res = JSON.parse(context.value);
    var cusrecordid = res.id;
    log.debug('cusrecordid', cusrecordid);
    var shortlocation = res.values.custrecord_location;
    log.debug('shortlocation', shortlocation);
    var hours = res.values.custrecord_total_hours;
    log.debug('hours', hours);
    var povendor = res.values.custrecord_vendor.value;
    log.debug('povendor', povendor);
    var itemid = res.values.custrecord_item.value;
    log.debug('itemid', itemid);
    var job = res.values.custrecord_job_number;
    log.debug('job', job);
    var billable = res.values.custrecord_is_billable;
    log.debug('billable', billable);

    if (billable == 'T') {

      var jobres = getProjectInformation(job);
      log.debug('jobres', jobres);
      var jobid = jobres[0].id;
      log.debug('jobid', jobid);

      var cusid = jobres[0].getValue({
        name: "internalid",
        join: "customer",
      });
      log.debug('cusid', cusid);
      var jobdepartment = jobres[0].getValue({
        name: "custentity_cert_proj_dept"
      });
      log.debug('jobdepartment', jobdepartment);
      var jobclass = jobres[0].getValue({
        name: "custentity_cert_proj_class"
      });
      log.debug('jobclass', jobclass);
      var jobcustype = jobres[0].getValue({
        name: "cseg_cert_custype"
      });
      log.debug('jobcustype', jobcustype);
      var joblocationfromjob = jobres[0].getValue({
        name: "custentitycert_proj_location"
      });
      log.debug('joblocationfromjob', joblocationfromjob);

    }

    var joblocation = getJobLocation(shortlocation);
    log.debug('joblocation', joblocation);

    // var porate = poinformation[0].getValue({
    //   name: 'custrecord_cost_price'
    // });
    // log.debug('porate', porate);

    // Get the volume to be invoiced from the custom record
    var cusrecord = record.load({
      type: 'customrecord_canvas_csv',
      id: cusrecordid
    });
    var proddate = cusrecord.getValue({
      fieldId: 'custrecord_date'
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
      });

      if (billable == 'T') {
        temppo.setValue({
          fieldId: 'department',
          value: jobdepartment
        }).setValue({
          fieldId: 'class',
          value: jobclass
        }).setValue({
          fieldId: 'cseg_cert_custype',
          value: jobcustype
        }).setValue({
          fieldId: 'location',
          value: joblocationfromjob
        });
      } else {
        temppo.setValue({
          fieldId: 'department',
          value: 4
        }).setValue({
          fieldId: 'class',
          value: 3
        }).setValue({
          fieldId: 'location',
          value: joblocation
        });
      }

      temppo.selectNewLine({
        sublistId: 'item'
      }).setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: itemid
      }).setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: hours
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
        fieldId: 'custrecordcert_cus_canvas_po',
        value: poid
      }).setValue({
        fieldId: 'custrecordcert_cus_canvas_ir',
        value: irid
      }).setValue({
        fieldId: 'custrecordcert_cus_canvas_project',
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
          ["jobname", "contains", project]
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
          }),
          search.createColumn({
            name: "custentity_cert_proj_dept",
            label: "Department"
          }),
          search.createColumn({
            name: "custentity_cert_proj_class",
            label: "Class"
          }),
          search.createColumn({
            name: "cseg_cert_custype",
            label: "Customer Type"
          })
        ]
      });

      var projectdata = jobSearchObj.run().getRange(0, 999);
      return projectdata;
    }

    // Map the project invoice billing UoM to the corrsponding custom field ID for the NetFlow custom record
    function getJobLocation(short) {
      var customrecordcert_cus_location_mapSearchObj = search.create({
        type: "customrecordcert_cus_location_map",
        filters: [
          ["custrecord156", "startswith", short]
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            join: "CUSTRECORD157",
            label: "Location Internal ID"
          })
        ]
      });

      customrecordcert_cus_location_mapSearchObj.run().each(function(result) {
        locationid = result.getValue({
          name: 'internalid',
          join: "CUSTRECORD157",
        });
        log.debug('locationid', locationid);
        return true;
      });
      return locationid;
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
