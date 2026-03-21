import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export interface PartyInvoiceSummary {
    invoice_count: string
    total_invoiced: string
    amount_received: string
    amount_due: string
    paid_count: string
    unpaid_count: string
}

export interface PartyBillSummary {
    bill_count: string
    total_billed: string
    amount_paid_out: string
    amount_due: string
    paid_count: string
    unpaid_count: string
}

export interface PartyInvoiceDetails {
    sales: PartyInvoiceSummary
    purchases: PartyBillSummary
}

export default class Party extends Model {
    static table = 'parties'

    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('party_type') partyType!: string   // "vendor" | "customer" | "both"
    @field('address') address!: string
    @field('email') email!: string
    @field('phone') phone!: string
    @field('pan_no') panNo!: string
    @field('is_active') isActive!: string

    // Nested invoice_details stored as JSON string
    @field('invoice_details_json') invoiceDetailsJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    get invoiceDetails(): PartyInvoiceDetails {
        try {
            const parsed = JSON.parse(this.invoiceDetailsJson || '{}')
            const emptySales: PartyInvoiceSummary = {
                invoice_count: '0', total_invoiced: '0', amount_received: '0',
                amount_due: '0', paid_count: '0', unpaid_count: '0',
            }
            const emptyPurchases: PartyBillSummary = {
                bill_count: '0', total_billed: '0', amount_paid_out: '0',
                amount_due: '0', paid_count: '0', unpaid_count: '0',
            }
            return {
                sales: parsed?.sales ?? emptySales,
                purchases: parsed?.purchases ?? emptyPurchases,
            }
        } catch {
            return {
                sales: { invoice_count: '0', total_invoiced: '0', amount_received: '0', amount_due: '0', paid_count: '0', unpaid_count: '0' },
                purchases: { bill_count: '0', total_billed: '0', amount_paid_out: '0', amount_due: '0', paid_count: '0', unpaid_count: '0' },
            }
        }
    }
}