'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Bell, 
  Lock, 
  Moon, 
  Sun, 
  WifiOff, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  DollarSign, 
  ChevronDown 
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const {
    currentUser,
    profiles,
    switchUser,
    lockSession,
    currentShift,
    notifications,
    markNotificationRead,
    isOffline,
    setOfflineStatus,
  } = usePosStore();

  const [darkMode, setDarkMode] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Monitor network online/offline status
  useEffect(() => {
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) setOfflineStatus(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineStatus]);

  // Dark Mode Handler
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  const unreadNotifs = notifications.filter((n) => !n.is_read);

  return (
    <>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top-full">
          <WifiOff className="h-4 w-4" />
          <span>Koneksi terputus: Mode Offline aktif. Seluruh transaksi dicatat secara lokal dan akan disinkronkan saat terhubung kembali.</span>
        </div>
      )}

      <header className="h-16 border-b bg-card/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
        {/* Resto Info & Shift Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-sm">
              KN
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-sm leading-tight">Kopi & Resto Nusantara</h1>
              <p className="text-[11px] text-muted-foreground">POS Resto & Bar Modern</p>
            </div>
          </div>

          <div className="h-4 w-px bg-border mx-1 hidden md:block" />

          {/* Shift Indicator */}
          {currentShift ? (
            <Link href="/shifts">
              <Badge variant="success" className="cursor-pointer gap-1.5 py-1 px-2.5 hover:opacity-90">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Shift Aktif</span>
              </Badge>
            </Link>
          ) : (
            <Link href="/shifts">
              <Badge variant="warning" className="cursor-pointer gap-1.5 py-1 px-2.5 animate-bounce">
                <Clock className="h-3.5 w-3.5" />
                <span>Buka Shift</span>
              </Badge>
            </Link>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={darkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground relative transition-colors"
              title="Notifikasi & Peringatan Stok"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border bg-popover p-3 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b">
                  <span className="font-bold text-sm">Peringatan & Notifikasi</span>
                  <span className="text-xs text-muted-foreground">{notifications.length} total</span>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-6">Tidak ada notifikasi baru</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                          n.is_read
                            ? 'bg-muted/30 border-transparent text-muted-foreground'
                            : 'bg-accent/40 border-accent font-medium text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-primary font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span>{n.title}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Staff Profile & Quick Switch */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 h-10 px-3 rounded-xl border hover:bg-muted transition-colors text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center uppercase">
                {currentUser?.name?.slice(0, 2) || 'US'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold leading-tight">{currentUser?.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{currentUser?.role}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* User Switcher Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border bg-popover p-2 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
                <div className="px-3 py-2 border-b mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Akun Karyawan</p>
                </div>
                <p className="p-3 text-xs text-muted-foreground">Untuk berganti karyawan, pilih “Keluar / ganti akun”, lalu masuk dengan akun karyawan tersebut.</p>
              </div>
            )}
          </div>

          {/* Lock Screen Button */}
          <button
            type="button"
            onClick={lockSession}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Kunci Layar (PIN Lock)"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>
    </>
  );
}
