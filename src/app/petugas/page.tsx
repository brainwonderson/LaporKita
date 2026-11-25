'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  History,
  Info,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ReportObstacle } from '@/types';

type StaffReport = {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  assignedAgency: string;
  assignedStaffId: string | null;
  dueAt: string | null;
  status: 'Diproses' | 'Selesai';
  workStatus: 'Belum Dimulai' | 'Sedang Dikerjakan' | 'Menunggu Tindak Lanjut' | 'Terkendala' | 'Bukti Diajukan' | 'Selesai';
  location: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  urgency: string;
  description: string;
  images: string[];
  completionEvidence: string[];
  completionNotes: string | null;
  completionSubmittedAt: string | null;
  obstacles?: ReportObstacle[];
  staffCoordinates?: { lat?: number; lng?: number; accuracy?: number; displayAddress?: string } | null;
  staffLocationUpdatedAt?: string | null;
};

const workStatusOptions: Record<StaffReport['workStatus'], StaffReport['workStatus'][]> = {
  'Belum Dimulai': ['Belum Dimulai', 'Sedang Dikerjakan', 'Terkendala'],
  'Sedang Dikerjakan': ['Sedang Dikerjakan', 'Menunggu Tindak Lanjut', 'Terkendala'],
  'Menunggu Tindak Lanjut': ['Menunggu Tindak Lanjut', 'Sedang Dikerjakan', 'Terkendala'],
  Terkendala: ['Terkendala', 'Sedang Dikerjakan'],
  'Bukti Diajukan': ['Bukti Diajukan'],
  Selesai: ['Selesai'],
};

const OBSTACLE_PRESET_CATEGORIES = [
  'Akses Lokasi Terhalang (Jalan ditutup, portal, medan berat)',
  'Cuaca Buruk / Faktor Alam (Hujan lebat, banjir, tanah longsor)',
  'Kekurangan Peralatan / Material Khusus',
  'Perizinan / Penolakan Warga / Pihak Terkait',
  'Bahaya Keamanan & Teknis Lapangan',
  'Lainnya',
];

