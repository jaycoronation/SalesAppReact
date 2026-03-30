import { appSchema, tableSchema, } from '@nozbe/watermelondb'



export default appSchema({
  version: 5,
  tables: [
    tableSchema({
      name: 'dashboard_overview',
      columns: [
        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        // sales
        { name: 'total_invoices', type: 'number' },
        { name: 'total_sales', type: 'string' },
        { name: 'igst_collected', type: 'string' },
        { name: 'cgst_collected', type: 'string' },
        { name: 'sgst_collected', type: 'string' },
        // purchase
        { name: 'total_bills', type: 'number' },
        { name: 'total_purchase', type: 'string' },
        { name: 'igst_paid', type: 'string' },
        { name: 'cgst_paid', type: 'string' },
        { name: 'sgst_paid', type: 'string' },
        // payment
        { name: 'total_vouchers', type: 'number' },
        { name: 'total_paid', type: 'string' },
        // journal
        { name: 'total_tds_payable', type: 'string' },
        { name: 'total_pf', type: 'string' },
        // profit_loss
        { name: 'gross_sales', type: 'string' },
        { name: 'gross_purchase', type: 'string' },
        { name: 'net', type: 'string' },
        { name: 'is_profit', type: 'string' },
        // gst_reconcile
        { name: 'gst_collected', type: 'string' },
        { name: 'gst_paid', type: 'string' },
        { name: 'net_gst_liability', type: 'string' },
        { name: 'is_payable', type: 'string' },
      ],

    }),

    // ── NEW: rich dashboard overview v2 ──────────────────────────────────────
    tableSchema({
      name: 'dashboard_overview_v2',
      columns: [
        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'kpi_json', type: 'string' },
        { name: 'net_position_json', type: 'string' },
        { name: 'receivables_aging_json', type: 'string' },
        { name: 'payables_aging_json', type: 'string' },
        { name: 'upcoming_payments_json', type: 'string' },
        { name: 'recent_invoices_json', type: 'string' },
        { name: 'profit_loss_json', type: 'string' },
        { name: 'stock_overview_json', type: 'string', isOptional: true },
        { name: 'stock_grade_overview_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── NEW: upcoming payments (separate API) ─────────────────────────────────
    tableSchema({
      name: 'upcoming_payments',
      columns: [
        { name: 'purchase_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'outstanding', type: 'number' },
        { name: 'payment_status', type: 'string' },
        { name: 'is_overdue', type: 'number' },
        { name: 'days_overdue', type: 'number' },
        { name: 'days_until', type: 'number' },
        { name: 'urgency', type: 'string' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'sync_type', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Top customers & vendors (party_type distinguishes them) ──────────
    tableSchema({
      name: "top_parties",
      columns: [
        { name: "party_type", type: "string" },  // "customer" | "vendor"
        { name: "month", type: "number" },
        { name: "year", type: "number" },
        { name: "party_name", type: "string" },
        { name: "gstin_uin", type: "string" },
        { name: "total_amount", type: "number" },  // sales OR purchase
        { name: "total_count", type: "number" },  // invoices OR bills
        { name: "rank", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ── Monthly trend (trend_type distinguishes sales vs purchase) ───────
    tableSchema({
      name: "monthly_trends",
      columns: [
        { name: "fiscal_year", type: "string" },  // e.g. "2025-26"
        { name: "trend_type", type: "string" },  // "sales" | "purchase"
        { name: "month", type: "string" },  // e.g. "2026-02"
        { name: "total_amount", type: "number" },
        { name: "total_count", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // ── New: purchase entries (paginated) ─────────────────────────────────────
    tableSchema({
      name: 'purchase_entries',
      columns: [
        { name: 'purchase_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_gstin', type: 'string' },
        { name: 'party_type', type: 'string' },

        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'fiscal_year', type: 'string' },

        { name: 'txn_date', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'voucher_type', type: 'string' },
        { name: 'gstin_uin', type: 'string' },

        { name: 'quantity', type: 'string' },
        { name: 'rate', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'gross_total', type: 'number' },

        { name: 'raw_material_purchase', type: 'string' },
        { name: 'job_work_purchase', type: 'string' },
        { name: 'ss_pipe_purchase', type: 'string' },

        { name: 'cgst_9_purchase', type: 'string' },
        { name: 'sgst_9_purchase', type: 'string' },
        { name: 'igst_18_purchase', type: 'string' },
        { name: 'cgst_2_5_purchase', type: 'string' },
        { name: 'sgst_2_5_purchase', type: 'string' },

        { name: 'freight_inward_exp', type: 'string' },
        { name: 'packing_material_exp', type: 'string' },
        { name: 'consumable_store', type: 'string' },
        { name: 'welding_material_exp', type: 'string' },
        { name: 'polishing_material_exp', type: 'string' },
        { name: 'repairing_maintenance', type: 'string' },
        { name: 'misc_exp', type: 'string' },
        { name: 'pf_charges', type: 'string' },
        { name: 'rounding_up', type: 'string' },

        { name: 'page', type: 'number' },

        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── purchase details (single record) ──────────────────────────────────────
    tableSchema({
      name: 'purchase_details',
      columns: [
        { name: 'purchase_id', type: 'string', isIndexed: true },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_gstin', type: 'string' },
        { name: 'party_type', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'voucher_type', type: 'string' },
        { name: 'particulars', type: 'string' },
        { name: 'remarks', type: 'string' },
        { name: 'payment_status', type: 'string' },
        { name: 'amount_paid_out', type: 'number' },
        { name: 'quantity', type: 'string' },
        { name: 'rate', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'gross_total', type: 'number' },
        { name: 'raw_material_purchase', type: 'string' },
        { name: 'ss_pipe_purchase', type: 'string' },
        { name: 'job_work_purchase', type: 'string' },
        { name: 'packing_material_exp', type: 'string' },
        { name: 'consumable_store', type: 'string' },
        { name: 'welding_material_exp', type: 'string' },
        { name: 'polishing_material_exp', type: 'string' },
        { name: 'freight_inward_exp', type: 'string' },
        { name: 'repairing_maintenance', type: 'string' },
        { name: 'misc_exp', type: 'string' },
        { name: 'pf_charges', type: 'string' },
        { name: 'cgst_9_purchase', type: 'string' },
        { name: 'sgst_9_purchase', type: 'string' },
        { name: 'igst_18_purchase', type: 'string' },
        { name: 'cgst_2_5_purchase', type: 'string' },
        { name: 'sgst_2_5_purchase', type: 'string' },
        { name: 'rounding_up', type: 'string' },
        { name: 'line_items_json', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── sale entries ──────────────────────────────────────────────────────────
    tableSchema({
      name: 'sale_entries',
      columns: [
        { name: 'sale_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_gstin', type: 'string' },
        { name: 'party_type', type: 'string' },
        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'voucher_type', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'quantity', type: 'string' },
        { name: 'rate', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'gross_total', type: 'number' },
        { name: 'ogs_sales_gst', type: 'string' },
        { name: 'local_sales_gst', type: 'string' },
        { name: 'local_sales_gst_12', type: 'string' },
        { name: 'ogs_jw_sales_18', type: 'string' },
        { name: 'igst_18_output', type: 'string' },
        { name: 'cgst_9_on_sales', type: 'string' },
        { name: 'sgst_9_on_sales', type: 'string' },
        { name: 'pf_charge', type: 'string' },
        { name: 'rounding_off', type: 'string' },
        { name: 'page', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── payment entries ───────────────────────────────────────────────────────
    tableSchema({
      name: 'payment_entries',
      columns: [
        { name: 'payment_id', type: 'string' },
        { name: 'group_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_gstin', type: 'string' },
        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'particulars', type: 'string' },
        { name: 'vch_type', type: 'string' },
        { name: 'vch_no', type: 'string' },
        { name: 'debit_amount', type: 'number' },
        { name: 'credit_amount', type: 'number' },
        { name: 'bank_account', type: 'string' },
        { name: 'payment_mode', type: 'string' },
        { name: 'page', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Sale Detail (paginated) ───────────────────────────────────────────────
    tableSchema({
      name: 'sale_details',
      columns: [
        { name: 'sale_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_gstin', type: 'string' },
        { name: 'party_type', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'voucher_type', type: 'string' },
        { name: 'particulars', type: 'string' },
        { name: 'remarks', type: 'string' },
        { name: 'payment_status', type: 'string' },
        { name: 'amount_received', type: 'number' },
        { name: 'quantity', type: 'string' },
        { name: 'rate', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'gross_total', type: 'number' },
        { name: 'ogs_sales_gst', type: 'string' },
        { name: 'local_sales_gst', type: 'string' },
        { name: 'local_sales_gst_12', type: 'string' },
        { name: 'ogs_jw_sales_18', type: 'string' },
        { name: 'igst_18_output', type: 'string' },
        { name: 'cgst_9_on_sales', type: 'string' },
        { name: 'sgst_9_on_sales', type: 'string' },
        { name: 'pf_charge', type: 'string' },
        { name: 'rounding_off', type: 'string' },
        { name: 'line_items_json', type: 'string' },  // JSON array of line items
        { name: 'page', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── parties ───────────────────────────────────────────────────────────────
    tableSchema({
      name: 'parties',
      columns: [
        { name: 'party_id', type: 'string', isIndexed: true },
        { name: 'party_name', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'party_type', type: 'string' },  // "vendor"|"customer"|"both"
        { name: 'address', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'pan_no', type: 'string' },
        { name: 'is_active', type: 'string' },
        { name: 'invoice_details_json', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── party details (single record with invoice list) ────────────────────
    tableSchema({
      name: 'party_details',
      columns: [
        { name: 'party_id', type: 'string', isIndexed: true },
        { name: 'party_name', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'party_type', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'pan_no', type: 'string' },
        { name: 'is_active', type: 'string' },
        { name: 'invoice_summary_json', type: 'string' },
        { name: 'sales_invoices_json', type: 'string' },
        { name: 'purchase_bills_json', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── purchase register (aging drill-down) ──────────────────────────────────
    tableSchema({
      name: 'purchase_register_entries',
      columns: [
        { name: 'purchase_id', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'gross_total', type: 'number' },
        { name: 'amount_paid_out', type: 'number' },
        { name: 'outstanding', type: 'number' },
        { name: 'payment_status', type: 'string' },
        { name: 'status_display', type: 'string' },
        { name: 'is_overdue', type: 'string' },
        { name: 'days_overdue', type: 'string' },
        { name: 'days_until', type: 'string' },
        { name: 'btwn_days', type: 'string', isIndexed: true },
        { name: 'fiscal_year', type: 'string' },
        { name: 'page', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'sales_register_entries',    // new table
      columns: [
        { name: 'btwn_days', type: 'string' },
        { name: 'fiscal_year', type: 'string' },
        { name: 'sale_id', type: 'string' },
        { name: 'voucher_no', type: 'string' },
        { name: 'txn_date', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'party_name', type: 'string' },
        { name: 'party_id', type: 'string' },
        { name: 'gstin_uin', type: 'string' },
        { name: 'gross_total', type: 'number' },
        { name: 'amount_received', type: 'number' },
        { name: 'outstanding', type: 'number' },
        { name: 'payment_status', type: 'string' },
        { name: 'status_display', type: 'string' },
        { name: 'invoice_type', type: 'string' },
        { name: 'is_overdue', type: 'string' },
        { name: 'days_overdue', type: 'string' },
        { name: 'days_until', type: 'string' },
      ],
    }),

    // In your schema file — add this table:
    tableSchema({
      name: 'stock_grade_details',
      columns: [
        { name: 'month', type: 'number' },
        { name: 'year', type: 'number' },
        { name: 'inwards_json', type: 'string' },
        { name: 'outwards_json', type: 'string' },
      ],
    })

  ],
})
