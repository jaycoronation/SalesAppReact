import {
    BottomTabBarProps,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
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
import { SessionManager } from '@/utils/sessionManager';
import DashboardScreen from './dashboard_new';
import PartyListScreen from './PartyListScreen';
import PaymentListScreen from './PaymentListScreen';
import PurchaseRegisterScreen from './PurchaseRegisterScreen';

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
// ── Profile Screen (with logout) ─────────────────────────
const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => (
    <View style={styles.center}>
        <Text style={{ fontSize: 18 }}>Profile</Text>

        <TouchableOpacity onPress={onLogout}>
            <Text style={{ color: 'red', marginTop: 20 }}>Logout</Text>
        </TouchableOpacity>
    </View>
);

// ── Navigator ────────────────────────────────────────────
const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator = () => {
    const [logoutVisible, setLogoutVisible] = useState(false);

    const handleLogout = () => {
        SessionManager.clearSession();
        setLogoutVisible(false);

        navigationRef.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
        });
    };

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
                <Tab.Screen name="Profile">
                    {() => <ProfileScreen onLogout={() => setLogoutVisible(true)} />}
                </Tab.Screen>
            </Tab.Navigator>

            {/* Logout Modal */}
            <Modal transparent visible={logoutVisible} animationType="fade">
                <Pressable
                    style={styles.overlay}
                    onPress={() => setLogoutVisible(false)}
                >
                    <Pressable style={styles.dialog}>
                        <Text style={styles.title}>Log out?</Text>

                        <TouchableOpacity
                            style={styles.btn}
                            onPress={handleLogout}
                        >
                            <Text style={{ color: 'red' }}>Logout</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.btn}
                            onPress={() => setLogoutVisible(false)}
                        >
                            <Text>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
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