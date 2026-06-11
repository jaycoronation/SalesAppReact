// ─── notificationService.ts ───────────────────────────────────────────────────

import { SessionManager } from '@/utils/sessionManager';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// ─── Content Types ─────────────────────────────────────────────────────────────
export enum NotificationContentType {
  PRODUCT = 'product',
  ORDER = 'order',
  CUSTOMER = 'customer',
  INVOICE = 'invoice',
  REPORT = 'report',
  HOME = 'home',
  INVOICE_DUE_MONTH = 'invoice_due_month',
  INVOICE_DUE = 'invoice_due',
  PAYMENT_DUE_MONTH = 'payment_due_month',
  PAYMENT_DUE = 'payment_due',
}

export interface NotificationPayload {
  contentType: NotificationContentType;
  contentId: string;
  screen?: string;
  extra?: string;
  created_at?: string;
}

// ─── Date Helpers ──────────────────────────────────────────────────────────────
function parseNotifDate(value: string | undefined): Date {
  if (!value) return new Date();
  const epoch = Number(value);
  if (!isNaN(epoch)) return new Date(epoch * (epoch > 1e10 ? 1 : 1000));
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

function monthTimestamps(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    due_from: Math.floor(from.getTime() / 1000),
    due_to: Math.floor(to.getTime() / 1000),
  };
}

function dayTimestamps(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return {
    due_from: Math.floor(from.getTime() / 1000),
    due_to: Math.floor(to.getTime() / 1000),
  };
}

// ─── Parse Helper ──────────────────────────────────────────────────────────────
function parsePayload(data: Record<string, string> | undefined): NotificationPayload | null {
  if (!data) return null;
  const rawType = data.contentType ?? data.content_type;
  if (!rawType) return null;
  return {
    contentType: rawType as NotificationContentType,
    contentId: data.contentId ?? data.content_id ?? '',
    screen: data.screen,
    extra: data.extra,
    created_at: data.created_at,
  };
}

// ─── Navigate Helper ──────────────────────────────────────────────────────────
function navigateTo(payload: NotificationPayload) {
  try {
    if (payload.screen) {
      router.push({ pathname: payload.screen as any, params: { contentId: payload.contentId, extra: payload.extra } });
      return;
    }

    switch (payload.contentType) {
      case NotificationContentType.INVOICE_DUE_MONTH: {
        const { due_from, due_to } = monthTimestamps(parseNotifDate(payload.created_at));
        router.push({ pathname: '/(main)/sales/SalesListScreen', params: { due_from, due_to } });
        return;
      }
      case NotificationContentType.INVOICE_DUE: {
        const { due_from, due_to } = dayTimestamps(parseNotifDate(payload.created_at));
        router.push({ pathname: '/(main)/sales/SalesListScreen', params: { due_from, due_to } });
        return;
      }
      case NotificationContentType.PAYMENT_DUE_MONTH: {
        const { due_from, due_to } = monthTimestamps(parseNotifDate(payload.created_at));
        router.push({ pathname: '/(main)/purchase/purchase', params: { due_from, due_to } });
        return;
      }
      case NotificationContentType.PAYMENT_DUE: {
        const { due_from, due_to } = dayTimestamps(parseNotifDate(payload.created_at));
        router.push({ pathname: '/(main)/purchase/purchase', params: { due_from, due_to } });
        return;
      }
      case NotificationContentType.HOME:
        router.push('/(main)/dashboard');
        return;
      default:
        router.push({ pathname: `/${payload.contentType}Detail` as any, params: { contentId: payload.contentId, extra: payload.extra } });
    }
  } catch (err) {
    console.error('[Notification] Navigation error:', err);
  }
}

// ─── Setup Foreground Display Handler ─────────────────────────────────────────
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Register Background Handler ──────────────────────────────────────────────
export function registerBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[Notification] Background message:', remoteMessage);
  });
}

// ─── Request Permission + Get FCM Token ───────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const authStatus = await messaging().requestPermission();

    const isGranted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!isGranted) {
      console.warn('[Notification] Permission denied — status:', authStatus);
      return null;
    }

    const sessionToken = await SessionManager.getFCMToken();
    if (sessionToken) {
      console.log('FCM Token already saved ✅:', sessionToken);
      return sessionToken;
    }

    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await SessionManager.setFCMToken(fcmToken);
      console.log('[Notification] FCM Token saved ✅:', fcmToken);
    }
    return fcmToken ?? null;
  } catch (err) {
    console.error('[Notification] Token registration error:', err);
    return null;
  }
}

// ─── Listen Foreground Messages ───────────────────────────────────────────────
export function listenForegroundNotifications() {
  return messaging().onMessage(async remoteMessage => {
    console.log('[Notification] Foreground message:', remoteMessage);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title ?? '',
        body: remoteMessage.notification?.body ?? '',
        data: (remoteMessage.data as Record<string, unknown>) ?? {},
        sound: true,
      },
      trigger: null,
    });
  });
}

// ─── Handle Notification Tap (foreground local) ───────────────────────────────
export function listenNotificationTap() {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, string>;
    const payload = parsePayload(data);
    if (payload) navigateTo(payload);
  });
  return () => subscription.remove();
}

// ─── Handle App Opened From Background Tap ────────────────────────────────────
export function listenBackgroundNotificationTap() {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[Notification] Opened from background:', remoteMessage);
    const payload = parsePayload(remoteMessage.data as Record<string, string>);
    if (payload) navigateTo(payload);
  });
}

// ─── Handle App Opened From Quit State ───────────────────────────────────────
export async function handleQuitStateNotification() {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (!remoteMessage) return;
    console.log('[Notification] Opened from quit state:', remoteMessage);
    const payload = parsePayload(remoteMessage.data as Record<string, string>);
    if (payload) navigateTo(payload);
  } catch (err) {
    console.error('[Notification] Quit state check error:', err);
  }
}

// ─── Token Refresh Listener ───────────────────────────────────────────────────
export function listenTokenRefresh() {
  return messaging().onTokenRefresh(async newToken => {
    console.log('[Notification] Token refreshed:', newToken);
    await SessionManager.setFCMToken(newToken);
  });
}