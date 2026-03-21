import { Model } from "@nozbe/watermelondb"
import { field, date, readonly } from "@nozbe/watermelondb/decorators"

// Shared model for both top_customers and top_vendors.
// The `party_type` field distinguishes them: "customer" | "vendor"
export default class TopParty extends Model {
  static table = "top_parties"

  @field("party_type")    partyType!: string   // "customer" | "vendor"
  @field("month")         month!: number        // e.g. 2
  @field("year")          year!: number         // e.g. 2026
  @field("party_name")    partyName!: string
  @field("gstin_uin")     gstinUin!: string
  @field("total_amount")  totalAmount!: number  // sales OR purchase value
  @field("total_count")   totalCount!: number   // invoices OR bills
  @field("rank")          rank!: number         // 1–10 position

  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}
