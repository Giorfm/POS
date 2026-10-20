'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePosStore } from '@/lib/store/usePosStore';
import {
  ShoppingCart,
  LayoutGrid,
  UtensilsCrossed,
  Receipt,
  DollarSign,
  Coffee,
  Sliders,
  Package,
  BookOpen,
  ShoppingBag,
  Truck,
  BarChart3,
  Settings,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = usePosStore();
  const role = currentUser?.role || 'cashier';

  const navItems = [
    { label: 'Kasir & POS', href: '/pos', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier', 'waiter'] },
    { label: 'Denah Meja', href: '/tables', icon: LayoutGrid, roles: ['owner', 'manager', 'cashier', 'waiter'] },
    { label: 'Dapur (KDS)', href: '/kds', icon: UtensilsCrossed, roles: ['owner', 'manager', 'kitchen'] },
    { label: 'Riwayat Pesanan', href: '/orders', icon: Receipt, roles: ['owner', 'manager', 'cashier', 'waiter', 'kitchen'] },
    { label: 'Shift Kasir', href: '/shifts', icon: DollarSign, roles: ['owner', 'manager', 'cashier'] },
    { label: 'Delivery Online', href: '/delivery', icon: Truck, roles: ['owner', 'manager', 'cashier'] },
    { label: 'Katalog Menu', href: '/menu', icon: Coffee, roles: ['owner', 'manager'] },
    { label: 'Modifier Menu', href: '/modifiers', icon: Sliders, roles: ['owner', 'manager'] },
    { label: 'Stok Bahan Baku', href: '/inventory', icon: Package, roles: ['owner', 'manager'] },
    { label: 'Resep & HPP', href: '/recipes', icon: BookOpen, roles: ['owner', 'manager'] },
    { label: 'Pembelian (PO)', href: '/purchasing', icon: ShoppingBag, roles: ['owner', 'manager'] },
    { label: 'Laporan Penjualan', href: '/reports', icon: BarChart3, roles: ['owner', 'manager'] },
    { label: 'Pengaturan Outlet', href: '/settings', icon: Settings, roles: ['owner', 'manager'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 border-r bg-card flex flex-col shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/pos' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all select-none ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Quick Role & Version Footer */}
      <div className="p-3 border-t bg-muted/20 text-[11px] text-muted-foreground flex justify-between items-center">
        <span>F&B POS v1.0</span>
        <span className="uppercase font-mono px-2 py-0.5 rounded bg-muted font-bold text-foreground">
          {role}
        </span>
      </div>
    </aside>
  );
}
