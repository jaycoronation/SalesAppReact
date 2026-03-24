import PartyDetail, {
  PurchaseBillListItem,
  SaleInvoiceListItem,
} from '@/Database/models/Partydetails'
import { loadPartyDetail, syncPartyDetail } from '@/Services/Partydetailsync'
import { Colors } from '@/utils/colors'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'sales' | 'purchases'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (!n || isNaN(n)) return '₹0'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function getStatusStyle(status: string, isOverdue: string) {
  if (isOverdue === '1' && status !== 'paid') {
    return { badge: s.badgeOverdue, text: s.badgeTextOverdue }
  }
  switch (status?.toLowerCase()) {
    case 'paid': return { badge: s.badgePaid, text: s.badgeTextPaid }
    case 'partial': return { badge: s.badgePartial, text: s.badgeTextPartial }
    default: return { badge: s.badgeUnpaid, text: s.badgeTextUnpaid }
  }
}

function getStatusLabel(status: string, isOverdue: string): string {
  if (isOverdue === '1' && status !== 'paid') return 'Overdue'
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unpaid'
}

function getTypeColor(type: string) {
  switch (type) {
    case 'customer': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    case 'vendor': return { bg: Colors.brandColorLight, text: '#1D4ED8', border: Colors.brandColor }
    default: return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }
  }
}

// ─── Summary Stat ─────────────────────────────────────────────────────────────

