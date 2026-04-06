import PurchaseDetail, { PurchaseLineItem } from '@/Database/models/Purchasedetail'
import { loadPurchaseDetail, syncPurchaseDetail } from '@/Services/Purchasedetailsync'
import { Colors } from '@/utils/colors'
import { Ionicons } from '@expo/vector-icons'
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
import { ShimmerBox } from '@/components/Shimmer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

// due_date is a unix timestamp number; txn_date is already "27 Feb, 2026"
function formatUnixDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function gstTotal(d: PurchaseDetail): number {
  return (
    parseFloat(d.igst18Purchase || '0') +
    parseFloat(d.cgst9Purchase || '0') +
    parseFloat(d.sgst9Purchase || '0') +
    parseFloat(d.cgst25Purchase || '0') +
    parseFloat(d.sgst25Purchase || '0')
  )
}

function getPurchaseCategory(d: PurchaseDetail): string {
  if (d.rawMaterialPurchase) return 'Raw Material'
  if (d.jobWorkPurchase) return 'Job Work'
  if (d.ssPipePurchase) return 'SS Pipe'
  if (d.consumableStore) return 'Consumable'
  if (d.weldingMaterialExp) return 'Welding'
  if (d.polishingMaterialExp) return 'Polishing'
  if (d.freightInwardExp) return 'Freight'
  return 'Purchase'
}

function getPaymentStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid': return { badge: s.badgePaid, text: s.badgeTextPaid }
    case 'partial': return { badge: s.badgePartial, text: s.badgeTextPartial }
    default: return { badge: s.badgeUnpaid, text: s.badgeTextUnpaid }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label, value, last = false, accent,
}: {
  label: string; value: string; last?: boolean; accent?: 'green' | 'red'
}) {
  return (
    <View style={[s.infoRow, last && s.infoRowLast]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, accent === 'green' && s.accentGreen, accent === 'red' && s.accentRed]}>
        {value}
      </Text>
    </View>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.sectionCard}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionContent}>{children}</View>
    </View>
  )
}

function LineItemRow({ item, last }: { item: PurchaseLineItem; last: boolean }) {
  return (
    <View style={[s.lineRow, last && s.lineRowLast]}>
      <View style={s.lineLeft}>
        <Text style={s.lineName}>{item.item_name}</Text>
        <Text style={s.lineMeta}>
          {item.quantity} {item.uom}  ×  ₹{item.rate} / {item.uom}
        </Text>
      </View>
      <Text style={s.lineValue}>{formatAmount(item.value)}</Text>
    </View>
  )
}

// ─── Shimmer Loading Layout ──────────────────────────────────────────────────

