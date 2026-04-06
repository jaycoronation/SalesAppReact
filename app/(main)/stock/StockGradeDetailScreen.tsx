import {
  loadStockGradeDetail,
  syncStockGradeDetail,
} from '@/Services/StockGradeDetailSync'
import { Colors } from '@/utils/colors'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeRow {
  grade: number | string
  qty: number
  rate: number | string
  avg_rate: number | string
  value: number
}

interface GradeSection {
  coil: GradeRow[]
  pipe: GradeRow[]
  total: GradeRow[]
}

interface GradeDetailData {
  inwards: GradeSection
  outwards: GradeSection
}

type ActiveTab = 'inwards' | 'outwards'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n as number)) return '—'
  const abs = Math.abs(n as number)
  const sign = (n as number) < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

function fmtQty(val: number | string | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n as number)) return '—'
  return (n as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function fmtRate(val: number | string | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n as number)) return '—'
  return `₹${(n as number).toFixed(2)}`
}

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  '202': { bg: '#DBEAFE', text: '#1D4ED8' },
  '304': { bg: '#D1FAE5', text: '#065F46' },
  '316': { bg: '#EDE9FE', text: '#5B21B6' },
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

function ShimmerBox({
  width,
  height,
  style,
}: {
  width?: number | string
  height: number
  style?: object
}) {
  const anim = useShimmerAnim()
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] })
  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: 6, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  )
}

function ShimmerTableRows({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={sh.shimmerRow}>
          <ShimmerBox width={48} height={22} style={{ borderRadius: 5 }} />
          <ShimmerBox width={64} height={14} style={{ alignSelf: 'center' }} />
          <ShimmerBox width={64} height={14} style={{ alignSelf: 'center' }} />
          <ShimmerBox width={72} height={14} style={{ alignSelf: 'center' }} />
        </View>
      ))}
      <View style={[sh.shimmerRow, { backgroundColor: '#F3F4F6' }]}>
        <ShimmerBox width={40} height={14} />
        <ShimmerBox width={64} height={14} />
        <ShimmerBox width={32} height={14} />
        <ShimmerBox width={72} height={14} />
      </View>
    </>
  )
}

