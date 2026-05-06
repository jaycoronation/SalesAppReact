import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                addColumns({
                    table: 'dashboard_overview_v2',
                    columns: [
                        { name: 'profit_loss_json', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 3,
            steps: [
                createTable({
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
            ],
        },
        {
            toVersion: 4,
            steps: [
                addColumns({
                    table: 'dashboard_overview_v2',
                    columns: [
                        { name: 'stock_overview_json', type: 'string', isOptional: true },
                        { name: 'stock_grade_overview_json', type: 'string', isOptional: true },
                    ],
                }),
                createTable({
                    name: 'sales_register_entries',
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
            ],
        },
        {
            toVersion: 5,
            steps: [
                createTable({
                    name: 'stock_grade_details',
                    columns: [
                        { name: 'month', type: 'number' },
                        { name: 'year', type: 'number' },
                        { name: 'inwards_json', type: 'string', isOptional: true },
                        { name: 'outwards_json', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 6,
            steps: [
                addColumns({
                    table: 'purchase_register_entries',
                    columns: [
                        { name: 'section', type: 'string' },
                    ],
                }),
            ],
        },
        {
            toVersion: 7,
            steps: [
                addColumns({
                    table: 'sales_register_entries',
                    columns: [
                        { name: 'section', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 8,
            steps: [
                createTable({
                    name: 'sale_invoice_entries',
                    columns: [
                        { name: 'sale_id', type: 'string' },
                        { name: 'voucher_no', type: 'string' },
                        { name: 'txn_date', type: 'string' },
                        { name: 'due_date', type: 'string' },
                        { name: 'party_name', type: 'string' },
                        { name: 'party_id', type: 'string' },
                        { name: 'gstin_uin', type: 'string' },
                        { name: 'gross_total', type: 'string' },
                        { name: 'amount_received', type: 'string' },
                        { name: 'outstanding', type: 'string' },
                        { name: 'payment_status', type: 'string' },
                        { name: 'status_display', type: 'string' },
                        { name: 'invoice_type', type: 'string' },
                        { name: 'is_overdue', type: 'string' },
                        { name: 'days_overdue', type: 'string' },
                        { name: 'days_until', type: 'string' },
                        { name: 'month', type: 'string' },
                        { name: 'year', type: 'string' },
                    ],
                }),
            ],
        },
        {
            toVersion: 9,
            steps: [
                // WatermelonDB does not support changeColumn — handled by JS layer.
            ],
        },
        {
            toVersion: 10,
            steps: [
                addColumns({
                    table: 'dashboard_overview_v2',
                    columns: [
                        { name: 'conversion_generate_json', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 11,
            steps: [
                addColumns({
                    table: 'purchase_details',
                    columns: [{ name: 'tds', type: 'string', isOptional: true }],
                }),
                addColumns({
                    table: 'sale_details',
                    columns: [{ name: 'tds', type: 'string', isOptional: true }],
                }),
            ],
        },
        {
            toVersion: 12,
            steps: [
                // gross_total, amount_paid_out, outstanding, page changed number→string.
                // SQLite handles this dynamically; no migration step needed.
            ],
        },
        {
            toVersion: 13,
            steps: [
                // Add tab_type column to scope rows as "Sales" or "Purchase"
                addColumns({
                    table: 'sale_invoice_entries',
                    columns: [
                        { name: 'tab_type', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 14,
            steps: [
                addColumns({
                    table: 'dashboard_overview_v2',
                    columns: [
                        // stock_grade_summary_json removed — use grade_summary table instead
                        // We keep it optional here just to prevent immediate migration failure if it was somehow used elsewhere,
                        // but ideally we should remove it entirely.
                        { name: 'stock_grade_summary_json', type: 'string', isOptional: true },
                    ],
                }),
                createTable({
                    name: 'grade_summary',
                    columns: [
                        { name: 'month', type: 'number' },
                        { name: 'year', type: 'number' },
                        { name: 'grade', type: 'string', isIndexed: true },
                        { name: 'opening', type: 'string' },
                        { name: 'inward', type: 'string' },
                        { name: 'outward', type: 'string' },
                        { name: 'closing', type: 'string' },
                    ],
                }),
            ],
        },

    ],
})