import {
    BottomTabBarProps,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import {
    createNavigationContainerRef
} from '@react-navigation/native';

// ── Your screens ─────────────────────────────────────────
import { Colors } from '@/utils/colors';
import PurchaseRegisterScreen from '../others/PurchaseRegisterScreen';
import PartyListScreen from '../parties/PartyListScreen';
import PaymentListScreen from '../payments/PaymentListScreen';
import ProfileScreen from '../profile/ProfileScreen';
import DashboardScreen from './dashboard_new';

// ── Navigation Ref (for logout) ───────────────────────────
export const navigationRef = createNavigationContainerRef();

// ── Types ────────────────────────────────────────────────
type RootTabParamList = {
    Dashboard: undefined;
    Parties: undefined;
    Receivables: undefined;
    Payments: undefined;
    Profile: undefined;
};

// ── Tabs Meta ────────────────────────────────────────────
const TABS = [
    { route: 'Dashboard', label: 'Dashboard', icon: '⊞' },
    { route: 'Parties', label: 'Parties', icon: '✦' },
    { route: 'Receivables', label: 'Receivables', icon: '↙' },
    { route: 'Payments', label: 'Payments', icon: '↗' },
    { route: 'Profile', label: 'Profile', icon: '◎' },
];

// ── Custom Tab Bar ───────────────────────────────────────
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
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
        <View style={styles.wrapper}>
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
                            <Animated.Text
                                style={[
                                    styles.icon,
                                    {
                                        color: focused ? Colors.brandColor : '#aaa',
                                        transform: [{ scale: scales[idx] }],
                                    },
                                ]}
                            >
                                {tab.icon}
                            </Animated.Text>

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
                screenOptions={{ headerShown: false, }} // ✅ FULL SCREEN
                tabBar={(props) => <CustomTabBar {...props} />}
            >
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="Parties" component={PartyListScreen} />
                <Tab.Screen name="Receivables" component={PurchaseRegisterScreen} />
                <Tab.Screen name="Payments" component={PaymentListScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />
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
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
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
        fontSize: 22,
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