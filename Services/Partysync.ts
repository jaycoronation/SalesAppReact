import { database } from '@/Database'
import Party from '@/Database/models/Party'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── API Types ────────────────────────────────────────────────────────────────

export interface PartyApiItem {
    party_id: string
    party_name: string
    gstin_uin: string
    party_type: string
    address: string
    email: string
    phone: string
    pan_no: string
    is_active: string
    created_at: string
    invoice_details: {
        sales: {
            invoice_count: string
            total_invoiced: string
            amount_received: string
            amount_due: string
            paid_count: string
            unpaid_count: string
        }
        purchases: {
            bill_count: string
            total_billed: string
            amount_paid_out: string
            amount_due: string
            paid_count: string
            unpaid_count: string
        }
    }
}

export interface PartyApiResponse {
    success: number
    message: string
    totalRecords: number
    page: number
    limit: number
    data: PartyApiItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeStr(val: string | null | undefined): string {
    return val ?? ''
}

function applyPartyFields(record: Party, item: PartyApiItem): void {
    record.partyId = item.party_id
    record.partyName = safeStr(item.party_name)
    record.gstinUin = safeStr(item.gstin_uin)
    record.partyType = safeStr(item.party_type)
    record.address = safeStr(item.address)
    record.email = safeStr(item.email)
    record.phone = safeStr(item.phone)
    record.panNo = safeStr(item.pan_no)
    record.isActive = safeStr(item.is_active)
    record.invoiceDetailsJson = JSON.stringify(item.invoice_details ?? {})
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getPartyCollection() {
    try {
        return database.get<Party>('parties')
    } catch (e) {
        console.error(
            '[partySync] "parties" collection not found.\n' +
            'Fix: add Party to modelClasses in @/Database/index.ts\n' +
            'and bump schema version to 8.',
            e,
        )
        return null
    }
}

// ─── Sync all parties ─────────────────────────────────────────────────────────
// All 96 parties come in one shot (limit:500), so no pagination needed.
// Strategy: delete all → insert fresh (simplest correctness guarantee).

export async function syncParties(): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached party data')
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}party/list?invoice_details=1`,
            { method: 'GET', headers: await authHeaders() },
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: PartyApiResponse = await res.json()
        if (!json.success) throw new Error(json.message)

        const collection = getPartyCollection()
        if (!collection) throw new Error('"parties" collection is null — see console for fix')

        await database.write(async () => {
            // Delete all existing rows
            const existing = await collection.query().fetch()
            const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

            // Insert fresh
            const insertBatch = json.data.map((item) =>
                collection.prepareCreate((record) => applyPartyFields(record, item)),
            )

            await database.batch(...deleteBatch, ...insertBatch)
        })

    } catch (err) {
        console.warn('Party sync failed, using cached data:', err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadParties(filter?: 'vendor' | 'customer' | 'both'): Promise<Party[]> {
    const collection = getPartyCollection()
    if (!collection) return []

    if (filter) {
        return collection
            .query(Q.where('party_type', filter), Q.sortBy('party_name', Q.asc))
            .fetch()
    }

    return collection.query(Q.sortBy('party_name', Q.asc)).fetch()
}

export async function loadPartyById(partyId: string): Promise<Party | null> {
    const collection = getPartyCollection()
    if (!collection) return null

    const records = await collection
        .query(Q.where('party_id', partyId))
        .fetch()

    return records.length > 0 ? records[0] : null
}