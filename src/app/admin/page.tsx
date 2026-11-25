'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Ban, Bell, Building2, CheckCheck, CheckCircle2, CircleAlert, Clock3, ExternalLink, History, Image as ImageIcon, LogOut, Map as MapIcon, MapPin, RefreshCw, Search, Send, ShieldCheck, ClipboardList, Trash2, UserCheck, Users, UserX, X } from 'lucide-react';
import type { AdminMapReport } from '@/components/AdminReportMap';
import AdminAbuseReview from '@/components/AdminAbuseReview';
import { useAuth } from '@/context/AuthContext';

const AdminReportMap = dynamic(() => import('@/components/AdminReportMap'), {
  ssr: false,
  loading: () => <div style={{ height: '460px', display: 'grid', placeItems: 'center', color: 'var(--slate-500)' }}>Memuat peta sebaran...</div>,
});

type AdminReport = {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  agency: string;
  location: string;
  date: string;
  status: string;
  urgency: string;
  description: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  images: string[];
  reporterName: string;
  rejectionReason?: string | null;
  assignedAgency?: string | null;
  assignedRegion?: string | null;
  forwardedAt?: string | null;
  completionEvidence: string[];
  completionNotes?: string | null;
  completionSubmittedAt?: string | null;
  completionSubmittedBy?: string | null;
  createdAt: string;
};

type AdminCategory = {
  id: string;
  name: string;
  defaultAgency: string;
  isActive: boolean;
  reportCount: number;
};

type AdminAgency = {
  id: string;
  name: string;
  isActive: boolean;
  reportCount: number;
};

type AdminRegion = {
  id: string;
  agencyId: string;
  agencyName: string;
  name: string;
  isActive: boolean;
  reportCount: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Warga' | 'Petugas' | 'Admin Instansi';
  isActive: boolean;
  createdAt: string;
  agencyName?: string | null;
  invitationStatus?: string | null;
};

type ReportHistory = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string;
  changed_at: string;
};

type RoutingHistory = {
  id: string;
  action: string;
  agency: string;
  region: string;
  details: string;
  created_at: string;
};

type AdminData = {
  user: { id: string; name: string; email: string };
  reports: AdminReport[];
};

type AdminActivity = {
  id: string;
  action: string;
  details: string;
  adminName: string;
  ticketNumber: string | null;
  createdAt: string;
};

type AdminNotification = {
  id: string;
  reportId: string | null;
  kind: string;
  title: string;
  message: string;
  ticketNumber: string | null;
  createdAt: string;
  readAt: string | null;
};

const emptyAdminReports: AdminReport[] = [];
const statusOptions = ['Semua status', 'Menunggu', 'Diproses', 'Selesai', 'Ditolak'];
const reportMonthNumbers: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
  jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12',
};

