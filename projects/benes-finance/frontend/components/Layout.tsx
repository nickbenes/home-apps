import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Repeat2, List, CalendarDays, TrendingDown, Zap, Activity, BarChart3, Wand2 } from 'lucide-react';

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/accounts',     label: 'Accounts',     icon: CreditCard },
  { to: '/recurring',    label: 'Recurring',    icon: Repeat2 },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/rules',        label: 'Rules',        icon: Wand2 },
  { to: '/schedule',     label: 'Schedule',     icon: CalendarDays },
  { to: '/budget',       label: 'Budget',       icon: BarChart3 },
  { to: '/cashflow',     label: 'Cash Flow',    icon: Activity },
  { to: '/debt',         label: 'Debt',         icon: TrendingDown },
  { to: '/cascade',      label: 'Cascade',      icon: Zap },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-0 flex items-center gap-8 h-12 shrink-0">
        <span className="font-semibold text-gray-900 text-sm tracking-wide">Benes Finance</span>
        <nav className="flex items-center gap-1 h-full">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 h-full text-sm border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
