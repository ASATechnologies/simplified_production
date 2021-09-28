# -*- coding: utf-8 -*-
# Copyright (c) 2021, xyz and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
# import frappe
from frappe.model.document import Document
import frappe


class SimplifiedWorkOrder(Document):
    def on_submit(self):
        '''
        Submit
        '''
        items_have_changed_cost = set()

        doc = frappe.new_doc('Stock Entry')
        doc.stock_entry_type = "Manufacture"
        doc.set_posting_time = 1
        doc.posting_date = self.posting_date
        doc.company = self.company
        doc.simplified_work_order = self.name

        for row in self.consumed_by_manufacturing:
            valuation_rate = 0
            stock_item = frappe.db.get_list("Bin",
                                            {
                                                "item_code": row.item_code,
                                                "warehouse": row.source_warehouse
                                            },
                                            ["valuation_rate"])
           
            for item in stock_item:
                valuation_rate = item.valuation_rate

            if valuation_rate != row.cost:
                items_have_changed_cost.add(row.item_code)

        if len(items_have_changed_cost):
            changed_items = "<br>"
            for item in items_have_changed_cost:
                changed_items += item + "<br>"

            frappe.throw(
                f"Following items cost was changed after you create this work order {changed_items}")

        for row in self.consumed_by_manufacturing:
            doc.append('items', {
                "item_code": row.item_code,
                "s_warehouse": row.source_warehouse,
                "qty": row.qty,
                'basic_rate': row.cost
            })

        for row in self.produced_from_manufacturing:
            doc.append('items', {
                "item_code": row.item_code,
                "t_warehouse": row.target_warehouse,
                "qty": row.qty,
                "basic_rate": row.valuation
            })
        doc.insert()
        doc.save()
        doc.submit()
        frappe.msgprint(f'Stock Entry: {doc.name} created')
