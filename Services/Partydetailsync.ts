import { database } from '@/Database'
import PartyDetail from '@/Database/models/Partydetails'
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

const BASE_URL = 'http://192.168.29.245:5000'

// ─── API Types ────────────────────────────────────────────────────────────────

export interface PartyDetailApiResponse {
    success: number
    message: string
    data: {
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
        updated_at: string
        deleted_at: string
        invoice_summary: {
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
        invoice_list: {
            sales_invoices: {
                sale_id: string
                voucher_no: string
                txn_date: string
                due_date: string
                gross_total: string
                amount_received: string
                outstanding: string
                payment_status: string
                is_overdue: string
                invoice_type: string
            }[]
            purchase_bills: {
                purchase_id: string
                voucher_no: string
                txn_date: string
                due_date: string
                gross_total: string
                amount_paid_out: string
                outstanding: string
                payment_status: string
                is_overdue: string
            }[]
        }
    }
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

function applyFields(record: PartyDetail, d: PartyDetailApiResponse['data']): void {
    record.partyId = d.party_id
    record.partyName = safeStr(d.party_name)
    record.gstinUin = safeStr(d.gstin_uin)
    record.partyType = safeStr(d.party_type)
    record.address = safeStr(d.address)
    record.email = safeStr(d.email)
    record.phone = safeStr(d.phone)
    record.panNo = safeStr(d.pan_no)
    record.isActive = safeStr(d.is_active)
    record.invoiceSummaryJson = JSON.stringify(d.invoice_summary ?? {})
    record.salesInvoicesJson = JSON.stringify(d.invoice_list?.sales_invoices ?? [])
    record.purchaseBillsJson = JSON.stringify(d.invoice_list?.purchase_bills ?? [])
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getCollection() {
    try {
        return database.get<PartyDetail>('party_details')
    } catch (e) {
        console.error(
            '[partyDetailSync] "party_details" collection not found.\n' +
            'Fix: add PartyDetail to modelClasses and bump schema to version 9.',
            e,
        )
        return null
    }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncPartyDetail(partyId: string): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log(`Offline — serving cached detail for party ${partyId}`)
        return
    }

    try {
        const res = await fetch(
            `${BASE_URL}/api/party/detail?party_id=${partyId}&invoice_details=1`,
            { method: 'GET', headers: await authHeaders() },
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: PartyDetailApiResponse = await res.json()
        if (!json.success) throw new Error(json.message)

        const collection = getCollection()
        if (!collection) throw new Error('"party_details" is null — see console for fix')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('party_id', partyId))
                .fetch()

            if (existing.length > 0) {
                await existing[0].update((r) => applyFields(r, json.data))
            } else {
                await collection.create((r) => applyFields(r, json.data))
            }
        })
    } catch (err) {
        console.warn(`Party detail sync failed for ${partyId}, using cached data:`, err)
    }
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function loadPartyDetail(partyId: string): Promise<PartyDetail | null> {
    const collection = getCollection()
    if (!collection) return null

    const records = await collection
        .query(Q.where('party_id', partyId))
        .fetch()

    return records.length > 0 ? records[0] : null
}   