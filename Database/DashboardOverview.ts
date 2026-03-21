import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export default class DashboardOverview extends Model {
  static table = 'dashboard_overview'

  @field('month') month!: number
  @field('year') year!: number

  // Sales
  @field('total_invoices') totalInvoices!: number
  @field('total_sales') totalSales!: string
  @field('igst_collected') igstCollected!: string
  @field('cgst_collected') cgstCollected!: string
  @field('sgst_collected') sgstCollected!: string

  // Purchase
  @field('total_bills') totalBills!: number
  @field('total_purchase') totalPurchase!: string
  @field('igst_paid') igstPaid!: string
  @field('cgst_paid') cgstPaid!: string
  @field('sgst_paid') sgstPaid!: string

  // Payment
  @field('total_vouchers') totalVouchers!: number
  @field('total_paid') totalPaid!: string

  // Journal
  @field('total_tds_payable') totalTdsPayable!: string
  @field('total_pf') totalPf!: string

  // Profit / Loss
  @field('gross_sales') grossSales!: string
  @field('gross_purchase') grossPurchase!: string
  @field('net') net!: string
  @field('is_profit') isProfit!: string

  // GST Reconcile
  @field('gst_collected') gstCollected!: string
  @field('gst_paid') gstPaid!: string
  @field('net_gst_liability') netGstLiability!: string
  @field('is_payable') isPayable!: string
}
