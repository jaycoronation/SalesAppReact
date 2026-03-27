import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,  // bump version from 1 → 2
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
                })
            ]
        }
    ],
})