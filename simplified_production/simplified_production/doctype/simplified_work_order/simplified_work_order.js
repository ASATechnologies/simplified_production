/******************************************************************************
 * Main Document
 * Copyright (c) 2021, xyz and contributors
 * For license information, please see license.txt
 ******************************************************************************/
frappe.ui.form.on("Simplified Work Order", {
  onload: function (frm) {
    frm.set_value("posting_date", frappe.datetime.get_today());
  },
  starting_date: function (frm) {
    compare_dates(frm);
  },
  end_date: function (frm) {
    compare_dates(frm);
  },
  validate(frm) {
    compare_dates(frm);
    calc_total_input_qty_consumed(frm);
    calc_total_input_cost(frm);
    calc_apportion(frm);
  },
  refresh: function (frm) {
    frm.add_custom_button("Fetch Updated Rates", () => {
      const items = frm.doc.consumed_by_manufacturing || [];
      for (const item of items) {
        get_item_warehouse_state(item);
      }
    });
  },
});

function compare_dates(frm) {
  let date_1 = frm.doc.starting_date;
  let date_2 = frm.doc.end_date;

  if (!date_1 || !date_2) return 0;
  let x = new Date(date_1);
  var y = new Date(date_2);

  let is_bigger = x > y;
  if (is_bigger) {
    frappe.throw("Start date cannot after end date");
  }
}

function calc_apportion(frm) {
  const total_incoming_cost = frm.doc.total_incoming_value;
  const items = frm.doc.produced_from_manufacturing || [];


  const get_total_cost_of_production = items.reduce((acc, cur) =>{
    return acc + (cur.cost * cur.qty)
  }, 0)

  // for (let item of items) {
  //   if (item.item_code) {
  //     total_qty += item.qty;
  //   }

  //   if (item.item_code && item.apportion) {
  //     remaining_apportion -= item.apportion;
  //     total_qty -= item.qty;
  //   }
  // }
  items.map((cur) => {
    const total_cost  = ((cur.cost * cur.qty) / get_total_cost_of_production) * total_incoming_cost;
    frappe.model.set_value(cur.doctype, cur.name, "valuation", total_cost/cur.qty);
    
    frappe.model.set_value(cur.doctype, cur.name, "total_cost", total_cost);
    
  })
  frappe.model.set_value(frm.doctype, frm.docname, "total_outgoing_value", get_total_cost_of_production);

  // for (let item of items) {
  //   total_cost = item_cost = apportion = 0;

  //   if (item.item_code && item.qty > 0) {
  //     apportion = item.apportion;

  //     if (!apportion) {
  //       apportion = 0;
  //     }

  //     if (apportion === 0) {
  //       apportion = (item.qty / total_qty) * remaining_apportion;
  //       apportion = apportion.toFixed(2);
  //     }

  //     if (apportion > 0) {
  //       total_apportion += parseFloat(apportion);

  //       dt = item.doctype;
  //       dn = item.name;
  //       frappe.model.set_value(dt, dn, "apportion", apportion);

  //       total_cost = (total_incoming_cost / 100) * apportion;
  //       item_cost = total_cost / item.qty;
  //       grand_total_cost += total_cost;

  //       frappe.model.set_value(dt, dn, "cost", item_cost);
  //       frappe.model.set_value(dt, dn, "total_cost", total_cost);
  //     }
  //   }
  // }

  // dt = frm.doctype;
  // dn = frm.docname;
  // frappe.model.set_value(dt, dn, "total_outgoing_value", grand_total_cost);

  // if (parseInt(total_apportion) != 100) {
  //   for (let item of items) {
  //     dt = item.doctype;
  //     dn = item.name;
  //     frappe.model.set_value(dt, dn, "cost", 0);
  //     frappe.model.set_value(dt, dn, "total_cost", 0);
  //   }

  //   dt = frm.doctype;
  //   dn = frm.docname;
  //   frappe.model.set_value(dt, dn, "total_outgoing_value", 0);

  //   frappe.throw("Sum of all Apportions must be equal to 100%");
  // }
}

/******************************************************************************
 * Material Input Document
 ******************************************************************************/

