import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export interface LineItem {
    line_id: number
    item_id: number
    item_name: string
    quantity: string
    rate: string
    value: string
    uom: string
}

export default class SaleDetail extends Model {
    static table = 'sale_details'

    @field('sale_id') saleId!: string
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('party_gstin') partyGstin!: string
    @field('party_type') partyType!: string
    @field('gstin_uin') gstinUin!: string

    @field('fiscal_year') fiscalYear!: string
    @field('txn_date') txnDate!: string       // unix timestamp
    @field('due_date') dueDate!: string       // unix timestamp
    @field('voucher_no') voucherNo!: string
    @field('voucher_type') voucherType!: string
    @field('particulars') particulars!: string
    @field('remarks') remarks!: string

    @field('payment_status') paymentStatus!: string  // "paid" | "unpaid" | "partial"
    @field('amount_received') amountReceived!: number

    @field('quantity') quantity!: string
    @field('rate') rate!: string
    @field('value') value!: string
    @field('gross_total') grossTotal!: number

    // Sales categories
    @field('ogs_sales_gst') ogsSalesGst!: string
    @field('local_sales_gst') localSalesGst!: string
    @field('local_sales_gst_12') localSalesGst12!: string
    @field('ogs_jw_sales_18') ogsJwSales18!: string

    // GST output
    @field('igst_18_output') igst18Output!: string
    @field('cgst_9_on_sales') cgst9OnSales!: string
    @field('sgst_9_on_sales') sgst9OnSales!: string
    @field('pf_charge') pfCharge!: string
    @field('rounding_off') roundingOff!: string

    // Line items stored as JSON string (WatermelonDB has no array type)
    @field('line_items_json') lineItemsJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    // Convenience getter — parse line items on the fly
    get lineItems(): LineItem[] {
        try {
            return JSON.parse(this.lineItemsJson || '[]')
        } catch {
            return []
        }
    }
}