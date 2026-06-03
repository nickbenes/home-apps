import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, BookOpen, ShoppingCart, Star, Menu, X } from 'lucide-react';

const NAV = [
  { to: '/menu',     label: 'Menu Planner',      icon: CalendarDays },
  { to: '/recipes',  label: 'Recipes',           icon: BookOpen },
  { to: '/shopping', label: 'Shopping List',     icon: ShoppingCart },
  { to: '/requests', label: 'Feature Requests',  icon: Star },
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
                ? 'bg-green-50 text-green-700 font-medium'
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
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-44 shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <span className="text-base font-semibold text-green-700">🍽 Food</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          <NavItems />
        </nav>
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-white z-30 border-r border-gray-200
        flex flex-col transform transition-transform lg:hidden
        ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-base font-semibold text-green-700">🍽 Food</span>
          <button onClick={() => setDrawerOpen(false)} className="text-gray-500 hover:text-gray-800">
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          <NavItems onClick={() => setDrawerOpen(false)} />
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setDrawerOpen(true)} className="text-gray-500 hover:text-gray-800">
            <Menu size={20} />
          </button>
          <span className="text-base font-semibold text-green-700">🍽 Food</span>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
