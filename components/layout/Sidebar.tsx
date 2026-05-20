'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScanSearch,
  Users,
  Sun,
  Sparkles,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analyse', label: 'Analyse', icon: ScanSearch },
  { href: '/prospection', label: 'Prospection', icon: Sparkles },
  { href: '/prospects', label: 'Prospects', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 hidden md:flex flex-col w-[240px] h-screen text-white z-30"
      style={{ background: 'var(--sidebar)' }}
    >
      <div className="px-6 pt-7 pb-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F5821F, #D96B0A)',
            }}
          >
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div
              className="font-display font-bold text-lg leading-none"
              style={{ color: '#F5821F' }}
            >
              Énergies
            </div>
            <div
              className="font-display font-bold text-lg leading-none mt-0.5"
            >
              Concept
            </div>
          </div>
        </div>
        <div className="text-[11px] text-white/40 mt-3 tracking-wide uppercase">
          Prospection solaire · Montpellier
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {active && (
                <span
                  className="ml-auto w-1 h-5 rounded-full"
                  style={{ background: '#F5821F' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-[11px] text-white/40 mb-1.5 uppercase tracking-wide">
          Compte commercial
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center"
            style={{ background: '#0D7C66', color: '#fff' }}
          >
            EC
          </div>
          <div className="text-sm">
            <div className="font-semibold leading-tight">Commercial</div>
            <div className="text-white/40 text-xs">Énergies Concept</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