function ShimmerPurchaseDetail() {
  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Hero Card Shimmer */}
        <View style={s.heroCard}>
          <View style={[s.heroTop, { marginBottom: 20 }]}>
            <View style={s.heroLeft}>
              <ShimmerBox width="60%" height={24} style={{ marginBottom: 8 }} />
              <ShimmerBox width="40%" height={14} />
            </View>
          </View>
          <View style={{ marginBottom: 20 }}>
            <ShimmerBox width="30%" height={16} />
          </View>
          <View style={[s.datesRow, { backgroundColor: '#F9FAFB' }]}>
            <View style={{ flex: 1 }}><ShimmerBox height={30} /></View>
            <View style={s.dateDivider} />
            <View style={{ flex: 1 }}><ShimmerBox height={30} /></View>
            <View style={s.dateDivider} />
            <View style={{ flex: 1 }}><ShimmerBox height={30} /></View>
          </View>
          <ShimmerBox height={60} style={{ marginTop: 10 }} />
        </View>

        {/* Section Cards Shimmer */}
        <View style={s.sectionCard}>
          <View style={[s.sectionTitle, { backgroundColor: '#FAFAFA' }]}>
            <ShimmerBox width={80} height={14} />
          </View>
          <View style={{ padding: 14, gap: 12 }}>
            <ShimmerBox height={40} />
            <ShimmerBox height={40} />
            <ShimmerBox height={40} />
          </View>
        </View>

        <View style={s.sectionCard}>
          <View style={[s.sectionTitle, { backgroundColor: '#FAFAFA' }]}>
            <ShimmerBox width={100} height={14} />
          </View>
          <View style={{ padding: 14, gap: 12 }}>
            <ShimmerBox height={20} />
            <ShimmerBox height={20} />
            <ShimmerBox height={20} />
          </View>
        </View>
      </View>
    </View>
  )
}
// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PurchaseDetailScreen() {
  const { purchaseId } = useLocalSearchParams<{ purchaseId: string }>()

  const [detail, setDetail] = useState<PurchaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const runSync = useCallback(async () => {
    setSyncing(true)
    await syncPurchaseDetail(purchaseId)
    const fresh = await loadPurchaseDetail(purchaseId)
    if (fresh) setDetail(fresh)
    setSyncing(false)
  }, [purchaseId])

  useEffect(() => {
    const init = async () => {
      const cached = await loadPurchaseDetail(purchaseId)
      if (cached) {
        setDetail(cached)
        setLoading(false)
        runSync()           // refresh in background, don't await
      } else {
        await runSync()     // no cache — must wait for network
        setLoading(false)   // only hide spinner after sync completes
      }
    }
    init()
  }, [purchaseId])

  // ── Spinner — no cache yet OR actively syncing with no data ───────────────
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerBackTitle: '',
            headerTintColor: Colors.brandColor,
            title: 'Loading Purchase...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
              </TouchableOpacity>
            ),
          }}
        />
        <ShimmerPurchaseDetail />
      </>
    )
  }

  // ── Error — sync finished but still no data ───────────────────────────────
  if (!detail) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Purchase Detail', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <Text style={s.errorText}>Record not found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={runSync}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const lineItems = detail.lineItems
  const gst = gstTotal(detail)
  const balance = detail.grossTotal - detail.amountPaidOut
  const statusStyle = getPaymentStatusStyle(detail.paymentStatus)
  const category = getPurchaseCategory(detail)
  const hasIgst = !!detail.igst18Purchase
  const hasCgst9 = !!detail.cgst9Purchase
  const hasCgst25 = !!detail.cgst25Purchase

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{
        title: detail.voucherNo || 'Purchase Detail', headerShown: true, headerBackButtonDisplayMode: "minimal", headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
          </TouchableOpacity>
        ),
      }} />

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <Text style={s.partyName}>{detail.partyName}</Text>
            <Text style={s.partyGstin}>{detail.partyGstin || detail.gstinUin}</Text>
          </View>
          {syncing && <ActivityIndicator size="small" color={Colors.brandColor} />}
        </View>

        <View style={s.heroMeta}>
          <Text style={s.voucherNo}>{detail.voucherNo}</Text>
          <Text style={s.voucherType}>{detail.voucherType}</Text>
          <View style={s.categoryPill}>
            <Text style={s.categoryText}>{category}</Text>
          </View>
        </View>

        {/* Dates row */}
        <View style={s.datesRow}>
          <View>
            <Text style={s.dateLabel}>Invoice date</Text>
            <Text style={s.dateValue}>{detail.txnDate}</Text>
          </View>
          <View style={s.dateDivider} />
          <View>
            <Text style={s.dateLabel}>Due date</Text>
            <Text style={s.dateValue}>{detail.dueDate}</Text>
          </View>
          <View style={s.dateDivider} />
          <View>
            <Text style={s.dateLabel}>Fiscal year</Text>
            <Text style={s.dateValue}>{detail.fiscalYear}</Text>
          </View>
        </View>

        {/* Amount + status */}
        <View style={s.amountRow}>
          <View>
            <Text style={s.grossLabel}>Gross total</Text>
            <Text style={s.grossValue}>{formatAmount(detail.grossTotal)}</Text>
          </View>
          <View style={statusStyle.badge}>
            <Text style={statusStyle.text}>
              {detail.paymentStatus
                ? detail.paymentStatus.charAt(0).toUpperCase() + detail.paymentStatus.slice(1)
                : 'Unpaid'}
            </Text>
          </View>
        </View>

        {/* Payment progress bar */}
        {detail.grossTotal > 0 && (
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[
                s.progressFill,
                { width: `${Math.min((detail.amountPaidOut / detail.grossTotal) * 100, 100)}%` as any },
              ]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressPaid}>Paid: {formatAmount(detail.amountPaidOut)}</Text>
              <Text style={s.progressBalance}>Balance: {formatAmount(balance > 0 ? balance : 0)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Line items ─────────────────────────────────────────────────────── */}
      {lineItems.length > 0 && (
        <SectionCard title="Items">
          {lineItems.map((item, i) => (
            <LineItemRow key={item.line_id} item={item} last={i === lineItems.length - 1} />
          ))}
        </SectionCard>
      )}

      {/* ── Amount summary ─────────────────────────────────────────────────── */}
      <SectionCard title="Amount summary">
        <InfoRow label="Taxable value" value={formatAmount(detail.value)} />
        {detail.rawMaterialPurchase && <InfoRow label="Raw material" value={formatAmount(detail.rawMaterialPurchase)} />}
        {detail.jobWorkPurchase && <InfoRow label="Job work" value={formatAmount(detail.jobWorkPurchase)} />}
        {detail.ssPipePurchase && <InfoRow label="SS pipe" value={formatAmount(detail.ssPipePurchase)} />}
        {detail.consumableStore && <InfoRow label="Consumable" value={formatAmount(detail.consumableStore)} />}
        {detail.freightInwardExp && <InfoRow label="Freight inward" value={formatAmount(detail.freightInwardExp)} />}
        {detail.weldingMaterialExp && <InfoRow label="Welding" value={formatAmount(detail.weldingMaterialExp)} />}
        {detail.polishingMaterialExp && <InfoRow label="Polishing" value={formatAmount(detail.polishingMaterialExp)} />}
        {detail.miscExp && <InfoRow label="Misc exp" value={formatAmount(detail.miscExp)} />}
        {detail.roundingUp && <InfoRow label="Rounding" value={`₹ ${detail.roundingUp}`} />}
        {detail.tds && <InfoRow label="TDS" value={formatAmount(detail.tds)} />}
        <InfoRow label="Gross total" value={formatAmount(detail.grossTotal)} accent="red" last />
      </SectionCard>

      {/* ── GST breakdown ──────────────────────────────────────────────────── */}
      {gst > 0 && (
        <SectionCard title="GST breakdown">
          {hasIgst && <InfoRow label="IGST @ 18%" value={formatAmount(detail.igst18Purchase)} />}
          {hasCgst9 && <InfoRow label="CGST @ 9%" value={formatAmount(detail.cgst9Purchase)} />}
          {hasCgst9 && <InfoRow label="SGST @ 9%" value={formatAmount(detail.sgst9Purchase)} />}
          {hasCgst25 && <InfoRow label="CGST @ 2.5%" value={formatAmount(detail.cgst25Purchase)} />}
          {hasCgst25 && <InfoRow label="SGST @ 2.5%" value={formatAmount(detail.sgst25Purchase)} />}
          <InfoRow label="Total GST" value={formatAmount(gst)} accent="red" last />
        </SectionCard>
      )}

      {/* ── Payment info ───────────────────────────────────────────────────── */}
      <SectionCard title="Payment info">
        <InfoRow label="Amount paid" value={formatAmount(detail.amountPaidOut)} accent="green" />
        <InfoRow label="Balance due" value={formatAmount(balance > 0 ? balance : 0)} accent={balance > 0 ? 'red' : undefined} />
        {detail.quantity && <InfoRow label="Quantity" value={`${detail.quantity} KG`} last />}
      </SectionCard>

      {/* ── Remarks ────────────────────────────────────────────────────────── */}
      {!!detail.remarks && (
        <SectionCard title="Remarks">
          <Text style={s.remarks}>{detail.remarks}</Text>
        </SectionCard>
      )}

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

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  heroLeft: { flex: 1, marginRight: 12 },
  partyName: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  partyGstin: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  voucherNo: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },
  voucherType: { fontSize: 12, color: '#9CA3AF' },
  categoryPill: { backgroundColor: Colors.brandColorLight, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 0.5, borderColor: Colors.brandColor },
  categoryText: { fontSize: 11, fontWeight: '500', color: Colors.brandColor },

  datesRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 14 },
  dateDivider: { width: 0.5, height: 28, backgroundColor: '#E5E7EB', marginHorizontal: 14 },
  dateLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
  dateValue: { fontSize: 12, fontWeight: '600', color: '#374151' },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  grossLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  grossValue: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },

  // Payment status badges
  badgePaid: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#D1FAE5', borderWidth: 0.5, borderColor: '#6EE7B7' },
  badgePartial: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FEF9C3', borderWidth: 0.5, borderColor: '#FDE68A' },
  badgeUnpaid: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FEE2E2', borderWidth: 0.5, borderColor: '#FECACA' },
  badgeTextPaid: { fontSize: 12, fontWeight: '600', color: '#065F46' },
  badgeTextPartial: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  badgeTextUnpaid: { fontSize: 12, fontWeight: '600', color: '#991B1B' },

  // Progress bar
  progressWrap: { gap: 6 },
  progressBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.brandColor, borderRadius: 3 },  // blue for purchase (vs green for sale)
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPaid: { fontSize: 11, color: Colors.brandColor, fontWeight: '500' },
  progressBalance: { fontSize: 11, color: '#DC2626', fontWeight: '500' },

  // ── Section card ───────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  sectionContent: {},

  // ── Info rows ──────────────────────────────────────────────────────────────
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right' },
  accentGreen: { color: '#059669', fontWeight: '700' },
  accentRed: { color: '#DC2626', fontWeight: '700' },

  // ── Line items ─────────────────────────────────────────────────────────────
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', gap: 8 },
  lineRowLast: { borderBottomWidth: 0 },
  lineLeft: { flex: 1 },
  lineName: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 3 },
  lineMeta: { fontSize: 11, color: '#9CA3AF' },
  lineValue: { fontSize: 13, fontWeight: '600', color: '#DC2626', flexShrink: 0 }, // red for cost

  // ── Remarks ────────────────────────────────────────────────────────────────
  remarks: { fontSize: 13, color: '#374151', padding: 14, lineHeight: 20 },
})
