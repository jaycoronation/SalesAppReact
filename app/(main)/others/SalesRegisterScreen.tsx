// app/SalesRegisterScreen.tsx
import SalesRegisterEntry, { BtwnDays } from '@/Database/models/SalesRegisterEntry'
import { loadSalesRegister, syncSalesRegister } from '@/Services/SalesRegisterSync'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string | null | undefined): string {
    const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
    if (!n || isNaN(n as number)) return '₹0'
    const abs = Math.abs(n as number)
    const sign = (n as number) < 0 ? '−' : ''
    if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
    return `${sign}₹${abs.toLocaleString('en-IN')}`
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BUCKET_LABELS: Record<BtwnDays, string> = {
    paid: 'Received',
    d0_7: '0–7 days',
    d7_15: '7–15 days',
    d15_30: '15–30 days',
    over_30: '>30 days',
}

const BUCKET_DESC: Record<BtwnDays, string> = {
    paid: 'Fully received invoices',
    d0_7: 'Due within a week',
    d7_15: 'Due in 7–15 days',
    d15_30: 'Due in 15–30 days',
    over_30: 'Overdue by 30+ days',
}

const BUCKET_COLORS: Record<BtwnDays, { bg: string; text: string; border: string; accent: string }> = {
    paid: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', accent: '#059669' },
    d0_7: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', accent: '#2563EB' },
    d7_15: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', accent: '#D97706' },
    d15_30: { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74', accent: '#EA580C' },
    over_30: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', accent: '#DC2626' },
}

const BUCKET_DOT: Record<BtwnDays, string> = {
    paid: '#059669',
    d0_7: '#2563EB',
    d7_15: '#D97706',
    d15_30: '#EA580C',
    over_30: '#DC2626',
}

const ALL_BUCKETS = Object.keys(BUCKET_LABELS) as BtwnDays[]

function statusStyle(statusDisplay: string, isOverdue: string) {
    if (isOverdue === '1') return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
    if (statusDisplay?.toLowerCase() === 'paid' ||
        statusDisplay?.toLowerCase() === 'received') return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
    if (statusDisplay?.toLowerCase() === 'partial') return { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' }
    return { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' }
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function SaleRow({ item, accent }: { item: SalesRegisterEntry; accent: string }) {
    const ss = statusStyle(item.statusDisplay, item.isOverdue)
    const daysLabel = item.isOverdue === '1'
        ? `${item.daysOverdue}d overdue`
        : item.daysUntil === '0' ? 'Due today' : `${item.daysUntil}d left`

    const receivedPct = item.grossTotal > 0
        ? Math.min(100, (item.amountReceived / item.grossTotal) * 100)
        : 0

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={s.row}
            onPress={() =>
                router.push({
                    pathname: '../../sale/SaleDetailScreen',
                    params: { saleId: item.saleId },
                })
            }
        >
            {/* Left */}
            <View style={s.rowLeft}>
                <View style={s.rowTopRow}>
                    <Text style={s.partyName} numberOfLines={1}>{item.partyName}</Text>
                    <View style={[s.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                        <Text style={[s.statusText, { color: ss.text }]}>{item.statusDisplay}</Text>
                    </View>
                </View>

                <Text style={[s.voucherNo, { color: accent }]}>{item.voucherNo}</Text>

                <Text style={s.dates}>
                    {item.txnDate}  ·  Due: {item.dueDate}
                </Text>

                {/* Invoice type pill */}
                <View style={s.typeRow}>
                    <View style={[s.typePill, { backgroundColor: accent + '18' }]}>
                        <Text style={[s.typePillText, { color: accent }]}>{item.invoiceType}</Text>
                    </View>
                    {item.gstinUin ? (
                        <Text style={s.gstin} numberOfLines={1}>{item.gstinUin}</Text>
                    ) : null}
                </View>

                {/* Progress bar — amount received vs gross */}
                {receivedPct > 0 && (
                    <View style={s.progressWrap}>
                        <View style={[s.progressBar, { width: `${receivedPct}%` as any, backgroundColor: '#059669' }]} />
                    </View>
                )}
            </View>

            {/* Right */}
            <View style={s.rowRight}>
                <Text style={s.outstanding}>{fmt(item.outstanding)}</Text>
                <Text style={s.grossTotal}>{fmt(item.grossTotal)} total</Text>
                <Text style={[s.daysLabel, { color: item.isOverdue === '1' ? '#DC2626' : '#6B7280' }]}>
                    {daysLabel}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SalesRegisterScreen() {
    const { btwnDays, fiscalYear } = useLocalSearchParams<{
        btwnDays: BtwnDays
        fiscalYear: string
    }>()

    const fy = fiscalYear ?? '2025-26'

    const [bucket, setBucket] = useState<BtwnDays>((btwnDays as BtwnDays) ?? 'd0_7')
    const [entries, setEntries] = useState<SalesRegisterEntry[]>([])
    const [syncing, setSyncing] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const bucketCfg = BUCKET_COLORS[bucket]
    const bucketLabel = BUCKET_LABELS[bucket]

    // ── Derived summary ────────────────────────────────────────────────────────
    const totalRecords = entries.length
    const totalOutstanding = entries.reduce((s, r) => s + r.outstanding, 0)
    const totalGross = entries.reduce((s, r) => s + r.grossTotal, 0)
    const totalReceived = entries.reduce((s, r) => s + r.amountReceived, 0)
    const overdueCount = entries.filter((r) => r.isOverdue === '1').length
    const uniqueParties = new Set(entries.map((r) => r.partyId)).size

    // ── Data ───────────────────────────────────────────────────────────────────
    const loadLocal = useCallback(async () => {
        const records = await loadSalesRegister(bucket, fy)
        setEntries(records)
    }, [bucket, fy])

    const runSync = useCallback(async () => {
        await syncSalesRegister(bucket, fy)
        await loadLocal()
    }, [bucket, fy, loadLocal])

    useEffect(() => {
        setEntries([])
        loadLocal()
        setSyncing(true)
        runSync().finally(() => setSyncing(false))
    }, [bucket]) // eslint-disable-line react-hooks/exhaustive-deps

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await runSync()
        setRefreshing(false)
    }, [runSync])

    // ── Bottom Sheet ───────────────────────────────────────────────────────────
    const sheetRef = useRef<BottomSheet>(null)
    const snapPoints = useMemo(() => ['42%'], [])

    const openFilter = () => sheetRef.current?.expand()
    const closeFilter = () => sheetRef.current?.close()

    const selectBucket = (b: BtwnDays) => {
        setBucket(b)
        closeFilter()
    }

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
            />
        ),
        [],
    )

    // ── Loading ────────────────────────────────────────────────────────────────
    if (entries.length === 0 && syncing) {
        return (
            <View style={s.center}>
                <Stack.Screen options={{ title: bucketLabel, headerBackTitle: '', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
                <ActivityIndicator size="large" color={bucketCfg.accent} />
                <Text style={s.loadingText}>Loading…</Text>
            </View>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: `Receivables · ${bucketLabel}`, headerBackTitle: '', headerShown: true, headerBackButtonDisplayMode: "minimal", }} />

            {/* ── Hero summary ──────────────────────────────────────────────── */}
            <View style={[s.heroCard, { backgroundColor: bucketCfg.bg, borderColor: bucketCfg.border }]}>
                <View style={s.heroTopRow}>
                    <View style={[s.bucketPill, { backgroundColor: bucketCfg.accent }]}>
                        <Text style={s.bucketPillText}>{bucketLabel}</Text>
                    </View>
                    <View style={s.heroTopRight}>
                        {syncing && !refreshing && (
                            <ActivityIndicator size="small" color={bucketCfg.accent} />
                        )}
                        <TouchableOpacity
                            style={[s.filterBtn, { borderColor: bucketCfg.accent }]}
                            onPress={openFilter}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.filterBtnText, { color: bucketCfg.accent }]}>⇅ Filter</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Outstanding amount */}
                <Text style={[s.heroAmount, { color: bucketCfg.accent }]}>{fmt(totalOutstanding)}</Text>
                <Text style={s.heroSub}>Outstanding across {totalRecords} invoices</Text>

                {/* Progress bar: received vs gross */}
                {totalGross > 0 && (
                    <View style={s.heroProgressWrap}>
                        <View
                            style={[
                                s.heroProgressBar,
                                {
                                    width: `${Math.min(100, (totalReceived / totalGross) * 100)}%` as any,
                                    backgroundColor: '#059669',
                                },
                            ]}
                        />
                    </View>
                )}

                {/* Stats row */}
                <View style={s.heroStats}>
                    <View style={s.heroStat}>
                        <Text style={[s.heroStatVal, { color: bucketCfg.text }]}>{fmt(totalGross)}</Text>
                        <Text style={s.heroStatLabel}>Gross total</Text>
                    </View>
                    <View style={s.heroStatDivider} />
                    <View style={s.heroStat}>
                        <Text style={[s.heroStatVal, { color: bucketCfg.text }]}>{uniqueParties}</Text>
                        <Text style={s.heroStatLabel}>Parties</Text>
                    </View>
                    <View style={s.heroStatDivider} />
                    <View style={s.heroStat}>
                        <Text style={[s.heroStatVal, { color: overdueCount > 0 ? '#DC2626' : bucketCfg.text }]}>
                            {overdueCount}
                        </Text>
                        <Text style={s.heroStatLabel}>Overdue</Text>
                    </View>
                </View>
            </View>

            {/* ── List ──────────────────────────────────────────────────────── */}
            <FlatList
                data={entries}
                keyExtractor={(item) => `${item.btwnDays}-${item.saleId}-${item.partyId}`}
                renderItem={({ item }) => <SaleRow item={item} accent={bucketCfg.accent} />}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={bucketCfg.accent}
                    />
                }
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyText}>No invoices for this bucket</Text>
                    </View>
                }
                ListFooterComponent={<View style={s.footer} />}
            />

            {/* ── Filter Bottom Sheet ──────────────────────────────────────── */}
            <BottomSheet
                ref={sheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={s.sheetHandle}
                backgroundStyle={s.sheetBg}
            >
                <BottomSheetView style={s.sheetContent}>
                    <View style={s.sheetHeader}>
                        <Text style={s.sheetTitle}>Filter by Due Period</Text>
                        <TouchableOpacity onPress={closeFilter} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={s.sheetClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.sheetSubtitle}>Select a bucket to view receivables</Text>

                    <View style={s.bucketList}>
                        {ALL_BUCKETS.map((b) => {
                            const cfg = BUCKET_COLORS[b]
                            const isActive = b === bucket
                            return (
                                <TouchableOpacity
                                    key={b}
                                    activeOpacity={0.7}
                                    onPress={() => selectBucket(b)}
                                    style={[
                                        s.bucketOption,
                                        isActive && {
                                            backgroundColor: cfg.bg,
                                            borderColor: cfg.accent,
                                            borderWidth: 1.5,
                                        },
                                    ]}
                                >
                                    <View style={[s.bucketDot, { backgroundColor: BUCKET_DOT[b] }]} />
                                    <View style={s.bucketOptionMid}>
                                        <Text style={[
                                            s.bucketOptionLabel,
                                            isActive && { color: cfg.text, fontWeight: '700' },
                                        ]}>
                                            {BUCKET_LABELS[b]}
                                        </Text>
                                        <Text style={s.bucketOptionDesc}>{BUCKET_DESC[b]}</Text>
                                    </View>
                                    {isActive && (
                                        <View style={[s.checkCircle, { backgroundColor: cfg.accent }]}>
                                            <Text style={s.checkMark}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </BottomSheetView>
            </BottomSheet>
        </View>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
    loadingText: { fontSize: 14, color: '#6B7280' },
    listContent: { paddingHorizontal: 16, paddingTop: 4 },
    footer: { height: 32 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: '#9CA3AF' },

    // Hero
    heroCard: {
        margin: 16,
        borderRadius: 14,
        padding: 16,
        borderWidth: 0.5,
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bucketPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    bucketPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
    },
    filterBtnText: { fontSize: 12, fontWeight: '700' },

    heroAmount: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
    heroSub: { fontSize: 12, color: '#6B7280', marginBottom: 10 },

    heroProgressWrap: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 14,
    },
    heroProgressBar: { height: 4, borderRadius: 2 },

    heroStats: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatDivider: { width: 0.5, height: 28, backgroundColor: '#D1D5DB' },
    heroStatVal: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    heroStatLabel: { fontSize: 10, color: '#9CA3AF' },

    // Row card
    row: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
        alignItems: 'flex-start',
        gap: 8,
    },
    rowLeft: { flex: 1 },
    rowTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    partyName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },

    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        flexShrink: 0,
    },
    statusText: { fontSize: 10, fontWeight: '600' },

    voucherNo: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
    dates: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },

    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typePillText: { fontSize: 10, fontWeight: '600' },
    gstin: { fontSize: 10, color: '#9CA3AF', flex: 1 },

    progressWrap: { height: 3, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
    progressBar: { height: 3, borderRadius: 2 },

    rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    outstanding: { fontSize: 14, fontWeight: '700', color: '#111827' },
    grossTotal: { fontSize: 11, color: '#9CA3AF' },
    daysLabel: { fontSize: 11, fontWeight: '500' },

    // Bottom Sheet
    sheetBg: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    sheetHandle: { backgroundColor: '#D1D5DB', width: 40 },
    sheetContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
    sheetClose: { fontSize: 16, color: '#9CA3AF' },
    sheetSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },

    bucketList: { gap: 8 },
    bucketOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    bucketDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    bucketOptionMid: { flex: 1 },
    bucketOptionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 1 },
    bucketOptionDesc: { fontSize: 11, color: '#9CA3AF' },

    checkCircle: {
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    checkMark: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
})