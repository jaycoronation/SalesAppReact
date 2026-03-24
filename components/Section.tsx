import { Colors } from '@/utils/colors'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface SectionProps {
  title: string
  children: React.ReactNode
  badge?: string
  badgeType?: 'neutral' | 'profit' | 'loss'
  actionLabel?: string        // e.g. "All Purchases", "View All", "See More"
  onActionPress?: () => void
}

export const Section: React.FC<SectionProps> = ({
  title,
  children,
  badge,
  badgeType = 'neutral',
  actionLabel,
  onActionPress,
}) => {
  const badgeStyle = [
    styles.badge,
    badgeType === 'profit' && styles.badgeProfit,
    badgeType === 'loss' && styles.badgeLoss,
  ]

  const badgeTextStyle = [
    styles.badgeText,
    badgeType === 'profit' && styles.badgeTextProfit,
    badgeType === 'loss' && styles.badgeTextLoss,
  ]

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {/* Left: title + badge */}
        <View style={styles.left}>
          <Text style={styles.title}>{title}</Text>
          {badge !== undefined && (
            <View style={badgeStyle}>
              <Text style={badgeTextStyle}>{badge}</Text>
            </View>
          )}
        </View>

        {/* Right: dynamic action button */}
        {actionLabel !== undefined && (
          <TouchableOpacity
            style={styles.action}
            onPress={onActionPress}
            activeOpacity={0.6}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  )
}


const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: {
    padding: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeProfit: {
    backgroundColor: '#D1FAE5',
  },
  badgeLoss: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  badgeTextProfit: {
    color: '#065F46',
  },
  badgeTextLoss: {
    color: '#991B1B',
  },
  // ── Action button ──────────────────────────────────────────────────────────
  action: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.brandColorLight,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
    flexShrink: 0,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.brandColor,
  },
})
