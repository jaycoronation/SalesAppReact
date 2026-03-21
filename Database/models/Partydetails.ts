import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export interface PartyInvoiceSummarySection {
    invoice_count: string
    total_invoiced: string
    amount_received: string
    amount_due: string
    paid_count: string
    unpaid_count: string
}

export interface PartyBillSummarySection {
    bill_count: string
    total_billed: string
    amount_paid_out: string
    amount_due: string
    paid_count: string
    unpaid_count: string
}

export interface PartyInvoiceSummary {
    sales: PartyInvoiceSummarySection
    purchases: PartyBillSummarySection
}

export interface SaleInvoiceListItem {
    sale_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    gross_total: string
    amount_received: string
    outstanding: string
    payment_status: string   // "paid" | "unpaid" | "partial"
    is_overdue: string       // "0" | "1"
    invoice_type: string     // "Local" | "OGS" etc.
}

export interface PurchaseBillListItem {
    purchase_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    gross_total: string
    amount_paid_out: string
    outstanding: string
    payment_status: string
    is_overdue: string
}

export default class PartyDetail extends Model {
    static table = 'party_details'

    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('gstin_uin') gstinUin!: string
    @field('party_type') partyType!: string
    @field('address') address!: string
    @field('email') email!: string
    @field('phone') phone!: string
    @field('pan_no') panNo!: string
    @field('is_active') isActive!: string

    // Nested objects stored as JSON
    @field('invoice_summary_json') invoiceSummaryJson!: string
    @field('sales_invoices_json') salesInvoicesJson!: string
    @field('purchase_bills_json') purchaseBillsJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    get invoiceSummary(): PartyInvoiceSummary {
        try { return JSON.parse(this.invoiceSummaryJson || '{}') }
        catch { return { sales: {} as any, purchases: {} as any } }
    }

    get salesInvoices(): SaleInvoiceListItem[] {
        try { return JSON.parse(this.salesInvoicesJson || '[]') }
        catch { return [] }
    }

    get purchaseBills(): PurchaseBillListItem[] {
        try { return JSON.parse(this.purchaseBillsJson || '[]') }
        catch { return [] }
    }
}