import { FinancialYearPicker } from '@/components/FinancialYearPicker';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ShimmerBox } from '@/components/Shimmer';
import { RecentInvoiceItem } from '@/Database/models/dashboardoverview';
import { loadDashboardV2 } from '@/Services/DashboardV2Sync';
import { syncRecentInvoices } from '@/Services/RecentInvoicesSync';
import { Colors } from '@/utils/colors';
import {
  getCurrentFY,
  MONTH_SHORT,
} from '@/utils/fiscalYear';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n)) return '₹0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

function statusBadgeStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid': return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
    case 'partial': return { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' }
    default: return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' }
  }
}

// ─── Invoice Card ─────────────────────────────────────────────────────────────

function RecentInvoiceRow({ item }: { item: RecentInvoiceItem }) {
  const bs = statusBadgeStyle(item.payment_status)
  return (
    <TouchableOpacity
      style={cardStyles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/sales/SaleDetailScreen',
          params: { saleId: item.sale_id },
        })
      }
    >
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.partyName} numberOfLines={1}>{item.party_name}</Text>
        <Text style={cardStyles.amount}>{formatAmount(item.gross_total)}</Text>
      </View>
      <View style={cardStyles.midRow}>
        <Text style={cardStyles.voucherNo}>{item.voucher_no}</Text>
        <Text style={cardStyles.txnDate}>{item.txn_date}</Text>
      </View>
      <View style={cardStyles.bottomRow}>
        <View style={[cardStyles.badge, { backgroundColor: bs.bg, borderColor: bs.border }]}>
          <Text style={[cardStyles.badgeText, { color: bs.text }]}>{item.status_display}</Text>
        </View>
        <Text style={cardStyles.outstanding}>
          {parseFloat(item.outstanding) > 0 ? `Outstanding: ${formatAmount(item.outstanding)}` : 'Fully Paid'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Shimmer Loading Layout ──────────────────────────────────────────────────

function ShimmerRecentInvoices() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ShimmerBox height={40} borderRadius={10} />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} style={cardStyles.card}>
            <View style={cardStyles.topRow}>
              <ShimmerBox width="60%" height={16} />
              <ShimmerBox width={80} height={18} />
            </View>
            <View style={[cardStyles.midRow, { marginTop: 8 }]}>
              <ShimmerBox width="40%" height={12} />
              <ShimmerBox width="30%" height={12} />
            </View>
            <View style={[cardStyles.bottomRow, { marginTop: 12 }]}>
              <ShimmerBox width={60} height={20} borderRadius={6} />
              <ShimmerBox width="40%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecentInvoicesScreen() {
  const { month, year } = useLocalSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(month ? parseInt(month as string) : new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(year ? parseInt(year as string) : new Date().getFullYear());
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [fyPickerVisible, setFyPickerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [invoices, setInvoices] = useState<RecentInvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchInvoices = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      // 1. Load from local DB first
      const cached = await loadDashboardV2(selectedMonth, selectedYear);
      if (cached) {
        setInvoices(cached.recentInvoices);
      }

      // 2. Sync from API
      await syncRecentInvoices(selectedMonth, selectedYear);

      // 3. Reload from DB after sync
      const updated = await loadDashboardV2(selectedMonth, selectedYear);
      if (updated) {
        setInvoices(updated.recentInvoices);
      }
    } catch (error) {
      console.error('Error fetching recent invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

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
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices(true);
  }, [fetchInvoices]);

  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    SessionManager.setDashFilter(month, year, selectedFY)
    DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month, year, fy: selectedFY })
  }, [selectedFY])

  const handleFYApply = useCallback((fy: string) => {
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
  }, [])

  const filteredInvoices = invoices.filter(item =>
    item.party_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.voucher_no?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Recent Sales Invoices',
            headerShown: true,
            headerBackTitle: '',
            animation: 'none',
            headerTintColor: Colors.brandColor,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
              </TouchableOpacity>
            ),
          }}
        />
        <ShimmerRecentInvoices />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Recent Sales Invoices',
          headerShown: true,
          headerBackTitle: '',
          animation: 'none',
          headerTintColor: Colors.brandColor,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
        }}
      />

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

      <View style={styles.header}>
        <View style={styles.headerFilters}>
          <View />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFyPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterBtnIcon}>📅</Text>
              <Text style={styles.filterBtnText}>{selectedFY}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterBtnText}>
                {MONTH_SHORT[selectedMonth]} {selectedYear}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search party or voucher..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.sale_id}
        renderItem={({ item }) => <RecentInvoiceRow item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No invoices found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#F3F4F6', gap: 12 },
  headerFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  clearBtn: { fontSize: 13, color: '#9CA3AF', paddingLeft: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyText: { color: '#6B7280', fontSize: 16 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  amount: { fontSize: 15, fontWeight: '700', color: '#059669' },
  midRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  voucherNo: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  txnDate: { fontSize: 12, color: '#6B7280' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  outstanding: { fontSize: 11, color: '#9CA3AF' },
});
