import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class PurchaseEntry extends Model {
  static table = 'purchase_entries'

  @field('purchase_id') purchaseId!: string
  @field('party_id') partyId!: string
  @field('party_name') partyName!: string
  @field('party_gstin') partyGstin!: string
  @field('party_type') partyType!: string

  @field('month') month!: number
  @field('year') year!: number
  @field('fiscal_year') fiscalYear!: string

  @field('txn_date') txnDate!: string
  @field('voucher_no') voucherNo!: string
  @field('voucher_type') voucherType!: string
  @field('gstin_uin') gstinUin!: string

  @field('quantity') quantity!: string
  @field('rate') rate!: string
  @field('value') value!: string
  @field('gross_total') grossTotal!: number

  // Purchase categories
  @field('raw_material_purchase') rawMaterialPurchase!: string
  @field('job_work_purchase') jobWorkPurchase!: string
  @field('ss_pipe_purchase') ssPipePurchase!: string

  // GST
  @field('cgst_9_purchase') cgst9Purchase!: string
  @field('sgst_9_purchase') sgst9Purchase!: string
  @field('igst_18_purchase') igst18Purchase!: string
  @field('cgst_2_5_purchase') cgst25Purchase!: string
  @field('sgst_2_5_purchase') sgst25Purchase!: string

  // Expenses
  @field('freight_inward_exp') freightInwardExp!: string
  @field('packing_material_exp') packingMaterialExp!: string
  @field('consumable_store') consumableStore!: string
  @field('welding_material_exp') weldingMaterialExp!: string
  @field('polishing_material_exp') polishingMaterialExp!: string
  @field('repairing_maintenance') repairingMaintenance!: string
  @field('misc_exp') miscExp!: string
  @field('pf_charges') pfCharges!: string
  @field('rounding_up') roundingUp!: string

  // Pagination metadata (stored per row for cache-awareness)
  @field('page') page!: number

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
