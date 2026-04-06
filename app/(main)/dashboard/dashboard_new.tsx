import { FinancialYearPicker } from '@/components/FinancialYearPicker';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import NotificationBell from '@/components/NotificationBell';
import { ShimmerBox } from '@/components/Shimmer';
import DashboardOverviewV2, {
  AgingBucket,
  ConversionBlock,
  ConversionGenerate,
  RecentInvoiceItem,
  StockGradeItem,
  StockOverview,
  UpcomingPaymentItem,
} from '@/Database/models/dashboardoverview';
import {
  loadDashboardV2,
  observeDashboardV2,
  syncDashboardV2,
  syncUpcomingPayments,
} from '@/Services/DashboardV2Sync';
import { Colors } from '@/utils/colors';
import {
  getCurrentFY,
  getFiscalYear,
  MONTH_SHORT,
} from '@/utils/fiscalYear';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  DeviceEventEmitter,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


// ─── Constants ────────────────────────────────────────────────────────────────
const NOW = new Date()
const DEFAULT_MONTH = NOW.getMonth() + 1   // 1–12
const DEFAULT_YEAR = NOW.getFullYear()


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n)) return '₹0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

function urgencyStyle(urgency: string) {
  switch (urgency) {
    case 'overdue': return { dot: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
    case 'critical': return { dot: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' }
    case 'urgent': return { dot: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }
    default: return { dot: Colors.brandColor, bg: Colors.brandColorLight, border: Colors.brandColor }
  }
}

function statusBadgeStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid': return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
    case 'partial': return { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' }
    default: return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' }
  }
}


// ─── Shimmer ──────────────────────────────────────────────────────────────────

function useShimmerAnim() {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [anim])
  return anim
}

function DashboardShimmer() {
  // Reusable card wrapper
  function ShimmerCard({ children, style }: { children: React.ReactNode; style?: object }) {
    return (
      <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 0.5, borderColor: '#E5E7EB' }, style]}>
        {children}
      </View>
    )
  }

  // Section header row (title + optional action pill)
  function ShimmerSectionHeader({ withAction = false }: { withAction?: boolean }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <ShimmerBox width={120} height={14} />
        {withAction && <ShimmerBox width={52} height={22} style={{ borderRadius: 6 }} />}
      </View>
    )
  }

  // A table row with N shimmer cells
  function ShimmerTableRow({ cols = 4, last = false }: { cols?: number; last?: boolean }) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 9, paddingHorizontal: 10,
        borderBottomWidth: last ? 0 : 0.5, borderBottomColor: '#F3F4F6',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerBox key={i} height={12} style={{ flex: 1 }} />
        ))}
      </View>
    )
  }

  function ShimmerTable({ rows = 3 }: { rows?: number }) {
    return (
      <View style={{ borderRadius: 8, borderWidth: 0.5, borderColor: '#E5E7EB', overflow: 'hidden' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#F3F4F6' }}>
          {[0, 1, 2, 3].map((i) => <ShimmerBox key={i} height={10} style={{ flex: 1 }} />)}
        </View>
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerTableRow key={i} last={i === rows - 1} />
        ))}
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F3F4F6' }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Header filter chips */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ShimmerBox width={90} height={32} style={{ borderRadius: 20 }} />
        <ShimmerBox width={72} height={32} style={{ borderRadius: 20 }} />
      </View>

      {/* P&L card — 3-column net row */}
      <ShimmerCard>
        <ShimmerSectionHeader />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <View style={{ flex: 1, gap: 6 }}>
                <ShimmerBox width={60} height={10} />
                <ShimmerBox width={80} height={18} />
              </View>
              {i < 2 && <View style={{ width: 0.5, backgroundColor: '#E5E7EB', alignSelf: 'stretch', marginHorizontal: 12 }} />}
            </React.Fragment>
          ))}
        </View>
      </ShimmerCard>

      {/* Conversion Generate card — 2 sub-tables */}
      <ShimmerCard>
        <ShimmerSectionHeader />
        <ShimmerBox width={80} height={11} style={{ marginBottom: 8 }} />
        <ShimmerTable rows={3} />
        <View style={{ height: 12 }} />
        <ShimmerBox width={64} height={11} style={{ marginBottom: 8 }} />
        <ShimmerTable rows={2} />
        {/* Net total footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#E5E7EB' }}>
          <ShimmerBox width={72} height={14} />
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <ShimmerBox width={60} height={12} />
            <ShimmerBox width={80} height={16} />
          </View>
        </View>
        {/* View Breakdown button */}
        <View style={{ marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingVertical: 12, alignItems: 'center' }}>
          <ShimmerBox width={120} height={14} style={{ borderRadius: 4 }} />
        </View>
      </ShimmerCard>

      {/* Stock Summary card */}
      <ShimmerCard>
        <ShimmerSectionHeader />
        <ShimmerTable rows={4} />
      </ShimmerCard>

      {/* KPI row — 2 cards */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB', gap: 6 }}>
            <ShimmerBox width={80} height={10} />
            <ShimmerBox width={90} height={20} />
            <ShimmerBox width={60} height={10} />
          </View>
        ))}
      </View>

      {/* Recent Invoices card */}
      <ShimmerCard>
        <ShimmerSectionHeader withAction />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <ShimmerBox width="70%" height={13} />
                <ShimmerBox width="45%" height={10} />
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <ShimmerBox width={64} height={13} />
                <ShimmerBox width={44} height={18} style={{ borderRadius: 4 }} />
              </View>
            </View>
            {i < 4 && <View style={{ height: 0.5, backgroundColor: '#F3F4F6' }} />}
          </View>
        ))}
      </ShimmerCard>

      <View style={{ height: 82 }} />
    </ScrollView>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────


