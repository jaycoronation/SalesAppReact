import { database } from '@/Database'
import PurchaseDetail from '@/Database/models/Purchasedetail'
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

const BASE_URL = 'http://192.168.29.245:5000'

// ─── API Types ────────────────────────────────────────────────────────────────

export interface PurchaseDetailLineItem {
    line_id: string
    item_id: string
    item_name: string
    quantity: string
    rate: string
    value: string
    uom: string
}

export interface PurchaseDetailApiData {
    purchase_id: string
    party_id: string
    party_name: string
    party_gstin: string
    party_type: string
    gstin_uin: string
    txn_date: string
    due_date: string           // unix timestamp as string e.g. "1773772190"
    payment_status: string
    amount_paid_out: string
    particulars: string
    voucher_type: string
    voucher_no: string
    quantity: string
    rate: string
    value: string
    gross_total: string
    raw_material_purchase: string
    ss_pipe_purchase: string
    job_work_purchase: string
    packing_material_exp: string
    consumable_store: string
    welding_material_exp: string
    polishing_material_exp: string
    freight_inward_exp: string
    repairing_maintenance: string
    misc_exp: string
    pf_charges: string
    cgst_9_purchase: string
    sgst_9_purchase: string
    igst_18_purchase: string
    cgst_2_5_purchase: string
    sgst_2_5_purchase: string
    rounding_up: string
    fiscal_year: string
    remarks: string
    created_at: string
    deleted_at: string
    line_items: PurchaseDetailLineItem[]
}

export interface PurchaseDetailApiResponse {
    success: number
    message: string
    data: PurchaseDetailApiData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: string | null | undefined): number {
    if (!val) return 0
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
}

function safeStr(val: string | null | undefined): string {
    return val ?? ''
}

function applyDetailFields(record: PurchaseDetail, d: PurchaseDetailApiData): void {
    record.purchaseId = d.purchase_id
    record.partyId = d.party_id
    record.partyName = safeStr(d.party_name)
    record.partyGstin = safeStr(d.party_gstin)
    record.partyType = safeStr(d.party_type)
    record.gstinUin = safeStr(d.gstin_uin)
    record.fiscalYear = safeStr(d.fiscal_year)
    record.txnDate = safeStr(d.txn_date)
    record.dueDate = safeNum(d.due_date)    // parse unix string → number
    record.voucherNo = safeStr(d.voucher_no)
    record.voucherType = safeStr(d.voucher_type)
    record.particulars = safeStr(d.particulars)
    record.remarks = safeStr(d.remarks)
    record.paymentStatus = safeStr(d.payment_status)
    record.amountPaidOut = safeNum(d.amount_paid_out)
    record.quantity = safeStr(d.quantity)
    record.rate = safeStr(d.rate)
    record.value = safeStr(d.value)
    record.grossTotal = safeNum(d.gross_total)
    record.rawMaterialPurchase = safeStr(d.raw_material_purchase)
    record.ssPipePurchase = safeStr(d.ss_pipe_purchase)
    record.jobWorkPurchase = safeStr(d.job_work_purchase)
    record.packingMaterialExp = safeStr(d.packing_material_exp)
    record.consumableStore = safeStr(d.consumable_store)
    record.weldingMaterialExp = safeStr(d.welding_material_exp)
    record.polishingMaterialExp = safeStr(d.polishing_material_exp)
    record.freightInwardExp = safeStr(d.freight_inward_exp)
    record.repairingMaintenance = safeStr(d.repairing_maintenance)
    record.miscExp = safeStr(d.misc_exp)
    record.pfCharges = safeStr(d.pf_charges)
    record.cgst9Purchase = safeStr(d.cgst_9_purchase)
    record.sgst9Purchase = safeStr(d.sgst_9_purchase)
    record.igst18Purchase = safeStr(d.igst_18_purchase)
    record.cgst25Purchase = safeStr(d.cgst_2_5_purchase)
    record.sgst25Purchase = safeStr(d.sgst_2_5_purchase)
    record.roundingUp = safeStr(d.rounding_up)
    record.lineItemsJson = JSON.stringify(d.line_items ?? [])
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getDetailCollection() {
    try {
        return database.get<PurchaseDetail>('purchase_details')
    } catch (e) {
        console.error(
            '[purchaseDetailSync] "purchase_details" collection not found.\n' +
            'Fix: add PurchaseDetail to modelClasses in @/Database/index.ts\n' +
            'and bump schema version to 7.',
            e,
        )
        return null
    }
}

// ─── Sync single purchase detail ──────────────────────────────────────────────

export async function syncPurchaseDetail(purchaseId: string): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log(`Offline — serving cached detail for purchase ${purchaseId}`)
        return
    }

    try {
        const res = await fetch(
            `${BASE_URL}/api/register/purchase_detail?purchase_id=${purchaseId}`,
            { method: 'GET', headers: await authHeaders() },
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: PurchaseDetailApiResponse = await res.json()
        if (!json.success) throw new Error(json.message)

        const collection = getDetailCollection()
        if (!collection) throw new Error('"purchase_details" collection is null — see console for fix')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('purchase_id', purchaseId))
                .fetch()

            if (existing.length > 0) {
                await existing[0].update((r) => applyDetailFields(r, json.data))
            } else {
                await collection.create((r) => applyDetailFields(r, json.data))
            }
        })
    } catch (err) {
        console.warn(`Purchase detail sync failed for ${purchaseId}, using cached data:`, err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadPurchaseDetail(purchaseId: string): Promise<PurchaseDetail | null> {
    const collection = getDetailCollection()
    if (!collection) return null

    const records = await collection
        .query(Q.where('purchase_id', purchaseId))
        .fetch()

    return records.length > 0 ? records[0] : null
}