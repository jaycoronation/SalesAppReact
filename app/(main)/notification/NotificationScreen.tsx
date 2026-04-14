import { ApiEndPoints } from '@/network/ApiEndPoint';
import { Colors } from '@/utils/colors';
import { useNotification } from '@/utils/NotificationContext';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Helper: compute Unix timestamp range for a full calendar month ────────
const MONTH_MAP: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

function parseNotifDate(createdAt: string): Date {
    // Input: "12 Apr, 2026"  →  split into ["12", "Apr,", "2026"]
    const parts = createdAt.trim().split(/\s+/)
    const day = parseInt(parts[0], 10)
    const mon = MONTH_MAP[parts[1].replace(',', '')]   // strip trailing comma
    const year = parseInt(parts[2], 10)
    return new Date(year, mon, day)   // local time, never NaN
}

// Full month: 1st @ 00:00:00 → last day @ 23:59:59
function monthTimestamps(date: Date) {
    console.log("date", date);
    const y = date.getFullYear()
    const m = date.getMonth()           // 0-indexed
    const from = new Date(y, m, 1, 0, 0, 0)
    const to = new Date(y, m + 1, 0, 23, 59, 59)  // day 0 of next month = last day of this month
    return {
        due_from: Math.floor(from.getTime() / 1000).toString(),
        due_to: Math.floor(to.getTime() / 1000).toString(),
    }
}

// Single day: start of day → end of day
function dayTimestamps(date: Date) {
    console.log("date", date);
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
    const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
    return {
        due_from: Math.floor(from.getTime() / 1000).toString(),
        due_to: Math.floor(to.getTime() / 1000).toString(),
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
    notification_id: string;
    data_id: string;
    from_id: string;
    to_id: string;
    message: string;
    title: string;
    is_read: string;
    content_type: string;
    content_id: string;
    is_read_date: string;
    created_at: string;
}

// ─── Content-type config ──────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
}> = {
    payment_due_month: {
        icon: 'wallet-outline',
        color: '#B45309',
        bg: '#FEF3C7',
        border: '#FDE68A',
    },
    invoice_due: {
        icon: 'document-text-outline',
        color: Colors.brandColor,
        bg: Colors.brandColorLight ?? '#FEE2E2',
        border: '#FECACA',
    },
    invoice_due_month: {
        icon: 'calendar-outline',
        color: '#6D28D9',
        bg: '#EDE9FE',
        border: '#DDD6FE',
    },
    default: {
        icon: 'notifications-outline',
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
    },
};

