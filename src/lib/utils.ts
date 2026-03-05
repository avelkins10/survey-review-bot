import type { DispositionType } from './types'

export function dispositionColor(d: DispositionType) {
  if (d === 'APPROVE') return { text: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500', badge: 'bg-green-900 text-green-300' }
  if (d === 'REJECT') return { text: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500', badge: 'bg-red-900 text-red-300' }
  return { text: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500', badge: 'bg-yellow-900 text-yellow-300' }
}

export function dispositionEmoji(d: DispositionType) {
  if (d === 'APPROVE') return '✅'
  if (d === 'REJECT') return '❌'
  return '⚠️'
}

export function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export function qualityColor(score: number) {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

export function fmt(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
