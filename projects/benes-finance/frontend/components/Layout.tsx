import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, Repeat2, List, CalendarDays, TrendingDown,
  Zap, Activity, BarChart3, Wand2, LineChart, ScrollText, Menu, X, SplitSquareHorizontal,
  CalendarClock, MessageSquarePlus, Tag,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/accounts',     label: 'Accounts',     icon: CreditCard },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/recurring',    label: 'Recurring',    icon: Repeat2 },
  { to: '/tags',         label: 'Tags',         icon: Tag },
  { to: '/rules',        label: 'Rules',        icon: Wand2 },
  { to: '/schedule',     label: 'Schedule',     icon: CalendarDays },
  { to: '/forecast',     label: 'Forecast',     icon: CalendarClock },
  { to: '/budget',       label: 'Budget',       icon: BarChart3 },
  { to: '/cashflow',     label: 'Cash Flow',    icon: Activity },
  { to: '/debt',         label: 'Debt',         icon: TrendingDown },
  { to: '/projections',  label: 'Projections',  icon: LineChart },
  { to: '/scenarios',    label: 'Scenarios',    icon: SplitSquareHorizontal },
  { to: '/cascade',      label: 'Cascade',      icon: Zap },
  { to: '/audit',        label: 'Audit',        icon: ScrollText },
  { to: '/requests',     label: 'Requests',     icon: MessageSquarePlus },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <Icon size={15} className="shrink-0" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-48 shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900 text-sm tracking-wide">Benes Finance</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          <NavItems />
        </nav>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1 text-gray-500 hover:text-gray-800 rounded"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold text-gray-900 text-sm tracking-wide">Benes Finance</span>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-50 w-56 bg-white h-full flex flex-col shadow-xl">
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm tracking-wide">Benes Finance</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
              <NavItems onClick={() => setDrawerOpen(false)} />
            </nav>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pt-12 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
