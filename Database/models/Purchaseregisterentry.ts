import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class PurchaseRegisterEntry extends Model {
    static table = 'purchase_register_entries'

    @field('purchase_id') purchaseId!: string
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('voucher_no') voucherNo!: string
    @field('txn_date') txnDate!: string
    @field('due_date') dueDate!: string
    @field('gross_total') grossTotal!: number
    @field('amount_paid_out') amountPaidOut!: number
    @field('outstanding') outstanding!: number
    @field('payment_status') paymentStatus!: string
    @field('status_display') statusDisplay!: string
    @field('is_overdue') isOverdue!: string    // "0" | "1"
    @field('days_overdue') daysOverdue!: string
    @field('days_until') daysUntil!: string
    @field('btwn_days') btwnDays!: string     // bucket key: "paid"|"d0_7"|"d7_15"|"d15_30"|"over_30"
    @field('fiscal_year') fiscalYear!: string
    @field('page') page!: number

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}