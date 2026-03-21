import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class SaleEntry extends Model {
    static table = 'sale_entries'

    @field('sale_id') saleId!: string
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

    // Sales categories
    @field('ogs_sales_gst') ogsSalesGst!: string       // OGS sales @ 18%
    @field('local_sales_gst') localSalesGst!: string     // Local sales @ 18%
    @field('local_sales_gst_12') localSalesGst12!: string   // Local sales @ 12%
    @field('ogs_jw_sales_18') ogsJwSales18!: string      // OGS job work @ 18%

    // GST output
    @field('igst_18_output') igst18Output!: string
    @field('cgst_9_on_sales') cgst9OnSales!: string
    @field('sgst_9_on_sales') sgst9OnSales!: string

    // Other
    @field('pf_charge') pfCharge!: string
    @field('rounding_off') roundingOff!: string

    // Pagination metadata
    @field('page') page!: number

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}