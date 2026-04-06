// Database/models/SalesRegisterEntry.ts
import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export type BtwnDays = 'paid' | 'd0_7' | 'd7_15' | 'd15_30' | 'over_30'

export default class SalesRegisterEntry extends Model {
    static table = 'sales_register_entries'

    // ── Party-level fields (from new API) ─────────────────────────────────────
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('gross_total') grossTotal!: string
    @field('amount_received') amountReceived!: string
    @field('outstanding') outstanding!: string
    @field('payment_status') paymentStatus!: string
    @field('status_display') statusDisplay!: string

    // ── Bucket & section classification ───────────────────────────────────────

    /** 'due' | 'upcoming'  — which envelope this row came from */

    @field('section') section!: string

    /** 'paid' | 'd0_7' | 'd7_15' | 'd15_30' | 'over_30' **/

    @field('btwn_days') btwnDays!: string
    @field('nearest_due_date') nearestDueDate!: string

    // ── Timestamps (managed by WatermelonDB) ──────────────────────────────────
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
