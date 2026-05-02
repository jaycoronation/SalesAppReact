import { FinancialYearPicker } from '@/components/FinancialYearPicker';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ShimmerBox } from '@/components/Shimmer';
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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuarterlyPL {
  quarter: string;
  period: {
    from: string;
    to: string;
  };
  sales: string;
  purchase: string;
  job_work: string;
  expense: string;
  opening_stock: string;
  total_cost: string;
  net_pl: string;
  is_profit: string;
}

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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function PLRow({ item, index }: { item: QuarterlyPL; index: number }) {
  const isLast = false; // We can handle this in the map
  const isProfit = item.is_profit === 'Yes';

  return (
    <View style={[st.tableRow, index % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
      <View style={[st.tableCell, { flex: 0.6 }]}>
        <Text style={st.quarterText}>{item.quarter}</Text>
        <Text style={st.periodText}>{formatDate(item.period.from)} - {formatDate(item.period.to)}</Text>
      </View>
      <Text style={[st.tableCell, st.right]}>{formatAmount(item.sales)}</Text>
      <Text style={[st.tableCell, st.right]}>{formatAmount(item.purchase)}</Text>
      <Text style={[st.tableCell, st.right]}>{formatAmount(item.expense)}</Text>
      <Text style={[st.tableCell, st.right, { color: isProfit ? '#059669' : '#DC2626', fontWeight: '700' }]}>
        {formatAmount(item.net_pl)}
      </Text>
    </View>
  );
}

// ─── Shimmer Loading ─────────────────────────────────────────────────────────

function ShimmerPL() {
  return (
    <View style={styles.container}>
      <View style={{ padding: 16 }}>
        <ShimmerBox height={150} borderRadius={12} />
        <View style={{ height: 16 }} />
        <ShimmerBox height={300} borderRadius={12} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfitLossBreakdownScreen() {
  const params = useLocalSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(params.month ? parseInt(params.month as string) : new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(params.year ? parseInt(params.year as string) : new Date().getFullYear());
  const [selectedFY, setSelectedFY] = useState((params.fy as string) || getCurrentFY());

  const [data, setData] = useState<QuarterlyPL[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fyPickerVisible, setFyPickerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SessionManager.getToken();
      const url = `https://sps-velocity.onrender.com/api/dashboard/getProfitLossQuarterly?fiscal_year=${selectedFY}&month=${selectedMonth}&year=${selectedYear}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Error fetching Quarterly P&L:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFY, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const handleFYApply = useCallback((fy: string) => {
    setSelectedFY(fy);
    // Reset to appropriate month/year for the FY if needed, but let's keep it simple
  }, []);

  if (loading && !refreshing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Quarterly P&L',
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
        <ShimmerPL />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Quarterly P&L',
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <View style={st.tableCard}>
            {/* Header */}
            <View style={[st.tableRow, st.tableHead]}>
              <Text style={[st.tableCell, st.tableHeadText, { flex: 0.6 }]}>Quarter / Period</Text>
              <Text style={[st.tableCell, st.tableHeadText, st.right]}>Sales</Text>
              <Text style={[st.tableCell, st.tableHeadText, st.right]}>Purchase</Text>
              <Text style={[st.tableCell, st.tableHeadText, st.right]}>Expense</Text>
              <Text style={[st.tableCell, st.tableHeadText, st.right]}>Net P/L</Text>
            </View>

            {/* Data Rows */}
            {data.map((item, index) => (
              <View key={item.quarter} style={[st.tableRow, index % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                <View style={[st.tableCell, { flex: 0.6 }]}>
                  <Text style={st.quarterText}>{item.quarter}</Text>
                  <Text style={st.periodText}>{formatDate(item.period.from)} - {formatDate(item.period.to)}</Text>
                </View>
                <Text style={[st.tableCell, st.right]}>{formatAmount(item.sales)}</Text>
                <Text style={[st.tableCell, st.right]}>{formatAmount(item.purchase)}</Text>
                <Text style={[st.tableCell, st.right]}>{formatAmount(item.expense)}</Text>
                <Text style={[st.tableCell, st.right, { color: item.is_profit === 'Yes' ? '#059669' : '#DC2626', fontWeight: '700' }]}>
                  {formatAmount(item.net_pl)}
                </Text>
              </View>
            ))}

            {data.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available for this period</Text>
              </View>
            )}

            {/* Extra details (Opening Stock, Job Work, Total Cost) can be added as a detailed view or more columns if needed */}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Additional Breakdown Details</Text>
            {data.map((item) => (
              <View key={`detail-${item.quarter}`} style={styles.detailItem}>
                <Text style={styles.detailQuarter}>{item.quarter}</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Opening Stock</Text>
                    <Text style={styles.detailValue}>{formatAmount(item.opening_stock)}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Job Work</Text>
                    <Text style={styles.detailValue}>{formatAmount(item.job_work)}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Total Cost</Text>
                    <Text style={styles.detailValue}>{formatAmount(item.total_cost)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16 },
  header: { padding: 16, backgroundColor: '#F3F4F6' },
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
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },

  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 0.5, borderColor: '#E5E7EB' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailItem: { marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  detailQuarter: { fontSize: 13, fontWeight: '700', color: Colors.brandColor, marginBottom: 8 },
  detailGrid: { flexDirection: 'row', gap: 12 },
  detailBox: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
});

const st = StyleSheet.create({
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    minWidth: 500, // Ensure enough width for horizontal scroll
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  tableHead: { backgroundColor: '#F3F4F6' },
  tableHeadText: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  tableCell: { flex: 1, fontSize: 12, color: '#374151' },
  right: { textAlign: 'right' },
  quarterText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  periodText: { fontSize: 10, color: '#6B7280' },
});
