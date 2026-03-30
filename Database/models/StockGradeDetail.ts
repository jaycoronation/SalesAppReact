import { Model } from '@nozbe/watermelondb'
import { field, json } from '@nozbe/watermelondb/decorators'

// ─── Sanitizers (WatermelonDB json() requires these) ──────────────────────────

const sanitizeObj = (raw: any) => (raw && typeof raw === 'object' ? raw : {})
const sanitizeArr = (raw: any) => (Array.isArray(raw) ? raw : [])

// ─── Model ────────────────────────────────────────────────────────────────────

export default class StockGradeDetail extends Model {
  static table = 'stock_grade_details'

  @field('month') month!: number
  @field('year') year!: number

  // Store inwards and outwards as JSON blobs — same pattern as DashboardOverviewV2
  @json('inwards_json', sanitizeObj) inwardsJson!: any
  @json('outwards_json', sanitizeObj) outwardsJson!: any

  // ── Parsed accessors ───────────────────────────────────────────────────────

  get inwards() {
    return this.inwardsJson ?? {}
  }

  get outwards() {
    return this.outwardsJson ?? {}
  }
}
