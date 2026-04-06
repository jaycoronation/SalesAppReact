import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

/**
 * ⚠️  SCHEMA MIGRATION REQUIRED — bump schema version by 1 and add:
 *
 *  addColumns('dashboard_overview_v2', [
 *    { name: 'conversion_generate_json', type: 'string', isOptional: true },
 *  ])
 */

// ─── Primitive sub-types ──────────────────────────────────────────────────────

export interface StockOverviewRow {
    qty: string
    value: string
    avg: string
}

export interface StockOverview {
    opening: StockOverviewRow
    inwards: StockOverviewRow
    outwards: StockOverviewRow
    total: StockOverviewRow
}

export interface StockGradeItem {
    details: string
    grade: string
    qty: string
    avg: string
    value: string
}

export interface ProfitLoss {
    gross_sales: string
    gross_purchase: string
    net: string
    is_profit: string
}

export interface KpiSales {
    total_invoices: string
    total_sales: string
    mom_change_pct: string
    mom_direction: string
    sparkline?: number[]
}

export interface KpiPurchases {
    total_bills: string
    total_purchase: string
    mom_change_pct: string
    mom_direction: string
}

export interface KpiGst {
    output_tax: string
    input_tax_credit: string
    net_payable: string
    is_refund: string
}

export interface KpiTds {
    total_entries: string
    total_tds: string
}

export interface NetPosition {
    total_receivable: string
    total_payable: string
    net: string
    overdue_receivable: string
    overdue_payable: string
}

// ─── Aging types ──────────────────────────────────────────────────────────────

export interface AgingBucket {
    label: string
    amount: string
    count: string
}

export interface AgingSection {
    total_outstanding: string
    total_count: string
    buckets: {
        paid: AgingBucket
        d0_7: AgingBucket
        d7_15: AgingBucket
        d15_30: AgingBucket
        over_30: AgingBucket
    }
}

export interface AgingData {
    due: AgingSection
    upcoming: AgingSection
}

// ─── Upcoming payments ────────────────────────────────────────────────────────

export interface UpcomingPaymentItem {
    purchase_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    party_name: string
    gstin_uin: string
    outstanding: string
    payment_status: string
    is_overdue: string
    days_overdue: string
    days_until: string
    urgency: string   // "overdue" | "critical" | "urgent" | "upcoming"
}

export interface RecentInvoiceItem {
    sale_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    party_name: string
    party_id: string
    gstin_uin: string
    gross_total: string
    amount_received: string
    outstanding: string
    payment_status: string
    status_display: string
    invoice_type: string
    is_overdue: string
    days_overdue: string
    days_until: string
}

// ─── Conversion / Generate types ──────────────────────────────────────────────

/** A single grade row inside prod_conv or jw_conv */
export interface ConversionRow {
    details: string
    grade: string
    qty: string
    avg_rate: string
    value: string
}

/** A totals row (no grade, just qty + value) */
export interface ConversionTotal {
    details: string
    grade: string
    qty: string
    avg_rate: string
    value: string
}

/** One conversion block — either prod_conv or jw_conv */
export interface ConversionBlock {
    rows: ConversionRow[]
    total: ConversionTotal
}

/**
 * Top-level conversion_generate object.
 * Shape from API:
 *   { prod_conv: { rows, total }, jw_conv: { rows, total }, net_total: { qty, value, … } }
 */
export interface ConversionGenerate {
    prod_conv: ConversionBlock
    jw_conv: ConversionBlock
    net_total: ConversionTotal
}

// ─── WatermelonDB model ───────────────────────────────────────────────────────

export default class DashboardOverviewV2 extends Model {
    static table = 'dashboard_overview_v2'

    @field('month') month!: number
    @field('year') year!: number

    // All sections stored as serialised JSON strings
    @field('kpi_json') kpiJson!: string
    @field('net_position_json') netPositionJson!: string
    @field('receivables_aging_json') receivablesAgingJson!: string
    @field('payables_aging_json') payablesAgingJson!: string
    @field('upcoming_payments_json') upcomingPaymentsJson!: string
    @field('recent_invoices_json') recentInvoicesJson!: string
    @field('profit_loss_json') profitLossJson!: string
    @field('stock_overview_json') stockOverviewJson!: string
    @field('stock_grade_overview_json') stockGradeOverviewJson!: string
    /** NEW — requires schema migration (addColumns above) */
    @field('conversion_generate_json') conversionGenerateJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    // ── Parsed getters ─────────────────────────────────────────────────────────

    get kpi(): { sales: KpiSales; purchases: KpiPurchases; gst: KpiGst; tds: KpiTds } {
        try { return JSON.parse(this.kpiJson || '{}') } catch { return {} as any }
    }

    get netPosition(): NetPosition {
        try { return JSON.parse(this.netPositionJson || '{}') } catch { return {} as any }
    }

    get receivablesAging(): AgingData {
        try { return JSON.parse(this.receivablesAgingJson || '{}') } catch { return {} as any }
    }

    get payablesAging(): AgingData {
        try { return JSON.parse(this.payablesAgingJson || '{}') } catch { return {} as any }
    }

    get upcomingOverdue(): UpcomingPaymentItem[] {
        try {
            const d = JSON.parse(this.upcomingPaymentsJson || '{}')
            return d.overdue ?? []
        } catch { return [] }
    }

    get upcomingUpcoming(): UpcomingPaymentItem[] {
        try {
            const d = JSON.parse(this.upcomingPaymentsJson || '{}')
            return d.upcoming ?? []
        } catch { return [] }
    }

    get totalOverdueCount(): string {
        try { return JSON.parse(this.upcomingPaymentsJson || '{}').total_overdue ?? '' }
        catch { return '' }
    }

    get totalOverdueAmount(): string {
        try { return JSON.parse(this.upcomingPaymentsJson || '{}').total_overdue_amount ?? '' }
        catch { return '' }
    }

    get totalUpcomingCount(): string {
        try { return JSON.parse(this.upcomingPaymentsJson || '{}').total_upcoming ?? '' }
        catch { return '' }
    }

    get totalUpcomingAmount(): string {
        try { return JSON.parse(this.upcomingPaymentsJson || '{}').total_upcoming_amount ?? '' }
        catch { return '' }
    }

    get recentInvoices(): RecentInvoiceItem[] {
        try { return JSON.parse(this.recentInvoicesJson || '[]') } catch { return [] }
    }

    get profitLoss(): ProfitLoss {
        try { return JSON.parse(this.profitLossJson || '{}') } catch { return {} as any }
    }

    get stockOverview(): StockOverview {
        try { return JSON.parse(this.stockOverviewJson || '{}') } catch { return {} as any }
    }

    get stockGradeOverview(): StockGradeItem[] {
        try { return JSON.parse(this.stockGradeOverviewJson || '[]') } catch { return [] }
    }

    /** Conversion & generate data (prod + job-work) */
    get conversionGenerate(): ConversionGenerate | null {
        try {
            const d = JSON.parse(this.conversionGenerateJson || 'null')
            return d && d.prod_conv ? d : null
        } catch { return null }
    }
}
