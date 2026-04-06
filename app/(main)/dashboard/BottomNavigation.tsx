import {
    BottomTabBarProps,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// ── Icons ────────────────────────────────────────────────
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

import {
    createNavigationContainerRef
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Your screens ─────────────────────────────────────────
import { Colors } from '@/utils/colors';
import SalesInvoiceScreen from '../invoice/SalesInvoiceScreen';
import PurchaseRegisterScreen from '../others/PurchaseRegisterScreen';
import SalesRegisterScreen from '../others/SalesRegisterScreen';
import PartyListScreen from '../parties/PartyListScreen';
import DashboardScreen from './dashboard_new';

// ── Navigation Ref (for logout) ───────────────────────────
export const navigationRef = createNavigationContainerRef();

// ── Types ────────────────────────────────────────────────
type RootTabParamList = {
    Parties: undefined;
    Invoices: undefined;
    Dashboard: undefined;
    Receivables: undefined;
    Payables: undefined;
};

// ── Tabs Meta ────────────────────────────────────────────
const TABS = [
    { route: 'Parties', label: 'Parties', icon: ic_parties, iconSelected: ic_parties_selected },
    { route: 'Invoices', label: 'Invoices', icon: ic_invoice, iconSelected: ic_invoice_selected },
    { route: 'Dashboard', label: 'Dashboard', icon: ic_dashboard, iconSelected: ic_dashboard_selected },
    { route: 'Receivables', label: 'Receivables', icon: ic_receivables, iconSelected: ic_receivables_selected },
    { route: 'Payables', label: 'Payables', icon: ic_payables, iconSelected: ic_payables_selected }
];

// ── Custom Tab Bar ───────────────────────────────────────
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const insets = useSafeAreaInsets();
    const scales = useRef(TABS.map(() => new Animated.Value(1))).current;

    useEffect(() => {
        const active = state.index;

        scales.forEach((anim, i) =>
            Animated.spring(anim, {
                toValue: i === active ? 1.15 : 1,
                useNativeDriver: true,
            }).start()
        );
    }, [state.index]);

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
                {TABS.map((tab, idx) => {
                    const focused = state.index === idx;

                    return (
                        <TouchableOpacity
                            key={tab.route}
                            onPress={() => navigation.navigate(tab.route as never)}
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

                            <Text
                                style={{
                                    fontSize: 11,
                                    marginTop: 2,
                                    color: focused ? Colors.brandColor : '#aaa',
                                }}
                            >
                                {tab.label}
                            </Text>

                            {/* Active indicator */}
                            {focused && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

// ── Navigator ────────────────────────────────────────────
const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator = () => {
    return (
        <>
            <Tab.Navigator
                initialRouteName="Dashboard"
                screenOptions={{ headerShown: false, }} // ✅ FULL SCREEN
                tabBar={(props) => <CustomTabBar {...props} />}
            >
                <Tab.Screen name="Parties" component={PartyListScreen} />
                <Tab.Screen name="Invoices" component={SalesInvoiceScreen} />
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="Receivables" component={SalesRegisterScreen} />
                <Tab.Screen name="Payables" component={PurchaseRegisterScreen} />
            </Tab.Navigator>
        </>
    );
};

export default AppNavigator;

// ── Styles ───────────────────────────────────────────────
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

        // iOS glass look
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 10,
        elevation: 10,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    title: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    btn: {
        padding: 15,
        alignItems: 'center',
    },
});