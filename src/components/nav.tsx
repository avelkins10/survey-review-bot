'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/queue', label: 'Queue' },
  { href: '/reviews', label: 'Reviews' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <header className="border-b border-[#1f1f1f] bg-[#0d0d0d] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 h-14">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-[#f97316] font-bold text-lg">⚡</span>
          <span className="font-bold text-white text-sm tracking-tight">Survey Review</span>
          <span className="text-[#333] text-xs ml-1">by KIN</span>
        </div>
        <nav className="flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                path === l.href
                  ? 'bg-[#f97316]/10 text-[#f97316]'
                  : 'text-[#777] hover:text-[#ccc]'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
