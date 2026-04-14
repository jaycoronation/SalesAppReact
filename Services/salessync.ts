import { database } from '@/Database'
import SaleEntry from '@/Database/models/SalesEntry'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── API Types ────────────────────────────────────────────────────────────────

export interface SaleApiItem {
    sale_id: string
    party_id: string
    party_name: string
    party_gstin: string
    party_type: string
    txn_date: string
    particulars: string
    voucher_type: string
    voucher_no: string
    gstin_uin: string
    quantity: string
    rate: string
    value: string
    gross_total: string
    ogs_sales_gst: string
    igst_18_output: string
    rounding_off: string
    local_sales_gst: string
    cgst_9_on_sales: string
    sgst_9_on_sales: string
    pf_charge: string
    local_sales_gst_12: string
    ogs_jw_sales_18: string
    fiscal_year: string
    created_at: string
}

export interface SaleApiResponse {
    success: number
    message: string
    month: number
    year: number
    totalRecords: number
    page: number
    limit: number
    data: SaleApiItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: string): number {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
}

function applySaleFields(
    record: SaleEntry,
    item: SaleApiItem,
    month: number,
    year: number,
    page: number,
): void {
    record.saleId = item.sale_id
    record.partyId = item.party_id
    record.partyName = item.party_name
    record.partyGstin = item.party_gstin
    record.partyType = item.party_type
    record.month = month
    record.year = year
    record.fiscalYear = item.fiscal_year
    record.txnDate = item.txn_date
    record.voucherNo = item.voucher_no
    record.voucherType = item.voucher_type
    record.gstinUin = item.gstin_uin
    record.quantity = item.quantity
    record.rate = item.rate
    record.value = item.value
    record.grossTotal = safeNum(item.gross_total)
    record.ogsSalesGst = item.ogs_sales_gst
    record.localSalesGst = item.local_sales_gst
    record.localSalesGst12 = item.local_sales_gst_12
    record.ogsJwSales18 = item.ogs_jw_sales_18
    record.igst18Output = item.igst_18_output
    record.cgst9OnSales = item.cgst_9_on_sales
    record.sgst9OnSales = item.sgst_9_on_sales
    record.pfCharge = item.pf_charge
    record.roundingOff = item.rounding_off
    record.page = page
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getSaleCollection() {
    try {
        return database.get<SaleEntry>('sale_entries')
    } catch (e) {
        console.error(
            '[salesSync] "sale_entries" collection not found.\n' +
            'Fix: add SaleEntry to modelClasses in @/Database/index.ts\n' +
            'and bump schema version to 4.',
            e,
        )
        return null
    }
}

// ─── Build API URL ─────────────────────────────────────────────────────────────

function buildSalesUrl(
    month: number,
    year: number,
    page: number,
    dueFrom?: number,
    dueTo?: number,
): string {
    let url = `${ApiEndPoints.BASE_URL}register/sales_list?month=${month}&year=${year}&page=${page}&limit=10`
    if (dueFrom != null) url += `&due_from=${dueFrom}`
    if (dueTo != null) url += `&due_to=${dueTo}`
    return url
}

// ─── Sync a single page ───────────────────────────────────────────────────────

async function syncSalePage(
    month: number,
    year: number,
    page: number,
    dueFrom?: number,
    dueTo?: number,
    cMonth: number = month,
    cYear: number = year,
): Promise<{ totalRecords: number }> {
    const res = await fetch(
        buildSalesUrl(month, year, page, dueFrom, dueTo),
        { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: SaleApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const collection = getSaleCollection()
    if (!collection) throw new Error('"sale_entries" collection is null — see console for fix')

    await database.write(async () => {
        const existing = await collection
            .query(
                Q.where('month', cMonth),
                Q.where('year', cYear),
                Q.where('page', page),
            )
            .fetch()

        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())
        const insertBatch = json.data.map((item) =>
            collection.prepareCreate((record) =>
                applySaleFields(record, item, cMonth, cYear, page),
            ),
        )

        await database.batch([...deleteBatch, ...insertBatch])
    })

    return { totalRecords: json.totalRecords }
}

// ─── Sync all pages ───────────────────────────────────────────────────────────
//
// Options:
//   dueFrom / dueTo — Unix timestamps (seconds) forwarded to the API as
//                     due_from / due_to query params (used when navigating
//                     from a notification to scope the result set).
//   force           — When true, always fetch from the network even if
//                     local data already exists (used for pull-to-refresh).

export async function syncSales(
    month: number,
    year: number,
    dueFrom?: number,
    dueTo?: number,
    force = false,
    cacheMonth?: number,
    cacheYear?: number,
): Promise<void> {
    const cMonth = cacheMonth ?? month
    const cYear = cacheYear ?? year

    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached sales data')
        return
    }

    // ── Local-first cache check ───────────────────────────────────────────────
    // If the caller doesn't need a forced refresh and we already have records
    // for this month/year in the local DB, skip the network round-trip.
    if (!force) {
        const collection = getSaleCollection()
        if (collection) {
            const cachedCount = await collection
                .query(Q.where('month', cMonth), Q.where('year', cYear))
                .fetchCount()

            if (cachedCount > 0) {
                console.log(`Sales: ${cachedCount} cached records found — skipping network sync`)
                return
            }
        }
    } else {
        // Full wipe on force sync to remove ghost records and page shifts
        const collection = getSaleCollection()
        if (collection) {
            await database.write(async () => {
                const allCached = await collection
                    .query(Q.where('month', cMonth), Q.where('year', cYear))
                    .fetch()
                const deleteBatch = allCached.map((r) => r.prepareDestroyPermanently())
                if (deleteBatch.length > 0) {
                    await database.batch(...deleteBatch)
                }
            })
        }
    }

    // ── Network sync ──────────────────────────────────────────────────────────
    try {
        const { totalRecords } = await syncSalePage(month, year, 1, dueFrom, dueTo, cMonth, cYear)
        const totalPages = Math.ceil(totalRecords / 10)

        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
        for (let i = 0; i < remaining.length; i += 5) {
            await Promise.all(
                remaining.slice(i, i + 5).map((p) => syncSalePage(month, year, p, dueFrom, dueTo, cMonth, cYear)),
            )
        }

        console.log(`Sales sync complete — ${totalRecords} records, ${totalPages} pages`)
    } catch (err) {
        console.warn('Sales sync failed, using cached data:', err)
    }
}