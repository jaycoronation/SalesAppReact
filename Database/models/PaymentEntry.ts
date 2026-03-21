import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class PaymentEntry extends Model {
    static table = 'payment_entries'

    @field('payment_id') paymentId!: string
    @field('group_id') groupId!: string
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('party_gstin') partyGstin!: string

    @field('month') month!: number
    @field('year') year!: number
    @field('fiscal_year') fiscalYear!: string

    @field('txn_date') txnDate!: string
    @field('particulars') particulars!: string
    @field('vch_type') vchType!: string
    @field('vch_no') vchNo!: string

    @field('debit_amount') debitAmount!: number
    @field('credit_amount') creditAmount!: number
    @field('bank_account') bankAccount!: string
    @field('payment_mode') paymentMode!: string   // "bank" | "cash" etc.

    @field('page') page!: number

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}