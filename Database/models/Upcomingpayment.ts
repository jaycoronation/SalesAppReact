import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class UpcomingPayment extends Model {
    static table = 'upcoming_payments'

    @field('purchase_id') purchaseId!: string
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('voucher_no') voucherNo!: string
    @field('txn_date') txnDate!: string    // unix timestamp
    @field('due_date') dueDate!: string    // unix timestamp
    @field('outstanding') outstanding!: number
    @field('payment_status') paymentStatus!: string
    @field('is_overdue') isOverdue!: number  // 0 | 1
    @field('days_overdue') daysOverdue!: number
    @field('days_until') daysUntil!: number
    @field('urgency') urgency!: string    // "overdue"|"critical"|"urgent"|"upcoming"
    @field('fiscal_year') fiscalYear!: string
    @field('sync_type') syncType!: string   // "upcoming" | "overdue"

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}