import { FinancialYearPicker } from '@/components/FinancialYearPicker'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import NotificationBell from '@/components/NotificationBell'
import { AgingData, AgingSection } from '@/Database/models/dashboardoverview'
import SalesRegisterEntry from '@/Database/models/SalesRegisterEntry'
import { loadReceivablesAging, syncDashboardV2 } from '@/Services/DashboardV2Sync'
import {
    BtwnDaysFilter,
    loadAllSalesRegister,
    Section,
    syncAllSalesRegister,
} from '@/Services/SalesRegisterSync'
import { Colors } from '@/utils/colors'
import {
    getCurrentFY,
    MONTH_SHORT,
} from '@/utils/fiscalYear'
import { SessionManager } from '@/utils/sessionManager'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    DeviceEventEmitter,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string): string {
    const n = typeof val === 'string' ? parseFloat(val) : val
    if (!n || isNaN(n)) return '₹0'
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
    return `₹${n.toLocaleString('en-IN')}`
}

function nowMonthYear(): { month: number; year: number } {
    const d = new Date()
    return { month: d.getMonth() + 1, year: d.getFullYear() }
}

// ─── Constants ────────────────────────────────────────────────────────────────

interface BtwnFilter {
    key: BtwnDaysFilter
    label: string
}

const BTWN_FILTERS: BtwnFilter[] = [
    { key: 'all', label: 'All' },
    { key: 'd0_7', label: 'd0–7' },
    { key: 'd7_15', label: 'd7–15' },
    { key: 'd15_30', label: 'd15–30' },
    { key: 'over_30', label: 'd>30' },
]

const SECTION_CFG = {
    due: {
        label: 'DUE',
        subtitle: 'Overdue',
        dot: '#DC2626',
        activeBg: '#FEF2F2',
        activeBorder: '#DC2626',
        activeText: '#991B1B',
        activeAmount: '#DC2626',
    },
    upcoming: {
        label: 'UPCOMING',
        subtitle: 'Due soon',
        dot: '#2563EB',
        activeBg: '#EFF6FF',
        activeBorder: '#2563EB',
        activeText: '#1D4ED8',
        activeAmount: '#2563EB',
    },
} as const

// ─── Chip summary helpers ─────────────────────────────────────────────────────

interface ChipSummary { count: number; outstanding: number }
type SectionSummaries = Record<BtwnDaysFilter, ChipSummary>

function bucketToSummary(b: any): ChipSummary {
    return {
        count: parseInt(b?.count ?? '0') || 0,
        outstanding: parseFloat(b?.amount ?? '0') || 0,
    }
}

function sectionToSummaries(s: AgingSection | undefined): SectionSummaries {
    return {
        d0_7: bucketToSummary(s?.buckets?.d0_7),
        d7_15: bucketToSummary(s?.buckets?.d7_15),
        d15_30: bucketToSummary(s?.buckets?.d15_30),
        over_30: bucketToSummary(s?.buckets?.over_30),
        all: {
            count: parseInt(s?.total_count ?? '0') || 0,
            outstanding: parseFloat(s?.total_outstanding ?? '0') || 0,
        },
    }
}

const EMPTY_SUMMARIES: SectionSummaries = {
    d0_7: { count: 0, outstanding: 0 }, d7_15: { count: 0, outstanding: 0 },
    d15_30: { count: 0, outstanding: 0 }, over_30: { count: 0, outstanding: 0 },
    all: { count: 0, outstanding: 0 },
}

// ─── Party Row ────────────────────────────────────────────────────────────────