function ShimmerCard() {
  return (
    <View style={[s.card, { marginBottom: 12 }]}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
        <ShimmerBox width={60} height={11} />
      </View>
      <View
        style={[
          sh.shimmerRow,
          { backgroundColor: '#F9FAFB', borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
        ]}
      >
        <ShimmerBox width={40} height={10} />
        <ShimmerBox width={56} height={10} />
        <ShimmerBox width={56} height={10} />
        <ShimmerBox width={56} height={10} />
      </View>
      <ShimmerTableRows rows={3} />
    </View>
  )
}

function ShimmerScreen() {
  return (
    <View style={s.container}>
      {/* Tab bar */}
      <View style={[s.tabBar, { paddingHorizontal: 16, gap: 12 }]}>
        <ShimmerBox width={80} height={14} style={{ marginVertical: 14 }} />
        <ShimmerBox width={80} height={14} style={{ marginVertical: 14 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary strip */}
        <View style={[s.summaryStrip, { marginBottom: 14 }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.summaryItem, { gap: 6 }]}>
              <ShimmerBox width={36} height={10} />
              <ShimmerBox width={56} height={16} />
              <ShimmerBox width={48} height={10} />
            </View>
          ))}
        </View>

        {/* Coil card */}
        <ShimmerCard />

        {/* Pipe card */}
        <ShimmerCard />

        {/* Total card (branded border) */}
        <View style={[s.card, s.totalCard, { marginBottom: 12 }]}>
          <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
            <ShimmerBox width={110} height={11} />
          </View>
          <View
            style={[
              sh.shimmerRow,
              { backgroundColor: '#F9FAFB', borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
            ]}
          >
            <ShimmerBox width={40} height={10} />
            <ShimmerBox width={56} height={10} />
            <ShimmerBox width={56} height={10} />
            <ShimmerBox width={56} height={10} />
          </View>
          <ShimmerTableRows rows={4} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ─── Grade Table ──────────────────────────────────────────────────────────────

function GradeTable({ rows, title }: { rows: GradeRow[]; title: string }) {
  // Separate data rows from the total row (empty grade)
  const dataRows = rows.filter(r => r.grade !== '' && r.grade !== null)
  const totalRow = rows.find(r => r.grade === '' || r.grade === null)

  return (
    <View style={t.tableWrap}>
      {/* Section label */}
      <Text style={t.sectionLabel}>{title}</Text>

      {/* Table */}
      <View style={t.table}>
        {/* Header */}
        <View style={[t.row, t.headerRow]}>
          <Text style={[t.cell, t.headerCell, { flex: 0.7 }]}>Grade</Text>
          <Text style={[t.cell, t.headerCell, t.right]}>Qty (kg)</Text>
          <Text style={[t.cell, t.headerCell, t.right]}>Avg ₹/kg</Text>
          <Text style={[t.cell, t.headerCell, t.right]}>Value</Text>
        </View>

        {/* Data rows */}
        {dataRows.map((row, i) => {
          const gradeKey = String(row.grade)
          const gc = GRADE_COLORS[gradeKey]
          const isLast = i === dataRows.length - 1 && !totalRow

          return (
            <View
              key={`${gradeKey}-${i}`}
              style={[t.row, isLast && t.rowLast]}
            >
              {/* Grade pill */}
              <View style={[t.cell, { flex: 0.7 }]}>
                <View style={[t.gradePill, gc ? { backgroundColor: gc.bg } : t.gradePillDefault]}>
                  <Text style={[t.gradePillText, gc ? { color: gc.text } : { color: '#6B7280' }]}>
                    {row.grade || 'NA'}
                  </Text>
                </View>
              </View>
              <Text style={[t.cell, t.right, t.dataText]}>{fmtQty(row.qty)}</Text>
              <Text style={[t.cell, t.right, t.dataText]}>{fmtRate(row.avg_rate)}</Text>
              <Text style={[t.cell, t.right, t.valueText]}>{fmt(row.value)}</Text>
            </View>
          )
        })}

        {/* Total footer row */}
        {totalRow && (
          <View style={[t.row, t.totalRow, t.rowLast]}>
            <Text style={[t.cell, t.totalLabel, { flex: 0.7 }]}>Total</Text>
            <Text style={[t.cell, t.right, t.totalText]}>{fmtQty(totalRow.qty)}</Text>
            <Text style={[t.cell, t.right, t.totalText]}>—</Text>
            <Text style={[t.cell, t.right, t.totalText]}>{fmt(totalRow.value)}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StockGradeDetailScreen() {
  const { month, year } = useLocalSearchParams<{ month: string; year: string }>()
  const monthNum = parseInt(month ?? '1')
  const yearNum = parseInt(year ?? '2026')

  const [gradeData, setGradeData] = useState<GradeDetailData | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('inwards')

  // ── Load from local DB (fast, works offline) ──────────────────────────────
  const loadLocal = useCallback(async () => {
    const cached = await loadStockGradeDetail(monthNum, yearNum)
    if (cached) {
      setGradeData({ inwards: cached.inwards, outwards: cached.outwards })
    }
    setInitialLoading(false)
  }, [monthNum, yearNum])

  // ── Sync from API then reload cache ───────────────────────────────────────
  const runSync = useCallback(async () => {
    setError(null)
    setSyncing(true)
    try {
      await syncStockGradeDetail(monthNum, yearNum)
      // Reload from DB after sync so UI reflects fresh data
      const fresh = await loadStockGradeDetail(monthNum, yearNum)
      if (fresh) setGradeData({ inwards: fresh.inwards, outwards: fresh.outwards })
    } catch (err: any) {
      // Only surface error if we have no cached data to show
      if (!gradeData) setError(err?.message ?? 'Failed to load data')
    } finally {
      setSyncing(false)
    }
  }, [monthNum, yearNum, gradeData])

  useEffect(() => {
    loadLocal().then(() => runSync())
  }, [monthNum, yearNum])

  // ── Loading — only block when there is genuinely nothing to show ──────────
  if (!gradeData) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Grade Breakdown',
            headerShown: true,
            headerBackTitle: '',
            headerTintColor: Colors.brandColor,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
              </TouchableOpacity>
            ),
          }}
        />
        <ShimmerScreen />
      </>
    )
  }



  const activeData = gradeData[activeTab]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Grade Breakdown',
          headerShown: true,
          headerBackTitle: '',
          headerTintColor: Colors.brandColor,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(['inwards', 'outwards'] as ActiveTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabBtnText, activeTab === tab && s.tabBtnTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        {syncing && (
          <View style={s.syncBadge}>
            <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 4 }} />
            <Text style={s.syncText}>Syncing…</Text>
          </View>
        )}
      </View>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary strip */}
        <View style={s.summaryStrip}>
          {(['coil', 'pipe', 'total'] as const).map((key) => {
            const totalRow = activeData[key].find(r => r.grade === '' || r.grade === null)
            return (
              <View key={key} style={s.summaryItem}>
                <Text style={s.summaryLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <Text style={s.summaryValue}>{fmt(totalRow?.value)}</Text>
                <Text style={s.summaryQty}>{fmtQty(totalRow?.qty)} kg</Text>
              </View>
            )
          })}
        </View>

        {/* Coil */}
        <View style={s.card}>
          <GradeTable rows={activeData.coil} title="Coil" />
        </View>

        {/* Pipe */}
        <View style={s.card}>
          <GradeTable rows={activeData.pipe} title="Pipe" />
        </View>

        {/* Total */}
        <View style={[s.card, s.totalCard]}>
          <GradeTable rows={activeData.total} title="Combined Total" />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 11, backgroundColor: Colors.brandColor, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.brandColor },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  tabBtnTextActive: { color: Colors.brandColor, fontWeight: '700' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.brandColorLight, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor, marginRight: 10, alignSelf: 'center' },
  syncText: { fontSize: 11, color: Colors.brandColor, fontWeight: '500' },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    overflow: 'hidden',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRightWidth: 0.5,
    borderRightColor: '#E5E7EB',
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  summaryQty: { fontSize: 10, color: '#9CA3AF' },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  totalCard: {
    borderColor: Colors.brandColor,
    borderWidth: 1,
  },
})

// ─── Table styles ─────────────────────────────────────────────────────────────

const t = StyleSheet.create({
  tableWrap: {},

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },

  table: { borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 4,
  },
  rowLast: { borderBottomWidth: 0 },
  headerRow: { backgroundColor: '#F9FAFB', paddingVertical: 8 },
  totalRow: { backgroundColor: '#F3F4F6' },

  cell: { flex: 1, fontSize: 12, color: '#374151' },
  headerCell: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  right: { textAlign: 'right' },
  dataText: { color: '#374151', fontWeight: '500' },
  valueText: { color: '#111827', fontWeight: '700' },
  totalLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
  totalText: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'right' },

  // Grade pill
  gradePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  gradePillDefault: { backgroundColor: '#F3F4F6' },
  gradePillText: { fontSize: 11, fontWeight: '700' },
})

// ─── Shimmer styles ───────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
})