frappe.ui.form.on("Simplified Work Order Input Material", {
  item_code: function (frm, dt, dn) {
    const item = locals[dt][dn];
    get_item_warehouse_state(item);
  },
  qty: function (frm, dt, dn) {
    calc_total_input_cost(frm);
    calc_total_input_qty_consumed(frm);
  },
  cost: function (frm, dt, dn) {
    calc_total_input_cost(frm);
  },
  source_warehouse: function (frm, dt, dn) {
    const item = locals[dt][dn];
    get_item_warehouse_state(item);
  },
});

function calc_total_input_qty_consumed(frm) {
  const items = frm.doc.consumed_by_manufacturing || [];

  let total_qty = 0;

  for (let item of items) {
    if (item.item_code) {
      total_qty += item.qty;
    }
  }

  let dt = frm.doc.doctype;
  let dn = frm.doc.name;

  frappe.model.set_value(dt, dn, "total_qty_consumed", total_qty);
}

function calc_total_input_cost(frm) {
  const items = frm.doc.consumed_by_manufacturing || [];
  let dt = "";
  let dn = "";

  let total_cost = 0;
  let grand_total_cost = 0;

  for (let item of items) {
    total_cost = 0;
    if (item.item_code) {
      total_cost = item.qty * item.cost;
    }

    dt = item.doctype;
    dn = item.name;
    frappe.model.set_value(dt, dn, "total_cost", total_cost);
    grand_total_cost += total_cost;
  }

  dt = frm.doctype;
  dn = frm.docname;

  frappe.model.set_value(dt, dn, "total_incoming_value", grand_total_cost);
}

function get_item_warehouse_state(item) {
  let dt = item.doctype;
  let dn = item.name;
  let warehouse = item.source_warehouse || item.target_warehouse

  if (!item.item_code || !warehouse) {
    frappe.model.set_value(dt, dn, "cost", 0);
    frappe.model.set_value(dt, dn, "qty", 0);
    frappe.model.set_value(dt, dn, "actual_qty", 0);
    frappe.model.set_value(dt, dn, "projected_qty", 0);
    return;
  }

  frappe.call({
    method:
      "simplified_production.api.simplified_work_order.get_item_warehouse_state",
    args: { item_code: item.item_code, warehouse },
    freeze: true,
    btn: $(".primary-action"),
    callback: (r) => {
      const data = r.message;
      if (!data) return;
      const dt = item.doctype;
      const dn = item.name;
      console.log(data)
      frappe.model.set_value(dt, dn, "cost", data.valuation_rate);
      frappe.model.set_value(dt, dn, "actual_qty", data.actual_qty);
      frappe.model.set_value(dt, dn, "projected_qty", data.projected_qty);
    },
    error: (r) => {
      console.error(r);
    },
  });
}

/******************************************************************************
 * Material Output Document
 ******************************************************************************/

frappe.ui.form.on("Simplified Work Order Output Material", {
  item_code: function (frm, dt, dn) {
    const item = locals[dt][dn];
    // get_item_warehouse_state(item);
    
    frappe.model.set_value(dt, dn, "cost", 0);
    frappe.model.set_value(dt, dn, "qty", 0);

  },
  qty: function (frm, dt, dn) {
    calc_total_output_qty_produced(frm);
  },
  target_warehouse: function (frm, dt, dn) {
    const item = locals[dt][dn];
    get_item_warehouse_state(item);
  },
});

function calc_total_output_qty_produced(frm) {
  const items = frm.doc.produced_from_manufacturing || [];

  const totalqty = items.reduce((acc, cur) => {
    return acc + cur.qty
  }, 0)
  
  let dt = frm.doc.doctype;
  let dn = frm.doc.name;

  frappe.model.set_value(dt, dn, "total_qty_produced", totalqty);
}

function calc_total_output_cost(frm) {
  const items = frm.doc.produced_from_manufacturing || [];
  let dt = "";
  let dn = "";

  let total_cost = 0;
  let grand_total_cost = 0;

  for (let item of items) {
    total_cost = 0;
    if (item.item_code) {
      total_cost = item.qty * item.cost;
    }

    dt = item.doctype;
    dn = item.name;
    frappe.model.set_value(dt, dn, "total_cost", total_cost);
    grand_total_cost += total_cost;
  }

  dt = frm.doctype;
  dn = frm.docname;

  frappe.model.set_value(dt, dn, "total_outgoing_value", grand_total_cost);
}