function getReportDateKey(value: string) {
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const localizedDate = value.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i);
  if (!localizedDate) return '';
  const month = reportMonthNumbers[localizedDate[2].toLowerCase()];
  return month ? `${localizedDate[3]}-${month}-${localizedDate[1].padStart(2, '0')}` : '';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua status');
  const [categoryFilter, setCategoryFilter] = useState('Semua kategori');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [routingHistory, setRoutingHistory] = useState<RoutingHistory[]>([]);
  const [routingError, setRoutingError] = useState('');
  const [destinationAgency, setDestinationAgency] = useState('');
  const [destinationRegion, setDestinationRegion] = useState('');
  const [isSavingRouting, setIsSavingRouting] = useState(false);
  const [isRejectionFormOpen, setIsRejectionFormOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryAgency, setCategoryAgency] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [agencies, setAgencies] = useState<AdminAgency[]>([]);
  const [agencyName, setAgencyName] = useState('');
  const [editingAgencyId, setEditingAgencyId] = useState('');
  const [agencyError, setAgencyError] = useState('');
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [regions, setRegions] = useState<AdminRegion[]>([]);
  const [regionName, setRegionName] = useState('');
  const [regionAgencyId, setRegionAgencyId] = useState('');
  const [editingRegionId, setEditingRegionId] = useState('');
  const [regionError, setRegionError] = useState('');
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [mapCategoryFilter, setMapCategoryFilter] = useState('Semua kategori');
  const { showToast } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersError, setUsersError] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [agencyUserName, setAgencyUserName] = useState('');
  const [agencyUserEmail, setAgencyUserEmail] = useState('');
  const [agencyUserNik, setAgencyUserNik] = useState('');
  const [agencyUserPhone, setAgencyUserPhone] = useState('');
  const [agencyUserAgencyId, setAgencyUserAgencyId] = useState('');
  const [isSavingAgencyUser, setIsSavingAgencyUser] = useState(false);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activityError, setActivityError] = useState('');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  const requestAdminData = useCallback(async () => {
    const response = await fetch('/api/admin/reports', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/admin/login');
      throw new Error('Sesi admin tidak valid.');
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat laporan.');
    return result as AdminData;
  }, [router]);

  useEffect(() => {
    let active = true;
    requestAdminData()
      .then((data) => {
        if (!active) return;
        setLoadError('');
        setAdminData(data);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Gagal memuat laporan.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [requestAdminData]);

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      try {
        const response = await fetch('/api/admin/activity', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat aktivitas admin.');
        if (!active) return;
        setActivities(Array.isArray(result.activities) ? result.activities as AdminActivity[] : []);
        setNotifications(Array.isArray(result.notifications) ? result.notifications as AdminNotification[] : []);
        setUnreadNotificationCount(Number(result.unreadCount) || 0);
        setActivityError('');
      } catch (error) {
        if (active) setActivityError(error instanceof Error ? error.message : 'Gagal memuat aktivitas admin.');
      }
    };

    void loadActivity();
    const interval = window.setInterval(() => void loadActivity(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router]);

  const loadReports = () => {
    requestAdminData()
      .then((data) => {
        setLoadError('');
        setAdminData(data);
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Gagal memuat laporan.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/categories', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat kategori.');
        return result;
      })
      .then((result) => {
        if (active && result) setCategories(Array.isArray(result.categories) ? result.categories as AdminCategory[] : []);
      })
      .catch((error: unknown) => {
        if (active) setCategoryError(error instanceof Error ? error.message : 'Gagal memuat kategori.');
      });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/users', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat data pengguna.');
        return result;
      })
      .then((result) => {
        if (active && result) setUsers(Array.isArray(result.users) ? result.users as AdminUser[] : []);
      })
      .catch((error: unknown) => {
        if (active) setUsersError(error instanceof Error ? error.message : 'Gagal memuat data pengguna.');
      })
      .finally(() => {
        if (active) setIsLoadingUsers(false);
      });
    return () => { active = false; };
  }, [router]);

  const toggleUser = async (user: AdminUser) => {
    setUpdatingUserId(user.id);
    setUsersError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengubah status pengguna.');
      const updatedUser = result.user as AdminUser;
      setUsers((current) => current.map((item) => item.id === updatedUser.id ? updatedUser : item));
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Gagal mengubah status pengguna.');
    } finally {
      setUpdatingUserId('');
    }
  };

  const deleteAgencyUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    setDeleteError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingUser.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menghapus akun Admin Instansi.');

      setUsers((current) => current.filter((item) => item.id !== deletingUser.id));
      showToast('success', 'Akun Berhasil Dihapus', `Akun Admin Instansi ${deletingUser.name} telah berhasil dihapus dari sistem.`);
      setDeletingUser(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Gagal menghapus akun Admin Instansi.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const createAgencyUser = async () => {
    setUsersError('');
    setIsSavingAgencyUser(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agencyUserName,
          email: agencyUserEmail,
          nik: agencyUserNik,
          phone: agencyUserPhone,
          agencyId: agencyUserAgencyId,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (result.user) {
        setUsers((current) => [result.user as AdminUser, ...current.filter((user) => user.id !== result.user.id)]);
        setAgencyUserName('');
        setAgencyUserEmail('');
        setAgencyUserNik('');
        setAgencyUserPhone('');
        setAgencyUserAgencyId('');
      }
      if (!response.ok) throw new Error(result.error || 'Gagal membuat akun Admin Instansi.');
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Gagal membuat akun Admin Instansi.');
    } finally {
      setIsSavingAgencyUser(false);
    }
  };

  const resendAgencyInvitation = async (user: AdminUser) => {
    setUpdatingUserId(user.id);
    setUsersError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend-invitation', id: user.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (result.user) {
        const updatedUser = result.user as AdminUser;
        setUsers((current) => current.map((item) => item.id === updatedUser.id ? updatedUser : item));
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim ulang undangan.');
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Gagal mengirim ulang undangan.');
    } finally {
      setUpdatingUserId('');
    }
  };

  const markNotificationRead = async (notification: AdminNotification) => {
    if (notification.readAt || isUpdatingNotifications) return;
    setIsUpdatingNotifications(true);
    try {
      const response = await fetch('/api/admin/activity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui notifikasi.');
      setNotifications((current) => current.map((item) => item.id === notification.id
        ? { ...item, readAt: new Date().toISOString() }
        : item));
      setUnreadNotificationCount(Number(result.unreadCount) || 0);
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'Gagal memperbarui notifikasi.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const markAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0 || isUpdatingNotifications) return;
    setIsUpdatingNotifications(true);
    try {
      const response = await fetch('/api/admin/activity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui notifikasi.');
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      setUnreadNotificationCount(Number(result.unreadCount) || 0);
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'Gagal memperbarui notifikasi.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/agencies', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat data instansi.');
        return result;
      })
      .then((result) => {
        if (active && result) setAgencies(Array.isArray(result.agencies) ? result.agencies as AdminAgency[] : []);
      })
      .catch((error: unknown) => {
        if (active) setAgencyError(error instanceof Error ? error.message : 'Gagal memuat data instansi.');
      });
    return () => { active = false; };
  }, [router]);

  const fetchRegions = useCallback(async () => {
    const response = await fetch('/api/admin/regions', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/admin/login');
      return null;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat data wilayah.');
    return Array.isArray(result.regions) ? result.regions as AdminRegion[] : [];
  }, [router]);

  const reloadRegions = useCallback(async () => {
    setIsLoadingRegions(true);
    setRegionError('');
    try {
      const result = await fetchRegions();
      if (result) setRegions(result);
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : 'Gagal memuat data wilayah.');
    } finally {
      setIsLoadingRegions(false);
    }
  }, [fetchRegions]);

  useEffect(() => {
    let active = true;
    fetchRegions()
      .then((result) => {
        if (active && result) setRegions(result);
      })
      .catch((error: unknown) => {
        if (active) setRegionError(error instanceof Error ? error.message : 'Gagal memuat data wilayah.');
      })
      .finally(() => {
        if (active) setIsLoadingRegions(false);
      });
    return () => { active = false; };
  }, [fetchRegions]);

  const saveAgency = async () => {
    setIsSavingAgency(true);
    setAgencyError('');
    try {
      const response = await fetch('/api/admin/agencies', {
        method: editingAgencyId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgencyId
          ? { id: editingAgencyId, action: 'update', name: agencyName }
          : { name: agencyName }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan instansi.');
      setAgencies(result.agencies as AdminAgency[]);
      setAgencyName('');
      setEditingAgencyId('');
      if (editingAgencyId) {
        const [categoriesResponse, regionsResponse] = await Promise.all([
          fetch('/api/admin/categories', { cache: 'no-store' }),
          fetch('/api/admin/regions', { cache: 'no-store' }),
        ]);
        const [categoriesResult, regionsResult] = await Promise.all([
          categoriesResponse.json().catch(() => ({})),
          regionsResponse.json().catch(() => ({})),
        ]);
        if (categoriesResponse.ok) setCategories(categoriesResult.categories as AdminCategory[]);
        if (regionsResponse.ok) setRegions(regionsResult.regions as AdminRegion[]);
      }
    } catch (error) {
      setAgencyError(error instanceof Error ? error.message : 'Gagal menyimpan instansi.');
    } finally {
      setIsSavingAgency(false);
    }
  };

  const toggleAgency = async (agency: AdminAgency) => {
    setAgencyError('');
    try {
      const response = await fetch('/api/admin/agencies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agency.id, action: 'toggle' }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengubah status instansi.');
      setAgencies(result.agencies as AdminAgency[]);
    } catch (error) {
      setAgencyError(error instanceof Error ? error.message : 'Gagal mengubah status instansi.');
    }
  };

  const saveRegion = async () => {
    setIsSavingRegion(true);
    setRegionError('');
    try {
      const response = await fetch('/api/admin/regions', {
        method: editingRegionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRegionId
          ? { id: editingRegionId, action: 'update', name: regionName }
          : { name: regionName, agencyId: regionAgencyId }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan wilayah.');
      setRegions(result.regions as AdminRegion[]);
      setRegionName('');
      setRegionAgencyId('');
      setEditingRegionId('');
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : 'Gagal menyimpan wilayah.');
    } finally {
      setIsSavingRegion(false);
    }
  };

  const toggleRegion = async (region: AdminRegion) => {
    setRegionError('');
    try {
      const response = await fetch('/api/admin/regions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: region.id, action: 'toggle' }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengubah status wilayah.');
      setRegions(result.regions as AdminRegion[]);
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : 'Gagal mengubah status wilayah.');
    }
  };

  const saveCategory = async () => {
    setIsSavingCategory(true);
    setCategoryError('');
    try {
      const response = await fetch('/api/admin/categories', {
        method: editingCategoryId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategoryId
          ? { id: editingCategoryId, action: 'update', name: categoryName, defaultAgency: categoryAgency }
          : { name: categoryName, defaultAgency: categoryAgency }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan kategori.');
      setCategories(result.categories as AdminCategory[]);
      setCategoryName('');
      setCategoryAgency('');
      setEditingCategoryId('');
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Gagal menyimpan kategori.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const toggleCategory = async (category: AdminCategory) => {
    setCategoryError('');
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, action: 'toggle' }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengubah status kategori.');
      setCategories(result.categories as AdminCategory[]);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Gagal mengubah status kategori.');
    }
  };

  const openReportDetails = useCallback(async (report: AdminReport) => {
    setSelectedReport(report);
    setReportHistory([]);
    setRoutingHistory([]);
    setHistoryError('');
    setRoutingError('');
    setDecisionError('');
    setRejectionReason('');
    setIsRejectionFormOpen(false);
    const suggestedAgency = report.assignedAgency || report.agency || agencies.find((agency) => agency.isActive)?.name || '';
    const suggestedRegion = regions.find((region) => region.agencyName === suggestedAgency && region.name === report.assignedRegion && region.isActive)
      || regions.find((region) => region.agencyName === suggestedAgency && region.isActive);
    setDestinationAgency(suggestedAgency);
    setDestinationRegion(suggestedRegion?.name || '');
    setIsLoadingHistory(true);

    try {
      const [response, routingResponse, completionResponse] = await Promise.all([
        fetch(`/api/admin/reports?historyFor=${encodeURIComponent(report.id)}`, { cache: 'no-store' }),
        fetch(`/api/admin/reports?routingFor=${encodeURIComponent(report.id)}`, { cache: 'no-store' }),
        fetch(`/api/admin/reports?completionFor=${encodeURIComponent(report.id)}`, { cache: 'no-store' }),
      ]);
      const [result, routingResult, completionResult] = await Promise.all([
        response.json().catch(() => ({})),
        routingResponse.json().catch(() => ({})),
        completionResponse.json().catch(() => ({})),
      ]);
      if (response.status === 401 || routingResponse.status === 401 || completionResponse.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memuat riwayat laporan.');
      setReportHistory(Array.isArray(result.history) ? result.history as ReportHistory[] : []);
      if (!routingResponse.ok) throw new Error(routingResult.error || 'Gagal memuat riwayat penerusan.');
      setRoutingHistory(Array.isArray(routingResult.routingHistory) ? routingResult.routingHistory as RoutingHistory[] : []);
      if (!completionResponse.ok) throw new Error(completionResult.error || 'Gagal memuat bukti penyelesaian.');
      setSelectedReport((current) => current?.id === report.id ? {
        ...current,
        completionEvidence: Array.isArray(completionResult.completionEvidence) ? completionResult.completionEvidence as string[] : [],
        completionNotes: completionResult.completionNotes as string | null,
        completionSubmittedAt: completionResult.completionSubmittedAt as string | null,
        completionSubmittedBy: completionResult.completionSubmittedBy as string | null,
      } : current);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Gagal memuat riwayat laporan.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [agencies, regions, router]);

  const updateRoutingHistory = async (reportId: string) => {
    const response = await fetch(`/api/admin/reports?routingFor=${encodeURIComponent(reportId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Gagal memuat riwayat penerusan.');
    setRoutingHistory(Array.isArray(result.routingHistory) ? result.routingHistory as RoutingHistory[] : []);
  };

  const saveDestination = async () => {
    if (!selectedReport) return;
    if (isLoadingRegions || !availableDestinationRegions.some((region) => region.name === destinationRegion)) {
      setRoutingError('Pilih wilayah aktif untuk instansi tujuan. Jika daftar wilayah gagal dimuat, coba muat ulang.');
      return;
    }
    setIsSavingRouting(true);
    setRoutingError('');
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          action: 'assign',
          agency: destinationAgency,
          region: destinationRegion,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menetapkan instansi tujuan.');

      const updatedReport = { ...selectedReport, ...result.report } as AdminReport;
      setSelectedReport(updatedReport);
      setAdminData((current) => current ? {
        ...current,
        reports: current.reports.map((report) => report.id === updatedReport.id ? updatedReport : report),
      } : current);
      await updateRoutingHistory(updatedReport.id);
      showToast('success', 'Tujuan berhasil disimpan', `Laporan ditugaskan ke ${destinationAgency} untuk wilayah ${destinationRegion}.`);
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Gagal menetapkan instansi tujuan.');
    } finally {
      setIsSavingRouting(false);
    }
  };

  const forwardReport = async () => {
    if (!selectedReport) return;
    setIsSavingRouting(true);
    setRoutingError('');
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReport.id, action: 'forward' }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal meneruskan laporan.');

      const updatedReport = { ...selectedReport, ...result.report } as AdminReport;
      setSelectedReport(updatedReport);
      setAdminData((current) => current ? {
        ...current,
        reports: current.reports.map((report) => report.id === updatedReport.id ? updatedReport : report),
      } : current);
      await updateRoutingHistory(updatedReport.id);
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Gagal meneruskan laporan.');
    } finally {
      setIsSavingRouting(false);
    }
  };

  const decideReport = async (action: 'approve' | 'reject' | 'complete') => {
    if (!selectedReport) return;
    setIsSavingDecision(true);
    setDecisionError('');

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          action,
          rejectionReason,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan keputusan.');

      const updatedReport = {
        ...selectedReport,
        status: result.report.status as string,
        completionEvidence: Array.isArray(result.report.completionEvidence) ? result.report.completionEvidence as string[] : selectedReport.completionEvidence,
        rejectionReason: action === 'reject' ? result.report.rejectionReason as string | null : selectedReport.rejectionReason ?? null,
      };
      setSelectedReport(updatedReport);
      setAdminData((current) => current ? {
        ...current,
        reports: current.reports.map((report) => report.id === updatedReport.id ? updatedReport : report),
      } : current);
      setIsRejectionFormOpen(false);
      setRejectionReason('');

      const historyResponse = await fetch(`/api/admin/reports?historyFor=${encodeURIComponent(updatedReport.id)}`, { cache: 'no-store' });
      const historyResult = await historyResponse.json().catch(() => ({}));
      if (historyResponse.ok) {
        setReportHistory(Array.isArray(historyResult.history) ? historyResult.history as ReportHistory[] : []);
      }
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Gagal menyimpan keputusan.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const reports = adminData?.reports ?? emptyAdminReports;
  const availableDestinationRegions = regions.filter((region) => (
    region.agencyName === destinationAgency && region.isActive
  ));
  const editingRegion = regions.find((region) => region.id === editingRegionId);
  const mapReports = useMemo<AdminMapReport[]>(() => reports
    .filter((report) => mapCategoryFilter === 'Semua kategori' || report.category === mapCategoryFilter)
    .filter((report) => report.coordinates
      && Number.isFinite(report.coordinates.lat)
      && Number.isFinite(report.coordinates.lng))
    .map((report) => ({
      id: report.id,
      ticketNumber: report.ticketNumber,
      title: report.title,
      category: report.category,
      location: report.location,
      coordinates: report.coordinates,
    })), [reports, mapCategoryFilter]);
  const missingMapCoordinatesCount = reports.filter((report) => (
    (mapCategoryFilter === 'Semua kategori' || report.category === mapCategoryFilter)
    && (!report.coordinates
      || !Number.isFinite(report.coordinates.lat)
      || !Number.isFinite(report.coordinates.lng))
  )).length;
  const openMapReport = useCallback((reportId: string) => {
    const report = reports.find((item) => item.id === reportId);
    if (report) void openReportDetails(report);
  }, [openReportDetails, reports]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedRegion = regionFilter.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== 'Semua status' && report.status !== statusFilter) return false;
      if (categoryFilter !== 'Semua kategori' && report.category !== categoryFilter) return false;
      const reportDate = getReportDateKey(report.date);
      if (dateFrom && (!reportDate || reportDate < dateFrom)) return false;
      if (dateTo && (!reportDate || reportDate > dateTo)) return false;
      if (normalizedRegion && ![report.location, report.assignedRegion || '']
        .some((value) => value.toLowerCase().includes(normalizedRegion))) return false;
      if (!normalizedSearch) return true;
      return [report.ticketNumber, report.title, report.category, report.location, report.reporterName, report.agency, report.date]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [reports, search, statusFilter, categoryFilter, dateFrom, dateTo, regionFilter]);

  const progressEntries = [
    ...reportHistory.map((entry) => ({
      id: `status-${entry.id}`,
      title: entry.previous_status ? `${entry.previous_status} → ${entry.new_status}` : entry.new_status,
      details: entry.note,
      occurredAt: entry.changed_at,
    })),
    ...routingHistory.map((entry) => ({
      id: `routing-${entry.id}`,
      title: `${entry.action} · ${entry.agency}`,
      details: `Wilayah: ${entry.region}. ${entry.details}`,
      occurredAt: entry.created_at,
    })),
  ].sort((first, second) => new Date(first.occurredAt).getTime() - new Date(second.occurredAt).getTime());

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
    }
  };

  const summary = [
    { label: 'Semua laporan', count: reports.length, color: 'var(--slate-900)' },
    { label: 'Menunggu', count: reports.filter((report) => report.status === 'Menunggu').length, color: 'var(--warning-text)' },
    { label: 'Diproses', count: reports.filter((report) => report.status === 'Diproses').length, color: 'var(--primary-700)' },
    { label: 'Selesai', count: reports.filter((report) => report.status === 'Selesai').length, color: 'var(--success-solid)' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: 'var(--slate-50)', padding: '28px 20px 56px' }}>
      <main style={{ maxWidth: '1320px', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', display: 'grid', placeItems: 'center', background: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: '10px' }}><ShieldCheck size={22} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase' }}>Admin Platform</div>
              <h1 style={{ margin: '3px 0 0', color: 'var(--slate-900)', fontSize: '1.5rem', fontWeight: 800 }}>Daftar Laporan</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {adminData && <span style={{ color: 'var(--slate-600)', fontSize: '0.8125rem' }}>{adminData.user.name}</span>}
            <button type="button" onClick={() => { setIsLoading(true); setLoadError(''); void loadReports(); }} disabled={isLoading} title="Muat ulang laporan" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 11px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={15} /> Muat ulang</button>
            <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} title="Keluar dari dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 11px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--danger-text)', fontWeight: 700, cursor: 'pointer' }}><LogOut size={15} /> Keluar</button>
          </div>
        </header>

        <section aria-label="Ringkasan laporan" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {summary.map((item) => (
            <div key={item.label} style={{ padding: '15px 17px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white' }}>
              <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem', fontWeight: 700 }}>{item.label}</div>
              <div style={{ marginTop: '5px', color: item.color, fontSize: '1.5rem', fontWeight: 800 }}>{item.count}</div>
            </div>
          ))}
        </section>

        <section aria-label="Peta sebaran laporan" style={{ marginBottom: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>
                <MapIcon size={18} color="var(--primary-700)" /> Peta sebaran laporan
              </h2>
              <p style={{ margin: '5px 0 0', color: 'var(--slate-500)', fontSize: '.75rem' }}>Sebaran titik berdasarkan koordinat lokasi dan kategori laporan.</p>
            </div>
            <label style={{ display: 'grid', gap: '4px', color: 'var(--slate-600)', fontSize: '.7rem', fontWeight: 700 }}>
              Filter kategori
              <select aria-label="Filter kategori peta" value={mapCategoryFilter} onChange={(event) => setMapCategoryFilter(event.target.value)} style={{ minWidth: '190px', padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', font: 'inherit' }}>
                <option>Semua kategori</option>
                {[...new Set(reports.map((report) => report.category))].sort().map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </header>
          {isLoading ? (
            <div style={{ height: '460px', display: 'grid', placeItems: 'center', color: 'var(--slate-500)' }}>Memuat laporan untuk peta...</div>
          ) : mapReports.length === 0 ? (
            <div style={{ minHeight: '220px', display: 'grid', placeItems: 'center', padding: '24px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.85rem' }}>
              Belum ada laporan dengan koordinat lokasi pada kategori ini.
            </div>
          ) : (
            <AdminReportMap reports={mapReports} onSelectReport={openMapReport} />
          )}
          <footer style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '10px 16px', borderTop: '1px solid var(--slate-200)', color: 'var(--slate-600)', fontSize: '.73rem' }}>
            <span>{mapReports.length} laporan bertitik pada peta</span>
            {missingMapCoordinatesCount > 0 && <span>{missingMapCoordinatesCount} laporan belum memiliki koordinat valid</span>}
          </footer>
        </section>

        <section aria-label="Notifikasi dan aktivitas admin" style={{ marginBottom: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          {activityError && <p role="alert" style={{ margin: 0, padding: '10px 16px', borderBottom: '1px solid var(--slate-200)', color: 'var(--danger-text)', fontSize: '.78rem' }}>{activityError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
            <section aria-label="Notifikasi laporan" style={{ minWidth: 0, padding: '14px 16px', borderRight: '1px solid var(--slate-200)' }}>
              <header aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--slate-800)', fontSize: '.9rem', fontWeight: 800 }}>
                  <Bell size={17} color="var(--primary-700)" /> Notifikasi laporan
                  {unreadNotificationCount > 0 && <span style={{ minWidth: '20px', padding: '2px 6px', borderRadius: '10px', background: 'var(--danger-bg)', color: 'var(--danger-text)', textAlign: 'center', fontSize: '.68rem' }}>{unreadNotificationCount}</span>}
                </h2>
                <button type="button" onClick={() => void markAllNotificationsRead()} disabled={unreadNotificationCount === 0 || isUpdatingNotifications} title="Tandai semua notifikasi telah dibaca" aria-label="Tandai semua notifikasi telah dibaca" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-600)', cursor: unreadNotificationCount ? 'pointer' : 'default', opacity: unreadNotificationCount ? 1 : .5 }}>
                  <CheckCheck size={16} />
                </button>
              </header>
              {notifications.length === 0 ? (
                <p style={{ margin: 0, padding: '14px 0', color: 'var(--slate-500)', fontSize: '.78rem' }}>Belum ada notifikasi laporan.</p>
              ) : (
                <ul style={{ display: 'grid', gap: 0, maxHeight: '360px', overflowY: 'auto', margin: 0, padding: '0 5px 0 0', listStyle: 'none' }}>
                  {notifications.map((notification) => (
                    <li key={notification.id} style={{ borderTop: '1px solid var(--slate-100)' }}>
                      <button type="button" onClick={() => {
                        void markNotificationRead(notification);
                        const report = reports.find((item) => item.id === notification.reportId);
                        if (report) void openReportDetails(report);
                      }} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '10px 2px', border: 0, background: notification.readAt ? 'white' : 'var(--primary-50)', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                        {notification.kind === 'report_issue' ? <CircleAlert size={16} color="var(--danger-text)" style={{ flexShrink: 0, marginTop: '2px' }} /> : <Bell size={15} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: '2px' }} />}
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: 'var(--slate-800)', fontSize: '.75rem', fontWeight: notification.readAt ? 600 : 800 }}>
                            <span>{notification.title}</span>
                            {!notification.readAt && <span aria-label="Belum dibaca" style={{ width: 7, height: 7, marginTop: 4, borderRadius: '50%', background: 'var(--primary-700)', flexShrink: 0 }} />}
                          </span>
                          <span style={{ display: 'block', marginTop: '3px', color: 'var(--slate-600)', fontSize: '.7rem', lineHeight: 1.45 }}>{notification.message}</span>
                          <time style={{ display: 'block', marginTop: '4px', color: 'var(--slate-400)', fontSize: '.65rem' }}>{new Date(notification.createdAt).toLocaleString('id-ID')}</time>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Riwayat aktivitas admin" style={{ minWidth: 0, padding: '14px 16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '.9rem', fontWeight: 800 }}><History size={17} color="var(--primary-700)" /> Riwayat aktivitas</h2>
              {activities.length === 0 ? (
                <p style={{ margin: 0, padding: '14px 0', color: 'var(--slate-500)', fontSize: '.78rem' }}>Belum ada aktivitas admin.</p>
              ) : (
                <ol style={{ display: 'grid', gap: 0, maxHeight: '360px', overflowY: 'auto', margin: 0, padding: '0 5px 0 0', listStyle: 'none' }}>
                  {activities.map((activity) => (
                    <li key={activity.id} style={{ padding: '10px 2px', borderTop: '1px solid var(--slate-100)' }}>
                      <div style={{ color: 'var(--slate-800)', fontSize: '.73rem', fontWeight: 700 }}>{activity.details}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px', color: 'var(--slate-500)', fontSize: '.65rem' }}>
                        <span>{activity.adminName}{activity.ticketNumber ? ` · ${activity.ticketNumber}` : ''}</span>
                        <time style={{ whiteSpace: 'nowrap' }}>{new Date(activity.createdAt).toLocaleString('id-ID')}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </section>

        <AdminAbuseReview />

        <section style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--slate-800)', fontWeight: 800 }}><ClipboardList size={18} color="var(--primary-700)" /> Laporan masuk <span style={{ color: 'var(--slate-400)', fontWeight: 600 }}>({filteredReports.length})</span></div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--slate-400)' }} />
                <input aria-label="Cari nomor laporan" placeholder="Nomor tiket atau kata kunci" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 'min(260px, 70vw)', boxSizing: 'border-box', padding: '9px 10px 9px 32px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', fontSize: '0.8125rem' }} />
              </label>
              <select aria-label="Filter kategori" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', font: 'inherit', fontSize: '0.8125rem' }}>
                <option>Semua kategori</option>
                {[...new Set(reports.map((report) => report.category))].sort().map((category) => <option key={category}>{category}</option>)}
              </select>
              <select aria-label="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', font: 'inherit', fontSize: '0.8125rem' }}>
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--slate-500)', fontSize: '0.7rem' }}>
                Dari<input aria-label="Tanggal mulai" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} style={{ minWidth: '130px', padding: '8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-700)', font: 'inherit' }} />
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--slate-500)', fontSize: '0.7rem' }}>
                Sampai<input aria-label="Tanggal akhir" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} style={{ minWidth: '130px', padding: '8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-700)', font: 'inherit' }} />
              </label>
              <label>
                <input aria-label="Filter wilayah" placeholder="Wilayah / kecamatan" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} style={{ width: 'min(190px, 65vw)', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', fontSize: '0.8125rem' }} />
              </label>
            </div>
          </div>

          {loadError && <p role="alert" style={{ margin: 0, padding: '14px 16px', color: 'var(--danger-text)', background: 'var(--danger-bg)', fontSize: '0.875rem' }}>{loadError}</p>}
          {isLoading ? (
            <div style={{ padding: '42px 16px', textAlign: 'center', color: 'var(--slate-500)' }}>Memuat daftar laporan...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '42px 16px', textAlign: 'center', color: 'var(--slate-500)' }}>{reports.length === 0 ? 'Belum ada laporan di database.' : 'Tidak ada laporan yang cocok dengan filter.'}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px', textAlign: 'left' }}>
                <thead style={{ background: 'var(--slate-50)', color: 'var(--slate-600)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  <tr>{['Tiket / Laporan', 'Kategori', 'Pelapor', 'Lokasi / Instansi', 'Tanggal', 'Status', 'Urgensi'].map((heading) => <th key={heading} scope="col" style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-200)', whiteSpace: 'nowrap' }}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', maxWidth: '300px' }}>
                        <div style={{ color: 'var(--primary-700)', fontSize: '0.7rem', fontWeight: 800 }}>{report.ticketNumber}</div>
                        <button type="button" onClick={() => void openReportDetails(report)} style={{ marginTop: '4px', padding: 0, border: 0, background: 'none', color: 'var(--slate-900)', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>{report.title}</button>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '0.8125rem' }}>{report.category}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '0.8125rem' }}>{report.reporterName}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', maxWidth: '260px' }}>
                        <div style={{ color: 'var(--slate-800)', fontSize: '0.8125rem' }}>{report.location}</div>
                        <div style={{ marginTop: '3px', color: 'var(--slate-500)', fontSize: '0.7rem' }}>{report.assignedAgency || report.agency}</div>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{report.date}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', padding: '4px 7px', borderRadius: '4px', background: report.status === 'Selesai' ? 'var(--success-bg)' : report.status === 'Ditolak' ? 'var(--danger-bg)' : report.status === 'Diproses' ? 'var(--primary-100)' : 'var(--warning-bg)', color: report.status === 'Selesai' ? 'var(--success-text)' : report.status === 'Ditolak' ? 'var(--danger-text)' : report.status === 'Diproses' ? 'var(--primary-700)' : 'var(--warning-text)', fontSize: '0.7rem', fontWeight: 800 }}>{report.status}</span></td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '0.8125rem' }}>{report.urgency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-label="Kelola kategori laporan" style={{ marginTop: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>Kelola kategori laporan</h2>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '9px', alignItems: 'end', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>
              Nama kategori
              <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={50} placeholder="Contoh: Pohon tumbang" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
            </label>
            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>
              Instansi tujuan default
              <select value={categoryAgency} onChange={(event) => setCategoryAgency(event.target.value)} disabled={agencies.filter((agency) => agency.isActive).length === 0} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', font: 'inherit' }}>
                <option value="">Pilih instansi aktif</option>
                {agencies.filter((agency) => agency.isActive).map((agency) => <option key={agency.id} value={agency.name}>{agency.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void saveCategory()} disabled={isSavingCategory || categoryName.trim().length < 2 || !agencies.some((agency) => agency.name === categoryAgency && agency.isActive)} style={{ padding: '9px 12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{isSavingCategory ? 'Menyimpan...' : editingCategoryId ? 'Simpan perubahan' : 'Tambah kategori'}</button>
            {editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(''); setCategoryName(''); setCategoryAgency(''); }} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', cursor: 'pointer' }}>Batal</button>}
          </div>
          {categoryError && <p role="alert" style={{ margin: 0, padding: '10px 16px', color: 'var(--danger-text)', fontSize: '.78rem' }}>{categoryError}</p>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ color: 'var(--slate-500)', background: 'var(--slate-50)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                <tr>{['Kategori', 'Instansi default', 'Laporan', 'Status', 'Aksi'].map((heading) => <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>)}</tr>
              </thead>
              <tbody>{categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-800)', fontSize: '.8rem', fontWeight: 700 }}>{category.name}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '.75rem' }}>{category.defaultAgency}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{category.reportCount}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: category.isActive ? 'var(--success-text)' : 'var(--slate-500)', fontSize: '.75rem', fontWeight: 700 }}>{category.isActive ? 'Aktif' : 'Nonaktif'}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); setCategoryAgency(category.defaultAgency); }} style={{ marginRight: 7, padding: '6px 8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>Ubah</button>
                    <button type="button" onClick={() => void toggleCategory(category)} style={{ padding: '6px 8px', border: `1px solid ${category.isActive ? 'var(--danger-border)' : 'var(--success-border)'}`, borderRadius: 'var(--radius-sm)', background: 'white', color: category.isActive ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>{category.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section aria-label="Kelola instansi" style={{ marginTop: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>Kelola instansi</h2>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '9px', alignItems: 'end', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>
              Nama instansi
              <input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} maxLength={255} placeholder="Contoh: Dinas Pertamanan" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
            </label>
            <button type="button" onClick={() => void saveAgency()} disabled={isSavingAgency || agencyName.trim().length < 2} style={{ padding: '9px 12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{isSavingAgency ? 'Menyimpan...' : editingAgencyId ? 'Simpan perubahan' : 'Tambah instansi'}</button>
            {editingAgencyId && <button type="button" onClick={() => { setEditingAgencyId(''); setAgencyName(''); }} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', cursor: 'pointer' }}>Batal</button>}
          </div>
          {agencyError && <p role="alert" style={{ margin: 0, padding: '10px 16px', color: 'var(--danger-text)', fontSize: '.78rem' }}>{agencyError}</p>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ color: 'var(--slate-500)', background: 'var(--slate-50)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                <tr>{['Instansi', 'Laporan', 'Status', 'Aksi'].map((heading) => <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>)}</tr>
              </thead>
              <tbody>{agencies.map((agency) => (
                <tr key={agency.id}>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-800)', fontSize: '.8rem', fontWeight: 700 }}>{agency.name}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{agency.reportCount}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: agency.isActive ? 'var(--success-text)' : 'var(--slate-500)', fontSize: '.75rem', fontWeight: 700 }}>{agency.isActive ? 'Aktif' : 'Nonaktif'}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => { setEditingAgencyId(agency.id); setAgencyName(agency.name); }} style={{ marginRight: 7, padding: '6px 8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>Ubah</button>
                    <button type="button" onClick={() => void toggleAgency(agency)} style={{ padding: '6px 8px', border: `1px solid ${agency.isActive ? 'var(--danger-border)' : 'var(--success-border)'}`, borderRadius: 'var(--radius-sm)', background: 'white', color: agency.isActive ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>{agency.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section aria-label="Kelola wilayah tanggung jawab" style={{ marginTop: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>Kelola wilayah tanggung jawab</h2>
            <p style={{ margin: '5px 0 0', color: 'var(--slate-500)', fontSize: '.75rem' }}>Daftarkan wilayah cakupan untuk setiap instansi. Contoh: Kecamatan atau kelurahan.</p>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '9px', alignItems: 'end', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>
              Instansi
              <select value={editingRegion ? editingRegion.agencyId : regionAgencyId} onChange={(event) => setRegionAgencyId(event.target.value)} disabled={Boolean(editingRegionId) || agencies.filter((agency) => agency.isActive).length === 0} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', font: 'inherit' }}>
                <option value="">Pilih instansi aktif</option>
                {agencies.filter((agency) => agency.isActive).map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
                {editingRegion && !agencies.some((agency) => agency.id === editingRegion.agencyId && agency.isActive) && (
                  <option value={editingRegion.agencyId}>{editingRegion.agencyName} (nonaktif)</option>
                )}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>
              Nama wilayah
              <input value={regionName} onChange={(event) => setRegionName(event.target.value)} maxLength={200} placeholder="Contoh: Kecamatan Sukmajaya" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
            </label>
            <button type="button" onClick={() => void saveRegion()} disabled={isSavingRegion || regionName.trim().length < 2 || !(editingRegionId || agencies.some((agency) => agency.id === regionAgencyId && agency.isActive))} style={{ padding: '9px 12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{isSavingRegion ? 'Menyimpan...' : editingRegionId ? 'Simpan perubahan' : 'Tambah wilayah'}</button>
            {editingRegionId && <button type="button" onClick={() => { setEditingRegionId(''); setRegionName(''); setRegionAgencyId(''); }} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', cursor: 'pointer' }}>Batal</button>}
          </div>
          {regionError && <p role="alert" style={{ margin: 0, padding: '10px 16px', color: 'var(--danger-text)', fontSize: '.78rem' }}>{regionError}</p>}
          {isLoadingRegions ? (
            <p style={{ margin: 0, padding: '24px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>Memuat data wilayah...</p>
          ) : regions.length === 0 ? (
            <p style={{ margin: 0, padding: '24px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>Belum ada wilayah tanggung jawab terdaftar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '660px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ color: 'var(--slate-500)', background: 'var(--slate-50)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                  <tr>{['Wilayah', 'Instansi', 'Laporan ditugaskan', 'Status', 'Aksi'].map((heading) => <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>)}</tr>
                </thead>
                <tbody>{regions.map((region) => (
                  <tr key={region.id}>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-800)', fontSize: '.8rem', fontWeight: 700 }}>{region.name}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '.75rem' }}>{region.agencyName}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{region.reportCount}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: region.isActive ? 'var(--success-text)' : 'var(--slate-500)', fontSize: '.75rem', fontWeight: 700 }}>{region.isActive ? 'Aktif' : 'Nonaktif'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => { setEditingRegionId(region.id); setRegionName(region.name); setRegionAgencyId(region.agencyId); }} style={{ marginRight: 7, padding: '6px 8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>Ubah</button>
                      <button type="button" onClick={() => void toggleRegion(region)} style={{ padding: '6px 8px', border: `1px solid ${region.isActive ? 'var(--danger-border)' : 'var(--success-border)'}`, borderRadius: 'var(--radius-sm)', background: 'white', color: region.isActive ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>{region.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-label="Kelola pengguna" style={{ marginTop: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
            <Users size={18} color="var(--primary-700)" />
            <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>Kelola pengguna</h2>
            <span style={{ color: 'var(--slate-400)', fontSize: '.8rem' }}>({users.length})</span>
          </header>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
            <h3 style={{ margin: '0 0 5px', color: 'var(--slate-800)', fontSize: '.85rem', fontWeight: 800 }}>Buat akun Admin Instansi</h3>
            <p style={{ margin: '0 0 12px', color: 'var(--slate-500)', fontSize: '.72rem' }}>Undangan aktivasi dikirim ke email. Penerima membuat kata sandinya sendiri; akun baru dapat masuk setelah aktivasi.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '9px', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                Nama
                <input value={agencyUserName} onChange={(event) => setAgencyUserName(event.target.value)} maxLength={255} autoComplete="name" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                Email
                <input type="email" value={agencyUserEmail} onChange={(event) => setAgencyUserEmail(event.target.value)} maxLength={255} autoComplete="email" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                NIK (16 digit)
                <input value={agencyUserNik} onChange={(event) => setAgencyUserNik(event.target.value.replace(/\D/g, '').slice(0, 16))} inputMode="numeric" maxLength={16} autoComplete="off" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                Telepon
                <input value={agencyUserPhone} onChange={(event) => setAgencyUserPhone(event.target.value)} maxLength={50} autoComplete="tel" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                Instansi
                <select value={agencyUserAgencyId} onChange={(event) => setAgencyUserAgencyId(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', font: 'inherit' }}>
                  <option value="">Pilih instansi aktif</option>
                  {agencies.filter((agency) => agency.isActive).map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => void createAgencyUser()} disabled={isSavingAgencyUser || agencyUserName.trim().length < 2 || !agencyUserEmail.includes('@') || agencyUserNik.length !== 16 || agencyUserPhone.trim().length < 6 || !agencyUserAgencyId} style={{ padding: '9px 12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontWeight: 800, cursor: isSavingAgencyUser ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                {isSavingAgencyUser ? 'Membuat akun & mengirim undangan...' : 'Buat akun & kirim undangan'}
              </button>
            </div>
          </div>
          {usersError && <p role="alert" style={{ margin: 0, padding: '10px 16px', color: 'var(--danger-text)', fontSize: '.78rem' }}>{usersError}</p>}
          {isLoadingUsers ? (
            <p style={{ margin: 0, padding: '28px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>Memuat data pengguna...</p>
          ) : users.length === 0 ? (
            <p style={{ margin: 0, padding: '28px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>Belum ada akun Warga, Petugas, atau Admin Instansi.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ color: 'var(--slate-500)', background: 'var(--slate-50)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                  <tr>{['Nama / Email', 'Telepon', 'Peran', 'Terdaftar', 'Status', 'Aksi'].map((heading) => <th key={heading} scope="col" style={{ padding: '10px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)' }}>
                        <div style={{ color: 'var(--slate-800)', fontSize: '.8rem', fontWeight: 700 }}>{user.name}</div>
                        <div style={{ marginTop: '3px', color: 'var(--slate-500)', fontSize: '.72rem' }}>{user.email}</div>
                        {user.agencyName && <div style={{ marginTop: '3px', color: 'var(--primary-700)', fontSize: '.68rem', fontWeight: 700 }}>{user.agencyName}</div>}
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{user.phone}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{user.role}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '.72rem', whiteSpace: 'nowrap' }}>{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: user.isActive ? 'var(--success-text)' : user.invitationStatus === 'failed' ? 'var(--danger-text)' : 'var(--slate-500)', fontSize: '.75rem', fontWeight: 700 }}>
                        {user.isActive ? 'Aktif' : user.role === 'Admin Instansi'
                          ? user.invitationStatus === 'failed' ? 'Undangan gagal dikirim'
                            : user.invitationStatus === 'expired' ? 'Undangan kedaluwarsa'
                              : user.invitationStatus === 'accepted' ? 'Nonaktif'
                                : user.invitationStatus === 'sent' || user.invitationStatus === 'pending' ? 'Menunggu aktivasi' : 'Belum diundang'
                          : 'Nonaktif'}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--slate-100)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {user.role === 'Admin Instansi' && !user.isActive && user.invitationStatus !== 'accepted' ? (
                            <button type="button" onClick={() => void resendAgencyInvitation(user)} disabled={updatingUserId === user.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 9px', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--primary-700)', fontSize: '.7rem', fontWeight: 700, cursor: updatingUserId === user.id ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                              <Send size={14} /> {updatingUserId === user.id ? 'Mengirim...' : 'Kirim ulang undangan'}
                            </button>
                          ) : (
                            <button type="button" onClick={() => void toggleUser(user)} disabled={updatingUserId === user.id} aria-pressed={!user.isActive} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 9px', border: `1px solid ${user.isActive ? 'var(--danger-border)' : 'var(--success-border)'}`, borderRadius: 'var(--radius-sm)', background: 'white', color: user.isActive ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '.7rem', fontWeight: 700, cursor: updatingUserId === user.id ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                              {user.isActive ? <><UserX size={14} /> Nonaktifkan</> : <><UserCheck size={14} /> Aktifkan</>}
                            </button>
                          )}
                          {user.role === 'Admin Instansi' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingUser(user);
                              }}
                              disabled={updatingUserId === user.id || isDeletingUser}
                              title="Hapus akun Admin Instansi"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 9px',
                                border: '1px solid var(--danger-border)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'white',
                                color: 'var(--danger-text)',
                                fontSize: '.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Trash2 size={14} /> Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedReport && (
          <div role="presentation" onClick={() => setSelectedReport(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(15, 23, 42, 0.62)' }}>
            <section role="dialog" aria-modal="true" aria-labelledby="admin-report-title" onClick={(event) => event.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: 'var(--shadow-xl)' }}>
              <header style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', borderBottom: '1px solid var(--slate-200)', background: 'white' }}>
                <div>
                  <div style={{ color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 800 }}>{selectedReport.ticketNumber} · {selectedReport.category}</div>
                  <h2 id="admin-report-title" style={{ margin: '5px 0 0', color: 'var(--slate-900)', fontSize: '1.2rem', fontWeight: 800 }}>{selectedReport.title}</h2>
                </div>
                <button type="button" onClick={() => setSelectedReport(null)} aria-label="Tutup detail laporan" title="Tutup detail laporan" style={{ width: '34px', height: '34px', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', cursor: 'pointer' }}><X size={17} /></button>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(230px, 0.8fr)', gap: '20px', padding: '20px' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}>Deskripsi laporan</h3>
                  <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '0.875rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selectedReport.description || 'Tidak ada deskripsi.'}</p>

                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '22px 0 10px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}><ImageIcon size={16} color="var(--primary-700)" /> Foto laporan</h3>
                  {selectedReport.images.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '9px' }}>
                      {selectedReport.images.map((image, index) => (
                        <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block', aspectRatio: '4 / 3', overflow: 'hidden', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-100)' }}>
                          <Image src={image} alt={`Foto laporan ${index + 1}`} fill unoptimized sizes="(max-width: 600px) 45vw, 200px" style={{ objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  ) : <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.8125rem' }}>Tidak ada foto terlampir.</p>}

                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '22px 0 8px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}><MapPin size={16} color="var(--primary-700)" /> Lokasi</h3>
                  <p style={{ margin: '0 0 7px', color: 'var(--slate-700)', fontSize: '0.8125rem' }}>{selectedReport.location}</p>
                  {selectedReport.coordinates?.lat != null && selectedReport.coordinates.lng != null && (
                    <a href={`https://www.google.com/maps?q=${selectedReport.coordinates.lat},${selectedReport.coordinates.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 700 }}>Buka koordinat di peta <ExternalLink size={13} /></a>
                  )}
                </div>

                <aside style={{ display: 'grid', alignContent: 'start', gap: '15px' }}>
                  <div style={{ padding: '13px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                    <h3 style={{ margin: '0 0 10px', color: 'var(--slate-800)', fontSize: '0.8125rem', fontWeight: 800 }}>Informasi laporan</h3>
                    {[['Kategori', selectedReport.category], ['Status', selectedReport.status], ['Urgensi', selectedReport.urgency], ['Instansi usulan', selectedReport.agency], ['Pelapor', selectedReport.reporterName], ['Tanggal', selectedReport.date]].map(([label, value]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '75px minmax(0, 1fr)', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--slate-200)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--slate-500)' }}>{label}</span>
                        <span style={{ color: 'var(--slate-800)', fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedReport.status === 'Menunggu' && (
                    <section aria-label="Verifikasi laporan" style={{ padding: '13px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'white' }}>
                      <h3 style={{ margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '0.8125rem', fontWeight: 800 }}>Keputusan verifikasi</h3>
                      <p style={{ margin: '0 0 11px', color: 'var(--slate-500)', fontSize: '0.7rem', lineHeight: 1.5 }}>Periksa deskripsi, foto, lokasi, dan kategori sebelum menyetujui atau menolak laporan.</p>
                      {decisionError && <p role="alert" style={{ margin: '0 0 9px', color: 'var(--danger-text)', fontSize: '0.75rem' }}>{decisionError}</p>}
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <button type="button" onClick={() => void decideReport('approve')} disabled={isSavingDecision} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px 11px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--success-solid)', color: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>
                          <CheckCircle2 size={15} /> Setujui laporan
                        </button>
                        {!isRejectionFormOpen ? (
                          <button type="button" onClick={() => setIsRejectionFormOpen(true)} disabled={isSavingDecision} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px 11px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--danger-text)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                            <Ban size={15} /> Tolak laporan
                          </button>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '0.7rem', fontWeight: 700 }}>
                              Alasan penolakan (wajib)
                              <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} rows={4} placeholder="Jelaskan bagian yang tidak valid atau belum memenuhi syarat" style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', resize: 'vertical' }} />
                            </label>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '7px' }}>
                              <span style={{ color: 'var(--slate-400)', fontSize: '0.65rem' }}>{rejectionReason.length}/1.000</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" onClick={() => { setIsRejectionFormOpen(false); setRejectionReason(''); setDecisionError(''); }} disabled={isSavingDecision} style={{ padding: '7px 9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                                <button type="button" onClick={() => void decideReport('reject')} disabled={isSavingDecision || rejectionReason.trim().length < 5} style={{ padding: '7px 9px', border: 0, borderRadius: 'var(--radius-sm)', background: rejectionReason.trim().length >= 5 ? 'var(--danger-solid)' : 'var(--slate-300)', color: 'white', fontSize: '0.7rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>{isSavingDecision ? 'Menyimpan...' : 'Konfirmasi tolak'}</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {selectedReport.status === 'Ditolak' && selectedReport.rejectionReason && (
                    <section style={{ padding: '13px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)' }}>
                      <h3 style={{ margin: '0 0 6px', color: 'var(--danger-text)', fontSize: '0.8125rem', fontWeight: 800 }}>Alasan penolakan</h3>
                      <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selectedReport.rejectionReason}</p>
                    </section>
                  )}

                  {selectedReport.status === 'Diproses' && (
                    <section aria-label="Penetapan instansi tujuan" style={{ padding: '13px', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '0.8125rem', fontWeight: 800 }}><Building2 size={15} color="var(--primary-700)" /> Tujuan penanganan</h3>
                      {selectedReport.forwardedAt ? (
                        <div style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '0.75rem' }}>
                          <strong>{selectedReport.assignedAgency}</strong>
                          <span>Wilayah: {selectedReport.assignedRegion}</span>
                          <span style={{ color: 'var(--success-solid)', fontWeight: 700 }}>Diteruskan {new Date(selectedReport.forwardedAt).toLocaleString('id-ID')}</span>
                        </div>
                      ) : (
                        <>
                          <p style={{ margin: '0 0 11px', color: 'var(--slate-600)', fontSize: '0.7rem', lineHeight: 1.5 }}>Rekomendasi berdasarkan kategori: {categories.find((category) => category.name === selectedReport.category)?.defaultAgency || selectedReport.agency || 'Belum ada instansi aktif'}. Persetujuan hanya mengubah status laporan; agar tampil di dashboard instansi, simpan tujuan instansi dan wilayah lalu klik “Teruskan ke instansi”.</p>
                          {routingError && <p role="alert" style={{ margin: '0 0 9px', color: 'var(--danger-text)', fontSize: '0.75rem' }}>{routingError}</p>}
                          <div style={{ display: 'grid', gap: '9px' }}>
                            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '0.7rem', fontWeight: 700 }}>
                              Instansi tujuan
                              <select value={destinationAgency} onChange={(event) => {
                                const agencyName = event.target.value;
                                setDestinationAgency(agencyName);
                                setDestinationRegion(regions.find((region) => region.agencyName === agencyName && region.isActive)?.name || '');
                              }} disabled={Boolean(selectedReport.forwardedAt) || isSavingRouting} style={{ width: '100%', padding: '8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit' }}>
                                {destinationAgency && !agencies.some((agency) => agency.name === destinationAgency && agency.isActive) && <option value={destinationAgency} disabled>{destinationAgency} (nonaktif)</option>}
                                {agencies.filter((agency) => agency.isActive).map((agency) => <option key={agency.id} value={agency.name}>{agency.name}</option>)}
                              </select>
                            </label>
                            <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '0.7rem', fontWeight: 700 }}>
                              Wilayah tanggung jawab
                              <select value={destinationRegion} onChange={(event) => setDestinationRegion(event.target.value)} disabled={isSavingRouting || isLoadingRegions || availableDestinationRegions.length === 0} style={{ width: '100%', padding: '8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit' }}>
                                <option value="">{isLoadingRegions ? 'Memuat daftar wilayah...' : availableDestinationRegions.length > 0 ? 'Pilih wilayah terdaftar' : 'Belum ada wilayah aktif untuk instansi ini'}</option>
                                {availableDestinationRegions.map((region) => <option key={region.id} value={region.name}>{region.name}</option>)}
                              </select>
                            </label>
                            {regionError ? (
                              <div role="alert" style={{ display: 'grid', gap: '7px', color: 'var(--danger-text)', fontSize: '0.72rem', lineHeight: 1.45 }}>
                                <span>{regionError}</span>
                                <button type="button" onClick={() => void reloadRegions()} disabled={isLoadingRegions} style={{ justifySelf: 'start', padding: 0, border: 0, background: 'transparent', color: 'var(--primary-700)', font: 'inherit', fontWeight: 800, textDecoration: 'underline', cursor: isLoadingRegions ? 'wait' : 'pointer' }}>
                                  {isLoadingRegions ? 'Memuat ulang...' : 'Coba muat ulang wilayah'}
                                </button>
                              </div>
                            ) : !isLoadingRegions && availableDestinationRegions.length === 0 ? (
                              <p style={{ margin: 0, color: 'var(--warning-text)', fontSize: '0.72rem', lineHeight: 1.45 }}>
                                Belum ada wilayah aktif untuk instansi ini. Tambahkan atau aktifkan wilayah di bagian pengelolaan Wilayah sebelum menyimpan tujuan.
                              </p>
                            ) : null}
                            <button type="button" onClick={() => void saveDestination()} disabled={isSavingRouting || isLoadingRegions || !availableDestinationRegions.some((region) => region.name === destinationRegion) || Boolean(selectedReport.forwardedAt)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '8px 10px', border: '1px solid var(--primary-700)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--primary-700)', fontSize: '0.72rem', fontWeight: 800, cursor: isSavingRouting ? 'wait' : isLoadingRegions || availableDestinationRegions.length === 0 ? 'not-allowed' : 'pointer', opacity: isLoadingRegions || availableDestinationRegions.length === 0 ? 0.65 : 1 }}>
                              <Building2 size={14} /> {isSavingRouting ? 'Menyimpan...' : isLoadingRegions ? 'Memuat wilayah...' : 'Simpan tujuan'}
                            </button>
                            <button type="button" onClick={() => void forwardReport()} disabled={isSavingRouting || !selectedReport.assignedAgency || !selectedReport.assignedRegion || !agencies.some((agency) => agency.name === selectedReport.assignedAgency && agency.isActive) || !availableDestinationRegions.some((region) => region.name === selectedReport.assignedRegion) || destinationAgency !== selectedReport.assignedAgency || destinationRegion.trim() !== selectedReport.assignedRegion || Boolean(selectedReport.forwardedAt)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: selectedReport.assignedAgency && selectedReport.assignedRegion && agencies.some((agency) => agency.name === selectedReport.assignedAgency && agency.isActive) && availableDestinationRegions.some((region) => region.name === selectedReport.assignedRegion) && destinationAgency === selectedReport.assignedAgency && destinationRegion.trim() === selectedReport.assignedRegion && !selectedReport.forwardedAt ? 'var(--primary-700)' : 'var(--slate-300)', color: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: isSavingRouting ? 'wait' : 'pointer' }}>
                              <Send size={14} /> {isSavingRouting ? 'Memproses...' : 'Teruskan ke instansi'}
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {selectedReport.status === 'Diproses' && selectedReport.forwardedAt && (
                    <section aria-label="Konfirmasi penyelesaian laporan" style={{ padding: '13px', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '0 0 6px', color: 'var(--success-text)', fontSize: '0.8125rem', fontWeight: 800 }}><CheckCircle2 size={15} /> Konfirmasi penanganan</h3>
                      <p style={{ margin: '0 0 10px', color: 'var(--slate-600)', fontSize: '0.7rem', lineHeight: 1.5 }}>Periksa bukti foto dan catatan dari petugas sebelum menutup laporan.</p>
                      {selectedReport.completionEvidence.length > 0 ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginBottom: 9 }}>
                            {selectedReport.completionEvidence.map((image, index) => (
                              <a key={`${image.slice(0, 24)}-${index}`} href={image} target="_blank" rel="noreferrer" aria-label={`Lihat bukti penyelesaian ${index + 1}`} style={{ position: 'relative', display: 'block', aspectRatio: '4 / 3', overflow: 'hidden', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)' }}>
                                <Image src={image} alt={`Bukti penyelesaian ${index + 1}`} fill unoptimized sizes="100px" style={{ objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                          <p style={{ margin: '0 0 6px', color: 'var(--slate-700)', fontSize: '.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selectedReport.completionNotes || 'Petugas tidak menambahkan catatan.'}</p>
                          <p style={{ margin: '0 0 10px', color: 'var(--slate-500)', fontSize: '.67rem' }}>{selectedReport.completionSubmittedBy ? `Petugas: ${selectedReport.completionSubmittedBy} · ` : ''}{selectedReport.completionSubmittedAt ? `Dikirim ${new Date(selectedReport.completionSubmittedAt).toLocaleString('id-ID')}` : 'Bukti penyelesaian diterima'}</p>
                        </>
                      ) : <p style={{ margin: '0 0 10px', color: 'var(--warning-text)', fontSize: '.75rem' }}>Menunggu foto dan catatan penyelesaian dari petugas.</p>}
                      {decisionError && <p role="alert" style={{ margin: '0 0 9px', color: 'var(--danger-text)', fontSize: '0.75rem' }}>{decisionError}</p>}
                      <button type="button" onClick={() => void decideReport('complete')} disabled={isSavingDecision || selectedReport.completionEvidence.length === 0} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', width: '100%', padding: '9px 11px', border: 0, borderRadius: 'var(--radius-sm)', background: selectedReport.completionEvidence.length > 0 ? 'var(--success-solid)' : 'var(--slate-300)', color: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>
                        <CheckCircle2 size={15} /> {isSavingDecision ? 'Menyimpan...' : 'Setujui bukti dan tutup laporan'}
                      </button>
                    </section>
                  )}

                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '0 0 10px', color: 'var(--slate-800)', fontSize: '0.8125rem', fontWeight: 800 }}><Clock3 size={16} color="var(--primary-700)" /> Perkembangan laporan</h3>
                    {isLoadingHistory ? <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.75rem' }}>Memuat perkembangan...</p> : historyError ? <p role="alert" style={{ margin: 0, color: 'var(--danger-text)', fontSize: '0.75rem' }}>{historyError}</p> : progressEntries.length === 0 ? <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.75rem' }}>Belum ada perkembangan laporan.</p> : (
                      <ol style={{ display: 'grid', gap: '11px', margin: 0, padding: '0 0 0 17px', color: 'var(--slate-300)' }}>
                        {progressEntries.map((entry) => (
                          <li key={entry.id} style={{ paddingLeft: '2px', color: 'var(--slate-800)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{entry.title}</div>
                            <div style={{ marginTop: '3px', color: 'var(--slate-600)', fontSize: '0.7rem', lineHeight: 1.45 }}>{entry.details}</div>
                            <time style={{ display: 'block', marginTop: '3px', color: 'var(--slate-400)', fontSize: '0.65rem' }}>{new Date(entry.occurredAt).toLocaleString('id-ID')}</time>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}

        {deletingUser && (
          <div
            role="presentation"
            onClick={() => !isDeletingUser && setDeletingUser(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 220,
              display: 'grid',
              placeItems: 'center',
              padding: '18px',
              background: 'rgba(15, 23, 42, 0.62)',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-admin-user-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(460px, 100%)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                background: 'white',
                boxShadow: 'var(--shadow-xl)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#fee2e2',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#b91c1c',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 id="delete-admin-user-title" style={{ margin: 0, color: 'var(--slate-900)', fontSize: '1.05rem', fontWeight: 800 }}>
                    Hapus Akun Admin Instansi
                  </h3>
                  <p style={{ margin: '3px 0 0', color: 'var(--slate-500)', fontSize: '.78rem' }}>
                    Tindakan ini tidak dapat dibatalkan
                  </p>
                </div>
              </div>

              <p style={{ margin: '0 0 14px', color: 'var(--slate-700)', fontSize: '.84rem', lineHeight: 1.55 }}>
                Apakah Anda yakin ingin menghapus akun <strong>{deletingUser.name}</strong> ({deletingUser.email})
                {deletingUser.agencyName ? <> yang terdaftar untuk instansi <strong>{deletingUser.agencyName}</strong></> : null}?
              </p>

              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', marginBottom: '18px', fontSize: '.76rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                ⚠️ <strong>Catatan:</strong> Akun, sesi login, dan token undangan admin ini akan dihapus permanen dari sistem. Riwayat laporan instansi yang pernah ditangani tetap tersimpan dengan aman.
              </div>

              {deleteError && (
                <p role="alert" style={{ margin: '0 0 14px', padding: '8px 10px', background: '#fee2e2', borderRadius: 'var(--radius-sm)', color: '#b91c1c', fontSize: '.78rem', fontWeight: 600 }}>
                  {deleteError}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeletingUser}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'white',
                    color: 'var(--slate-700)',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAgencyUser()}
                  disabled={isDeletingUser}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: '#dc2626',
                    color: 'white',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    cursor: isDeletingUser ? 'wait' : 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  {isDeletingUser ? 'Menghapus...' : 'Ya, Hapus Akun'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}