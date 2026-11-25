'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  UserCheck,
  Building2,
  LogOut,
  User,
  FileText,
  Lock,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  PlusCircle,
  Map as MapIcon,
  Bell,
} from 'lucide-react';

type ReportStatusNotification = {
  id: string;
  report_id: string;
  ticket_number: string;
  title: string;
  previous_status: string;
  new_status: string;
  note: string;
  changed_at: string;
};

export default function Navbar() {
  const { user, reports, logout, loginAsDemo } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusNotifications, setStatusNotifications] = useState<ReportStatusNotification[]>([]);
  const [statusNotificationsUserId, setStatusNotificationsUserId] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [readNotificationUserId, setReadNotificationUserId] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState('');
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationRefresh, setNotificationRefresh] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'Warga') return;
    if (user.id === 'usr-89211') return;

    let active = true;
    const loadNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const response = await fetch('/api/reports/notifications', {
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Gagal memuat notifikasi perubahan status.');
        }
        if (active) {
          const storageKey = `laporkita_read_status_notifications_${user.id}`;
          let savedReadIds: unknown = [];
          try {
            const storedReadIds = localStorage.getItem(storageKey);
            savedReadIds = storedReadIds ? JSON.parse(storedReadIds) : [];
          } catch (error) {
            console.error('Gagal memuat status baca notifikasi.', error);
          }
          setStatusNotifications(Array.isArray(result.notifications) ? result.notifications : []);
          setStatusNotificationsUserId(user.id);
          setReadNotificationIds(Array.isArray(savedReadIds) ? savedReadIds : []);
          setReadNotificationUserId(user.id);
          setNotificationError('');
        }
      } catch (error) {
        console.error('Gagal memuat notifikasi perubahan status.', error);
        if (active) {
          setNotificationError(error instanceof Error ? error.message : 'Gagal memuat notifikasi perubahan status.');
        }
      } finally {
        if (active) setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user, notificationRefresh]);

  const markNotificationAsRead = (notificationId: string) => {
    if (!user) return;
    const currentReadIds = readNotificationUserId === user.id ? readNotificationIds : [];
    const nextReadIds = Array.from(new Set([...currentReadIds, notificationId]));
    setReadNotificationIds(nextReadIds);
    setReadNotificationUserId(user.id);
    try {
      localStorage.setItem(`laporkita_read_status_notifications_${user.id}`, JSON.stringify(nextReadIds));
    } catch (error) {
      console.error('Gagal menyimpan status baca notifikasi.', error);
    }
  };

  const visibleStatusNotifications = statusNotificationsUserId === user?.id ? statusNotifications : [];
  const visibleReadNotificationIds = readNotificationUserId === user?.id ? readNotificationIds : [];
  const unreadNotificationCount = visibleStatusNotifications.filter(
    (notification) => !visibleReadNotificationIds.includes(notification.id),
  ).length;

  const handleLogout = async () => {
    const role = user?.role;
    try {
      if (role === 'Warga') await fetch('/api/auth/logout', { method: 'POST' });
      if (role === 'Petugas') await fetch('/api/staff/logout', { method: 'POST' });
      if (role === 'Admin') await fetch('/api/admin/logout', { method: 'POST' });
      if (role === 'Admin Instansi') await fetch('/api/agency/logout', { method: 'POST' });
    } finally {
      logout();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      router.replace(role === 'Admin' ? '/admin/login' : role === 'Admin Instansi' ? '/instansi/login' : '/login');
    }
  };

  const handleDemoClick = () => {
    loginAsDemo();
    router.push('/profile');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--slate-200)',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--white)',
              boxShadow: 'var(--shadow-teal)',
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--slate-900)',
                lineHeight: 1.1,
              }}
            >
              Lapor<span style={{ color: 'var(--primary-600)' }}>Kita</span>
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--slate-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Suara Warga, Solusi Nyata
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '32px',
          }}
          className="desktop-nav"
        >
          <Link
            href="/"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: pathname === '/' ? 'var(--primary-700)' : 'var(--slate-600)',
              transition: 'color var(--transition-fast)',
            }}
          >
            Beranda
          </Link>
          <Link
            href="/laporan"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: pathname.startsWith('/laporan') ? 'var(--primary-700)' : 'var(--slate-600)',
              transition: 'color var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MapIcon size={16} color={pathname.startsWith('/laporan') ? 'var(--primary-700)' : 'var(--slate-500)'} />
            Laporan Publik & Peta
          </Link>
          <Link
            href="/#alur"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--slate-600)',
              transition: 'color var(--transition-fast)',
            }}
          >
            Alur Aduan
          </Link>
          <Link
            href="/#kategori"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--slate-600)',
              transition: 'color var(--transition-fast)',
            }}
          >
            Kategori Laporan
          </Link>
          <Link
            href="/lapor"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: pathname === '/lapor' ? 'var(--primary-700)' : 'var(--slate-600)',
              transition: 'color var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PlusCircle size={16} color="var(--primary-600)" />
            Buat Laporan
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
          }}
          className="desktop-actions"
        >
          {user?.role === 'Warga' ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label={`Notifikasi perubahan status${unreadNotificationCount ? `, ${unreadNotificationCount} belum dibaca` : ''}`}
                aria-expanded={notificationDropdownOpen}
                onClick={() => setNotificationDropdownOpen((open) => !open)}
                className="btn btn-sm btn-primary"
                style={{ boxShadow: 'var(--shadow-teal)', position: 'relative' }}
              >
                <Bell size={16} />
                <span>Notifikasi</span>
                {unreadNotificationCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      right: '-7px',
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 5px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--danger-solid)',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {notificationDropdownOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup notifikasi"
                    onClick={() => setNotificationDropdownOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 10, border: 0, background: 'transparent' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 10px)',
                      width: 'min(380px, calc(100vw - 32px))',
                      maxHeight: 'min(480px, calc(100vh - 100px))',
                      overflowY: 'auto',
                      background: 'var(--white)',
                      border: '1px solid var(--slate-200)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-xl)',
                      padding: '12px',
                      zIndex: 20,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px 10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--slate-900)' }}>Perubahan Status Laporan</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Pembaruan laporan milik Anda</div>
                      </div>
                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={() => visibleStatusNotifications.forEach((notification) => markNotificationAsRead(notification.id))}
                          style={{ border: 0, background: 'none', color: 'var(--primary-700)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    {notificationError ? (
                      <div role="alert" style={{ padding: '14px 8px', color: 'var(--danger-solid)', fontSize: '0.875rem' }}>
                        {notificationError}
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationError('');
                            setNotificationRefresh((refresh) => refresh + 1);
                          }}
                          style={{ display: 'block', marginTop: '8px', border: 0, background: 'none', color: 'var(--primary-700)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Coba muat ulang dalam beberapa saat
                        </button>
                      </div>
                    ) : isLoadingNotifications && visibleStatusNotifications.length === 0 ? (
                      <div style={{ padding: '16px 8px', color: 'var(--slate-500)', fontSize: '0.875rem' }}>Memuat notifikasi...</div>
                    ) : visibleStatusNotifications.length === 0 ? (
                      <div style={{ padding: '16px 8px', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
                        Belum ada perubahan status pada laporan Anda.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {visibleStatusNotifications.map((notification) => {
                          const isUnread = !visibleReadNotificationIds.includes(notification.id);
                          return (
                            <Link
                              key={notification.id}
                              href={`/profile?tab=reports&reportId=${encodeURIComponent(notification.report_id)}`}
                              onClick={() => {
                                markNotificationAsRead(notification.id);
                                setNotificationDropdownOpen(false);
                              }}
                              style={{
                                display: 'block',
                                padding: '11px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: isUnread ? 'var(--primary-50)' : 'var(--white)',
                                border: '1px solid var(--slate-100)',
                                textDecoration: 'none',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--slate-900)' }}>{notification.ticket_number}</span>
                                {isUnread && <span aria-label="Belum dibaca" style={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: 'var(--primary-600)', marginTop: 4 }} />}
                              </div>
                              <div style={{ marginTop: '3px', fontSize: '0.8125rem', color: 'var(--slate-700)' }}>{notification.title}</div>
                              <div style={{ marginTop: '5px', fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                                {notification.previous_status} → {notification.new_status}
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--slate-500)' }}>
                                {new Date(notification.changed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href={user?.role === 'Admin' ? '/admin' : user?.role === 'Admin Instansi' ? '/instansi' : user?.role === 'Petugas' ? '/petugas' : '/lapor'}
              className="btn btn-sm btn-primary"
              style={{ boxShadow: 'var(--shadow-teal)' }}
            >
              {user?.role === 'Admin' ? <ShieldAlert size={15} /> : user?.role === 'Admin Instansi' ? <Building2 size={15} /> : user?.role === 'Petugas' ? <UserCheck size={15} /> : <PlusCircle size={15} />}
              <span>{user?.role === 'Admin' ? 'Dashboard Admin' : user?.role === 'Admin Instansi' ? 'Dashboard Instansi' : user?.role === 'Petugas' ? 'Tugas Petugas' : 'Buat Laporan'}</span>
            </Link>
          )}

          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'none',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 14px 4px 6px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--white)',
                  transition: 'background var(--transition-fast)',
                }}
              >
                {/* User Avatar */}
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--slate-900)',
                      maxWidth: '140px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--success-solid)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <UserCheck size={11} /> NIK Terverifikasi
                  </div>
                </div>
                <ChevronDown size={16} color="var(--slate-500)" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 10,
                    }}
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '240px',
                      backgroundColor: 'var(--white)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-xl)',
                      border: '1px solid var(--slate-200)',
                      padding: '8px',
                      zIndex: 20,
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--slate-100)',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                        Masuk sebagai:
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--slate-800)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.email}
                      </div>
                    </div>

                    {user.role === 'Admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)' }}
                      >
                        <ShieldAlert size={16} />
                        Dashboard Admin
                      </Link>
                    )}

                    {user.role === 'Petugas' && (
                      <Link href="/petugas" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)' }}>
                        <UserCheck size={16} /> Daftar tugas Petugas
                      </Link>
                    )}

                    {user.role === 'Admin Instansi' && (
                      <Link href="/instansi" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)' }}>
                        <Building2 size={16} /> Dashboard Instansi
                      </Link>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--slate-700)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <User size={16} color="var(--primary-600)" />
                      Kelola Profil
                    </Link>

                    <Link
                      href="/profile?tab=reports"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--slate-700)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FileText size={16} color="var(--info-solid)" />
                      Laporan Saya ({reports.length})
                    </Link>

                    <Link
                      href="/profile?tab=security"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--slate-700)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--slate-100)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Lock size={16} color="var(--warning-solid)" />
                      Keamanan Akun
                    </Link>

                    <div
                      style={{
                        borderTop: '1px solid var(--slate-100)',
                        margin: '6px 0',
                      }}
                    />

                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--danger-solid)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <LogOut size={16} />
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleDemoClick}
                className="btn btn-sm btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: 'var(--warning-border)',
                  backgroundColor: 'var(--warning-bg)',
                  color: 'var(--warning-text)',
                }}
                title="Buka akun warga contoh instan"
              >
                <Sparkles size={14} /> Akun Demo
              </button>
              <Link href="/login" className="btn btn-sm btn-ghost">
                Masuk
              </Link>
              <Link href="/register" className="btn btn-sm btn-primary">
                Daftar Warga
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--slate-200)',
            background: 'var(--white)',
            color: 'var(--slate-700)',
            cursor: 'pointer',
          }}
          className="mobile-hamburger"
          aria-label="Buka menu navigasi"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderBottom: '1px solid var(--slate-200)',
            padding: '16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontWeight: 600,
              color: 'var(--slate-800)',
              borderBottom: '1px solid var(--slate-100)',
            }}
          >
            Beranda
          </Link>
          <Link
            href="/laporan"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontWeight: 600,
              color: pathname.startsWith('/laporan') ? 'var(--primary-700)' : 'var(--slate-800)',
              borderBottom: '1px solid var(--slate-100)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MapIcon size={18} color="var(--primary-600)" />
            Laporan Publik & Peta
          </Link>
          <Link
            href="/#alur"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontWeight: 600,
              color: 'var(--slate-800)',
              borderBottom: '1px solid var(--slate-100)',
            }}
          >
            Alur Aduan
          </Link>
          <Link
            href="/#kategori"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontWeight: 600,
              color: 'var(--slate-800)',
              borderBottom: '1px solid var(--slate-100)',
            }}
          >
            Kategori Laporan
          </Link>
          <Link
            href="/lapor"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '12px 14px',
              fontWeight: 700,
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-800)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--primary-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PlusCircle size={18} color="var(--primary-600)" />
            Buat Laporan Baru
          </Link>

          {user?.role === 'Warga' && (
            <section
              aria-label="Notifikasi perubahan status laporan"
              style={{
                padding: '12px',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--slate-50)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  <Bell size={17} color="var(--primary-700)" />
                  Notifikasi Status
                </div>
                {unreadNotificationCount > 0 && (
                  <span style={{ borderRadius: 'var(--radius-full)', padding: '2px 8px', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '0.75rem', fontWeight: 800 }}>
                    {unreadNotificationCount} baru
                  </span>
                )}
              </div>
              {notificationError ? (
                <div role="alert" style={{ color: 'var(--danger-solid)', fontSize: '0.8125rem' }}>
                  {notificationError}
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationError('');
                      setNotificationRefresh((refresh) => refresh + 1);
                    }}
                    style={{ display: 'block', marginTop: '6px', border: 0, background: 'none', color: 'var(--primary-700)', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Coba lagi
                  </button>
                </div>
              ) : visibleStatusNotifications.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                  Belum ada perubahan status laporan.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {visibleStatusNotifications.slice(0, 5).map((notification) => (
                    <Link
                      key={notification.id}
                      href={`/profile?tab=reports&reportId=${encodeURIComponent(notification.report_id)}`}
                      onClick={() => {
                        markNotificationAsRead(notification.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: visibleReadNotificationIds.includes(notification.id) ? 'var(--white)' : 'var(--primary-50)',
                        border: '1px solid var(--slate-200)',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        {notification.ticket_number} · {notification.previous_status} → {notification.new_status}
                      </span>
                      <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: 'var(--slate-600)' }}>
                        {notification.title}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/profile?tab=reports"
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 700 }}
              >
                Buka Aktivitas Laporan
              </Link>
            </section>
          )}

          {user ? (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                }}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{user.email}</div>
                </div>
              </div>
              <Link
                href={user.role === 'Admin' ? '/admin' : user.role === 'Admin Instansi' ? '/instansi' : user.role === 'Petugas' ? '/petugas' : '/profile'}
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-block"
              >
                {user.role === 'Admin' ? 'Dashboard Admin' : user.role === 'Admin Instansi' ? 'Dashboard Instansi' : user.role === 'Petugas' ? 'Daftar Tugas Petugas' : 'Kelola Profil Saya'}
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-block"
                style={{ color: 'var(--danger-solid)', borderColor: 'var(--danger-border)' }}
              >
                Keluar
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  handleDemoClick();
                  setMobileMenuOpen(false);
                }}
                className="btn btn-secondary btn-block"
              >
                <Sparkles size={16} /> Coba Akun Demo Warga
              </button>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline btn-block"
              >
                Masuk
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-ghost btn-block"
              >
                Masuk Admin
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-block"
              >
                Daftar Akun Baru
              </Link>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .desktop-actions {
            display: flex !important;
          }
          .mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
