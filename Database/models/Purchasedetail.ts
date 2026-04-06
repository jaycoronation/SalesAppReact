import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export interface PurchaseLineItem {
    line_id: string
    item_id: string
    item_name: string
    quantity: string
    rate: string
    value: string
    uom: string
}

export default class PurchaseDetail extends Model {
    static table = 'purchase_details'

    @field('purchase_id') purchaseId!: string
    @field('party_id') partyId!: string
    @field('party_name') partyName!: string
    @field('party_gstin') partyGstin!: string
    @field('party_type') partyType!: string
    @field('gstin_uin') gstinUin!: string

    @field('fiscal_year') fiscalYear!: string
    @field('txn_date') txnDate!: string    // "27 Feb, 2026" — string from API
    @field('due_date') dueDate!: string    // unix timestamp string → stored as number
    @field('voucher_no') voucherNo!: string
    @field('voucher_type') voucherType!: string
    @field('particulars') particulars!: string
    @field('remarks') remarks!: string

    @field('payment_status') paymentStatus!: string  // "paid" | "unpaid" | "partial"
    @field('amount_paid_out') amountPaidOut!: number

    @field('quantity') quantity!: string
    @field('rate') rate!: string
    @field('value') value!: string
    @field('gross_total') grossTotal!: number

    // Purchase categories
    @field('raw_material_purchase') rawMaterialPurchase!: string
    @field('ss_pipe_purchase') ssPipePurchase!: string
    @field('job_work_purchase') jobWorkPurchase!: string

    // Expenses
    @field('packing_material_exp') packingMaterialExp!: string
    @field('consumable_store') consumableStore!: string
    @field('welding_material_exp') weldingMaterialExp!: string
    @field('polishing_material_exp') polishingMaterialExp!: string
    @field('freight_inward_exp') freightInwardExp!: string
    @field('repairing_maintenance') repairingMaintenance!: string
    @field('misc_exp') miscExp!: string
    @field('pf_charges') pfCharges!: string

    // GST
    @field('cgst_9_purchase') cgst9Purchase!: string
    @field('sgst_9_purchase') sgst9Purchase!: string
    @field('igst_18_purchase') igst18Purchase!: string
    @field('cgst_2_5_purchase') cgst25Purchase!: string
    @field('sgst_2_5_purchase') sgst25Purchase!: string
    @field('rounding_up') roundingUp!: string
    @field('tds') tds!: string

    // Line items as JSON string
    @field('line_items_json') lineItemsJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    get lineItems(): PurchaseLineItem[] {
        try {
            return JSON.parse(this.lineItemsJson || '[]')
        } catch {
            return []
        }
    }
}