function Stat({
  label, value, accent,
}: { label: string; value: string; accent?: 'green' | 'red' | 'amber' }) {
  return (
    <View style={s.stat}>
      <Text style={[
        s.statValue,
        accent === 'green' && s.accentGreen,
        accent === 'red' && s.accentRed,
        accent === 'amber' && s.accentAmber,
      ]}>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ─── Sales Invoice Row ────────────────────────────────────────────────────────

function SaleRow({ item }: { item: SaleInvoiceListItem }) {
  const st = getStatusStyle(item.payment_status, item.is_overdue)
  const hasOutstanding = parseFloat(item.outstanding) > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.invoiceRow}
      onPress={() =>
        router.push({
          pathname: '/SaleDetailScreen',
          params: { saleId: item.sale_id },
        })
      }
    >
      {/* Left */}
      <View style={s.invoiceLeft}>
        <View style={s.invoiceTopRow}>
          <Text style={s.voucherNo}>{item.voucher_no}</Text>
          {!!item.invoice_type && (
            <View style={s.typePill}>
              <Text style={s.typePillText}>{item.invoice_type}</Text>
            </View>
          )}
        </View>
        <Text style={s.invoiceDates}>
          {item.txn_date}  ·  Due: {item.due_date}
        </Text>
      </View>

      {/* Right */}
      <View style={s.invoiceRight}>
        <Text style={s.invoiceTotal}>{formatAmount(item.gross_total)}</Text>
        {hasOutstanding && (
          <Text style={s.invoiceOutstanding}>
            Due: {formatAmount(item.outstanding)}
          </Text>
        )}
        <View style={st.badge}>
          <Text style={st.text}>{getStatusLabel(item.payment_status, item.is_overdue)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Purchase Bill Row ────────────────────────────────────────────────────────

function PurchaseRow({ item }: { item: PurchaseBillListItem }) {
  const st = getStatusStyle(item.payment_status, item.is_overdue)
  const hasOutstanding = parseFloat(item.outstanding) > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.invoiceRow}
      onPress={() =>
        router.push({
          pathname: '/PurchaseDetailScreen',
          params: { purchaseId: item.purchase_id },
        })
      }
    >
      {/* Left */}
      <View style={s.invoiceLeft}>
        <Text style={s.voucherNo}>{item.voucher_no}</Text>
        <Text style={s.invoiceDates}>
          {item.txn_date}  ·  Due: {item.due_date}
        </Text>
      </View>

      {/* Right */}
      <View style={s.invoiceRight}>
        <Text style={[s.invoiceTotal, s.purchaseTotal]}>
          {formatAmount(item.gross_total)}
        </Text>
        {hasOutstanding && (
          <Text style={s.invoiceOutstanding}>
            Due: {formatAmount(item.outstanding)}
          </Text>
        )}
        <View style={st.badge}>
          <Text style={st.text}>{getStatusLabel(item.payment_status, item.is_overdue)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartyDetailScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>()

  const [detail, setDetail] = useState<PartyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('sales')

  const load = useCallback(async () => {
    const cached = await loadPartyDetail(partyId)
    if (cached) setDetail(cached)
  }, [partyId])

  const runSync = useCallback(async () => {
    setSyncing(true)
    await syncPartyDetail(partyId)
    const fresh = await loadPartyDetail(partyId)
    if (fresh) setDetail(fresh)
    setSyncing(false)
  }, [partyId])

  useEffect(() => {
    load().finally(() => setLoading(false))
    runSync()
  }, [load, runSync])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !detail) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Party Detail' }} />
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Party Detail' }} />
        <Text style={s.errorText}>Party not found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={runSync}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const summary = detail.invoiceSummary
  const salesInvoices = detail.salesInvoices
  const purchaseBills = detail.purchaseBills
  const typeColor = getTypeColor(detail.partyType)

  const salesDue = parseFloat(summary.sales?.amount_due || '0')
  const purchaseDue = parseFloat(summary.purchases?.amount_due || '0')

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: detail.partyName }} />

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <Text style={s.partyName}>{detail.partyName}</Text>
            {!!detail.gstinUin && (
              <Text style={s.gstin}>{detail.gstinUin}</Text>
            )}
          </View>
          <View style={s.heroRight}>
            <View style={[s.typeBadge, { backgroundColor: typeColor.bg, borderColor: typeColor.border }]}>
              <Text style={[s.typeText, { color: typeColor.text }]}>
                {detail.partyType.charAt(0).toUpperCase() + detail.partyType.slice(1)}
              </Text>
            </View>
            {syncing && <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginTop: 6 }} />}
          </View>
        </View>

        {/* Contact info if available */}
        {(!!detail.phone || !!detail.email || !!detail.address) && (
          <View style={s.contactRow}>
            {!!detail.phone && <Text style={s.contactText}>📞 {detail.phone}</Text>}
            {!!detail.email && <Text style={s.contactText}>✉ {detail.email}</Text>}
            {!!detail.address && <Text style={s.contactText}>📍 {detail.address}</Text>}
          </View>
        )}

        {/* PAN */}
        {!!detail.panNo && (
          <Text style={s.pan}>PAN: {detail.panNo}</Text>
        )}
      </View>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <View style={s.summaryRow}>
        {/* Sales summary */}
        <View style={[s.summaryCard, s.summaryCardSales]}>
          <Text style={s.summaryCardTitle}>Sales</Text>
          <View style={s.statsGrid}>
            <Stat label="Invoiced" value={formatAmount(summary.sales?.total_invoiced || '0')} accent="green" />
            <Stat label="Received" value={formatAmount(summary.sales?.amount_received || '0')} />
            <Stat label="Due" value={formatAmount(summary.sales?.amount_due || '0')} accent={salesDue > 0 ? 'red' : undefined} />
            <Stat label="Invoices" value={`${summary.sales?.invoice_count || 0} (${summary.sales?.unpaid_count || 0} unpaid)`} />
          </View>
        </View>

        {/* Purchase summary */}
        <View style={[s.summaryCard, s.summaryCardPurchase]}>
          <Text style={s.summaryCardTitle}>Purchases</Text>
          <View style={s.statsGrid}>
            <Stat label="Billed" value={formatAmount(summary.purchases?.total_billed || '0')} accent="red" />
            <Stat label="Paid" value={formatAmount(summary.purchases?.amount_paid_out || '0')} />
            <Stat label="Due" value={formatAmount(summary.purchases?.amount_due || '0')} accent={purchaseDue > 0 ? 'amber' : undefined} />
            <Stat label="Bills" value={`${summary.purchases?.bill_count || 0} (${summary.purchases?.unpaid_count || 0} unpaid)`} />
          </View>
        </View>
      </View>

      {/* ── Invoice tabs ───────────────────────────────────────────────────── */}
      <View style={s.tabsCard}>
        {/* Tab headers */}
        <View style={s.tabsHeader}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'sales' && s.tabBtnActive]}
            onPress={() => setActiveTab('sales')}
          >
            <Text style={[s.tabBtnText, activeTab === 'sales' && s.tabBtnTextActive]}>
              Sales ({salesInvoices.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'purchases' && s.tabBtnActive]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[s.tabBtnText, activeTab === 'purchases' && s.tabBtnTextActive]}>
              Purchases ({purchaseBills.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        {activeTab === 'sales' && (
          salesInvoices.length > 0
            ? salesInvoices.map((item, i) => (
              <View key={item.sale_id}>
                <SaleRow item={item} />
                {i < salesInvoices.length - 1 && <View style={s.divider} />}
              </View>
            ))
            : <Text style={s.emptyTab}>No sales invoices</Text>
        )}

        {activeTab === 'purchases' && (
          purchaseBills.length > 0
            ? purchaseBills.map((item, i) => (
              <View key={item.purchase_id}>
                <PurchaseRow item={item} />
                {i < purchaseBills.length - 1 && <View style={s.divider} />}
              </View>
            ))
            : <Text style={s.emptyTab}>No purchase bills</Text>
        )}
      </View>

      <View style={s.footer} />
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.brandColor, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  footer: { height: 32 },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heroLeft: { flex: 1, marginRight: 12 },
  heroRight: { alignItems: 'flex-end' },
  partyName: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  gstin: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5 },
  typeText: { fontSize: 12, fontWeight: '600' },
  contactRow: { gap: 4, marginTop: 4 },
  contactText: { fontSize: 12, color: '#6B7280' },
  pan: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  // ── Summary cards ──────────────────────────────────────────────────────────
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 0.5 },
  summaryCardSales: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  summaryCardPurchase: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  summaryCardTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 10 },
  statsGrid: { gap: 8 },
  stat: { gap: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9CA3AF' },
  accentGreen: { color: '#059669' },
  accentRed: { color: '#DC2626' },
  accentAmber: { color: '#D97706' },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.brandColor },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabBtnTextActive: { color: Colors.brandColor, fontWeight: '600' },
  emptyTab: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 24 },
  divider: { height: 0.5, backgroundColor: '#F3F4F6', marginHorizontal: 14 },

  // ── Invoice / Bill rows ────────────────────────────────────────────────────
  invoiceRow: { flexDirection: 'row', padding: 14, alignItems: 'flex-start', gap: 8 },
  invoiceLeft: { flex: 1 },
  invoiceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  voucherNo: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },
  typePill: {
    backgroundColor: Colors.brandColorLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
  },
  typePillText: { fontSize: 10, fontWeight: '500', color: '#1D4ED8' },
  invoiceDates: { fontSize: 11, color: '#9CA3AF' },
  invoiceRight: { alignItems: 'flex-end', gap: 3 },
  invoiceTotal: { fontSize: 14, fontWeight: '700', color: '#059669' },
  purchaseTotal: { color: '#DC2626' },
  invoiceOutstanding: { fontSize: 11, color: '#D97706', fontWeight: '500' },

  // Status badges
  badgePaid: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#D1FAE5', borderWidth: 0.5, borderColor: '#6EE7B7' },
  badgeUnpaid: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FEE2E2', borderWidth: 0.5, borderColor: '#FECACA' },
  badgePartial: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FEF9C3', borderWidth: 0.5, borderColor: '#FDE68A' },
  badgeOverdue: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FFF7ED', borderWidth: 0.5, borderColor: '#FDBA74' },
  badgeTextPaid: { fontSize: 10, fontWeight: '600', color: '#065F46' },
  badgeTextUnpaid: { fontSize: 10, fontWeight: '600', color: '#991B1B' },
  badgeTextPartial: { fontSize: 10, fontWeight: '600', color: '#92400E' },
  badgeTextOverdue: { fontSize: 10, fontWeight: '600', color: '#C2410C' },
})
