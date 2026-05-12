// ─── notificationService.ts ───────────────────────────────────────────────────
// Migrated to the modern modular SDK API (@react-native-firebase/messaging)
// ─────────────────────────────────────────────────────────────────────────────

import { initFirebase } from '@/firebaseConfig';
import { SessionManager } from '@/utils/sessionManager';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Router } from 'expo-router';

// ─── Content Types ─────────────────────────────────────────────────────────────
export enum NotificationContentType {
  PRODUCT = 'product',
  ORDER = 'order',
  CUSTOMER = 'customer',
  INVOICE = 'invoice',
  REPORT = 'report',
  HOME = 'home',
  // ── Due-date alert types ──────────────────────────────────────────────────
  INVOICE_DUE_MONTH = 'invoice_due_month',
  INVOICE_DUE = 'invoice_due',
  PAYMENT_DUE_MONTH = 'payment_due_month',
  PAYMENT_DUE = 'payment_due',
}

// ─── Notification Payload Shape ────────────────────────────────────────────────
export interface NotificationPayload {
  contentType: NotificationContentType
  contentId: string
  screen?: string   // optional direct screen path override
  extra?: string    // optional JSON string for extra data
  created_at?: string // ISO/epoch string — used to compute due-date ranges
}

// ─── Date Range Helpers ────────────────────────────────────────────────────────

/** Parse the notification's created_at into a JS Date (handles ISO strings & epoch ms) */
function parseNotifDate(value: string | undefined): Date {
  if (!value) return new Date()
  const epoch = Number(value)
  if (!isNaN(epoch)) return new Date(epoch * (epoch > 1e10 ? 1 : 1000)) // ms or s
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

/** Unix-second timestamps for the whole calendar month containing `date` */
function monthTimestamps(date: Date): { due_from: number; due_to: number } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    due_from: Math.floor(from.getTime() / 1000),
    due_to: Math.floor(to.getTime() / 1000),
  }
}

/** Unix-second timestamps for the single day of `date` */
function dayTimestamps(date: Date): { due_from: number; due_to: number } {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  return {
    due_from: Math.floor(from.getTime() / 1000),
    due_to: Math.floor(to.getTime() / 1000),
  }
}

// ─── Route Map ─────────────────────────────────────────────────────────────────
const ROUTE_MAP: Record<NotificationContentType, string> = {
  [NotificationContentType.PRODUCT]: '/ProductDetail',
  [NotificationContentType.ORDER]: '/OrderDetail',
  [NotificationContentType.CUSTOMER]: '/CustomerDetail',
  [NotificationContentType.INVOICE]: '/InvoiceDetail',
  [NotificationContentType.REPORT]: '/ReportDetail',
  [NotificationContentType.HOME]: '/dashboard/BottomNavigation',
  // Due-date types handled in navigateTo switch — these satisfy the Record<> exhaustiveness check
  [NotificationContentType.INVOICE_DUE_MONTH]: '/(main)/sales/SalesListScreen',
  [NotificationContentType.INVOICE_DUE]: '/(main)/sales/SalesListScreen',
  [NotificationContentType.PAYMENT_DUE_MONTH]: '/(main)/purchase/purchase',
  [NotificationContentType.PAYMENT_DUE]: '/(main)/purchase/purchase',
}

// ─── Parse Helper ──────────────────────────────────────────────────────────────
function parsePayload(
  data: Record<string, string> | undefined
): NotificationPayload | null {
  if (!data) return null
  // Support both `contentType` (camelCase) and `content_type` (snake_case) from server
  const rawType = data.contentType ?? data.content_type
  if (!rawType) return null
  return {
    contentType: rawType as NotificationContentType,
    contentId: data.contentId ?? data.content_id ?? '',
    screen: data.screen,
    extra: data.extra,
    created_at: data.created_at,
  }
}

// ─── Navigate Helper ──────────────────────────────────────────────────────────
function navigateTo(router: Router, payload: NotificationPayload) {
  try {
    // ── Direct screen override ──────────────────────────────────────────────
    if (payload.screen) {
      router.push({
        pathname: payload.screen as any,
        params: { contentId: payload.contentId, extra: payload.extra },
      })
      return
    }

    // ── Due-date content types (use created_at to build date range params) ──
    switch (payload.contentType) {
      case NotificationContentType.INVOICE_DUE_MONTH: {
        const { due_from, due_to } = monthTimestamps(parseNotifDate(payload.created_at))
        router.push({
          pathname: '/(main)/sales/SalesListScreen',
          params: { due_from, due_to },
        })
        return
      }
      case NotificationContentType.INVOICE_DUE: {
        const { due_from, due_to } = dayTimestamps(parseNotifDate(payload.created_at))
        router.push({
          pathname: '/(main)/sales/SalesListScreen',
          params: { due_from, due_to },
        })
        return
      }
      case NotificationContentType.PAYMENT_DUE_MONTH: {
        const { due_from, due_to } = monthTimestamps(parseNotifDate(payload.created_at))
        router.push({
          pathname: '/(main)/purchase/purchase',
          params: { due_from, due_to },
        })
        return
      }
      case NotificationContentType.PAYMENT_DUE: {
        const { due_from, due_to } = dayTimestamps(parseNotifDate(payload.created_at))
        router.push({
          pathname: '/(main)/purchase/purchase',
          params: { due_from, due_to },
        })
        return
      }
      default:
        break
    }

    // ── Generic route map for all other content types ───────────────────────
    const route = ROUTE_MAP[payload.contentType]

    if (!route) {
      console.warn(`[Notification] No route for contentType: ${payload.contentType}`)
      router.push('/dashboard/BottomNavigation')
      return
    }

    if (payload.contentType === NotificationContentType.HOME) {
      router.push('/dashboard/BottomNavigation')
      return
    }

    router.push({
      pathname: route as any,
      params: { contentId: payload.contentId, extra: payload.extra },
    })
  } catch (err) {
    console.error('[Notification] Navigation error:', err)
  }
}

