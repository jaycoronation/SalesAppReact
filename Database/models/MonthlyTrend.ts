import { Model } from "@nozbe/watermelondb"
import { field, date, readonly } from "@nozbe/watermelondb/decorators"

// One row per month per trend_type ("sales" | "purchase") per fiscal year.
export default class MonthlyTrend extends Model {
  static table = "monthly_trends"

  @field("fiscal_year")    fiscalYear!: string   // e.g. "2025-26"
  @field("trend_type")     trendType!: string    // "sales" | "purchase"
  @field("month")          month!: string        // e.g. "2026-02"
  @field("total_amount")   totalAmount!: number  // total_sales OR total_purchase
  @field("total_count")    totalCount!: number   // total_invoices OR total_bills

  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}