function getConfig(type: string) {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({
    item,
    onPress,
}: {
    item: Notification;
    onPress: (item: Notification) => void;
}) {
    const isUnread = item.is_read === '0';
    const cfg = getConfig(item.content_type);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPress(item)}
            style={[cardStyles.card, isUnread && cardStyles.cardUnread]}
        >
            {/* Unread left accent bar */}
            {isUnread && (
                <View style={[cardStyles.accent, { backgroundColor: cfg.color }]} />
            )}

            {/* Icon badge */}
            <View style={[cardStyles.iconBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <Ionicons name={cfg.icon} size={20} color={cfg.color} />
            </View>

            {/* Content */}
            <View style={cardStyles.content}>
                <View style={cardStyles.titleRow}>
                    <Text
                        style={[cardStyles.title, isUnread && cardStyles.titleUnread]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    {isUnread && (
                        <View style={[cardStyles.dot, { backgroundColor: cfg.color }]} />
                    )}
                </View>

                <Text style={cardStyles.message} numberOfLines={2}>
                    {item.message}
                </Text>

                <View style={cardStyles.footer}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[cardStyles.typeText, { color: cfg.color }]}>
                            {item.content_type.replace(/_/g, ' ')}
                        </Text>
                    </View>
                    <Text style={cardStyles.date}>{item.created_at}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { refreshCount } = useNotification();

    const unreadCount = notifications.filter(n => n.is_read === '0').length;

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchNotifications = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const userData = await SessionManager.getUserData();
            const token = await SessionManager.getToken(); // adjust if your method differs

            const response = await fetch(
                `${ApiEndPoints.BASE_URL}notifications/list?user_id=${userData.user_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log("URL", response.url);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            console.log("Response", json);
            if (json.success === 1) {
                setNotifications(json.data);
            } else {
                throw new Error('Failed to load notifications');
            }
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Navigate on tap ────────────────────────────────────────────────────────

    const handlePress = async (item: Notification) => {
        // Mark as read if unread
        if (item.is_read === '0') {
            setNotifications(prev =>
                prev.map(n => n.notification_id === item.notification_id ? { ...n, is_read: '1' } : n)
            );
            try {
                const userData = await SessionManager.getUserData();
                const token = await SessionManager.getToken();

                await fetch(
                    `${ApiEndPoints.BASE_URL}notifications/mark_read`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: `user_id=${userData.user_id}&notification_id=${item.notification_id}`
                    }
                );

                refreshCount();
            } catch (err) {
                console.error("Failed to mark read:", err);
            }
        }

        // ─── In your switch ────────────────────────────────────────────────────────
        switch (item.content_type) {
            case 'invoice_due_month': {
                const { due_from, due_to } = monthTimestamps(parseNotifDate(item.created_at))
                router.push({
                    pathname: '/(main)/sales/SalesListScreen',
                    params: { due_from, due_to },
                })
                break
            }
            case 'invoice_due': {
                const { due_from, due_to } = dayTimestamps(parseNotifDate(item.created_at))
                router.push({
                    pathname: '/(main)/sales/SalesListScreen',
                    params: { due_from, due_to },
                })
                break
            }
            case 'payment_due_month': {
                const { due_from, due_to } = monthTimestamps(parseNotifDate(item.created_at))
                router.push({
                    pathname: '/(main)/purchase/purchase',
                    params: { due_from, due_to },
                })
                break
            }
            case 'payment_due': {
                const { due_from, due_to } = dayTimestamps(parseNotifDate(item.created_at))
                router.push({
                    pathname: '/(main)/purchase/purchase',
                    params: { due_from, due_to },
                })
                break
            }
            default:
                break
        }
    };

    // ── Mark all as read ───────────────────────────────────────────────────────

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: '1' })));

        try {
            const userData = await SessionManager.getUserData();
            const token = await SessionManager.getToken();

            await fetch(
                `${ApiEndPoints.BASE_URL}notifications/mark_all_read`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `user_id=${userData.user_id}`
                }
            );

            refreshCount();
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────────

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.brandColor} />
                <Text style={styles.loadingText}>Loading notifications…</Text>
            </View>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────

    if (error) {
        return (
            <View style={styles.center}>
                <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
                <Text style={styles.errorText}>Couldn't load notifications</Text>
                <Text style={styles.errorHint}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotifications()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main render ────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Notifications',
                    headerShown: true,
                    headerBackTitle: '',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
                            <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
                        </TouchableOpacity>
                    ),
                    headerTintColor: Colors.brandColor,
                }}
            />

            {/* Unread count + mark-all row */}
            <View style={styles.subHeader}>
                <Text style={styles.subHeaderText}>
                    {unreadCount > 0 ? `${unreadCount} unread` : ''}
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        onPress={markAllRead}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.markAll}>Mark all as read</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.notification_id}
                renderItem={({ item }) => (
                    <NotificationCard item={item} onPress={handlePress} />
                )}
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.listEmpty,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchNotifications(true)}
                        tintColor={Colors.brandColor}
                        colors={[Colors.brandColor]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={52} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No notifications found</Text>
                        <Text style={styles.emptyHint}>You're all caught up!</Text>
                    </View>
                }
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        gap: 10,
    },

    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
    },
    subHeaderText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    markAll: { fontSize: 13, color: Colors.brandColor, fontWeight: '600' },

    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    listEmpty: { flexGrow: 1 },

    loadingText: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    errorText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 },
    errorHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: Colors.brandColor,
        borderRadius: 8,
    },
    retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
    emptyHint: { fontSize: 13, color: '#9CA3AF' },
});

const cardStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        gap: 12,
    },
    cardUnread: {
        backgroundColor: '#FFFCFA',
    },

    // Unread left bar
    accent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },

    // Icon
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        flexShrink: 0,
    },

    // Text block
    content: { flex: 1, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#4B5563' },
    titleUnread: { color: '#111827', fontWeight: '700' },
    dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
    message: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    typeBadge: {
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 0.5,
    },
    typeText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
    date: { fontSize: 11, color: '#9CA3AF' },
});