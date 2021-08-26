import frappe


@frappe.whitelist()
def get_item_warehouse_state(item_code=None, warehouse=None):
    """
    for calculating warehouse item qty from bin
    """
    actual_qty, projected_qty, valuation_rate = 0, 0, 0

    if not item_code or not warehouse:
        frappe.throw("Item Code or Source Warehouse not found")

    stock_item = frappe.db.get_list("Bin",
                                    {
                                        "item_code": item_code,
                                        "warehouse": warehouse
                                    },
                                    ["actual_qty", "projected_qty", "valuation_rate"])

    for row in stock_item:
        actual_qty, projected_qty, valuation_rate = row.actual_qty, row.projected_qty, row.valuation_rate


    if valuation_rate == 0:
        default_item = frappe.get_doc("Item", item_code)
        valuation_rate = default_item.valuation_rate
    response = {
        "actual_qty": actual_qty,
        "projected_qty": projected_qty,
        "valuation_rate": valuation_rate
    }

    return response
