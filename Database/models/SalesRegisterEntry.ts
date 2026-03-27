// Database/models/SalesRegisterEntry.ts
import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export type BtwnDays = 'paid' | 'd0_7' | 'd7_15' | 'd15_30' | 'over_30'

export default class SalesRegisterEntry extends Model {
    static table = 'sales_register_entries'

    // ── Filter keys ───────────────────────────────────────────────────────────
    @field('btwn_days') btwnDays!: BtwnDays
    @field('fiscal_year') fiscalYear!: string

    // ── API fields ────────────────────────────────────────────────────────────
    @field('sale_id') saleId!: string
    @field('voucher_no') voucherNo!: string
    @field('txn_date') txnDate!: string
    @field('due_date') dueDate!: string
    @field('party_name') partyName!: string
    @field('party_id') partyId!: string
    @field('gstin_uin') gstinUin!: string
    @field('gross_total') grossTotal!: number
    @field('amount_received') amountReceived!: number
    @field('outstanding') outstanding!: number
    @field('payment_status') paymentStatus!: string
    @field('status_display') statusDisplay!: string
    @field('invoice_type') invoiceType!: string
    @field('is_overdue') isOverdue!: string   // "0" | "1"
    @field('days_overdue') daysOverdue!: string
    @field('days_until') daysUntil!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