function formatTimeRemaining(milliseconds: number): string {
  const totalMinutes = Math.ceil(Math.abs(milliseconds) / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days} hari` : '',
    hours > 0 ? `${hours} jam` : '',
    minutes > 0 ? `${minutes} menit` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : 'kurang dari 1 menit';
}

function getDeadlineStatus(dueAt: string | null, currentTime: number, isCompleted: boolean) {
  if (isCompleted) {
    return { text: 'Penanganan selesai', color: 'var(--success-text)' };
  }
  if (!dueAt) {
    return { text: 'Belum tersedia', color: 'var(--slate-500)' };
  }
  if (currentTime === 0) {
    return { text: 'Menghitung sisa waktu...', color: 'var(--slate-600)' };
  }

  const remaining = new Date(dueAt).getTime() - currentTime;
  if (!Number.isFinite(remaining)) {
    return { text: 'Tidak dapat dihitung', color: 'var(--danger-text)' };
  }
  if (remaining < 0) {
    return { text: `Terlambat ${formatTimeRemaining(remaining)}`, color: 'var(--danger-text)' };
  }
  if (remaining <= 24 * 60 * 60 * 1000) {
    return { text: formatTimeRemaining(remaining), color: 'var(--warning-text)' };
  }
  return { text: formatTimeRemaining(remaining), color: 'var(--success-text)' };
}

type StaffNotification = {
  id: string;
  reportId: string | null;
  kind: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type TaskMessage = {
  id: string;
  reportId: string;
  authorId: string | null;
  authorName: string;
  authorRole: 'Petugas' | 'Admin Instansi';
  message: string;
  createdAt: string;
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function readImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    throw new Error('Pilih foto JPG, PNG, atau WebP dengan ukuran maksimal 3 MB.');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Foto tidak dapat dibaca.')));
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
}

export default function StaffReportsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, { notes: string; evidence: string[] }>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [taskFilter, setTaskFilter] = useState<'Semua' | 'Aktif' | 'Terkendala' | 'Selesai'>('Semua');
  const [expandedReportId, setExpandedReportId] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [taskMessagesReportId, setTaskMessagesReportId] = useState('');
  const [taskMessageDraft, setTaskMessageDraft] = useState('');
  const [taskMessageError, setTaskMessageError] = useState('');
  const [isSendingTaskMessage, setIsSendingTaskMessage] = useState(false);

  // Obstacle Reporting Modal state
  const [reportingObstacleReport, setReportingObstacleReport] = useState<StaffReport | null>(null);
  const [obstacleCategory, setObstacleCategory] = useState(OBSTACLE_PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [obstacleReason, setObstacleReason] = useState('');
  const [obstaclePhotos, setObstaclePhotos] = useState<string[]>([]);
  const [isSubmittingObstacle, setIsSubmittingObstacle] = useState(false);
  const [obstacleError, setObstacleError] = useState('');

  // Obstacle Resolution Modal state
  const [resolvingObstacleReport, setResolvingObstacleReport] = useState<StaffReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolvingObstacle, setIsResolvingObstacle] = useState(false);
  const [resolutionError, setResolutionError] = useState('');

  // Location Update state
  const [locatingReportId, setLocatingReportId] = useState('');
  const [locationModalReport, setLocationModalReport] = useState<StaffReport | null>(null);
  const [detectedCoordinates, setDetectedCoordinates] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    displayAddress?: string;
  } | null>(null);
  const [locationNote, setLocationNote] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);

  const loadReports = useCallback(async () => {
    const response = await fetch('/api/staff/reports', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/petugas/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat laporan tugas.');
    const nextReports = Array.isArray(result.reports) ? (result.reports as StaffReport[]) : [];
    setReports(nextReports);
    setDrafts((current) =>
      Object.fromEntries(
        nextReports.map((report) => [
          report.id,
          current[report.id] ?? {
            notes: report.completionNotes ?? '',
            evidence: report.completionEvidence,
          },
        ]),
      ),
    );
  }, [router]);

  const loadNotifications = useCallback(async () => {
    const response = await fetch('/api/staff/notifications', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/petugas/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat notifikasi.');
    setNotifications(Array.isArray(result.notifications) ? (result.notifications as StaffNotification[]) : []);
    setUnreadNotificationCount(Number(result.unreadCount ?? 0));
  }, [router]);

  const loadTaskMessages = useCallback(async (reportId: string) => {
    const response = await fetch(`/api/task-messages?reportId=${encodeURIComponent(reportId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/petugas/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat percakapan tugas.');
    setTaskMessages(Array.isArray(result.messages) ? result.messages as TaskMessage[] : []);
    setTaskMessagesReportId(reportId);
    setTaskMessageError('');
  }, [router]);

  useEffect(() => {
    if (!expandedReportId) return;
    const reportId = expandedReportId;
    const timeout = window.setTimeout(() => {
      void loadTaskMessages(reportId)
        .catch((loadError: unknown) => setTaskMessageError(loadError instanceof Error ? loadError.message : 'Gagal memuat percakapan tugas.'));
    }, 0);
    const interval = window.setInterval(() => {
      void loadTaskMessages(reportId)
        .catch((loadError: unknown) => setTaskMessageError(loadError instanceof Error ? loadError.message : 'Gagal memuat percakapan tugas.'));
    }, 15_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [expandedReportId, loadTaskMessages]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      Promise.all([loadReports(), loadNotifications()])
        .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Gagal memuat laporan tugas.'))
        .finally(() => setIsLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadNotifications, loadReports]);

  useEffect(() => {
    const refreshTime = () => setCurrentTime(Date.now());
    const refreshData = () => {
      setCurrentTime(Date.now());
      void loadNotifications().catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat notifikasi.'),
      );
      void loadReports().catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat laporan tugas.'),
      );
    };
    const timeout = window.setTimeout(refreshTime, 0);
    const interval = window.setInterval(refreshData, 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadNotifications, loadReports]);

  const markNotificationsRead = async () => {
    if (unreadNotificationCount === 0) return;
    setError('');
    try {
      const response = await fetch('/api/staff/notifications', { method: 'PATCH' });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui status notifikasi.');
      await loadNotifications();
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Gagal memperbarui status notifikasi.');
    }
  };

  const updateWorkStatus = async (report: StaffReport, workStatus: StaffReport['workStatus']) => {
    if (workStatus === report.workStatus) return;
    if (workStatus === 'Terkendala') {
      openObstacleModal(report);
      return;
    }

    setSavingId(report.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/staff/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, workStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui status pekerjaan.');
      setReports((current) => current.map((item) => (item.id === report.id ? { ...item, workStatus } : item)));
      setNotice('Status pekerjaan berhasil diperbarui.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Gagal memperbarui status pekerjaan.');
    } finally {
      setSavingId('');
    }
  };

  const addPhotos = async (reportId: string, event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    try {
      const current = drafts[reportId]?.evidence ?? [];
      if (current.length + files.length > 4) throw new Error('Maksimal 4 foto bukti per laporan.');
      const photos = await Promise.all(files.map(readImage));
      setDrafts((value) => ({ ...value, [reportId]: { ...value[reportId], evidence: [...current, ...photos] } }));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Foto tidak dapat diproses.');
    }
  };

  const submitEvidence = async (report: StaffReport) => {
    const draft = drafts[report.id];
    if (!draft) return;
    setSavingId(report.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/staff/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, notes: draft.notes, evidence: draft.evidence }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim bukti penyelesaian.');
      setNotice(result.message || 'Bukti penyelesaian berhasil dikirim kepada Admin Instansi.');
      await loadReports();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal mengirim bukti penyelesaian.');
    } finally {
      setSavingId('');
    }
  };

  const submitTaskMessage = async (event: FormEvent<HTMLFormElement>, reportId: string) => {
    event.preventDefault();
    const message = taskMessageDraft.trim();
    if (!message || isSendingTaskMessage) return;

    setIsSendingTaskMessage(true);
    setTaskMessageError('');
    try {
      const response = await fetch('/api/task-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim pesan.');
      setTaskMessageDraft('');
      await loadTaskMessages(reportId);
    } catch (sendError) {
      setTaskMessageError(sendError instanceof Error ? sendError.message : 'Gagal mengirim pesan.');
    } finally {
      setIsSendingTaskMessage(false);
    }
  };

  // Obstacle Handlers
  const openObstacleModal = (report: StaffReport) => {
    setReportingObstacleReport(report);
    setObstacleCategory(OBSTACLE_PRESET_CATEGORIES[0]);
    setCustomCategory('');
    setObstacleReason('');
    setObstaclePhotos([]);
    setObstacleError('');
  };

  const closeObstacleModal = () => {
    if (isSubmittingObstacle) return;
    setReportingObstacleReport(null);
    setObstacleError('');
  };

  const addObstaclePhotosHandler = async (event: ChangeEvent<HTMLInputElement>) => {
    setObstacleError('');
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    try {
      if (obstaclePhotos.length + files.length > 3) throw new Error('Maksimal 3 foto bukti kendala.');
      const photos = await Promise.all(files.map(readImage));
      setObstaclePhotos((current) => [...current, ...photos]);
    } catch (photoError) {
      setObstacleError(photoError instanceof Error ? photoError.message : 'Foto kendala tidak dapat diproses.');
    }
  };

  const removeObstaclePhotoHandler = (index: number) => {
    setObstaclePhotos((current) => current.filter((_, i) => i !== index));
  };

  const submitObstacleHandler = async () => {
    if (!reportingObstacleReport) return;
    const finalCategory =
      obstacleCategory === 'Lainnya' ? customCategory.trim() : obstacleCategory.trim();

    if (!finalCategory || finalCategory.length < 3) {
      setObstacleError('Tentukan kategori kendala yang valid (minimal 3 karakter).');
      return;
    }

    if (obstacleReason.trim().length < 10) {
      setObstacleError('Alasan dan deskripsi kendala wajib diisi minimal 10 karakter.');
      return;
    }

    setIsSubmittingObstacle(true);
    setObstacleError('');
    setError('');

    try {
      const response = await fetch('/api/staff/reports/obstacles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: reportingObstacleReport.id,
          category: finalCategory,
          reason: obstacleReason.trim(),
          photos: obstaclePhotos,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal melaporkan kendala penanganan.');

      setNotice(result.message || 'Kendala penanganan berhasil dilaporkan kepada instansi.');
      closeObstacleModal();
      await loadReports();
    } catch (err) {
      setObstacleError(err instanceof Error ? err.message : 'Gagal mengirim laporan kendala.');
    } finally {
      setIsSubmittingObstacle(false);
    }
  };

  const openResolveModal = (report: StaffReport) => {
    setResolvingObstacleReport(report);
    setResolutionNotes('');
    setResolutionError('');
  };

  const closeResolveModal = () => {
    if (isResolvingObstacle) return;
    setResolvingObstacleReport(null);
    setResolutionError('');
  };

  const submitResolveObstacleHandler = async () => {
    if (!resolvingObstacleReport) return;
    setIsResolvingObstacle(true);
    setResolutionError('');
    setError('');

    try {
      const response = await fetch('/api/staff/reports/obstacles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: resolvingObstacleReport.id,
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyelesaikan kendala.');

      setNotice(result.message || 'Kendala berhasil diselesaikan dan pekerjaan dilanjutkan.');
      closeResolveModal();
      await loadReports();
    } catch (err) {
      setResolutionError(err instanceof Error ? err.message : 'Gagal memperbarui kendala.');
    } finally {
      setIsResolvingObstacle(false);
    }
  };

  // Location Handlers (Geolocation)
  const handleRequestLocation = (report: StaffReport) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Browser Anda tidak mendukung fitur Geolocation / GPS.');
      return;
    }

    setLocatingReportId(report.id);
    setError('');
    setLocationError('');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        let reverseAddress = '';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            {
              headers: { 'Accept-Language': 'id, en' },
              signal: controller.signal,
            },
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address || {};
              const road = addr.road || addr.pedestrian || addr.street || '';
              const village = addr.village || addr.suburb || addr.neighbourhood || '';
              const city = addr.city || addr.town || addr.county || addr.state || '';
              if (road && city) {
                reverseAddress = `${road}${village ? ', ' + village : ''}${city ? ', ' + city : ''}`;
              } else {
                reverseAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
              }
            }
          }
        } catch {
          reverseAddress = `Koordinat GPS (${lat}, ${lng})`;
        }

        setDetectedCoordinates({
          lat,
          lng,
          accuracy,
          displayAddress: reverseAddress || undefined,
        });
        setLocationModalReport(report);
        setLocationNote('');
        setLocatingReportId('');
      },
      (err) => {
        setLocatingReportId('');
        let message = 'Gagal mengambil koordinat lokasi perangkat.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message =
              'Izin lokasi tidak diberikan oleh browser. Harap izinkan akses lokasi pada browser perangkat Anda untuk mengirimkan lokasi penanganan.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi GPS perangkat tidak tersedia atau sinyal lemah.';
            break;
          case err.TIMEOUT:
            message = 'Permintaan lokasi GPS memakan waktu terlalu lama. Pastikan GPS aktif dan coba lagi.';
            break;
          default:
            message = 'Terjadi kesalahan saat mendeteksi lokasi GPS.';
        }
        setError(message);
      },
      options,
    );
  };

  const closeLocationModal = () => {
    if (isSubmittingLocation) return;
    setLocationModalReport(null);
    setDetectedCoordinates(null);
    setLocationError('');
  };

  const submitLocationUpdateHandler = async () => {
    if (!locationModalReport || !detectedCoordinates) return;
    setIsSubmittingLocation(true);
    setLocationError('');
    setError('');

    try {
      const response = await fetch('/api/staff/reports/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: locationModalReport.id,
          coordinates: detectedCoordinates,
          note: locationNote.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/petugas/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui lokasi penanganan.');

      setNotice(result.message || 'Lokasi penanganan petugas berhasil dikirim ke sistem.');
      closeLocationModal();
      await loadReports();
    } catch (submitErr) {
      setLocationError(submitErr instanceof Error ? submitErr.message : 'Gagal mengirim lokasi.');
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === 'Diproses' && report.workStatus !== 'Terkendala'),
    [reports],
  );
  const hinderedReports = useMemo(
    () => reports.filter((report) => report.workStatus === 'Terkendala'),
    [reports],
  );
  const completedReports = useMemo(() => reports.filter((report) => report.status === 'Selesai'), [reports]);

  const visibleReports = useMemo(() => {
    if (taskFilter === 'Aktif') return activeReports;
    if (taskFilter === 'Terkendala') return hinderedReports;
    if (taskFilter === 'Selesai') return completedReports;
    return reports;
  }, [activeReports, hinderedReports, completedReports, reports, taskFilter]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError('');
    try {
      const response = await fetch('/api/staff/logout', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Gagal mengakhiri sesi Petugas.');
      logout();
      router.replace('/petugas/login');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Gagal mengakhiri sesi Petugas.');
      setIsLoggingOut(false);
    }
  };

  if (user && user.role !== 'Petugas') {
    return (
      <main style={{ maxWidth: 720, margin: '48px auto', padding: '48px 24px', color: 'var(--slate-700)', textAlign: 'center' }}>
        Halaman ini hanya tersedia untuk akun Petugas.{' '}
        <Link href="/petugas/login" style={{ color: 'var(--primary-700)', fontWeight: 700 }}>
          Masuk sebagai Petugas
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 56px', color: 'var(--slate-900)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClipboardList size={24} color="var(--primary-700)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Dashboard Petugas</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--slate-600)', fontSize: '.875rem' }}>{user?.name ?? 'Petugas'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 11px',
            border: '1px solid var(--slate-300)',
            borderRadius: 'var(--radius-sm)',
            background: 'white',
            color: 'var(--slate-700)',
            fontSize: '.76rem',
            fontWeight: 700,
            cursor: isLoggingOut ? 'wait' : 'pointer',
          }}
        >
          <LogOut size={15} /> {isLoggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </header>

      {error && <p role="alert" style={{ padding: 12, border: '1px solid var(--danger-border)', color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>{error}</p>}
      {notice && <p role="status" style={{ padding: 12, border: '1px solid var(--success-border)', color: 'var(--success-text)', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)' }}>{notice}</p>}

      {/* Notifikasi Penugasan */}
      <section aria-label="Notifikasi penugasan" style={{ marginBottom: 20, padding: 16, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: notifications.length ? 10 : 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--slate-800)', fontSize: '.9rem', fontWeight: 800 }}>
            <Bell size={17} color="var(--primary-700)" /> Notifikasi penugasan
            {unreadNotificationCount > 0 && <span style={{ padding: '2px 7px', borderRadius: 999, background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.68rem' }}>{unreadNotificationCount} baru</span>}
          </h2>
          {unreadNotificationCount > 0 && (
            <button type="button" onClick={() => void markNotificationsRead()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>
              <CheckCheck size={14} /> Tandai dibaca
            </button>
          )}
        </header>
        {notifications.length === 0 ? (
          <p style={{ margin: '8px 0 0', color: 'var(--slate-500)', fontSize: '.78rem' }}>Belum ada notifikasi penugasan.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {notifications.map((notification) => (
              <article key={notification.id} style={{ padding: '10px 12px', border: `1px solid ${notification.readAt ? 'var(--slate-200)' : 'var(--primary-200)'}`, borderRadius: 'var(--radius-sm)', background: notification.readAt ? 'white' : 'var(--primary-50)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ color: 'var(--slate-800)', fontSize: '.78rem' }}>{notification.title}</strong>
                  <time dateTime={notification.createdAt} style={{ flexShrink: 0, color: 'var(--slate-500)', fontSize: '.68rem' }}>{new Date(notification.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--slate-600)', fontSize: '.75rem' }}>{notification.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Ringkasan Tugas */}
      <section aria-label="Ringkasan tugas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Semua tugas', count: reports.length, color: 'var(--primary-700)' },
          { label: 'Sedang dikerjakan', count: activeReports.length, color: 'var(--warning-text)' },
          { label: 'Terkendala', count: hinderedReports.length, color: '#d97706' },
          { label: 'Telah diselesaikan', count: completedReports.length, color: 'var(--success-text)' },
        ].map((item) => (
          <article key={item.label} style={{ padding: '14px 16px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white' }}>
            <div style={{ color: 'var(--slate-500)', fontSize: '.74rem', fontWeight: 700 }}>{item.label}</div>
            <div style={{ marginTop: 4, color: item.color, fontSize: '1.45rem', fontWeight: 800 }}>{isLoading ? '—' : item.count}</div>
          </article>
        ))}
      </section>

      {/* Daftar Tugas Petugas */}
      <section aria-label="Daftar tugas Petugas" style={{ overflow: 'hidden', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 16, borderBottom: '1px solid var(--slate-200)' }}>
          <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '.95rem', fontWeight: 800 }}>Daftar tugas</h2>
          <div role="group" aria-label="Filter tugas" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              ['Semua', `Semua (${reports.length})`],
              ['Aktif', `Sedang dikerjakan (${activeReports.length})`],
              ['Terkendala', `Terkendala (${hinderedReports.length})`],
              ['Selesai', `Selesai (${completedReports.length})`],
            ] as const).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTaskFilter(filter)}
                aria-pressed={taskFilter === filter}
                style={{
                  padding: '7px 9px',
                  border: `1px solid ${taskFilter === filter ? 'var(--primary-700)' : 'var(--slate-300)'}`,
                  borderRadius: 'var(--radius-sm)',
                  background: taskFilter === filter ? 'var(--primary-50)' : 'white',
                  color: taskFilter === filter ? 'var(--primary-700)' : 'var(--slate-600)',
                  fontSize: '.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <p style={{ padding: 20, color: 'var(--slate-600)' }}>Memuat laporan tugas...</p>
        ) : visibleReports.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--slate-600)', textAlign: 'center', fontSize: '.82rem' }}>
            {reports.length === 0
              ? 'Belum ada tugas yang ditetapkan kepada Anda.'
              : taskFilter === 'Aktif'
              ? 'Tidak ada tugas yang sedang aktif dikerjakan.'
              : taskFilter === 'Terkendala'
              ? 'Tidak ada tugas yang sedang mengalami kendala.'
              : taskFilter === 'Selesai'
              ? 'Belum ada tugas yang diselesaikan.'
              : 'Tidak ada tugas.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 14, padding: 16 }}>
            {visibleReports.map((report) => {
              const draft = drafts[report.id] ?? { notes: '', evidence: [] };
              const isCompleted = report.status === 'Selesai';
              const isHindered = report.workStatus === 'Terkendala';
              const isExpanded = expandedReportId === report.id;
              const deadlineStatus = getDeadlineStatus(report.dueAt, currentTime, isCompleted);
              const deadlineDate = report.dueAt ? new Date(report.dueAt) : null;
              const coordinates = report.coordinates;
              const reportLatitude = coordinates?.lat;
              const reportLongitude = coordinates?.lng;
              const staffLatitude = report.staffCoordinates?.lat;
              const staffLongitude = report.staffCoordinates?.lng;
              const hasCoordinates =
                typeof reportLatitude === 'number' &&
                Number.isFinite(reportLatitude) &&
                typeof reportLongitude === 'number' &&
                Number.isFinite(reportLongitude);
              const mapUrl = hasCoordinates
                ? `https://www.google.com/maps?q=${reportLatitude},${reportLongitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location)}`;

              const activeObstacle = report.obstacles?.find((o) => o.status === 'Menunggu Solusi');
              const resolvedObstacles = report.obstacles?.filter((o) => o.status === 'Terselesaikan') ?? [];

              const hasStaffLocation =
                typeof staffLatitude === 'number' &&
                Number.isFinite(staffLatitude) &&
                typeof staffLongitude === 'number' &&
                Number.isFinite(staffLongitude);
              const staffMapUrl = hasStaffLocation
                ? `https://www.google.com/maps?q=${staffLatitude},${staffLongitude}`
                : '';

              const distanceFromReport =
                typeof reportLatitude === 'number' &&
                typeof reportLongitude === 'number' &&
                typeof staffLatitude === 'number' &&
                typeof staffLongitude === 'number'
                  ? calculateDistanceMeters(
                      reportLatitude,
                      reportLongitude,
                      staffLatitude,
                      staffLongitude,
                    )
                  : null;

              return (
                <article
                  key={report.id}
                  style={{
                    padding: 18,
                    border: `1px solid ${isHindered ? '#fcd34d' : 'var(--slate-200)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: isHindered ? '#fffdf7' : 'white',
                    boxShadow: isHindered ? '0 1px 3px rgba(217, 119, 6, 0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'var(--primary-700)', fontSize: '.72rem', fontWeight: 800 }}>
                        {report.ticketNumber} · {report.category}
                      </div>
                      <h2 style={{ margin: '5px 0', fontSize: '1rem' }}>{report.title}</h2>
                      <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.8rem' }}>
                        {report.location} · {report.assignedAgency}
                      </p>
                      <p style={{ margin: '6px 0 0', color: deadlineStatus.color, fontSize: '.75rem', fontWeight: 700 }}>
                        Tenggat:{' '}
                        {deadlineDate && Number.isFinite(deadlineDate.getTime()) ? (
                          <time dateTime={deadlineDate.toISOString()}>
                            {deadlineDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </time>
                        ) : (
                          report.dueAt ? 'Tidak valid' : 'Belum ditentukan'
                        )}
                        <span style={{ display: 'block', marginTop: 2 }}>
                          Sisa waktu: {deadlineStatus.text}
                        </span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        alignSelf: 'flex-start',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: isCompleted
                          ? 'var(--success-bg)'
                          : isHindered
                          ? '#fef3c7'
                          : report.workStatus === 'Bukti Diajukan'
                          ? 'var(--primary-100)'
                          : 'var(--warning-bg)',
                        color: isCompleted
                          ? 'var(--success-text)'
                          : isHindered
                          ? '#b45309'
                          : report.workStatus === 'Bukti Diajukan'
                          ? 'var(--primary-700)'
                          : 'var(--warning-text)',
                        fontSize: '.72rem',
                        fontWeight: 800,
                        border: isHindered ? '1px solid #fde68a' : 'none',
                      }}
                    >
                      {isHindered ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      {isCompleted
                        ? 'Selesai'
                        : isHindered
                        ? 'Terkendala'
                        : report.workStatus === 'Bukti Diajukan'
                        ? 'Bukti diajukan · menunggu pemeriksaan'
                        : report.workStatus}
                    </span>
                  </div>

                  {/* LOKASI PENANGANAN TERKINI PETUGAS (Jika sudah dikirim) */}
                  {hasStaffLocation && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 800, fontSize: '.78rem' }}>
                          <Navigation size={14} color="#16a34a" />
                          <span>Lokasi Penanganan Terkini Petugas</span>
                          {report.staffCoordinates?.accuracy && (
                            <span style={{ fontSize: '.68rem', padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                              ±{report.staffCoordinates.accuracy}m
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#14532d', fontSize: '.76rem', lineHeight: 1.45 }}>
                          {report.staffCoordinates?.displayAddress || `${report.staffCoordinates?.lat}, ${report.staffCoordinates?.lng}`}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap', fontSize: '.7rem', color: '#15803d' }}>
                          {report.staffLocationUpdatedAt && (
                            <span>
                              Diperbarui: {new Date(report.staffLocationUpdatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                          {distanceFromReport !== null && (
                            <span>
                              Jarak dari titik laporan: <strong>±{distanceFromReport} meter</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <a
                          href={staffMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 9px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #86efac',
                            background: 'white',
                            color: '#166534',
                            fontSize: '.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Peta Lokasi <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* KENDALA AKTIF CARD */}
                  {activeObstacle && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#92400e', fontWeight: 800, fontSize: '.8rem' }}>
                          <AlertTriangle size={17} color="#d97706" />
                          <span>Kendala Aktif: {activeObstacle.category}</span>
                        </div>
                        <time dateTime={activeObstacle.createdAt} style={{ color: '#b45309', fontSize: '.68rem' }}>
                          Dilaporkan: {new Date(activeObstacle.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </time>
                      </div>
                      <p style={{ margin: '8px 0 0', color: '#78350f', fontSize: '.78rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {activeObstacle.reason}
                      </p>
                      {activeObstacle.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          {activeObstacle.photos.map((photo, pIdx) => (
                            <a
                              key={pIdx}
                              href={photo}
                              target="_blank"
                              rel="noreferrer"
                              title="Buka foto kendala ukuran penuh"
                              style={{
                                position: 'relative',
                                width: 72,
                                height: 54,
                                borderRadius: 4,
                                overflow: 'hidden',
                                border: '1px solid #fcd34d',
                                display: 'block',
                              }}
                            >
                              <Image src={photo} alt={`Foto kendala ${pIdx + 1}`} fill unoptimized style={{ objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openResolveModal(report)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            border: '1px solid #b45309',
                            borderRadius: 'var(--radius-sm)',
                            background: '#b45309',
                            color: 'white',
                            fontSize: '.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <CheckCircle2 size={14} /> Selesaikan Kendala & Lanjutkan Pengerjaan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Toolbar: Status Selection, Laporkan Kendala, and Perbarui Lokasi */}
                  {!isCompleted && !report.completionSubmittedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate-700)', fontSize: '.76rem', fontWeight: 700 }}>
                        Status pekerjaan
                        <select
                          value={report.workStatus}
                          disabled={savingId === report.id}
                          onChange={(event) => void updateWorkStatus(report, event.target.value as StaffReport['workStatus'])}
                          style={{
                            padding: '7px 9px',
                            border: '1px solid var(--slate-300)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'white',
                            color: 'var(--slate-800)',
                            font: 'inherit',
                          }}
                        >
                          {workStatusOptions[report.workStatus].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* Tombol Perbarui Lokasi Penanganan */}
                      <button
                        type="button"
                        onClick={() => handleRequestLocation(report)}
                        disabled={locatingReportId === report.id}
                        title="Kirimkan lokasi terkini saat berada di titik penanganan"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 11px',
                          border: '1px solid #0284c7',
                          borderRadius: 'var(--radius-sm)',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          fontSize: '.74rem',
                          fontWeight: 700,
                          cursor: locatingReportId === report.id ? 'wait' : 'pointer',
                        }}
                      >
                        {locatingReportId === report.id ? <LoaderCircle size={14} /> : <Navigation size={14} />}
                        {locatingReportId === report.id
                          ? 'Mencari GPS...'
                          : hasStaffLocation
                          ? 'Perbarui Lokasi GPS'
                          : 'Kirim Lokasi Penanganan'}
                      </button>

                      {/* Tombol Laporkan Kendala */}
                      {report.workStatus !== 'Terkendala' && (
                        <button
                          type="button"
                          onClick={() => openObstacleModal(report)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 11px',
                            border: '1px solid #d97706',
                            borderRadius: 'var(--radius-sm)',
                            background: '#fffbeb',
                            color: '#b45309',
                            fontSize: '.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <AlertTriangle size={14} color="#d97706" /> Laporkan Kendala
                        </button>
                      )}
                    </div>
                  )}

                  {/* Riwayat Kendala yang Pernah Diselesaikan */}
                  {resolvedObstacles.length > 0 && (
                    <details style={{ marginTop: 12, padding: '8px 12px', border: '1px dashed var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <History size={13} /> Riwayat kendala sebelumnya ({resolvedObstacles.length})
                        </span>
                      </summary>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        {resolvedObstacles.map((obs) => (
                          <div key={obs.id} style={{ padding: '8px 10px', borderRadius: 4, background: 'white', border: '1px solid var(--slate-200)', fontSize: '.72rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 700, color: 'var(--slate-800)' }}>
                              <span>{obs.category}</span>
                              <span style={{ color: 'var(--success-text)', fontSize: '.68rem' }}>Terselesaikan</span>
                            </div>
                            <p style={{ margin: '4px 0', color: 'var(--slate-600)' }}>Alasan: {obs.reason}</p>
                            {obs.resolutionNotes && <p style={{ margin: '2px 0 0', color: 'var(--success-text)' }}>Solusi: {obs.resolutionNotes}</p>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`task-details-${report.id}`}
                    onClick={() => {
                      setExpandedReportId(isExpanded ? '' : report.id);
                      setTaskMessagesReportId('');
                      setTaskMessageDraft('');
                      setTaskMessageError('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 12,
                      padding: '7px 9px',
                      border: '1px solid var(--slate-300)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'white',
                      color: 'var(--primary-700)',
                      fontSize: '.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? 'Tutup detail tugas' : 'Lihat detail tugas'}
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {isExpanded && (
                    <section
                      id={`task-details-${report.id}`}
                      aria-label={`Detail tugas ${report.ticketNumber}`}
                      style={{
                        display: 'grid',
                        gap: 14,
                        marginTop: 14,
                        padding: 14,
                        border: '1px solid var(--slate-200)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--slate-50)',
                      }}
                    >
                      <section aria-label="Komunikasi dengan Admin Instansi" style={{ padding: 12, border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'white' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '.82rem', fontWeight: 800 }}>
                          <MessageCircle size={15} color="var(--primary-700)" /> Komunikasi dengan Admin Instansi
                        </h3>
                        <div aria-live="polite" style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
                          {taskMessagesReportId !== report.id && !taskMessageError ? (
                            <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Memuat percakapan...</p>
                          ) : (taskMessagesReportId !== report.id || taskMessages.length === 0) ? (
                            <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Belum ada pesan. Kirim catatan atau minta arahan kepada Admin Instansi.</p>
                          ) : taskMessages.map((message) => {
                            const isOwnMessage = message.authorRole === 'Petugas';
                            return (
                              <article key={message.id} style={{ justifySelf: isOwnMessage ? 'end' : 'start', width: 'min(90%, 460px)', padding: '8px 10px', border: `1px solid ${isOwnMessage ? 'var(--primary-200)' : 'var(--slate-200)'}`, borderRadius: 'var(--radius-sm)', background: isOwnMessage ? 'var(--primary-50)' : 'var(--slate-50)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--slate-600)', fontSize: '.66rem' }}>
                                  <strong>{isOwnMessage ? 'Anda' : message.authorName + ' · Admin Instansi'}</strong>
                                  <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</time>
                                </div>
                                <p style={{ margin: '5px 0 0', color: 'var(--slate-800)', fontSize: '.76rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</p>
                              </article>
                            );
                          })}
                        </div>
                        {taskMessageError && <p role="alert" style={{ margin: '0 0 8px', color: 'var(--danger-text)', fontSize: '.72rem' }}>{taskMessageError}</p>}
                        <form onSubmit={(event) => void submitTaskMessage(event, report.id)} style={{ display: 'grid', gap: 7 }}>
                          <label htmlFor={`task-message-${report.id}`} style={{ color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>Catatan atau permintaan arahan</label>
                          <textarea
                            id={`task-message-${report.id}`}
                            value={taskMessageDraft}
                            onChange={(event) => setTaskMessageDraft(event.target.value)}
                            maxLength={2000}
                            rows={3}
                            placeholder="Tuliskan perkembangan tugas atau arahan yang dibutuhkan..."
                            style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', font: 'inherit', fontSize: '.76rem', resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--slate-500)', fontSize: '.68rem' }}>{taskMessageDraft.length}/2000</span>
                            <button type="submit" disabled={isSendingTaskMessage || !taskMessageDraft.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: isSendingTaskMessage || !taskMessageDraft.trim() ? 'var(--slate-300)' : 'var(--primary-700)', color: 'white', fontSize: '.72rem', fontWeight: 800, cursor: isSendingTaskMessage || !taskMessageDraft.trim() ? 'not-allowed' : 'pointer' }}>
                              <Send size={13} /> {isSendingTaskMessage ? 'Mengirim...' : 'Kirim pesan'}
                            </button>
                          </div>
                        </form>
                      </section>
                      <div>
                        <h3 style={{ margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '.82rem', fontWeight: 800 }}>Deskripsi masalah</h3>
                        <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {report.description}
                        </p>
                      </div>
                      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: 0 }}>
                        <div>
                          <dt style={{ color: 'var(--slate-500)', fontSize: '.7rem' }}>Kategori</dt>
                          <dd style={{ margin: '3px 0 0', color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 700 }}>{report.category}</dd>
                        </div>
                        <div>
                          <dt style={{ color: 'var(--slate-500)', fontSize: '.7rem' }}>Prioritas</dt>
                          <dd
                            style={{
                              margin: '3px 0 0',
                              color:
                                report.urgency === 'Darurat' || report.urgency === 'Tinggi'
                                  ? 'var(--danger-text)'
                                  : report.urgency === 'Sedang'
                                  ? 'var(--warning-text)'
                                  : 'var(--slate-800)',
                              fontSize: '.78rem',
                              fontWeight: 800,
                            }}
                          >
                            {report.urgency}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ color: 'var(--slate-500)', fontSize: '.7rem' }}>Tenggat waktu</dt>
                          <dd
                            style={{
                              margin: '3px 0 0',
                              color: deadlineStatus.color,
                              fontSize: '.78rem',
                              fontWeight: 700,
                            }}
                          >
                            {deadlineDate && Number.isFinite(deadlineDate.getTime())
                              ? deadlineDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                              : report.dueAt ? 'Tidak valid' : 'Belum ditentukan'}
                            <span style={{ display: 'block', marginTop: 3 }}>
                              Sisa waktu: {deadlineStatus.text}
                            </span>
                          </dd>
                        </div>
                      </dl>
                      <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '.82rem', fontWeight: 800 }}>
                          <MapPin size={15} color="var(--primary-700)" /> Lokasi Kejadian (Laporan Warga)
                        </h3>
                        <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '.8rem', lineHeight: 1.5 }}>
                          {report.location}
                          {coordinates?.displayAddress && coordinates.displayAddress !== report.location
                            ? ` · ${coordinates.displayAddress}`
                            : ''}
                        </p>
                        {hasCoordinates && (
                          <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: '.72rem' }}>
                            Koordinat: {reportLatitude}, {reportLongitude}
                          </p>
                        )}
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 7,
                            color: 'var(--primary-700)',
                            fontSize: '.74rem',
                            fontWeight: 800,
                          }}
                        >
                          Buka peta laporan <ExternalLink size={13} />
                        </a>
                      </div>

                      {hasStaffLocation && (
                        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)' }}>
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px', color: '#166534', fontSize: '.78rem', fontWeight: 800 }}>
                            <Navigation size={14} color="#16a34a" /> Lokasi Penanganan Anda di Lapangan
                          </h4>
                          <p style={{ margin: 0, color: '#14532d', fontSize: '.76rem' }}>
                            {report.staffCoordinates?.displayAddress || `${report.staffCoordinates?.lat}, ${report.staffCoordinates?.lng}`}
                          </p>
                          <a
                            href={staffMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, color: '#15803d', fontSize: '.72rem', fontWeight: 700 }}
                          >
                            Buka di Google Maps <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      <div>
                        <h3 style={{ margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '.82rem', fontWeight: 800 }}>
                          Foto laporan ({report.images.length})
                        </h3>
                        {report.images.length ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                            {report.images.map((image, index) => (
                              <a
                                key={`${report.id}-report-image-${index}`}
                                href={image}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Buka foto laporan ${index + 1}`}
                                style={{
                                  position: 'relative',
                                  display: 'block',
                                  aspectRatio: '4 / 3',
                                  overflow: 'hidden',
                                  border: '1px solid var(--slate-200)',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'white',
                                }}
                              >
                                <Image src={image} alt={`Foto laporan ${index + 1}`} fill unoptimized sizes="160px" style={{ objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Tidak ada foto laporan.</p>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Pengajuan Bukti Selesai */}
                  {isCompleted || report.completionSubmittedAt ? (
                    <section aria-label="Bukti tugas selesai" style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                      <h3 style={{ margin: '0 0 8px', color: 'var(--slate-700)', fontSize: '.78rem', fontWeight: 800 }}>
                        {isCompleted ? 'Tugas selesai' : 'Bukti diajukan · menunggu pemeriksaan Admin Instansi'}
                      </h3>
                      <p style={{ margin: '0 0 8px', color: 'var(--slate-700)', fontSize: '.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {report.completionNotes || 'Tidak ada catatan penyelesaian.'}
                      </p>
                      {report.completionEvidence.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                          {report.completionEvidence.map((image, index) => (
                            <a
                              key={`${report.id}-evidence-${index}`}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Buka foto bukti penyelesaian ${index + 1}`}
                              style={{
                                position: 'relative',
                                display: 'block',
                                aspectRatio: '4 / 3',
                                overflow: 'hidden',
                                border: '1px solid var(--slate-200)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              <Image src={image} alt={`Bukti penyelesaian ${index + 1}`} fill unoptimized sizes="120px" style={{ objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Tidak ada foto bukti yang tercatat.</p>
                      )}
                      {report.completionSubmittedAt && (
                        <time dateTime={report.completionSubmittedAt} style={{ display: 'block', marginTop: 8, color: 'var(--slate-500)', fontSize: '.68rem' }}>
                          Bukti dikirim {new Date(report.completionSubmittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </time>
                      )}
                    </section>
                  ) : (
                    <>
                      {report.workStatus === 'Belum Dimulai' && (
                        <p style={{ margin: '14px 0 0', color: 'var(--slate-600)', fontSize: '.76rem' }}>
                          Ubah status ke “Sedang Dikerjakan” sebelum menyiapkan pengajuan penyelesaian.
                        </p>
                      )}
                      {report.workStatus === 'Terkendala' && (
                        <p style={{ margin: '14px 0 0', color: '#b45309', fontSize: '.76rem', fontWeight: 600 }}>
                          Laporan sedang dalam status Terkendala. Selesaikan kendala terlebih dahulu untuk dapat mengirimkan bukti penyelesaian.
                        </p>
                      )}
                      <label style={{ display: 'grid', gap: 6, marginTop: 16, color: 'var(--slate-700)', fontSize: '.8rem', fontWeight: 700 }}>
                        Catatan penyelesaian
                        <textarea
                          value={draft.notes}
                          disabled={report.workStatus === 'Terkendala'}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [report.id]: { ...draft, notes: event.target.value },
                            }))
                          }
                          rows={3}
                          maxLength={1000}
                          placeholder="Jelaskan pekerjaan yang dilakukan dan hasilnya"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: 9,
                            border: '1px solid var(--slate-300)',
                            borderRadius: 'var(--radius-sm)',
                            font: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '8px 10px',
                            border: '1px solid var(--slate-300)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: report.workStatus === 'Terkendala' ? 'not-allowed' : 'pointer',
                            opacity: report.workStatus === 'Terkendala' ? 0.6 : 1,
                            fontSize: '.78rem',
                            fontWeight: 700,
                          }}
                        >
                          <Camera size={15} /> Tambah foto ({draft.evidence.length}/4)
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            disabled={draft.evidence.length >= 4 || report.workStatus === 'Terkendala'}
                            onChange={(event) => void addPhotos(report.id, event)}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void submitEvidence(report)}
                          disabled={
                            savingId === report.id ||
                            !['Sedang Dikerjakan', 'Menunggu Tindak Lanjut'].includes(report.workStatus) ||
                            draft.notes.trim().length < 10 ||
                            draft.evidence.length === 0
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '9px 12px',
                            border: 0,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--primary-700)',
                            color: 'white',
                            font: 'inherit',
                            fontSize: '.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            opacity:
                              savingId === report.id ||
                              !['Sedang Dikerjakan', 'Menunggu Tindak Lanjut'].includes(report.workStatus) ||
                              draft.notes.trim().length < 10 ||
                              draft.evidence.length === 0
                                ? 0.6
                                : 1,
                          }}
                        >
                          {savingId === report.id ? <LoaderCircle size={15} /> : <Send size={15} />} Kirim bukti ke Admin Instansi
                        </button>
                      </div>
                      {draft.evidence.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 12 }}>
                          {draft.evidence.map((image, index) => (
                            <div
                              key={`${image.slice(0, 32)}-${index}`}
                              style={{
                                position: 'relative',
                                aspectRatio: '4 / 3',
                                overflow: 'hidden',
                                border: '1px solid var(--slate-200)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              <Image src={image} alt={`Bukti penyelesaian ${index + 1}`} fill unoptimized sizes="120px" style={{ objectFit: 'cover' }} />
                              <button
                                type="button"
                                aria-label={`Hapus foto ${index + 1}`}
                                onClick={() =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [report.id]: {
                                      ...draft,
                                      evidence: draft.evidence.filter((_, itemIndex) => itemIndex !== index),
                                    },
                                  }))
                                }
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  border: 0,
                                  borderRadius: 3,
                                  background: 'white',
                                  color: 'var(--danger-text)',
                                  cursor: 'pointer',
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL KONFIRMASI PEMBARUAN LOKASI PENANGANAN */}
      {locationModalReport && detectedCoordinates && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: 'white',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--slate-200)',
                background: '#f0fdf4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 6, borderRadius: '50%', background: '#dcfce7' }}>
                  <Navigation size={20} color="#16a34a" />
                </div>
                <div>
                  <h3 id="location-modal-title" style={{ margin: 0, fontSize: '.98rem', fontWeight: 800, color: '#166534' }}>
                    Kirim Lokasi Penanganan
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#15803d' }}>
                    {locationModalReport.ticketNumber} · {locationModalReport.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLocationModal}
                disabled={isSubmittingLocation}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--slate-500)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.74rem', color: 'var(--slate-500)', fontWeight: 700 }}>Koordinat GPS Terdeteksi</span>
                  {detectedCoordinates.accuracy && (
                    <span style={{ fontSize: '.7rem', padding: '2px 7px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                      Akurasi ±{detectedCoordinates.accuracy} meter
                    </span>
                  )}
                </div>
                <p style={{ margin: '6px 0 2px', fontSize: '.84rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  {detectedCoordinates.displayAddress || `${detectedCoordinates.lat}, ${detectedCoordinates.lng}`}
                </p>
                <span style={{ fontSize: '.72rem', color: 'var(--slate-500)' }}>
                  Lat: {detectedCoordinates.lat}, Lng: {detectedCoordinates.lng}
                </span>

                {locationModalReport.coordinates?.lat != null && locationModalReport.coordinates?.lng != null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--slate-200)', fontSize: '.74rem', color: 'var(--slate-600)' }}>
                    Jarak dari lokasi laporan awal: <strong>±{calculateDistanceMeters(
                      locationModalReport.coordinates.lat,
                      locationModalReport.coordinates.lng,
                      detectedCoordinates.lat,
                      detectedCoordinates.lng,
                    )} meter</strong>
                  </div>
                )}
              </div>

              {locationError && (
                <p role="alert" style={{ margin: 0, padding: 10, border: '1px solid var(--danger-border)', color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', fontSize: '.76rem' }}>
                  {locationError}
                </p>
              )}

              <label style={{ display: 'grid', gap: 6, color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 800 }}>
                Catatan Lokasi (Opsional)
                <input
                  type="text"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="Contoh: Sudah tiba di titik pengerjaan / Titik inspeksi 1"
                  maxLength={150}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '.8rem',
                    font: 'inherit',
                  }}
                />
              </label>

              <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.72rem', lineHeight: 1.4 }}>
                Lokasi ini akan dicatat dan dapat dilihat oleh Admin Instansi sebagai bukti kehadiran dan kemajuan penanganan di lapangan.
              </p>
            </div>

            <footer
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid var(--slate-200)',
                background: 'var(--slate-50)',
              }}
            >
              <button
                type="button"
                onClick={closeLocationModal}
                disabled={isSubmittingLocation}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  color: 'var(--slate-700)',
                  fontSize: '.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void submitLocationUpdateHandler()}
                disabled={isSubmittingLocation}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 0,
                  borderRadius: 'var(--radius-sm)',
                  background: '#16a34a',
                  color: 'white',
                  fontSize: '.76rem',
                  fontWeight: 800,
                  cursor: isSubmittingLocation ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingLocation ? 0.6 : 1,
                }}
              >
                {isSubmittingLocation ? <LoaderCircle size={15} /> : <Navigation size={15} />}
                {isSubmittingLocation ? 'Menyimpan...' : 'Kirim Lokasi Sekarang'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL LAPORKAN KENDALA */}
      {reportingObstacleReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="obstacle-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'white',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--slate-200)',
                background: '#fffbeb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 6, borderRadius: '50%', background: '#fef3c7' }}>
                  <AlertTriangle size={20} color="#b45309" />
                </div>
                <div>
                  <h3 id="obstacle-modal-title" style={{ margin: 0, fontSize: '.98rem', fontWeight: 800, color: '#92400e' }}>
                    Laporkan Kendala Penanganan
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#b45309' }}>
                    {reportingObstacleReport.ticketNumber} · {reportingObstacleReport.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeObstacleModal}
                disabled={isSubmittingObstacle}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--slate-500)',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 9,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-50)',
                  border: '1px solid var(--primary-100)',
                  color: 'var(--primary-900)',
                  fontSize: '.76rem',
                  lineHeight: 1.5,
                }}
              >
                <Info size={16} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Laporkan kendala yang menghambat penanganan agar Admin Instansi dapat mengetahui kondisi lapangan dan
                  memberikan koordinasi/bantuan yang diperlukan. Status tugas akan dialihkan ke <strong>Terkendala</strong>.
                </span>
              </div>

              {obstacleError && (
                <p role="alert" style={{ margin: 0, padding: 10, border: '1px solid var(--danger-border)', color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', fontSize: '.76rem' }}>
                  {obstacleError}
                </p>
              )}

              {/* Form Kategori Kendala */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 800 }}>
                  Kategori Kendala <span style={{ color: 'var(--danger-text)' }}>*</span>
                </label>
                <select
                  value={obstacleCategory}
                  onChange={(e) => setObstacleCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '.8rem',
                    font: 'inherit',
                  }}
                >
                  {OBSTACLE_PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {obstacleCategory === 'Lainnya' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Tuliskan kategori kendala spesifik..."
                    maxLength={100}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      marginTop: 8,
                      padding: '8px 10px',
                      border: '1px solid var(--slate-300)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '.8rem',
                      font: 'inherit',
                    }}
                  />
                )}
              </div>

              {/* Form Alasan & Penjelasan Kendala */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 800 }}>
                    Alasan & Penjelasan Kendala <span style={{ color: 'var(--danger-text)' }}>*</span>
                  </label>
                  <span style={{ color: obstacleReason.length < 10 ? 'var(--danger-text)' : 'var(--slate-500)', fontSize: '.7rem' }}>
                    {obstacleReason.length}/1000 karakter (min. 10)
                  </span>
                </div>
                <textarea
                  value={obstacleReason}
                  onChange={(e) => setObstacleReason(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Jelaskan secara terperinci apa yang menghambat proses penanganan di lapangan, dampaknya, serta bantuan apa yang dibutuhkan..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 10,
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '.8rem',
                    font: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Form Foto Bukti Kendala (Opsional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 800 }}>
                    Foto Bukti Kendala <span style={{ color: 'var(--slate-500)', fontWeight: 400 }}>(Opsional, maks. 3)</span>
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 8px',
                      border: '1px solid var(--slate-300)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'white',
                      fontSize: '.72rem',
                      fontWeight: 700,
                      cursor: obstaclePhotos.length >= 3 ? 'not-allowed' : 'pointer',
                      opacity: obstaclePhotos.length >= 3 ? 0.5 : 1,
                    }}
                  >
                    <Camera size={13} /> Tambah Foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={obstaclePhotos.length >= 3}
                      onChange={(e) => void addObstaclePhotosHandler(e)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                {obstaclePhotos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                    {obstaclePhotos.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          position: 'relative',
                          aspectRatio: '4 / 3',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          border: '1px solid var(--slate-200)',
                        }}
                      >
                        <Image src={photo} alt={`Bukti kendala ${pIdx + 1}`} fill unoptimized style={{ objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeObstaclePhotoHandler(pIdx)}
                          aria-label={`Hapus foto ${pIdx + 1}`}
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            border: 0,
                            borderRadius: 3,
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: 'white',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: '2px 5px',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.72rem' }}>
                    Belum ada foto dilampirkan. Lampirkan foto kondisi lapangan jika tersedia.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <footer
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid var(--slate-200)',
                background: 'var(--slate-50)',
              }}
            >
              <button
                type="button"
                onClick={closeObstacleModal}
                disabled={isSubmittingObstacle}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  color: 'var(--slate-700)',
                  fontSize: '.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void submitObstacleHandler()}
                disabled={isSubmittingObstacle || obstacleReason.trim().length < 10}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 0,
                  borderRadius: 'var(--radius-sm)',
                  background: '#d97706',
                  color: 'white',
                  fontSize: '.76rem',
                  fontWeight: 800,
                  cursor: isSubmittingObstacle || obstacleReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingObstacle || obstacleReason.trim().length < 10 ? 0.6 : 1,
                }}
              >
                {isSubmittingObstacle ? <LoaderCircle size={15} /> : <AlertTriangle size={15} />}
                {isSubmittingObstacle ? 'Mengirim...' : 'Kirim Laporan Kendala'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL SELESAIKAN KENDALA */}
      {resolvingObstacleReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'white',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--slate-200)',
                background: 'var(--success-bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--success-text)" />
                <h3 id="resolve-modal-title" style={{ margin: 0, fontSize: '.95rem', fontWeight: 800, color: 'var(--success-text)' }}>
                  Selesaikan Kendala Penanganan
                </h3>
              </div>
              <button
                type="button"
                onClick={closeResolveModal}
                disabled={isResolvingObstacle}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--slate-500)' }}
              >
                <X size={18} />
              </button>
            </header>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '.78rem', lineHeight: 1.5 }}>
                Tandai bahwa kendala pada laporan <strong>{resolvingObstacleReport.ticketNumber}</strong> telah teratasi. Status pekerjaan akan dikembalikan ke <strong>Sedang Dikerjakan</strong>.
              </p>

              {resolutionError && (
                <p role="alert" style={{ margin: 0, padding: 10, border: '1px solid var(--danger-border)', color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', fontSize: '.76rem' }}>
                  {resolutionError}
                </p>
              )}

              <label style={{ display: 'grid', gap: 6, color: 'var(--slate-800)', fontSize: '.78rem', fontWeight: 800 }}>
                Catatan Penyelesaian Kendala (Opsional)
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: Akses jalan telah dibuka kembali / material pengganti telah tiba di lokasi..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 9,
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '.8rem',
                    font: 'inherit',
                  }}
                />
              </label>
            </div>

            <footer
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid var(--slate-200)',
                background: 'var(--slate-50)',
              }}
            >
              <button
                type="button"
                onClick={closeResolveModal}
                disabled={isResolvingObstacle}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  color: 'var(--slate-700)',
                  fontSize: '.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void submitResolveObstacleHandler()}
                disabled={isResolvingObstacle}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 0,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--success-text)',
                  color: 'white',
                  fontSize: '.76rem',
                  fontWeight: 800,
                  cursor: isResolvingObstacle ? 'not-allowed' : 'pointer',
                }}
              >
                {isResolvingObstacle ? <LoaderCircle size={15} /> : <CheckCircle2 size={15} />}
                {isResolvingObstacle ? 'Memproses...' : 'Lanjutkan Pekerjaan'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}