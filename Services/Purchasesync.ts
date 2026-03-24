import { database } from '@/Database'
import PurchaseEntry from '@/Database/models/PurchaseEntry'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── API Types ────────────────────────────────────────────────────────────────

export interface PurchaseApiItem {
    purchase_id: string
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
    raw_material_purchase: string
    job_work_purchase: string
    ss_pipe_purchase: string
    cgst_9_purchase: string
    sgst_9_purchase: string
    igst_18_purchase: string
    cgst_2_5_purchase: string
    sgst_2_5_purchase: string
    freight_inward_exp: string
    packing_material_exp: string
    consumable_store: string
    welding_material_exp: string
    polishing_material_exp: string
    repairing_maintenance: string
    rounding_up: string
    misc_exp: string
    pf_charges: string
    fiscal_year: string
    created_at: string
}

export interface PurchaseApiResponse {
    success: number
    message: string
    month: number
    year: number
    totalRecords: number
    page: number
    limit: number
    data: PurchaseApiItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: string): number {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
}

function applyPurchaseFields(
    record: PurchaseEntry,
    item: PurchaseApiItem,
    month: number,
    year: number,
    page: number,
): void {
    record.purchaseId = item.purchase_id
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

    record.rawMaterialPurchase = item.raw_material_purchase
    record.jobWorkPurchase = item.job_work_purchase
    record.ssPipePurchase = item.ss_pipe_purchase

    record.cgst9Purchase = item.cgst_9_purchase
    record.sgst9Purchase = item.sgst_9_purchase
    record.igst18Purchase = item.igst_18_purchase
    record.cgst25Purchase = item.cgst_2_5_purchase
    record.sgst25Purchase = item.sgst_2_5_purchase

    record.freightInwardExp = item.freight_inward_exp
    record.packingMaterialExp = item.packing_material_exp
    record.consumableStore = item.consumable_store
    record.weldingMaterialExp = item.welding_material_exp
    record.polishingMaterialExp = item.polishing_material_exp
    record.repairingMaintenance = item.repairing_maintenance
    record.miscExp = item.misc_exp
    record.pfCharges = item.pf_charges
    record.roundingUp = item.rounding_up

    record.page = page
}

// ─── Sync a single page ───────────────────────────────────────────────────────

async function syncPurchasePage(
    month: number,
    year: number,
    page: number,
): Promise<{ totalRecords: number; fetched: number }> {
    const res = await fetch(
        `${ApiEndPoints.BASE_URL}register/purchase_list?month=${month}&year=${year}&page=${page}&limit=10`,
        { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: PurchaseApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const collection = database.get<PurchaseEntry>('purchase_entries')

    await database.write(async () => {
        // Delete existing rows for this month/year/page before inserting fresh
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
                applyPurchaseFields(record, item, month, year, page),
            ),
        )

        await database.batch(...deleteBatch, ...insertBatch)
    })

    return { totalRecords: json.totalRecords, fetched: json.data.length }
}

// ─── Sync all pages for a month ───────────────────────────────────────────────
// Fetches page 1 first to learn totalRecords, then fetches remaining pages.

export async function syncPurchases(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached purchase data')
        return
    }

    try {
        // Page 1
        const { totalRecords } = await syncPurchasePage(month, year, 1)
        const totalPages = Math.ceil(totalRecords / 10)

        // Remaining pages in parallel (cap at 5 concurrent to avoid hammering)
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
        for (let i = 0; i < remaining.length; i += 5) {
            const batch = remaining.slice(i, i + 5)
            await Promise.all(batch.map((p) => syncPurchasePage(month, year, p)))
        }

        console.log(`Purchase sync complete — ${totalRecords} records across ${totalPages} pages`)
    } catch (err) {
        console.warn('Purchase sync failed, using cached data:', err)
    }
}