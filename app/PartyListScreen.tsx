import Party from '@/Database/models/Party'
import { loadParties, syncParties } from '@/Services/Partysync'
import { Colors } from '@/utils/colors'
import { router, Stack } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'customer' | 'vendor' | 'both'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (!n || isNaN(n)) return '₹0'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function getTypeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'customer': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    case 'vendor': return { bg: Colors.brandColorLight, text: Colors.brandColor, border: Colors.brandColor }
    default: return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }
  }
}

// ─── Party Card ───────────────────────────────────────────────────────────────

function PartyCard({ item }: { item: Party }) {
  const details = item.invoiceDetails
  const sales = details?.sales
  const purchases = details?.purchases
  const typeColor = getTypeColor(item.partyType)

  const hasSales = parseInt(sales?.invoice_count ?? '0') > 0
  const hasPurchases = parseInt(purchases?.bill_count ?? '0') > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={cardStyles.card}
      onPress={() =>
        router.push({
          pathname: '/PartyDetailScreen',
          params: { partyId: item.partyId },
        })
      }
    >
      {/* Top row: name + type badge */}
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.partyName} numberOfLines={1}>{item.partyName}</Text>
        <View style={[cardStyles.typeBadge, { backgroundColor: typeColor.bg, borderColor: typeColor.border }]}>
          <Text style={[cardStyles.typeText, { color: typeColor.text }]}>
            {item.partyType.charAt(0).toUpperCase() + item.partyType.slice(1)}
          </Text>
        </View>
      </View>

      {/* GSTIN */}
      {!!item.gstinUin && (
        <Text style={cardStyles.gstin}>{item.gstinUin}</Text>
      )}

      {/* Summary row */}
      <View style={cardStyles.summaryRow}>
        {hasSales && (
          <View style={cardStyles.summaryBlock}>
            <Text style={cardStyles.summaryLabel}>Sales</Text>
            <Text style={cardStyles.summaryValue}>{formatAmount(sales?.total_invoiced ?? '0')}</Text>
            <Text style={cardStyles.summaryMeta}>
              {sales?.invoice_count ?? 0} inv · Due: {formatAmount(sales?.amount_due ?? '0')}
            </Text>
          </View>
        )}
        {hasSales && hasPurchases && <View style={cardStyles.summaryDivider} />}
        {hasPurchases && (
          <View style={cardStyles.summaryBlock}>
            <Text style={cardStyles.summaryLabel}>Purchases</Text>
            <Text style={[cardStyles.summaryValue, cardStyles.purchaseValue]}>
              {formatAmount(purchases?.total_billed ?? '0')}
            </Text>
            <Text style={cardStyles.summaryMeta}>
              {purchases?.bill_count ?? 0} bills · Due: {formatAmount(purchases?.amount_due ?? '0')}
            </Text>
          </View>
        )}
        {!hasSales && !hasPurchases && (
          <Text style={cardStyles.noActivity}>No activity</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartyListScreen() {
  const [allParties, setAllParties] = useState<Party[]>([])
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  // ── Load from local DB ──────────────────────────────────────────────────────
  const loadLocal = useCallback(async () => {
    const records = await loadParties()
    setAllParties(records)
  }, [])

  // ── Sync + reload ───────────────────────────────────────────────────────────
  const runSync = useCallback(async () => {
    await syncParties()
    await loadLocal()
  }, [loadLocal])

  useEffect(() => {
    loadLocal()
    setSyncing(true)
    runSync().finally(() => setSyncing(false))
  }, [loadLocal, runSync])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync()
    setRefreshing(false)
  }, [runSync])

  // ── Filter + search (in-memory, fast) ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allParties

    if (activeTab !== 'all') {
      list = list.filter((p) => p.partyType === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.partyName.toLowerCase().includes(q) ||
          p.gstinUin.toLowerCase().includes(q),
      )
    }

    return list
  }, [allParties, activeTab, search])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customers' },
    { key: 'vendor', label: 'Vendors' },
    { key: 'both', label: 'Both' },
  ]

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (allParties.length === 0 && syncing) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Parties' }} />
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={s.loadingText}>Loading parties…</Text>
      </View>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Parties' }} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            <Text style={s.title}>Parties</Text>
            <Text style={s.subtitle}>{filtered.length} of {allParties.length} records</Text>
          </View>
          {syncing && !refreshing && (
            <View style={s.syncBadge}>
              <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
              <Text style={s.syncText}>Syncing…</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search name or GSTIN…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={s.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PartyCard item={item} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No parties found</Text>
            <Text style={s.emptyHint}>Try a different search or filter</Text>
          </View>
        }
        ListFooterComponent={<View style={s.footer} />}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  footer: { height: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9CA3AF' },

  header: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 0.5, borderColor: '#E5E7EB', marginBottom: 10 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  clearBtn: { fontSize: 13, color: '#9CA3AF', paddingLeft: 8 },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: Colors.brandColor, borderColor: Colors.brandColor },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
})

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 0.5, flexShrink: 0 },
  typeText: { fontSize: 11, fontWeight: '500' },
  gstin: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },

  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  summaryBlock: { flex: 1 },
  summaryDivider: { width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 12, alignSelf: 'stretch' },
  summaryLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#059669', marginBottom: 2 },
  purchaseValue: { color: '#DC2626' },
  summaryMeta: { fontSize: 11, color: '#6B7280' },
  noActivity: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' },
})