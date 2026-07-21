// app/(main)/dashboard/store.tsx
import { FinancialYearPicker } from '@/components/FinancialYearPicker';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import NotificationBell from '@/components/NotificationBell';
import { Colors } from '@/utils/colors';
import { getCurrentFY, MONTH_SHORT } from '@/utils/fiscalYear';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// ─── Constants ────────────────────────────────────────────────────────────────
const NOW = new Date()
const DEFAULT_MONTH = NOW.getMonth() + 1   // 1–12
const DEFAULT_YEAR = NOW.getFullYear()


// ─── Store sections ───────────────────────────────────────────────────────────

const STORE_ITEMS = [
    {
        label: 'Inward',
        description: 'Record incoming stock and materials',
        icon: 'arrow-down-circle-outline' as const,
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        route: '/(main)/store_management/inward/InwardListScreen',
    },
    {
        label: 'Outward',
        description: 'Record outgoing stock and dispatch',
        icon: 'arrow-up-circle-outline' as const,
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        route: '/(main)/store_management/outward/OutWardListScreen',
    },
    {
        label: 'Material',
        description: 'Manage materials and inventory items',
        icon: 'cube-outline' as const,
        color: Colors.brandColor,
        bg: Colors.brandColorLight,
        border: Colors.brandColor,
        route: '/(main)/store_management/material/MaterialListScreen',
    },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StoreHomeScreen() {
    const insets = useSafeAreaInsets();

    // ── Month / Year / FY filter ──────────────────────────────────────────────
    const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH)
    const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
    const [selectedFY, setSelectedFY] = useState(getCurrentFY())
    const [fyPickerVisible, setFyPickerVisible] = useState(false)
    const [pickerVisible, setPickerVisible] = useState(false)

    const fiscalYear = selectedFY

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

    return (
        <View style={[s.container, { paddingTop: insets.top + 16 }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ── */}
            <View style={s.header}>
                <View style={s.headerIconWrap}>
                    <Ionicons name="storefront-outline" size={22} color={Colors.brandColor} />
                </View>
                <View>
                    <Text style={s.headerTitle}>Store Management</Text>
                    <Text style={s.headerSub}>Select a section to manage</Text>
                </View>
                <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <NotificationBell color={Colors.brandColor} />
                    <TouchableOpacity onPress={() => router.push('/profile/ProfileScreen')}>
                        <Ionicons name="person-circle-outline" size={28} color={Colors.brandColor} />
                    </TouchableOpacity>
                </View>
            </View>

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

            <View style={s.headerButton}>
                <View />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

            {/* ── Cards ── */}
            <View style={s.cardList}>
                {STORE_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[s.card, { borderColor: item.border }]}
                        activeOpacity={0.7}
                        onPress={() => router.push(item.route as any)}
                    >
                        <View style={[s.iconWrap, { backgroundColor: item.bg }]}>
                            <Ionicons name={item.icon} size={28} color={item.color} />
                        </View>
                        <View style={s.cardBody}>
                            <Text style={s.cardLabel}>{item.label}</Text>
                            <Text style={s.cardDesc}>{item.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingTop: 12,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.brandColorLight,
        borderWidth: 0.5,
        borderColor: Colors.brandColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },

    // Header
    headerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitleButton: { fontSize: 22, fontWeight: '700', color: '#111827' },
    syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
    syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    filterBtnIcon: { fontSize: 13 },
    filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

    cardList: {
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 0.5,
        padding: 16,
        gap: 14,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    cardBody: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 3,
    },
    cardDesc: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 17,
    },
});