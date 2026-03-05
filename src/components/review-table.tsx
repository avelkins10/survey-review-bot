'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import DispositionBadge from './disposition-badge'
import type { Review, DispositionType } from '@/lib/types'
import { ExternalLink } from 'lucide-react'

export default function ReviewTable({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return (
      <div className="text-center py-20 text-[#555]">
        <p className="text-lg mb-2">No reviews yet</p>
        <p className="text-xs">Run the Python bot to generate survey reviews</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222] text-[10px] uppercase tracking-[2px] text-[#555]">
            <th className="text-left py-3 px-4">Project</th>
            <th className="text-left py-3 px-4">Customer</th>
            <th className="text-left py-3 px-4">State</th>
            <th className="text-left py-3 px-4">Date</th>
            <th className="text-left py-3 px-4">Disposition</th>
            <th className="text-right py-3 px-4">Complete</th>
            <th className="text-right py-3 px-4">Photos</th>
            <th className="text-right py-3 px-4">Flags</th>
            <th className="text-center py-3 px-4">Report</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
              <td className="py-3 px-4">
                <Link href={`/reviews/${r.id}`} className="text-[#f97316] hover:underline font-mono text-xs">
                  #{r.qb_record_id}
                </Link>
              </td>
              <td className="py-3 px-4 font-medium">{r.customer_name}</td>
              <td className="py-3 px-4 text-[#888]">{r.state || '—'}</td>
              <td className="py-3 px-4 text-[#888] text-xs">
                {format(new Date(r.review_date), 'MMM d, yyyy')}
              </td>
              <td className="py-3 px-4">
                <DispositionBadge disposition={r.disposition as DispositionType} />
              </td>
              <td className="py-3 px-4 text-right font-mono">
                <span style={{
                  color: r.completeness_score >= 90 ? '#22c55e' : r.completeness_score >= 60 ? '#f59e0b' : '#ef4444'
                }}>
                  {r.completeness_score}%
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono text-[#60a5fa]">{r.total_photos}</td>
              <td className="py-3 px-4 text-right font-mono text-[#f59e0b]">{r.quality_flags?.length || 0}</td>
              <td className="py-3 px-4 text-center">
                {r.drive_folder_url ? (
                  <a href={r.drive_folder_url} target="_blank" rel="noopener noreferrer"
                     className="text-[#60a5fa] hover:text-white">
                    <ExternalLink size={14} />
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
