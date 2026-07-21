// app/(main)/dashboard/_layout.tsx
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../utils/colors';
import { SessionManager } from '../../../utils/sessionManager';

import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import type { NavigationHelpers, ParamListBase, TabNavigationState } from '@react-navigation/native';

const ic_dashboard = require('@/assets/images/ic_dashboard.png');
const ic_dashboard_selected = require('@/assets/images/ic_dashboard_selected.png');
const ic_invoice = require('@/assets/images/ic_invoice.png');
const ic_invoice_selected = require('@/assets/images/ic_invoice_selected.png');
const ic_parties = require('@/assets/images/ic_parties.png');
const ic_parties_selected = require('@/assets/images/ic_parties_selected.png');
const ic_payables = require('@/assets/images/ic_payables.png');
const ic_payables_selected = require('@/assets/images/ic_payables_selected.png');
const ic_receivables = require('@/assets/images/ic_receivables.png');
const ic_receivables_selected = require('@/assets/images/ic_receivables_selected.png');

// ─── Tab definitions ──────────────────────────────────────────────────────────

const FULL_TABS = [
    { route: 'parties', label: 'Parties', icon: ic_parties, iconSelected: ic_parties_selected },
    { route: 'invoices', label: 'Invoices', icon: ic_invoice, iconSelected: ic_invoice_selected },
    { route: 'index', label: 'Dashboard', icon: ic_dashboard, iconSelected: ic_dashboard_selected },
    { route: 'receivables', label: 'Receivables', icon: ic_receivables, iconSelected: ic_receivables_selected },
    { route: 'payables', label: 'Payables', icon: ic_payables, iconSelected: ic_payables_selected },
];

// Store manager gets a single "Store" tab using the dashboard icon
// — swap ic_dashboard for a dedicated store icon if you have one
const STORE_TABS = [
    { route: 'store', label: 'Store', icon: ic_dashboard, iconSelected: ic_dashboard_selected },
];

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

type SimpleTabBarProps = {
    state: TabNavigationState<ParamListBase>;
    navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>;
    tabs: typeof FULL_TABS;
};

const CustomTabBar: React.FC<SimpleTabBarProps> = ({ state, navigation, tabs }) => {
    const insets = useSafeAreaInsets();
    const scales = useRef(tabs.map(() => new Animated.Value(1))).current;

    useEffect(() => {
        scales.forEach((anim, i) =>
            Animated.spring(anim, {
                toValue: i === state.index ? 1.15 : 1,
                useNativeDriver: true,
            }).start()
        );
    }, [state.index]);

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
                {tabs.map((tab, idx) => {
                    const focused = state.index === idx;
                    return (
                        <TouchableOpacity
                            key={tab.route}
                            onPress={() => navigation.navigate(tab.route)}
                            style={styles.tabItem}
                            activeOpacity={0.8}
                        >
                            <Animated.Image
                                source={focused ? tab.iconSelected : tab.icon}
                                style={[
                                    styles.icon,
                                    {
                                        tintColor: focused ? Colors.brandColor : '#aaa',
                                        transform: [{ scale: scales[idx] }],
                                    },
                                ]}
                            />
                            <Text style={{ fontSize: 11, marginTop: 2, color: focused ? Colors.brandColor : '#aaa' }}>
                                {tab.label}
                            </Text>
                            {focused && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout() {
    const [userType, setUserType] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        SessionManager.getUserType().then((type) => {
            setUserType(type);
            setReady(true);
        });
    }, []);

    // Don't render tabs until we know the user type —
    // prevents a flash of wrong tabs on mount
    if (!ready) return null;

    const isStoreManager = userType === 'store_manager';
    const tabs = isStoreManager ? STORE_TABS : FULL_TABS;

    return (
        <Tabs
            initialRouteName={isStoreManager ? 'store' : 'index'}
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...(props as any)} tabs={tabs} />}
        >
            {isStoreManager ? (
                <>
                    <Tabs.Screen name="store" />
                    {/* Hide all non-store screens from navigation */}
                    <Tabs.Screen name="index" options={{ href: null }} />
                    <Tabs.Screen name="parties" options={{ href: null }} />
                    <Tabs.Screen name="invoices" options={{ href: null }} />
                    <Tabs.Screen name="receivables" options={{ href: null }} />
                    <Tabs.Screen name="payables" options={{ href: null }} />
                </>
            ) : (
                <>
                    <Tabs.Screen name="parties" />
                    <Tabs.Screen name="invoices" />
                    <Tabs.Screen name="index" />
                    <Tabs.Screen name="receivables" />
                    <Tabs.Screen name="payables" />
                    {/* Hide store screen from non-store-managers */}
                    <Tabs.Screen name="store" options={{ href: null }} />
                </>
            )}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingHorizontal: 12,
    },
    blurContainer: {
        flexDirection: 'row',
        borderRadius: 25,
        overflow: 'hidden',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    activeDot: {
        marginTop: 4,
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: Colors.brandColor,
    },
});