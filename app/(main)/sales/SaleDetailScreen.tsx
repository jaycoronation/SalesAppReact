import SaleDetail, { LineItem } from '@/Database/models/SalesDetail'
import { loadSaleDetail, syncSaleDetail } from '@/Services/Saledetailsync'
import { Colors } from '@/utils/colors'
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatUnixDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function gstTotal(detail: SaleDetail): number {
  return (
    parseFloat(detail.igst18Output || '0') +
    parseFloat(detail.cgst9OnSales || '0') +
    parseFloat(detail.sgst9OnSales || '0')
  )
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
  label,
  value,
  last = false,
  accent,
}: {
  label: string
  value: string
  last?: boolean
  accent?: 'green' | 'red'
}) {
  return (
    <View style={[s.infoRow, last && s.infoRowLast]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[
        s.infoValue,
        accent === 'green' && s.accentGreen,
        accent === 'red' && s.accentRed,
      ]}>
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

function LineItemRow({ item, last }: { item: LineItem; last: boolean }) {
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SaleDetailScreen() {
  // Expo Router: expects route like /sale/[saleId]
  const { saleId } = useLocalSearchParams<{ saleId: string }>()

  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const doSync = async (id: string) => {
    setSyncing(true)
    try {
      await syncSaleDetail(id)
      const fresh = await loadSaleDetail(id)
      if (fresh) setDetail(fresh)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const cached = await loadSaleDetail(saleId)

      if (cancelled) return

      if (cached) {
        setDetail(cached)
        setLoading(false)
        doSync(saleId)
      } else {
        setSyncing(true)
        try {
          await syncSaleDetail(saleId)
          if (cancelled) return
          const fresh = await loadSaleDetail(saleId)
          if (fresh) setDetail(fresh)
        } finally {
          if (!cancelled) {
            setSyncing(false)
            setLoading(false)
          }
        }
      }
    }

    init()

    return () => { cancelled = true }
  }, [saleId])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Sale Detail', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Sale Detail', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <Text style={s.errorText}>Record not found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => doSync(saleId)}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const lineItems = detail.lineItems
  const gst = gstTotal(detail)
  const balance = detail.grossTotal - detail.amountReceived
  const statusStyle = getPaymentStatusStyle(detail.paymentStatus)
  const hasIgst = !!detail.igst18Output
  const hasCgstSgst = !!detail.cgst9OnSales

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: detail.voucherNo || 'Sale Detail', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <View style={s.heroCard}>
        {/* Top: party + syncing indicator */}
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <Text style={s.partyName}>{detail.partyName}</Text>
            <Text style={s.partyGstin}>{detail.partyGstin || detail.gstinUin}</Text>
          </View>
          {syncing && (
            <ActivityIndicator size="small" color={Colors.brandColor} />
          )}
        </View>

        {/* Voucher + dates */}
        <View style={s.heroMeta}>
          <Text style={s.voucherNo}>{detail.voucherNo}</Text>
          <Text style={s.voucherType}>{detail.voucherType}</Text>
        </View>

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

        {/* Amount + payment status */}
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
                { width: `${Math.min((detail.amountReceived / detail.grossTotal) * 100, 100)}%` as any },
              ]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressReceived}>
                Received: {formatAmount(detail.amountReceived)}
              </Text>
              <Text style={s.progressBalance}>
                Balance: {formatAmount(balance > 0 ? balance : 0)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Line items ─────────────────────────────────────────────────────── */}
      {lineItems.length > 0 && (
        <SectionCard title="Items">
          {lineItems.map((item, i) => (
            <LineItemRow
              key={item.line_id}
              item={item}
              last={i === lineItems.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── Amount summary ─────────────────────────────────────────────────── */}
      <SectionCard title="Amount summary">
        <InfoRow label="Taxable value" value={formatAmount(detail.value)} />
        {detail.ogsSalesGst && <InfoRow label="OGS sales" value={formatAmount(detail.ogsSalesGst)} />}
        {detail.localSalesGst && <InfoRow label="Local sales" value={formatAmount(detail.localSalesGst)} />}
        {detail.ogsJwSales18 && <InfoRow label="OGS job work" value={formatAmount(detail.ogsJwSales18)} />}
        {detail.roundingOff && <InfoRow label="Rounding off" value={`₹ ${detail.roundingOff}`} />}
        <InfoRow label="Gross total" value={formatAmount(detail.grossTotal)} accent="green" last />
      </SectionCard>

      {/* ── GST breakdown ──────────────────────────────────────────────────── */}
      {gst > 0 && (
        <SectionCard title="GST breakdown">
          {hasIgst && (
            <InfoRow label="IGST @ 18%" value={formatAmount(detail.igst18Output)} />
          )}
          {hasCgstSgst && (
            <>
              <InfoRow label="CGST @ 9%" value={formatAmount(detail.cgst9OnSales)} />
              <InfoRow label="SGST @ 9%" value={formatAmount(detail.sgst9OnSales)} />
            </>
          )}
          <InfoRow label="Total GST" value={formatAmount(gst)} accent="red" last />
        </SectionCard>
      )}

      {/* ── Payment info ───────────────────────────────────────────────────── */}
      <SectionCard title="Payment info">
        <InfoRow label="Amount received" value={formatAmount(detail.amountReceived)} accent="green" />
        <InfoRow label="Balance due" value={formatAmount(balance > 0 ? balance : 0)} accent={balance > 0 ? 'red' : undefined} />
        <InfoRow label="Quantity" value={`${detail.quantity} KG`} last />
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
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  voucherNo: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },
  voucherType: { fontSize: 12, color: '#9CA3AF' },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 0,
  },
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
  progressFill: { height: 6, backgroundColor: '#059669', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressReceived: { fontSize: 11, color: '#059669', fontWeight: '500' },
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right' },
  accentGreen: { color: '#059669', fontWeight: '700' },
  accentRed: { color: '#DC2626', fontWeight: '700' },

  // ── Line items ─────────────────────────────────────────────────────────────
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  lineRowLast: { borderBottomWidth: 0 },
  lineLeft: { flex: 1 },
  lineName: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 3 },
  lineMeta: { fontSize: 11, color: '#9CA3AF' },
  lineValue: { fontSize: 13, fontWeight: '600', color: '#059669', flexShrink: 0 },

  // ── Remarks ────────────────────────────────────────────────────────────────
  remarks: { fontSize: 13, color: '#374151', padding: 14, lineHeight: 20 },
})