// ─── Setup Foreground Display Handler ─────────────────────────────────────────
// Call ONCE outside the component at top of _layout.tsx
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// ─── Register Background Handler ──────────────────────────────────────────────
// Call ONCE outside the component at top of _layout.tsx
// ⚠️  Must be at module level — NOT inside useEffect
export function registerBackgroundHandler() {
  initFirebase(); // ✅ Ensure initialized before usage
  const messaging = getMessaging();

  setBackgroundMessageHandler(messaging, async remoteMessage => {
    console.log('[Notification] Background message:', remoteMessage)
    // Banner shown automatically by OS in background/quit state
    // Add silent background data processing here if needed
  })
}

// ─── Request Permission + Get FCM Token ───────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    initFirebase();
    const messaging = getMessaging();

    const authStatus = await requestPermission(messaging);

    const isGranted =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL

    if (!isGranted) {
      console.warn('[Notification] Permission denied — status:', authStatus)
      return null
    }

    const sessionToken = await SessionManager.getFCMToken();
    if (sessionToken) {
      console.log('FCM Token already saved ✅:', sessionToken)
      return sessionToken;
    }

    const fcmToken = await getToken(messaging)
    if (fcmToken) {
      await SessionManager.setFCMToken(fcmToken)
      console.log('[Notification] FCM Token saved ✅:', fcmToken)
    }
    return fcmToken ?? null
  } catch (err) {
    console.error('[Notification] Token registration error:', err)
    return null
  }
}

// ─── Listen Foreground Messages ───────────────────────────────────────────────
// Returns unsubscribe — call in useEffect cleanup
export function listenForegroundNotifications(router: Router) {
  const messaging = getMessaging();
  return onMessage(messaging, async remoteMessage => {
    console.log('[Notification] Foreground message:', remoteMessage)

    // iOS suppresses FCM banners while app is open — trigger a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title ?? '',
        body: remoteMessage.notification?.body ?? '',
        data: (remoteMessage.data as Record<string, unknown>) ?? {},
        sound: true,
      },
      trigger: null, // show immediately
    })
  })
}

// ─── Handle Notification Tap (foreground local notification) ──────────────────
// Returns unsubscribe — call in useEffect cleanup
export function listenNotificationTap(router: Router) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    response => {
      const data = response.notification.request.content.data as Record<string, string>
      console.log('[Notification] Tapped (foreground local):', data)
      const payload = parsePayload(data)
      if (payload) navigateTo(router, payload)
    }
  )
  return () => subscription.remove()
}

// ─── Handle App Opened From Background Tap ────────────────────────────────────
// Returns unsubscribe — call in useEffect cleanup
export function listenBackgroundNotificationTap(router: Router) {
  const messaging = getMessaging();
  return onNotificationOpenedApp(messaging, remoteMessage => {
    console.log('[Notification] Opened from background:', remoteMessage)
    const payload = parsePayload(remoteMessage.data as Record<string, string>)
    if (payload) navigateTo(router, payload)
  })
}

// ─── Handle App Opened From Quit / Killed State ───────────────────────────────
// Call once inside useEffect — no cleanup needed
export async function handleQuitStateNotification(router: Router) {
  try {
    initFirebase();
    const messaging = getMessaging();
    const remoteMessage = await getInitialNotification(messaging)
    if (!remoteMessage) return
    console.log('[Notification] Opened from quit state:', remoteMessage)
    const payload = parsePayload(remoteMessage.data as Record<string, string>)
    if (payload) navigateTo(router, payload)
  } catch (err) {
    console.error('[Notification] Quit state check error:', err)
  }
}

// ─── Token Refresh Listener ───────────────────────────────────────────────────
// FCM tokens rotate periodically — keep session in sync
// Returns unsubscribe — call in useEffect cleanup
export function listenTokenRefresh() {
  const messaging = getMessaging();
  return onTokenRefresh(messaging, async newToken => {
    console.log('[Notification] Token refreshed:', newToken)
    await SessionManager.setFCMToken(newToken)
    // TODO: POST newToken to your backend to keep it in sync
  })
}