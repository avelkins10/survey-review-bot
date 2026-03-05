interface StatCardProps {
  label: string
  value: string | number
  color?: string
  sub?: string
}

export default function StatCard({ label, value, color = '#f97316', sub }: StatCardProps) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <div className="text-[10px] uppercase tracking-[2px] text-[#555] mb-2">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#555] mt-1">{sub}</div>}
    </div>
  )
}