function PartyRow({
    item,
    amountColor,
}: {
    item: SalesRegisterEntry
    amountColor: string
}) {
    const isPaid = item.paymentStatus === 'paid'
    const badgeBg = isPaid ? '#D1FAE5' : '#FEF9C3'
    const badgeBorder = isPaid ? '#6EE7B7' : '#FDE68A'
    const badgeText = isPaid ? '#065F46' : '#92400E'

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            style={s.row}
            onPress={() =>
                router.push({
                    pathname: '/parties/PartyDetailScreen',
                    params: { partyId: item.partyId },
                })
            }
        >
            <View style={s.rowLeft}>
                <View style={s.rowTopRow}>
                    <Text style={s.partyName} numberOfLines={2}>
                        {item.partyName}
                    </Text>
                    <View style={[s.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                        <Text style={[s.badgeText, { color: badgeText }]}>
                            {item.statusDisplay}
                        </Text>
                    </View>
                </View>
                <Text style={s.gstin} numberOfLines={1}>{item.gstinUin}</Text>
            </View>

            <View style={s.rowRight}>
                <Text style={[s.outstanding, { color: amountColor }]}>
                    {fmt(item.outstanding)}
                </Text>
                <Text style={s.grossTotal}>{fmt(item.grossTotal)} total</Text>
                {item.nearestDueDate ? (
                    <Text style={s.dueDateLabel}>
                        {item.section === 'due' ? 'First unpaid: ' : 'Last unpaid: '}
                        <Text style={s.dueDateValue}>{item.nearestDueDate}</Text>
                    </Text>
                ) : null}
            </View>
        </TouchableOpacity>
    )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SalesRegisterScreen() {
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [selectedFY, setSelectedFY] = useState(getCurrentFY())
    const [isFYPickerVisible, setFYPickerVisible] = useState(false)
    const [isPickerVisible, setPickerVisible] = useState(false)

    const [agingData, setAgingData] = useState<AgingData | null>(null)
    const [allEntries, setAllEntries] = useState<SalesRegisterEntry[]>([])
    const [selectedSection, setSelectedSection] = useState<Section>('due')
    const [selectedBtwn, setSelectedBtwn] = useState<BtwnDaysFilter>('all')
    const [syncing, setSyncing] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const [isSearchVisible, setIsSearchVisible] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const summaries = useMemo<Record<Section, SectionSummaries>>(() => ({
        due: agingData?.due ? sectionToSummaries(agingData.due) : EMPTY_SUMMARIES,
        upcoming: agingData?.upcoming ? sectionToSummaries(agingData.upcoming) : EMPTY_SUMMARIES,
    }), [agingData])

    const entries = useMemo(() => {
        let filtered = selectedBtwn === 'all'
            ? allEntries.filter((e) => e.section === selectedSection)
            : allEntries.filter(
                (e) => e.section === selectedSection && e.btwnDays === selectedBtwn,
            )

        // Consolidate by Party if in All bucket
        if (selectedBtwn === 'all') {
            const map: Record<string, any> = {}
            for (const e of filtered) {
                if (!map[e.partyId]) {
                    map[e.partyId] = {
                        partyId: e.partyId,
                        partyName: e.partyName,
                        gstinUin: e.gstinUin,
                        paymentStatus: e.paymentStatus,
                        statusDisplay: e.statusDisplay,
                        section: e.section,
                        outstanding: e.outstanding,
                        grossTotal: e.grossTotal,
                        nearestDueDate: e.nearestDueDate,
                    }
                } else {
                    map[e.partyId].outstanding += e.outstanding
                    map[e.partyId].grossTotal += e.grossTotal
                    // For All bucket consolidation, we'll keep the first one found 
                    // as the API likely provides the consolidated date.
                }
            }
            filtered = Object.values(map)
        }

        // Apply Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(e =>
                e.partyName.toLowerCase().includes(q) ||
                (e.gstinUin && e.gstinUin.toLowerCase().includes(q))
            )
        }

        return filtered
    }, [allEntries, selectedSection, selectedBtwn, searchQuery])

    const loadAgingLocal = useCallback(async () => {
        const aging = await loadReceivablesAging(selectedMonth, selectedYear)
        setAgingData(aging)
    }, [selectedMonth, selectedYear])

    const loadEntriesLocal = useCallback(async () => {
        const rows = await loadAllSalesRegister()
        setAllEntries(rows)
    }, [])

    const runSync = useCallback(async () => {
        // Both syncs run in parallel for speed
        await Promise.all([
            syncDashboardV2(selectedMonth, selectedYear),
            syncAllSalesRegister(),
        ])
        // Reload both data sources after sync
        await Promise.all([
            loadAgingLocal(),
            loadEntriesLocal(),
        ])
    }, [selectedMonth, selectedYear, loadAgingLocal, loadEntriesLocal])

    useEffect(() => {
        const loadInitial = async () => {
            const saved = await SessionManager.getDashFilter();
            if (saved) {
                setSelectedMonth(saved.month);
                setSelectedYear(saved.year);
                setSelectedFY(saved.fy);
            }
        };
        loadInitial();

        const sub = DeviceEventEmitter.addListener('SHARED_FILTER_CHANGED', (data: any) => {
            setSelectedMonth(data.month);
            setSelectedYear(data.year);
            setSelectedFY(data.fy);
        });

        return () => sub.remove();
    }, []);

    useEffect(() => {
        setSyncing(true)
        Promise.all([loadAgingLocal(), loadEntriesLocal()])
            .then(runSync)
            .finally(() => setSyncing(false))
    }, [selectedMonth, selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleFYApply = (fy: string) => {
        setSelectedFY(fy)
        const d = new Date()
        const curFY = getCurrentFY()
        let m = 4, y = parseInt(fy.split('-')[0])
        if (fy === curFY) {
            m = d.getMonth() + 1
            y = d.getFullYear()
        }
        setSelectedMonth(m)
        setSelectedYear(y)
        SessionManager.setDashFilter(m, y, fy)
        DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month: m, year: y, fy })
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await runSync()
        setRefreshing(false)
    }, [runSync])

    const handleFilterApply = useCallback((month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
        SessionManager.setDashFilter(month, year, selectedFY)
        DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month, year, fy: selectedFY })
    }, [selectedFY])

    const cfg = SECTION_CFG[selectedSection]
    const activeFilter = BTWN_FILTERS.find((f) => f.key === selectedBtwn)!

    const ListHeader = (
        <View style={s.header}>
            {/* ── Month & FY Filter ────────────────────────────────────────────────── */}
            <View style={s.headerFilters}>
                <View />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        style={s.filterBtn}
                        onPress={() => setFYPickerVisible(true)}
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

            {/* ── Search Bar ──────────────────────────────────────────────────────────── */}
            {isSearchVisible && (
                <View style={s.searchRow}>
                    <View style={s.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search party or GSTIN..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>
                </View>
            )}
            {(['due', 'upcoming'] as Section[]).map((sec) => {
                const scfg = SECTION_CFG[sec]
                return (
                    <View key={sec} style={s.strip}>
                        <View style={s.stripTitle}>
                            <View style={[s.dot, { backgroundColor: scfg.dot }]} />
                            <Text style={s.stripLabel}>{scfg.label}</Text>
                            <Text style={s.stripSub}>· {scfg.subtitle}</Text>
                            {sec === selectedSection && syncing && !refreshing && (
                                <ActivityIndicator
                                    size="small"
                                    color={scfg.dot}
                                    style={{ marginLeft: 6 }}
                                />
                            )}
                            <Text style={[s.stripTotal, { color: scfg.dot }]}>
                                {fmt(summaries[sec].all.outstanding)} ({summaries[sec].all.count} Invoices)
                            </Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.chipRow}
                        >
                            {BTWN_FILTERS.map((filter) => {
                                const sum = summaries[sec][filter.key]
                                const isActive =
                                    selectedSection === sec && selectedBtwn === filter.key
                                return (
                                    <TouchableOpacity
                                        key={filter.key}
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            setSelectedSection(sec)
                                            setSelectedBtwn(filter.key)
                                        }}
                                        style={[
                                            s.chip,
                                            isActive && {
                                                backgroundColor: scfg.activeBg,
                                                borderColor: scfg.activeBorder,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.chipLabel,
                                                isActive && { color: scfg.activeText, fontWeight: '700' },
                                            ]}
                                        >
                                            {filter.label}
                                        </Text>
                                        <Text
                                            style={[
                                                s.chipCount,
                                                isActive && { color: scfg.dot },
                                            ]}
                                        >
                                            {fmt(sum.outstanding)}
                                        </Text>
                                        <Text
                                            style={[
                                                s.chipAmount,
                                                isActive && { color: scfg.activeText },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {sum.count} Invoices
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                )
            })}

            <View style={s.listMeta}>
                <View style={[s.dot, { backgroundColor: cfg.dot }]} />
                <Text style={s.listMetaLabel}>
                    {cfg.label} · {activeFilter.label}
                </Text>
                <Text style={s.listMetaCount}>
                    {entries.length} Parties
                </Text>
            </View>
        </View>
    )

    if (!agingData && syncing) {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color={Colors.brandColor} />
                <Text style={s.loadingText}>Loading…</Text>
            </View>
        )
    }

    return (
        <View style={s.container}>
            <Stack.Screen
                options={{
                    title: 'Receivables',
                    headerBackTitle: '',
                    headerShown: true,
                    headerBackVisible: true,
                    headerTintColor: Colors.brandColor,
                    headerRight: () => (
                        <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (isSearchVisible) setSearchQuery('')
                                    setIsSearchVisible(!isSearchVisible)
                                }}
                            >
                                <Ionicons
                                    name={isSearchVisible ? "close-circle-outline" : "search-outline"}
                                    size={22}
                                    color={Colors.brandColor}
                                />
                            </TouchableOpacity>
                            <NotificationBell color={Colors.brandColor} />
                        </View>
                    ),
                }}
            />

            <FinancialYearPicker
                visible={isFYPickerVisible}
                selectedFY={selectedFY}
                onApply={handleFYApply}
                onClose={() => setFYPickerVisible(false)}
            />

            <MonthYearPicker
                visible={isPickerVisible}
                month={selectedMonth}
                year={selectedYear}
                selectedFY={selectedFY}
                onApply={handleFilterApply}
                onClose={() => setPickerVisible(false)}
            />

            <FlatList
                data={entries}
                keyExtractor={(item, i) =>
                    `${item.section}-${item.btwnDays}-${item.partyId}-${i}`
                }
                renderItem={({ item }) => (
                    <PartyRow item={item} amountColor={cfg.activeAmount} />
                )}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={cfg.dot}
                    />
                }
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyIcon}>📭</Text>
                        <Text style={s.emptyText}>No records</Text>
                        <Text style={s.emptyHint}>Pull down to refresh</Text>
                    </View>
                }
                ListFooterComponent={<View style={{ height: 120 }} />}
            />
        </View>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    listContent: { paddingHorizontal: 8, paddingTop: 4 },

    // ── Header ────────────────────────────────────────────────────────────────
    header: { paddingTop: 4, paddingBottom: 4 },

    headerFilters: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterBtnIcon: { fontSize: 13 },
    filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

    strip: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: 8,
        marginBottom: 8,
        paddingVertical: 10,
    },
    stripTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 5,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    stripLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
    stripSub: { fontSize: 11, color: '#9CA3AF' },
    stripTotal: { fontSize: 12, fontWeight: '700', marginLeft: 'auto' },

    chipRow: {
        paddingHorizontal: 10,
        gap: 6,
        flexDirection: 'row',
    },
    chip: {
        width: 76,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 2,
    },
    chipLabel: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
    chipCount: { fontSize: 14, fontWeight: '700', color: '#111827' },
    chipAmount: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },

    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 5,
    },
    listMetaLabel: { fontSize: 11, fontWeight: '700', color: '#374151', flex: 1 },
    listMetaCount: { fontSize: 11, color: '#9CA3AF' },

    // ── Search Bar ────────────────────────────────────────────────────────────
    searchRow: { paddingHorizontal: 10, paddingBottom: 10 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

    row: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 6,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        gap: 8,
    },
    rowLeft: { flex: 1, },
    rowTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',   // ✅ IMPORTANT
        gap: 6,
    },
    partyName: { fontSize: 13, fontWeight: '600', color: '#111827', flexShrink: 1, },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        flexShrink: 0,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 10, fontWeight: '600' },
    gstin: { fontSize: 11, color: '#9CA3AF' },
    rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    outstanding: { fontSize: 14, fontWeight: '700' },
    grossTotal: { fontSize: 11, color: '#9CA3AF' },
    dueDateLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
    dueDateValue: { fontWeight: '600', color: '#374151' },

    empty: { alignItems: 'center', paddingTop: 48, gap: 6 },
    emptyIcon: { fontSize: 32 },
    emptyText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
    emptyHint: { fontSize: 12, color: '#D1D5DB' },
})