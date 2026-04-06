/**
 * PurchaseRegisterEntry — WatermelonDB model
 *
 * ⚠️  SCHEMA MIGRATION REQUIRED
 *  • Bump your schema version to the next integer (e.g. 12).
 *  • Add a migration step that:
 *      - addColumns('purchase_register_entries', [
 *          { name: 'section', type: 'string' },   ← NEW
 *        ])
 *  • Old columns (purchase_id, voucher_no, txn_date, due_date,
 *    is_overdue, days_overdue, days_until, fiscal_year, page)
 *    can stay in the schema as nullable strings — WatermelonDB
 *    does not drop columns.  Simply remove them from this model
 *    class so TypeScript stops referencing them.
 */

import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class PurchaseRegisterEntry extends Model {
    static table = 'purchase_register_entries'

    // ── Party-level fields (from new API) ─────────────────────────────────────
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('gross_total') grossTotal!: number
    @field('amount_paid_out') amountPaidOut!: number
    @field('outstanding') outstanding!: number
    @field('payment_status') paymentStatus!: string
    @field('status_display') statusDisplay!: string

    // ── Bucket & section classification ───────────────────────────────────────
    /** 'due' | 'upcoming'  — which envelope this row came from */
    @field('section') section!: string
    /** 'd0_7' | 'd7_15' | 'd15_30'  — which btwn_days query produced this row */
    @field('btwn_days') btwnDays!: string
    @field('nearest_due_date') nearestDueDate!: string

    // ── Timestamps (managed by WatermelonDB) ──────────────────────────────────
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}