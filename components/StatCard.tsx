import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface StatCardProps {
  label: string
  value: string
  accent?: 'default' | 'profit' | 'loss' | 'info'
  size?: 'sm' | 'md'
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accent = 'default',
  size = 'md',
}) => {
  const valueStyle = [
    styles.value,
    size === 'sm' && styles.valueSmall,
    accent === 'profit' && styles.profit,
    accent === 'loss' && styles.loss,
    accent === 'info' && styles.info,
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '500',
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  valueSmall: {
    fontSize: 13,
  },
  profit: {
    color: '#059669',
  },
  loss: {
    color: '#DC2626',
  },
  info: {
    color: '#2563EB',
  },
})