function SectionHeader({
  title, actionLabel, onAction, badge, badgeType = 'neutral',
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  badge?: string
  badgeType?: 'profit' | 'loss' | 'neutral'
}) {
  return (
    <View style={s.sectionHeader}>
      {/* Left: title + badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {badge !== undefined && (
          <View style={[
            s.badge,
            badgeType === 'profit' && s.badgeProfit,
            badgeType === 'loss' && s.badgeLoss,
          ]}>
            <Text style={[
              s.badgeText,
              badgeType === 'profit' && s.badgeTextProfit,
              badgeType === 'loss' && s.badgeTextLoss,
            ]}>
              {badge}
            </Text>
          </View>
        )}
      </View>

      {/* Right: action */}
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={s.sectionAction}>
          <Text style={s.sectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function KpiCard({
  label, value, sub, accent, onAction
}: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'amber' | 'blue', onAction?: () => void }) {
  const colors = {
    green: '#059669', red: '#DC2626', amber: '#D97706', blue: Colors.brandColor,
  }
  return (

    <View style={s.kpiCard}>
      <TouchableOpacity onPress={onAction}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Text style={[s.kpiValue, accent && { color: colors[accent] }]}>{value}</Text>
        {sub && <Text style={s.kpiSub}>{sub}</Text>}
      </TouchableOpacity>
    </View>

  )
}

function AgingBar({
  buckets,
  title,
  onBucketPress,
}: {
  buckets: Record<string, AgingBucket>
  title?: string
  onBucketPress?: (bucketKey: string) => void
}) {
  const order = ['paid', 'd0_7', 'd7_15', 'd15_30', 'over_30']
  const colors = ['#059669', '#2563EB', '#D97706', '#EA580C', '#DC2626']
  const total = order.reduce((s, k) => s + parseFloat(buckets[k]?.amount || '0'), 0)
  if (!total) return null

  const firstLabel = title === 'Receivables' ? 'Received' : 'Paid'

  return (
    <View style={s.agingBarWrap}>
      {/* Segmented bar — each segment tappable */}
      <View style={s.agingBar}>
        {order.map((k, i) => {
          const pct = (parseFloat(buckets[k]?.amount || '0') / total) * 100
          if (pct < 1) return null
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={onBucketPress ? 0.65 : 1}
              onPress={() => onBucketPress?.(k)}
              style={[s.agingSegment, { width: `${pct}%` as any, backgroundColor: colors[i] }]}
            />
          )
        })}
      </View>
      {/* Legend rows — also tappable */}
      <View style={s.agingLegend}>
        {order.map((k, i) => {
          const bucket = buckets[k]
          if (!bucket || parseFloat(bucket.amount) === 0) return null
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={onBucketPress ? 0.65 : 1}
              onPress={() => onBucketPress?.(k)}
              style={s.agingLegendItem}
            >
              <View style={[s.agingDot, { backgroundColor: colors[i] }]} />
              <Text style={s.agingLegendLabel}>
                {i === 0 ? firstLabel : bucket.label} ({bucket.count})
              </Text>
              <Text style={s.agingLegendVal}>{fmt(bucket.amount)}</Text>
              {onBucketPress && (
                <Text style={[s.agingChevron, { color: colors[i] }]}>›</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function UpcomingRow({ item }: { item: UpcomingPaymentItem }) {
  const ug = urgencyStyle(item.urgency)
  const daysLabel = item.urgency === 'overdue'
    ? `${item.days_overdue}d overdue`
    : item.days_until === '0' ? 'Due today' : `${item.days_until}d left`

  return (
    <TouchableOpacity
      style={[s.upcomingRow, { backgroundColor: ug.bg, borderColor: ug.border }]}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(main)/purchase/PurchaseDetailScreen',
          params: { purchaseId: item.purchase_id },
        })
      }
    >
      <View style={[s.upcomingDot, { backgroundColor: ug.dot }]} />
      <View style={s.upcomingLeft}>
        <Text style={s.upcomingParty} numberOfLines={1}>{item.party_name}</Text>
        <Text style={s.upcomingVoucher}>{item.voucher_no} · {item.due_date}</Text>
      </View>
      <View style={s.upcomingRight}>
        <Text style={s.upcomingAmount}>{fmt(item.outstanding)}</Text>
        <Text style={[s.upcomingDaysLabel, { color: ug.dot }]}>{daysLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

function RecentInvoiceRow({ item }: { item: RecentInvoiceItem }) {
  const bs = statusBadgeStyle(item.payment_status)
  return (
    <TouchableOpacity
      style={s.invoiceRow}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/sales/SaleDetailScreen',
          params: { saleId: item.sale_id },
        })
      }
    >
      <View style={s.invoiceLeft}>
        <Text style={s.invoiceParty} numberOfLines={1}>{item.party_name}</Text>
        <Text style={s.invoiceVoucher}>{item.voucher_no} · {item.txn_date}</Text>
      </View>
      <View style={s.invoiceRight}>
        <Text style={s.invoiceAmount}>{fmt(item.gross_total)}</Text>
        <View style={[s.invoiceBadge, { backgroundColor: bs.bg, borderColor: bs.border }]}>
          <Text style={[s.invoiceBadgeText, { color: bs.text }]}>{item.status_display}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Conversion / Generate Card ───────────────────────────────────────────────

function ConversionCard({ data }: { data: ConversionGenerate }) {
  const gradeColors: Record<string, string> = {
    '202': '#2563EB',
    '304': '#059669',
    '316': '#9333EA',
    'JOBWORK': '#D97706',
  }

  function fmtQty(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  function fmtRate(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return `₹${n.toFixed(2)}`
  }

  function ConvBlock({ block, label }: { block: ConversionBlock; label: string }) {
    const dataRows = block.rows ?? []
    const total = block.total
    if (!dataRows.length) return null


    return (
      <View style={{ marginBottom: 12 }}>
        {/* Sub-section label */}
        <Text style={cv.blockLabel}>{label}</Text>
        <View style={st.tableCard}>
          {/* Header */}
          <View style={[st.tableRow, st.tableHead]}>
            <Text style={[st.tableCell, st.tableHeadText, { flex: 0.7 }]}>Grade</Text>
            <Text style={[st.tableCell, st.tableHeadText, st.right]}>Qty</Text>
            <Text style={[st.tableCell, st.tableHeadText, st.right]}>Rate ₹</Text>
            <Text style={[st.tableCell, st.tableHeadText, st.right]}>Value</Text>
          </View>

          {dataRows.map((row, i) => {
            const color = gradeColors[row.grade] ?? '#6B7280'
            const isLast = i === dataRows.length - 1
            return (
              <View
                key={`${row.grade}-${i}`}
                style={[st.tableRow, isLast && !total && st.tableRowLast]}
              >
                <View style={[{ flex: 0.7 }, st.tableCell]}>
                  <View style={[st.gradePill, { backgroundColor: color + '18' }]}>
                    <Text style={[st.gradePillText, { color }]}>{row.grade || '—'}</Text>
                  </View>
                </View>
                <Text style={[st.tableCell, st.right]}>{parseFloat(row.qty).toFixed(2)}</Text>
                <Text style={[st.tableCell, st.right]}>{fmtRate(row.avg_rate)}</Text>
                <Text style={[st.tableCell, st.right, { fontWeight: '500' }]}>
                  {fmt(row.value)}
                </Text>
              </View>
            )
          })}

          {/* Total row */}
          {total && (
            <View style={[st.tableRow, st.tableRowTotal, st.tableRowLast]}>
              <Text style={[st.tableCell, { fontWeight: '700', color: '#111827' }]}>
                Total
              </Text>
              <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
                {parseFloat(total.qty).toFixed(2)}
              </Text>
              <Text style={[st.tableCell, st.right]}>—</Text>
              <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
                {fmt(total.value)}
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View>
      <ConvBlock block={data.prod_conv} label="Production Qty Dispatched" />
      <ConvBlock block={data.jw_conv} label="Job Work Qty Dispatched" />

      {/* Net total footer */}
      {data.net_total && (
        <View style={cv.netTotalRow}>
          <Text style={cv.netTotalLabel}>Net Total</Text>
          <View style={cv.netTotalRight}>
            <Text style={cv.netTotalQty}>
              {parseFloat(data.net_total.qty).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg
            </Text>
            <Text style={cv.netTotalValue}>{fmt(data.net_total.value)}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Stock Overview Table ─────────────────────────────────────────────────────

function StockOverviewCard({ stock }: { stock: StockOverview }) {
  const rows: { label: string; key: keyof StockOverview; color?: string }[] = [
    { label: 'Opening', key: 'opening' },
    { label: 'Inwards', key: 'inwards', color: '#059669' },
    { label: 'Outwards', key: 'outwards', color: '#DC2626' },
    { label: 'Net', key: 'total' },
  ]

  function fmtQty(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <View style={st.tableCard}>
      {/* Header row */}
      <View style={[st.tableRow, st.tableHead]}>
        <Text style={[st.tableCell, st.tableHeadText, { flex: 1.4 }]}>Movement</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Qty</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Avg ₹</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Value</Text>
      </View>

      {rows.map(({ label, key, color }, i) => {
        const r = stock?.[key]
        const isLast = i === rows.length - 1
        const qty = fmtQty(r?.qty ?? '')
        const qtyNum = parseFloat(r?.qty ?? '0')
        const qtyColor = key === 'total'
          ? (qtyNum < 0 ? '#DC2626' : '#059669')
          : color

        return (
          <View
            key={label}
            style={[
              st.tableRow,
              isLast && st.tableRowLast,
              key === 'total' && st.tableRowTotal,
            ]}
          >
            <Text style={[st.tableCell, st.labelCell, { flex: 1.4 }]}>{label}</Text>
            <Text style={[st.tableCell, st.right, qtyColor ? { color: qtyColor, fontWeight: '600' } : {}]}>
              {qty}
            </Text>
            <Text style={[st.tableCell, st.right]}>
              {r?.avg ? `₹${parseFloat(r.avg).toFixed(2)}` : '—'}
            </Text>
            <Text style={[st.tableCell, st.right, { fontWeight: isLast ? '700' : '500' }]}>
              {r?.value ? fmt(r.value) : '—'}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Stock Grade Table ────────────────────────────────────────────────────────

function StockGradeTable({ grades }: { grades: StockGradeItem[] }) {
  // Separate rows from the TOTAL footer row
  const dataRows = grades.filter(g => g.details !== 'TOTAL')
  const totalRow = grades.find(g => g.details === 'TOTAL')

  function fmtQty(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const gradeColors: Record<string, string> = {
    'NA': '#6B7280',
    '202': '#2563EB',
    '304': '#059669',
    '316': '#9333EA',
  }

  return (
    <View style={st.tableCard}>
      {/* Header */}
      <View style={[st.tableRow, st.tableHead]}>
        <Text style={[st.tableCell, st.tableHeadText, { flex: 0.7 }]}>Grade</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Qty</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Avg ₹</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Value</Text>
      </View>

      {dataRows.map((g, i) => (
        <View
          key={`${g.grade}-${i}`}
          style={[st.tableRow, i === dataRows.length - 1 && !totalRow && st.tableRowLast]}
        >
          <View style={[{ flex: 0.7 }, st.tableCell]}>
            <View style={[st.gradePill, { backgroundColor: (gradeColors[g.grade] ?? '#6B7280') + '18' }]}>
              <Text style={[st.gradePillText, { color: gradeColors[g.grade] ?? '#6B7280' }]}>
                {g.grade || 'NA'}
              </Text>
            </View>
          </View>
          <Text style={[st.tableCell, st.right]}>{fmtQty(g.qty)}</Text>
          <Text style={[st.tableCell, st.right]}>
            {g.avg ? `₹${parseFloat(g.avg).toFixed(2)}` : '—'}
          </Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '500' }]}>{fmt(g.value)}</Text>
        </View>
      ))}

      {/* Total footer */}
      {totalRow && (
        <View style={[st.tableRow, st.tableRowTotal, st.tableRowLast]}>
          <Text style={[st.tableCell, { flex: 0.7, fontWeight: '700', color: '#111827' }]}>Total</Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
            {fmtQty(totalRow.qty)}
          </Text>
          <Text style={[st.tableCell, st.right]}>—</Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
            {fmt(totalRow.value)}
          </Text>
        </View>
      )}
    </View>
  )
}


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardOverviewV2 | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logoutVisible, setLogoutVisible] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  // true only until the very first cache read completes — never set back to true
  const [initialLoading, setInitialLoading] = useState(true)

  // ── Month / Year / FY filter ──────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH)
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
  const [selectedFY, setSelectedFY] = useState(getCurrentFY())
  const [fyPickerVisible, setFyPickerVisible] = useState(false)

  const fiscalYear = selectedFY

  const loadLocal = useCallback(async (month: number, year: number) => {
    const cached = await loadDashboardV2(month, year)
    if (cached) setData(cached)
    // Mark initial load done regardless of whether cache existed
    setInitialLoading(false)
  }, [])

  const runSync = useCallback(async (month: number, year: number) => {
    const fy = getFiscalYear(month, year)
    await Promise.all([
      syncDashboardV2(month, year),
      syncUpcomingPayments(fy, 'upcoming'),
      syncUpcomingPayments(fy, 'overdue'),
    ])
    await loadLocal(month, year)
  }, [loadLocal])

  // Re-subscribe + re-sync whenever month/year changes
  useEffect(() => {
    // ⚠️ Do NOT call setData(null) here — that clears cached data and forces
    // the loader to show. Instead keep stale data visible until new data loads.
    const subscription = observeDashboardV2(selectedMonth, selectedYear)
      .observe()
      .subscribe((records) => {
        if (records.length > 0) setData(records[0])
      })

    // Load from local DB first (fast, works offline), then sync in background
    loadLocal(selectedMonth, selectedYear)
    setSyncing(true)
    runSync(selectedMonth, selectedYear).finally(() => setSyncing(false))

    return () => subscription.unsubscribe()
  }, [selectedMonth, selectedYear])

  // Load saved filter on mount + Listen for global changes
  useEffect(() => {
    const fetchSavedFilter = async () => {
      const saved = await SessionManager.getDashFilter();
      if (saved) {
        setSelectedMonth(saved.month);
        setSelectedYear(saved.year);
        setSelectedFY(saved.fy);
      }
    };
    fetchSavedFilter();

    const sub = DeviceEventEmitter.addListener('SHARED_FILTER_CHANGED', (data) => {
      setSelectedMonth(data.month);
      setSelectedYear(data.year);
      setSelectedFY(data.fy);
    });

    return () => sub.remove();
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync(selectedMonth, selectedYear)
    setRefreshing(false)
  }, [runSync, selectedMonth, selectedYear])

  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    SessionManager.setDashFilter(month, year, selectedFY);
    DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month, year, fy: selectedFY });
  }, [selectedFY])

  const handleFYApply = useCallback((fy: string) => {
    setSelectedFY(fy)
    const d = new Date()
    const curM = d.getMonth() + 1
    const curY = d.getFullYear()
    const curFY = getCurrentFY()

    let m = 4, y = parseInt(fy.split('-')[0])
    if (fy === curFY) {
      m = curM
      y = curY
    }

    setSelectedMonth(m)
    setSelectedYear(y)
    SessionManager.setDashFilter(m, y, fy)
    DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month: m, year: y, fy })
  }, [])

  // ── Show shimmer until we have any data to render ───────────────────────────
  if (!data) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Dashboard',
            headerTintColor: Colors.brandColor,
          }}
        />
        <DashboardShimmer />
      </>
    )
  }

  const handleLogout = () => {
    // your logout logic here (clear tokens, auth state, etc.)
    SessionManager.clearSession();
    setLogoutVisible(false);
    router.replace('/login');
  };

  const overdueList = data.upcomingOverdue.slice(0, 5)
  const recentInvoices = data.recentInvoices.slice(0, 5)
  const pl = data.profitLoss
  const stockOverview = data.stockOverview
  const conversionData = data.conversionGenerate

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
      }
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: '',
          headerBackVisible: true,
          headerTintColor: Colors.brandColor,
          title: 'Dashboard',
          headerRight: () => (
            <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NotificationBell color={Colors.brandColor} />
              <TouchableOpacity onPress={() => router.push('/profile/ProfileScreen')}>
                <Ionicons name="person-circle-outline" size={28} color={Colors.brandColor} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Modal
        transparent
        visible={logoutVisible}
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setLogoutVisible(false)}>
          <Pressable style={s.dialog} onPress={() => { }}>
            <Text style={s.title}>Log out of your account?</Text>

            <View style={s.divider} />

            <TouchableOpacity style={s.actionBtn} onPress={handleLogout}>
              <Text style={s.logoutText}>Log out</Text>
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity style={s.actionBtn} onPress={() => setLogoutVisible(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <FinancialYearPicker
        visible={fyPickerVisible}
        selectedFY={selectedFY}
        onApply={handleFYApply}
        onClose={() => setFyPickerVisible(false)}
      />

      <MonthYearPicker
        visible={pickerVisible}
        month={selectedMonth}
        year={selectedYear}
        selectedFY={selectedFY}
        onApply={handleFilterApply}
        onClose={() => setPickerVisible(false)}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {syncing && !refreshing && (
            <View style={s.syncBadge}>
              <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
              <Text style={s.syncText}>Syncing…</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setFyPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.filterBtnIcon}>📅</Text>
            <Text style={s.filterBtnText}>{selectedFY}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.filterBtnText}>
              {MONTH_SHORT[selectedMonth]} {selectedYear}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Profit & Loss ────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionHeader title="Profit & Loss" badge={pl?.is_profit === 'Yes' ? '▲ Profit' : '▼ Loss'}
          badgeType={pl?.is_profit === 'Yes' ? 'profit' : 'loss'} />
        <View style={s.netRow}>
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Gross Sales</Text>
            <Text style={[s.netValue, s.green]}>{fmt(pl?.gross_sales)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Gross Purchase</Text>
            <Text style={[s.netValue, s.red]}>{fmt(pl?.gross_purchase)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>{pl?.is_profit === 'Yes' ? 'Net Profit' : 'Net Loss'}</Text>
            <Text style={[s.netValue, pl?.is_profit === 'Yes' ? s.green : s.red]}>
              {fmt(pl?.net)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Conversion & Generate ────────────────────────────────────── */}
      {conversionData && (
        <View style={s.card}>
          <SectionHeader title="Conversion Generated" />
          <ConversionCard data={conversionData} />
          <TouchableOpacity
            style={s.breakdownBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '../../stock/StockGradeDetailScreen',
                params: { month: String(selectedMonth), year: String(selectedYear) },
              })
            }
          >
            <Text style={s.breakdownBtnText}>View Breakdown →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stock Overview ───────────────────────────────────────────────── */}
      {stockOverview?.inwards && (
        <View style={s.card}>
          <SectionHeader title="Stock Summary" />
          <StockOverviewCard stock={stockOverview} />
        </View>
      )}

      {/* ── Recent Invoices ──────────────────────────────────────────────── */}
      {recentInvoices.length > 0 && (
        <View style={s.card}>
          <SectionHeader
            title="Recent Sales Invoices"
            actionLabel="See All"
            onAction={() => router.push({ pathname: '/others/RecentInvoicesScreen', params: { month: selectedMonth, year: selectedYear } })}
          />
          {recentInvoices.map((item, i) => (
            <View key={item.sale_id}>
              <RecentInvoiceRow item={item} />
              {i < recentInvoices.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
      )}

      <View style={s.footer} />
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  footer: { height: 82 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  filterBtnIcon: { fontSize: 13 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 0.5, borderColor: '#E5E7EB' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionAction: { backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sectionActionText: { fontSize: 12, fontWeight: '500', color: Colors.brandColor },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 0.5, borderColor: '#E5E7EB' },
  badgeProfit: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  badgeLoss: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  badgeTextProfit: { color: '#065F46' },
  badgeTextLoss: { color: '#991B1B' },

  // KPI
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB' },
  kpiLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  kpiSub: { fontSize: 11, color: '#6B7280' },

  // Net position
  netRow: { flexDirection: 'row', alignItems: 'flex-start' },
  netBlock: { flex: 1 },
  netDivider: { width: 0.5, backgroundColor: '#E5E7EB', alignSelf: 'stretch', marginHorizontal: 12 },
  netLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  netValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  green: { color: '#059669' },
  red: { color: '#DC2626' },

  // Aging bar
  agingBarWrap: { gap: 10 },
  agingBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  agingSegment: { height: 8 },
  agingLegend: { gap: 6 },
  agingLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agingDot: { width: 8, height: 8, borderRadius: 4 },
  agingLegendLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  agingLegendVal: { fontSize: 12, fontWeight: '500', color: '#111827' },
  agingChevron: { fontSize: 16, fontWeight: '600', marginLeft: 4 },

  // Upcoming / overdue rows
  upcomingRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 0.5, gap: 8 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  upcomingLeft: { flex: 1 },
  upcomingParty: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  upcomingVoucher: { fontSize: 11, color: '#9CA3AF' },
  upcomingRight: { alignItems: 'flex-end' },
  upcomingAmount: { fontSize: 13, fontWeight: '700', color: '#111827' },
  upcomingDaysLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Recent invoices
  invoiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  invoiceLeft: { flex: 1 },
  invoiceParty: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  invoiceVoucher: { fontSize: 11, color: '#9CA3AF' },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmount: { fontSize: 13, fontWeight: '700', color: '#059669' },
  invoiceBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5 },
  invoiceBadgeText: { fontSize: 10, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: '#F3F4F6' },

  breakdownBtn: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.brandColorLight,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  breakdownBtnText: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    color: '#000',
  },
  actionBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },
  cancelText: { fontSize: 16, fontWeight: '400', color: '#000' },
})

const st = StyleSheet.create({
  tableCard: {
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 4,
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableRowTotal: { backgroundColor: '#F9FAFB' },
  tableHead: { backgroundColor: '#F3F4F6', paddingVertical: 7 },
  tableHeadText: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  tableCell: { flex: 1.2, fontSize: 12, color: '#374151' },
  labelCell: { fontWeight: '500', color: '#111827' },
  right: { textAlign: 'right' },
  gradePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  gradePillText: { fontSize: 11, fontWeight: '700' },
})

const cv = StyleSheet.create({
  blockLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 },
  netTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
  netTotalLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  netTotalRight: { alignItems: 'flex-end', gap: 2 },
  netTotalQty: { fontSize: 12, color: '#6B7280' },
  netTotalValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
})