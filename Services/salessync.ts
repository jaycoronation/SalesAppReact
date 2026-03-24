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

// ─── Sync a single page ───────────────────────────────────────────────────────

async function syncSalePage(
    month: number,
    year: number,
    page: number,
): Promise<{ totalRecords: number }> {
    const res = await fetch(
        `${ApiEndPoints.BASE_URL}register/sales_list?month=${month}&year=${year}`,
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
                Q.where('month', month),
                Q.where('year', year),
                Q.where('page', page),
            )
            .fetch()

        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())
        const insertBatch = json.data.map((item) =>
            collection.prepareCreate((record) =>
                applySaleFields(record, item, month, year, page),
            ),
        )

        await database.batch(...deleteBatch, ...insertBatch)
    })

    return { totalRecords: json.totalRecords }
}

// ─── Sync all pages ───────────────────────────────────────────────────────────

export async function syncSales(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached sales data')
        return
    }

    try {
        const { totalRecords } = await syncSalePage(month, year, 1)
        const totalPages = Math.ceil(totalRecords / 10)

        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
        for (let i = 0; i < remaining.length; i += 5) {
            await Promise.all(
                remaining.slice(i, i + 5).map((p) => syncSalePage(month, year, p)),
            )
        }

        console.log(`Sales sync complete — ${totalRecords} records, ${totalPages} pages`)
    } catch (err) {
        console.warn('Sales sync failed, using cached data:', err)
    }
}