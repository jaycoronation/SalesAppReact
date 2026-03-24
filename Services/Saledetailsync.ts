import { database } from '@/Database'
import SaleDetail from '@/Database/models/SalesDetail'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── API Types ────────────────────────────────────────────────────────────────

export interface SaleDetailApiLineItem {
    line_id: number
    item_id: number
    item_name: string
    quantity: string
    rate: string
    value: string
    uom: string
}

export interface SaleDetailApiData {
    sale_id: number
    party_id: number
    party_name: string
    party_gstin: string
    party_type: string
    gstin_uin: string
    txn_date: string
    due_date: string
    payment_status: string
    amount_received: number | null
    particulars: string
    voucher_type: string
    voucher_no: string
    quantity: string
    rate: string | null
    value: string
    gross_total: string
    ogs_sales_gst: string | null
    igst_18_output: string | null
    local_sales_gst: string | null
    cgst_9_on_sales: string | null
    sgst_9_on_sales: string | null
    local_sales_gst_12: string | null
    ogs_jw_sales_18: string | null
    pf_charge: string | null
    rounding_off: string | null
    fiscal_year: string
    remarks: string | null
    created_at: number
    line_items: SaleDetailApiLineItem[]
}

export interface SaleDetailApiResponse {
    success: number
    message: string
    data: SaleDetailApiData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: string | number | null | undefined): number {
    if (val === null || val === undefined) return 0
    const n = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(n) ? 0 : n
}

function safeStr(val: string | null | undefined): string {
    return val ?? ''
}

function applyDetailFields(record: SaleDetail, d: SaleDetailApiData): void {
    record.saleId = String(d.sale_id)
    record.partyId = String(d.party_id)
    record.partyName = safeStr(d.party_name)
    record.partyGstin = safeStr(d.party_gstin)
    record.partyType = safeStr(d.party_type)
    record.gstinUin = safeStr(d.gstin_uin)
    record.fiscalYear = safeStr(d.fiscal_year)
    record.txnDate = safeStr(d.txn_date)
    record.dueDate = safeStr(d.due_date)
    record.voucherNo = safeStr(d.voucher_no)
    record.voucherType = safeStr(d.voucher_type)
    record.particulars = safeStr(d.particulars)
    record.remarks = safeStr(d.remarks)
    record.paymentStatus = safeStr(d.payment_status)
    record.amountReceived = safeNum(d.amount_received)
    record.quantity = safeStr(d.quantity)
    record.rate = safeStr(d.rate)
    record.value = safeStr(d.value)
    record.grossTotal = safeNum(d.gross_total)
    record.ogsSalesGst = safeStr(d.ogs_sales_gst)
    record.localSalesGst = safeStr(d.local_sales_gst)
    record.localSalesGst12 = safeStr(d.local_sales_gst_12)
    record.ogsJwSales18 = safeStr(d.ogs_jw_sales_18)
    record.igst18Output = safeStr(d.igst_18_output)
    record.cgst9OnSales = safeStr(d.cgst_9_on_sales)
    record.sgst9OnSales = safeStr(d.sgst_9_on_sales)
    record.pfCharge = safeStr(d.pf_charge)
    record.roundingOff = safeStr(d.rounding_off)
    record.lineItemsJson = JSON.stringify(d.line_items ?? [])
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getDetailCollection() {
    try {
        return database.get<SaleDetail>('sale_details')
    } catch (e) {
        console.error(
            '[saleDetailSync] "sale_details" collection not found.\n' +
            'Fix: add SaleDetail to modelClasses in @/Database/index.ts\n' +
            'and bump schema version to 6.',
            e,
        )
        return null
    }
}

// ─── Sync single sale detail ──────────────────────────────────────────────────
// Fetches from API if online, updates cache. Caller reads from local DB always.

export async function syncSaleDetail(saleId: string): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log(`Offline — serving cached detail for sale ${saleId}`)
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}register/sales_detail?sale_id=${saleId}`,
            { method: 'GET', headers: await authHeaders() },
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: SaleDetailApiResponse = await res.json()
        if (!json.success) throw new Error(json.message)

        const collection = getDetailCollection()
        if (!collection) throw new Error('"sale_details" collection is null — see console for fix')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('sale_id', saleId))
                .fetch()

            if (existing.length > 0) {
                // Update existing cached record
                await existing[0].update((r) => applyDetailFields(r, json.data))
            } else {
                // Insert new record
                await collection.create((r) => applyDetailFields(r, json.data))
            }
        })
    } catch (err) {
        console.warn(`Sale detail sync failed for ${saleId}, using cached data:`, err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────
// Call this to read the cached detail record after sync.

export async function loadSaleDetail(saleId: string): Promise<SaleDetail | null> {
    const collection = getDetailCollection()
    if (!collection) return null

    const records = await collection
        .query(Q.where('sale_id', saleId))
        .fetch()

    return records.length > 0 ? records[0] : null
}