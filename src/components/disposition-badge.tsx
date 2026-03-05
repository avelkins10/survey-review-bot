import { DISPOSITION_CONFIG, type DispositionType } from '@/lib/types'

export default function DispositionBadge({ disposition }: { disposition: DispositionType }) {
  const c = DISPOSITION_CONFIG[disposition] || DISPOSITION_CONFIG.FLAG_FOR_REVIEW
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.emoji} {c.label}
    </span>
  )
}
