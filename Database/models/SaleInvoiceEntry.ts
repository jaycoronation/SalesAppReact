/**
 * SaleInvoiceEntry — WatermelonDB model
 *
 * ⚠️  SCHEMA MIGRATION REQUIRED — see migrations.ts (toVersion: 13)
 *     Adds `tab_type` column to scope Sales vs Purchase rows.
 *
 * NOTE: txn_date / due_date are stored as strings ("DD MMM, YYYY")
 *       because the API returns human-readable dates, not unix timestamps.
 */

import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class SaleInvoiceEntry extends Model {
    static table = 'sale_invoice_entries'

    // ── Invoice fields ────────────────────────────────────────────────────────
    @field('sale_id') saleId!: string
    @field('voucher_no') voucherNo!: string
    @field('txn_date') txnDate!: string        // "DD MMM, YYYY"
    @field('due_date') dueDate!: string        // "DD MMM, YYYY"
    @field('party_name') partyName!: string
    @field('party_id') partyId!: string
    @field('gstin_uin') gstinUin!: string
    @field('gross_total') grossTotal!: string
    @field('amount_received') amountReceived!: string // mapped from amount_settled
    @field('outstanding') outstanding!: string
    @field('payment_status') paymentStatus!: string  // "paid" | "unpaid" | "partial"
    @field('status_display') statusDisplay!: string
    @field('invoice_type') invoiceType!: string    // "Local" | "OGS" | "Purchase" etc.
    @field('is_overdue') isOverdue!: string      // "0" | "1"
    @field('days_overdue') daysOverdue!: string
    @field('days_until') daysUntil!: string

    // ── Sync / query metadata ─────────────────────────────────────────────────
    @field('month') month!: string
    @field('year') year!: string
    @field('tab_type') tabType!: string        // "Sales" | "Purchase"

    // ── Timestamps ────────────────────────────────────────────────────────────
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    // ── Derived helpers ───────────────────────────────────────────────────────

    /**
     * Maps this invoice to one of the four aging bucket keys.
     * For overdue invoices → use days_overdue.
     * For upcoming invoices → use days_until.
     */
    get agingBucket(): 'd0_7' | 'd7_15' | 'd15_30' | 'over_30' {
        const days = Number(this.isOverdue === '1' ? this.daysOverdue : this.daysUntil)
        if (days <= 7) return 'd0_7'
        if (days <= 15) return 'd7_15'
        if (days <= 30) return 'd15_30'
        return 'over_30'
    }

    /** 'due' | 'upcoming' | 'paid' — mirrors the receivables_aging envelope */
    get section(): 'due' | 'upcoming' | 'paid' {
        if (this.paymentStatus === 'paid') return 'paid'
        return this.isOverdue === '1' ? 'due' : 'upcoming'
    }
}