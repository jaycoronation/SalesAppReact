import { database } from '@/Database'
import MonthlyTrend from '@/Database/models/MonthlyTrend'
import TopParty from '@/Database/models/TopParty'
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'
import DashboardOverview from '../Database/DashboardOverview'
import {
  DashboardApiData,
  DashboardApiResponse,
  MonthlyTrendApiResponse,
  TopPartiesApiResponse,
} from './types'

const BASE_URL = 'http://192.168.29.245:5000' // ← replace with your base URL

// ─── Shared Auth Header ───────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SessionManager.getToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token ?? ''}`,
  }
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

function applyFields(record: DashboardOverview, data: DashboardApiData): void {
  const { sales, purchase, payment, journal, profit_loss, gst_reconcile } = data

  record.month = data.month
  record.year = data.year

  record.totalInvoices = sales.total_invoices
  record.totalSales = sales.total_sales
  record.igstCollected = sales.igst_collected
  record.cgstCollected = sales.cgst_collected
  record.sgstCollected = sales.sgst_collected

  record.totalBills = purchase.total_bills
  record.totalPurchase = purchase.total_purchase
  record.igstPaid = purchase.igst_paid
  record.cgstPaid = purchase.cgst_paid
  record.sgstPaid = purchase.sgst_paid

  record.totalVouchers = payment.total_vouchers
  record.totalPaid = payment.total_paid

  record.totalTdsPayable = journal.total_tds_payable
  record.totalPf = journal.total_pf

  record.grossSales = profit_loss.gross_sales
  record.grossPurchase = profit_loss.gross_purchase
  record.net = profit_loss.net
  record.isProfit = profit_loss.is_profit

  record.gstCollected = gst_reconcile.gst_collected
  record.gstPaid = gst_reconcile.gst_paid
  record.netGstLiability = gst_reconcile.net_gst_liability
  record.isPayable = gst_reconcile.is_payable
}

export async function syncDashboard(month: number, year: number): Promise<void> {
  const { isConnected } = await NetInfo.fetch()
  if (!isConnected) {
    console.log('Offline — serving cached dashboard data')
    return
  }

  try {
    const res = await fetch(
      `${BASE_URL}/api/register/dashboard_overview?month=${month}&year=${year}`,
      { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: DashboardApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const collection = database.get<DashboardOverview>('dashboard_overview')

    await database.write(async () => {
      const existing = await collection
        .query(Q.where('month', month), Q.where('year', year))
        .fetch()

      if (existing.length > 0) {
        await existing[0].update((r) => applyFields(r, json.data))
      } else {
        await collection.create((r) => applyFields(r, json.data))
      }
    })
  } catch (err) {
    console.warn('Dashboard sync failed, using cached data:', err)
  }
}

// ─── Top Parties (customers + vendors) ───────────────────────────────────────

export async function syncTopParties(month: number, year: number): Promise<void> {
  const { isConnected } = await NetInfo.fetch()
  if (!isConnected) {
    console.log('Offline — serving cached top parties data')
    return
  }

  try {
    const res = await fetch(
      `${BASE_URL}/api/register/dashboard_top-parties?month=${month}&year=${year}`,
      { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: TopPartiesApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const { top_customers, top_vendors } = json.data
    const collection = database.get<TopParty>('top_parties')

    await database.write(async () => {
      // Delete stale rows for this period
      const existing = await collection
        .query(Q.where('month', month), Q.where('year', year))
        .fetch()
      const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

      const customerBatch = top_customers.map((c, i) =>
        collection.prepareCreate((record) => {
          record.partyType = 'customer'
          record.month = month
          record.year = year
          record.partyName = c.party_name
          record.gstinUin = c.gstin_uin
          record.totalAmount = parseFloat(c.total_sales)
          record.totalCount = c.total_invoices
          record.rank = i + 1
        }),
      )

      const vendorBatch = top_vendors.map((v, i) =>
        collection.prepareCreate((record) => {
          record.partyType = 'vendor'
          record.month = month
          record.year = year
          record.partyName = v.party_name
          record.gstinUin = v.gstin_uin
          record.totalAmount = parseFloat(v.total_purchase)
          record.totalCount = v.total_bills
          record.rank = i + 1
        }),
      )

      await database.batch(...deleteBatch, ...customerBatch, ...vendorBatch)
    })
  } catch (err) {
    console.warn('Top parties sync failed, using cached data:', err)
  }
}

// ─── Monthly Trends (sales + purchase) ───────────────────────────────────────

export async function syncMonthlyTrends(fiscalYear: string): Promise<void> {
  const { isConnected } = await NetInfo.fetch()
  if (!isConnected) {
    console.log('Offline — serving cached monthly trends data')
    return
  }

  try {
    const res = await fetch(
      `${BASE_URL}/api/register/dashboard_monthly-trend?fiscal_year=${fiscalYear}`,
      { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: MonthlyTrendApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const { fiscal_year, sales, purchase } = json.data
    const collection = database.get<MonthlyTrend>('monthly_trends')

    await database.write(async () => {
      // Delete stale rows for this fiscal year
      const existing = await collection
        .query(Q.where('fiscal_year', fiscal_year))
        .fetch()
      const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

      const salesBatch = sales.map((s) =>
        collection.prepareCreate((record) => {
          record.fiscalYear = fiscal_year
          record.trendType = 'sales'
          record.month = s.month
          record.totalAmount = parseFloat(s.total_sales)
          record.totalCount = s.total_invoices
        }),
      )

      const purchaseBatch = purchase.map((p) =>
        collection.prepareCreate((record) => {
          record.fiscalYear = fiscal_year
          record.trendType = 'purchase'
          record.month = p.month
          record.totalAmount = parseFloat(p.total_purchase)
          record.totalCount = p.total_bills
        }),
      )

      await database.batch(...deleteBatch, ...salesBatch, ...purchaseBatch)
    })
  } catch (err) {
    console.warn('Monthly trends sync failed, using cached data:', err)
  }
}

// ─── Combined sync — call this from DashboardScreen ──────────────────────────
// Runs all three syncs in parallel for the given month/year/fiscalYear.

export async function syncDashboardData(
  month: number,
  year: number,
  fiscalYear: string,
): Promise<void> {
  await Promise.all([
    syncDashboard(month, year),
    syncTopParties(month, year),
    syncMonthlyTrends(fiscalYear),
  ])
}