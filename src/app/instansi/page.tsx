'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Eye,
  History,
  Image as ImageIcon,
  LogOut,
  Mail,
  MessageCircle,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { ReportObstacle } from '@/types';

type AgencyReport = {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  location: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  status: string;
  urgency: string;
  date: string;
  description: string;
  images: string[];
  reporterName: string;
  assignedAgency?: string | null;
  assignedRegion: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  dueAt: string | null;
  forwardedAt: string;
  agencyResponse: 'Menunggu' | 'Diterima' | 'Dikembalikan';
  agencyResponseReason: string | null;
  agencyRespondedAt: string | null;
  createdAt: string;
  completionEvidence: string[];
  completionNotes: string | null;
  completionSubmittedAt: string | null;
  completionSubmittedBy: string | null;
  staffWorkStatus: 'Belum Dimulai' | 'Sedang Dikerjakan' | 'Menunggu Tindak Lanjut' | 'Terkendala' | 'Bukti Diajukan' | 'Selesai';
  staffCoordinates?: { lat?: number; lng?: number; accuracy?: number; displayAddress?: string } | null;
  staffLocationUpdatedAt?: string | null;
  obstacles?: ReportObstacle[];
};

type ReportStatusHistory = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string;
  changed_at: string;
};

type ReportRoutingHistory = {
  id: string;
  action: string;
  agency: string;
  region: string;
  details: string;
  created_at: string;
};

type ReportStaffAssignmentHistory = {
  id: string;
  previous_staff_name: string | null;
  assigned_staff_name: string | null;
  previous_due_at: string | null;
  due_at: string;
  changed_by_name: string | null;
  created_at: string;
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

type AgencyStaff = { id: string; name: string };

type AgencyStaffAccount = {
  id: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  invitationStatus: string | null;
};

type AgencyDashboardData = {
  agency: { id: string; name: string };
  user: { id: string; name: string; email: string };
  summary: { received: number; awaitingResponse: number; processing: number; completed: number };
  reports: AgencyReport[];
  staff: AgencyStaff[];
};

const emptyAgencyReports: AgencyReport[] = [];

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'Darurat':
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
    case 'Tinggi':
      return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
    case 'Sedang':
      return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
    case 'Rendah':
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  }
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getReportProgress(report: AgencyReport) {
  if (report.status === 'Selesai') {
    return { label: 'Selesai', color: 'var(--success-text)', background: 'var(--success-bg)' };
  }
  if (report.agencyResponse !== 'Diterima') {
    return { label: 'Menunggu konfirmasi', color: 'var(--warning-text)', background: 'var(--warning-bg)' };
  }
  if (report.completionSubmittedAt) {
    return { label: 'Bukti diajukan', color: 'var(--primary-700)', background: 'var(--primary-100)' };
  }
  if (report.staffWorkStatus === 'Terkendala') {
    return { label: 'Terkendala', color: '#b45309', background: '#fef3c7' };
  }
  if (report.assignedStaffId) {
    return { label: report.staffWorkStatus, color: 'var(--primary-700)', background: 'var(--primary-100)' };
  }
  return { label: 'Menunggu petugas', color: 'var(--warning-text)', background: 'var(--warning-bg)' };
}

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AgencyDashboardData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<AgencyStaffAccount[]>([]);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', nik: '', phone: '' });
  const [staffError, setStaffError] = useState('');
  const [staffNotice, setStaffNotice] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [resendingStaffId, setResendingStaffId] = useState('');
  const [editingStaffId, setEditingStaffId] = useState('');
  const [editingStaff, setEditingStaff] = useState({ name: '', email: '', nik: '', phone: '' });
  const [updatingStaffId, setUpdatingStaffId] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Menunggu' | 'Diproses' | 'Selesai'>('Semua');
  const [urgencyFilter, setUrgencyFilter] = useState<'Semua' | 'Darurat' | 'Tinggi' | 'Sedang' | 'Rendah'>('Semua');
  const [regionFilter, setRegionFilter] = useState<string>('Semua');

  // Detail Modal states
  const [selectedReport, setSelectedReport] = useState<AgencyReport | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportStatusHistory[]>([]);
  const [routingHistory, setRoutingHistory] = useState<ReportRoutingHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionNotice, setDecisionNotice] = useState('');
  const [isRejectionFormOpen, setIsRejectionFormOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [assignmentHistory, setAssignmentHistory] = useState<ReportStaffAssignmentHistory[]>([]);
  const [obstacleHistory, setObstacleHistory] = useState<ReportObstacle[]>([]);
  const [assignmentStaffId, setAssignmentStaffId] = useState('');
  const [assignmentDueAt, setAssignmentDueAt] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [taskMessagesReportId, setTaskMessagesReportId] = useState('');
  const [taskMessageDraft, setTaskMessageDraft] = useState('');
  const [taskMessageError, setTaskMessageError] = useState('');
  const [isSendingTaskMessage, setIsSendingTaskMessage] = useState(false);

  const loadDashboard = useCallback(async () => {
    const response = await fetch('/api/agency/reports', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/instansi/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat ringkasan laporan.');
    setData(result as AgencyDashboardData);
    setError('');
  }, [router]);

  const loadStaffAccounts = useCallback(async () => {
    const response = await fetch('/api/agency/staff', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/instansi/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat akun Petugas.');
    setStaffAccounts(Array.isArray(result.staff) ? result.staff as AgencyStaffAccount[] : []);
  }, [router]);

  const loadTaskMessages = useCallback(async (reportId: string) => {
    const response = await fetch(`/api/task-messages?reportId=${encodeURIComponent(reportId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/instansi/login');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Gagal memuat percakapan tugas.');
    setTaskMessages(Array.isArray(result.messages) ? result.messages as TaskMessage[] : []);
    setTaskMessagesReportId(reportId);
    setTaskMessageError('');
  }, [router]);

  useEffect(() => {
    if (!selectedReport?.assignedStaffId || selectedReport.agencyResponse !== 'Diterima') return;

    const reportId = selectedReport.id;
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
  }, [loadTaskMessages, selectedReport?.agencyResponse, selectedReport?.assignedStaffId, selectedReport?.id]);

  useEffect(() => {
    let active = true;
    fetch('/api/agency/reports', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/instansi/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat ringkasan laporan.');
        return result;
      })
      .then((result) => {
        if (active && result) {
          setData(result as AgencyDashboardData);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat ringkasan laporan.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch('/api/agency/staff', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/instansi/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat akun Petugas.');
        return result;
      })
      .then((result) => {
        if (active && result) {
          setStaffAccounts(Array.isArray(result.staff) ? result.staff as AgencyStaffAccount[] : []);
          setStaffError('');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setStaffError(loadError instanceof Error ? loadError.message : 'Gagal memuat akun Petugas.');
      });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/agency/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Gagal mengakhiri sesi Admin Instansi.');
      router.replace('/instansi/login');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Gagal mengakhiri sesi Admin Instansi.');
      setIsLoggingOut(false);
    }
  };

  const submitStaffInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStaffError('');
    setStaffNotice('');
    setIsCreatingStaff(true);
    try {
      const response = await fetch('/api/agency/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (result.staff) {
        setStaffAccounts((current) => [result.staff as AgencyStaffAccount, ...current.filter((staff) => staff.id !== result.staff.id)]);
      }
      if (!response.ok) throw new Error(result.error || 'Gagal membuat akun Petugas.');
      setNewStaff({ name: '', email: '', nik: '', phone: '' });
      setStaffNotice(`Undangan aktivasi berhasil dikirim ke ${result.staff.email}.`);
    } catch (invitationError) {
      setStaffError(invitationError instanceof Error ? invitationError.message : 'Gagal membuat akun Petugas.');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const resendStaffInvitation = async (staffId: string) => {
    setStaffError('');
    setStaffNotice('');
    setResendingStaffId(staffId);
    try {
      const response = await fetch('/api/agency/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend-invitation', id: staffId }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (result.staff) {
        setStaffAccounts((current) => current.map((staff) => staff.id === result.staff.id ? result.staff as AgencyStaffAccount : staff));
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim ulang undangan Petugas.');
      setStaffNotice(`Undangan aktivasi berhasil dikirim ulang ke ${result.staff.email}.`);
    } catch (invitationError) {
      setStaffError(invitationError instanceof Error ? invitationError.message : 'Gagal mengirim ulang undangan Petugas.');
    } finally {
      setResendingStaffId('');
    }
  };

  const beginStaffEdit = (staff: AgencyStaffAccount) => {
    setEditingStaffId(staff.id);
    setEditingStaff({ name: staff.name, email: staff.email, nik: staff.nik, phone: staff.phone });
    setStaffError('');
    setStaffNotice('');
  };

  const saveStaffEdit = async (staffId: string) => {
    setStaffError('');
    setStaffNotice('');
    setUpdatingStaffId(staffId);
    try {
      const response = await fetch('/api/agency/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: staffId, ...editingStaff }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (result.staff) {
        setStaffAccounts((current) => current.map((staff) => staff.id === result.staff.id ? result.staff as AgencyStaffAccount : staff));
      }
      if (!response.ok) throw new Error(result.error || 'Gagal memperbarui akun Petugas.');
      setEditingStaffId('');
      setStaffNotice(result.staff?.invitationStatus === 'sent'
        ? `Data Petugas diperbarui dan undangan dikirim ke ${result.staff.email}.`
        : 'Data akun Petugas berhasil diperbarui.');
    } catch (updateError) {
      setStaffError(updateError instanceof Error ? updateError.message : 'Gagal memperbarui akun Petugas.');
    } finally {
      setUpdatingStaffId('');
    }
  };

  const deactivateStaff = async (staff: AgencyStaffAccount) => {
    if (!window.confirm(`Nonaktifkan akun ${staff.name}?`)) return;
    setStaffError('');
    setStaffNotice('');
    setUpdatingStaffId(staff.id);
    try {
      const response = await fetch('/api/agency/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', id: staff.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menonaktifkan akun Petugas.');
      if (result.staff) {
        setStaffAccounts((current) => current.map((account) => account.id === result.staff.id ? result.staff as AgencyStaffAccount : account));
      }
      setStaffNotice(`Akun ${staff.name} berhasil dinonaktifkan.`);
    } catch (deactivationError) {
      setStaffError(deactivationError instanceof Error ? deactivationError.message : 'Gagal menonaktifkan akun Petugas.');
    } finally {
      setUpdatingStaffId('');
    }
  };

  const decideAssignment = async (action: 'accept' | 'reject') => {
    if (!selectedReport) return;
    const reason = rejectionReason.trim();
    if (action === 'reject' && (reason.length < 5 || reason.length > 1000)) {
      setDecisionError('Alasan pengembalian wajib diisi (5 sampai 1.000 karakter).');
      return;
    }

    setIsSavingDecision(true);
    setDecisionError('');
    setDecisionNotice('');
    try {
      const response = await fetch('/api/agency/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReport.id, action, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan keputusan penugasan.');

      const accepted = action === 'accept';
      const updatedReport = {
        ...selectedReport,
        agencyResponse: accepted ? 'Diterima' as const : 'Dikembalikan' as const,
        agencyResponseReason: accepted ? null : reason,
        agencyRespondedAt: new Date().toISOString(),
      };
      setData((current) => current ? {
        ...current,
        summary: {
          ...current.summary,
          received: accepted ? current.summary.received : Math.max(0, current.summary.received - 1),
          awaitingResponse: Math.max(0, current.summary.awaitingResponse - 1),
          processing: accepted ? current.summary.processing + 1 : current.summary.processing,
        },
        reports: accepted
          ? current.reports.map((report) => report.id === updatedReport.id ? updatedReport : report)
          : current.reports.filter((report) => report.id !== updatedReport.id),
      } : current);
      if (accepted) {
        setSelectedReport(updatedReport);
        setIsRejectionFormOpen(false);
        setRejectionReason('');
        setDecisionNotice('Penugasan diterima. Laporan kini dapat ditangani oleh petugas instansi.');
        fetch(`/api/agency/reports?historyFor=${encodeURIComponent(selectedReport.id)}`, { cache: 'no-store' })
          .then(async (historyResponse) => {
            const historyResult = await historyResponse.json().catch(() => ({}));
            if (!historyResponse.ok) throw new Error(historyResult.error || 'Gagal memuat riwayat laporan.');
            setReportHistory(Array.isArray(historyResult.history) ? historyResult.history as ReportStatusHistory[] : []);
            setRoutingHistory(Array.isArray(historyResult.routingHistory) ? historyResult.routingHistory as ReportRoutingHistory[] : []);
            setAssignmentHistory(Array.isArray(historyResult.assignmentHistory) ? historyResult.assignmentHistory as ReportStaffAssignmentHistory[] : []);
          })
          .catch((error: unknown) => setHistoryError(error instanceof Error ? error.message : 'Gagal memuat riwayat laporan.'));
      } else {
        setSelectedReport(null);
        setDecisionNotice('Laporan dikembalikan ke Admin Platform dengan alasan yang Anda berikan.');
      }
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Gagal menyimpan keputusan penugasan.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const approveCompletion = async () => {
    if (!selectedReport) return;
    setIsSavingDecision(true);
    setDecisionError('');
    setDecisionNotice('');
    try {
      const response = await fetch('/api/agency/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReport.id, action: 'complete' }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyetujui penyelesaian.');

      const completedReport = { ...selectedReport, status: 'Selesai', staffWorkStatus: 'Selesai' as const };
      setSelectedReport(completedReport);
      setData((current) => current ? {
        ...current,
        summary: {
          ...current.summary,
          processing: Math.max(0, current.summary.processing - 1),
          completed: current.summary.completed + 1,
        },
        reports: current.reports.map((report) => report.id === completedReport.id ? completedReport : report),
      } : current);
      setDecisionNotice('Penyelesaian disetujui. Tugas kini berstatus selesai.');
    } catch (approvalError) {
      setDecisionError(approvalError instanceof Error ? approvalError.message : 'Gagal menyetujui penyelesaian.');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const submitTaskMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReport) return;
    const message = taskMessageDraft.trim();
    if (!message || isSendingTaskMessage) return;

    setIsSendingTaskMessage(true);
    setTaskMessageError('');
    try {
      const response = await fetch('/api/task-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReport.id, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim pesan.');
      setTaskMessageDraft('');
      await loadTaskMessages(selectedReport.id);
    } catch (sendError) {
      setTaskMessageError(sendError instanceof Error ? sendError.message : 'Gagal mengirim pesan.');
    } finally {
      setIsSendingTaskMessage(false);
    }
  };

  const openReportDetails = useCallback(async (report: AgencyReport) => {
    setTaskMessagesReportId('');
    setTaskMessageDraft('');
    setTaskMessageError('');
    setSelectedReport(report);
    setDecisionError('');
    setIsRejectionFormOpen(false);
    setRejectionReason('');
    setReportHistory([]);
    setRoutingHistory([]);
    setAssignmentHistory([]);
    setAssignmentStaffId(report.assignedStaffId ?? '');
    setAssignmentDueAt(toDateTimeLocal(report.dueAt));
    setHistoryError('');
    setAssignmentError('');
    setIsLoadingHistory(true);

    try {
      const [historyResponse, completionResponse] = await Promise.all([
        fetch(`/api/agency/reports?historyFor=${encodeURIComponent(report.id)}`, { cache: 'no-store' }),
        fetch(`/api/agency/reports?completionFor=${encodeURIComponent(report.id)}`, { cache: 'no-store' }),
      ]);
      const [historyResult, completionResult] = await Promise.all([
        historyResponse.json().catch(() => ({})),
        completionResponse.json().catch(() => ({})),
      ]);
      if (historyResponse.status === 401 || completionResponse.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!historyResponse.ok) throw new Error(historyResult.error || 'Gagal memuat riwayat laporan.');
      if (!completionResponse.ok) throw new Error(completionResult.error || 'Gagal memuat bukti penanganan.');
      setReportHistory(Array.isArray(historyResult.history) ? historyResult.history as ReportStatusHistory[] : []);
      setRoutingHistory(Array.isArray(historyResult.routingHistory) ? historyResult.routingHistory as ReportRoutingHistory[] : []);
      setAssignmentHistory(Array.isArray(historyResult.assignmentHistory) ? historyResult.assignmentHistory as ReportStaffAssignmentHistory[] : []);
      setObstacleHistory(Array.isArray(historyResult.obstacleHistory) ? historyResult.obstacleHistory as ReportObstacle[] : []);
      const refreshedReport = {
        ...report,
        completionEvidence: Array.isArray(completionResult.completionEvidence) ? completionResult.completionEvidence as string[] : [],
        completionNotes: typeof completionResult.completionNotes === 'string' ? completionResult.completionNotes : null,
        completionSubmittedAt: typeof completionResult.completionSubmittedAt === 'string' ? completionResult.completionSubmittedAt : null,
        completionSubmittedBy: typeof completionResult.completionSubmittedBy === 'string' ? completionResult.completionSubmittedBy : null,
      };
      setSelectedReport(refreshedReport);
      setData((current) => current ? {
        ...current,
        reports: current.reports.map((item) => item.id === refreshedReport.id ? refreshedReport : item),
      } : current);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Gagal memuat riwayat laporan.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [router]);

  const progressEntries = useMemo(() => {
    return [
      ...reportHistory.map((entry) => ({
        id: `status-${entry.id}`,
        title: entry.previous_status ? `${entry.previous_status} → ${entry.new_status}` : entry.new_status,
        details: entry.note,
        occurredAt: entry.changed_at,
      })),
      ...routingHistory.map((entry) => ({
        id: `routing-${entry.id}`,
        title: `${entry.action} · ${entry.agency}`,
        details: `Wilayah: ${entry.region || '-'}. ${entry.details}`,
        occurredAt: entry.created_at,
      })),
      ...assignmentHistory.map((entry) => ({
        id: `assignment-${entry.id}`,
        title: entry.previous_staff_name
          ? `Penugasan diubah · ${entry.assigned_staff_name ?? 'Petugas tidak tersedia'}`
          : `Tugas baru · ${entry.assigned_staff_name ?? 'Petugas tidak tersedia'}`,
        details: `${entry.previous_staff_name ? `Sebelumnya: ${entry.previous_staff_name}. ` : ''}Tenggat: ${new Date(entry.due_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}${entry.previous_due_at ? ` (sebelumnya ${new Date(entry.previous_due_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })})` : ''}${entry.changed_by_name ? `. Diubah oleh ${entry.changed_by_name}.` : '.'}`,
        occurredAt: entry.created_at,
      })),
    ].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }, [reportHistory, routingHistory, assignmentHistory]);

  const reports = data?.reports ?? emptyAgencyReports;
  const deadlineReports = useMemo(() => reports
    .filter((report) => report.status === 'Diproses'
      && report.agencyResponse === 'Diterima'
      && report.dueAt)
    .map((report) => ({
      report,
      overdue: new Date(report.dueAt as string).getTime() < currentTime,
      atRisk: new Date(report.dueAt as string).getTime() >= currentTime
        && new Date(report.dueAt as string).getTime() <= currentTime + 24 * 60 * 60 * 1000,
    }))
    .filter(({ overdue, atRisk }) => overdue || atRisk), [reports, currentTime]);
  const overdueCount = deadlineReports.filter((item) => item.overdue).length;
  const atRiskCount = deadlineReports.filter((item) => item.atRisk).length;
  const withoutDeadlineCount = reports.filter((report) => report.status === 'Diproses'
    && report.agencyResponse === 'Diterima' && !report.dueAt).length;

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    reports.forEach((r) => {
      if (r.assignedRegion) regions.add(r.assignedRegion);
    });
    return Array.from(regions).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== 'Semua' && report.status !== statusFilter) return false;
      if (urgencyFilter !== 'Semua' && report.urgency !== urgencyFilter) return false;
      if (regionFilter !== 'Semua' && report.assignedRegion !== regionFilter) return false;
      if (query) {
        const match = [
          report.ticketNumber,
          report.title,
          report.category,
          report.location,
          report.reporterName,
          report.assignedRegion || '',
          report.description,
        ].some((val) => val.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });
  }, [reports, searchTerm, statusFilter, urgencyFilter, regionFilter]);

  const saveStaffAssignment = async () => {
    if (!selectedReport) return;
    if (!assignmentStaffId || !assignmentDueAt) {
      setAssignmentError('Pilih petugas dan tenggat penanganan.');
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentError('');
    try {
      const response = await fetch('/api/agency/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          reportId: selectedReport.id,
          staffId: assignmentStaffId,
          dueAt: new Date(assignmentDueAt).toISOString(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/instansi/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menetapkan petugas.');

      const assignedStaff = data?.staff.find((staff) => staff.id === result.report.assigned_staff_id);
      const updatedReport = {
        ...selectedReport,
        assignedStaffId: result.report.assigned_staff_id,
        assignedStaffName: result.report.assigned_staff_name,
        dueAt: result.report.due_at,
      };
      setSelectedReport(updatedReport);
      setAssignmentStaffId(updatedReport.assignedStaffId);
      setAssignmentDueAt(toDateTimeLocal(updatedReport.dueAt));
      setData((current) => current ? {
        ...current,
        reports: current.reports.map((report) => report.id === updatedReport.id ? updatedReport : report),
      } : current);
      setDecisionNotice(result.report.changed
        ? `Tugas berhasil ditetapkan kepada ${assignedStaff?.name ?? updatedReport.assignedStaffName}. Petugas menerima notifikasi.`
        : 'Penugasan tidak berubah; tidak ada notifikasi baru yang dikirim.');
      try {
        const historyResponse = await fetch(`/api/agency/reports?historyFor=${encodeURIComponent(selectedReport.id)}`, { cache: 'no-store' });
        const historyResult = await historyResponse.json().catch(() => ({}));
        if (!historyResponse.ok) throw new Error(historyResult.error || 'Gagal memuat riwayat penugasan.');
        setAssignmentHistory(Array.isArray(historyResult.assignmentHistory) ? historyResult.assignmentHistory as ReportStaffAssignmentHistory[] : []);
      } catch (historyLoadError) {
        setHistoryError(historyLoadError instanceof Error ? historyLoadError.message : 'Gagal memuat riwayat penugasan.');
      }
    } catch (assignmentSaveError) {
      setAssignmentError(assignmentSaveError instanceof Error ? assignmentSaveError.message : 'Gagal menetapkan petugas.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const summaryItems = [
    { label: 'Laporan diteruskan', count: data?.summary.received ?? 0, icon: <ClipboardList size={19} />, color: 'var(--primary-700)' },
    { label: 'Menunggu keputusan', count: data?.summary.awaitingResponse ?? 0, icon: <Clock3 size={19} />, color: 'var(--warning-text)' },
    { label: 'Sedang ditangani', count: data?.summary.processing ?? 0, icon: <Building2 size={19} />, color: 'var(--primary-700)' },
    { label: 'Telah selesai', count: data?.summary.completed ?? 0, icon: <CheckCircle2 size={19} />, color: 'var(--success-text)' },
  ];

  return (
    <main style={{ minHeight: 'calc(100vh - 72px)', maxWidth: 1240, margin: '0 auto', padding: '32px 20px 56px', color: 'var(--slate-900)' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--primary-700)', fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Dashboard Admin Instansi</div>
            <h1 style={{ margin: '3px 0 0', fontSize: '1.45rem', fontWeight: 800 }}>{data?.agency.name ?? 'Memuat instansi...'}</h1>
            {data && <p style={{ margin: '3px 0 0', color: 'var(--slate-600)', fontSize: '.78rem' }}>Admin: <strong>{data.user.name}</strong> ({data.user.email})</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void Promise.all([loadDashboard(), loadStaffAccounts()])
                .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Gagal memuat dashboard instansi.'))
                .finally(() => setIsLoading(false));
            }}
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Muat ulang
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--danger-text)', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer' }}
          >
            <LogOut size={15} /> Keluar
          </button>
        </div>
      </header>

      {error && <p role="alert" style={{ marginBottom: 16, padding: 12, border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.82rem' }}>{error}</p>}
      {decisionNotice && <p role="status" style={{ marginBottom: 16, padding: 12, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '.82rem' }}>{decisionNotice}</p>}

      <section aria-label="Kelola akun Petugas" style={{ marginBottom: 24, padding: 18, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <header style={{ marginBottom: 16 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--slate-800)', fontSize: '.96rem', fontWeight: 800 }}>
            <UserPlus size={18} color="var(--primary-700)" /> Kelola akun Petugas
          </h2>
          <p style={{ margin: '5px 0 0', color: 'var(--slate-500)', fontSize: '.76rem' }}>Buat akun untuk instansi ini. Petugas membuat kata sandi melalui undangan yang dikirim ke email terdaftar.</p>
        </header>
        <form onSubmit={(event) => void submitStaffInvitation(event)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>
          <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
            Nama lengkap
            <input value={newStaff.name} onChange={(event) => setNewStaff((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={255} required style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
            Email undangan
            <input type="email" value={newStaff.email} onChange={(event) => setNewStaff((current) => ({ ...current, email: event.target.value }))} maxLength={255} required style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
            NIK (16 digit)
            <input inputMode="numeric" pattern="[0-9]{16}" value={newStaff.nik} onChange={(event) => setNewStaff((current) => ({ ...current, nik: event.target.value }))} minLength={16} maxLength={16} required style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
            Nomor telepon
            <input type="tel" value={newStaff.phone} onChange={(event) => setNewStaff((current) => ({ ...current, phone: event.target.value }))} minLength={6} maxLength={50} required style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button type="submit" disabled={isCreatingStaff} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7, width: '100%', padding: 10, border: 0, borderRadius: 'var(--radius-sm)', background: isCreatingStaff ? 'var(--slate-300)' : 'var(--primary-700)', color: 'white', fontSize: '.76rem', fontWeight: 800, cursor: isCreatingStaff ? 'wait' : 'pointer' }}>
              <Mail size={15} /> {isCreatingStaff ? 'Mengirim undangan...' : 'Buat akun & kirim undangan'}
            </button>
          </div>
        </form>
        {staffError && <p role="alert" style={{ margin: '0 0 12px', padding: 10, border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.76rem' }}>{staffError}</p>}
        {staffNotice && <p role="status" style={{ margin: '0 0 12px', padding: 10, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '.76rem' }}>{staffNotice}</p>}
        {staffAccounts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.76rem' }}>Belum ada akun Petugas pada instansi ini.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {staffAccounts.map((staff) => {
              const invitationLabel = staff.isActive
                ? 'Aktif'
                : staff.invitationStatus === 'accepted'
                  ? 'Nonaktif'
                  : staff.invitationStatus === 'sent'
                    ? 'Undangan terkirim'
                  : staff.invitationStatus === 'failed'
                    ? 'Pengiriman gagal'
                    : staff.invitationStatus === 'expired'
                      ? 'Undangan kedaluwarsa'
                      : 'Menunggu aktivasi';
              return (
                <article key={staff.id} style={{ display: 'grid', gap: 10, padding: '10px 12px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--slate-800)', fontSize: '.78rem' }}>{staff.name}</strong>
                      <span style={{ display: 'block', marginTop: 3, color: 'var(--slate-500)', fontSize: '.72rem' }}>{staff.email} · NIK {staff.nik} · {staff.phone} · {invitationLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => beginStaffEdit(staff)} disabled={Boolean(updatingStaffId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--primary-700)', fontSize: '.7rem', fontWeight: 800, cursor: 'pointer' }}>
                        <Pencil size={13} /> Ubah
                      </button>
                      {staff.isActive && (
                        <button type="button" onClick={() => void deactivateStaff(staff)} disabled={Boolean(updatingStaffId)} style={{ padding: '7px 9px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--danger-text)', fontSize: '.7rem', fontWeight: 800, cursor: 'pointer' }}>
                          {updatingStaffId === staff.id ? 'Menyimpan...' : 'Nonaktifkan'}
                        </button>
                      )}
                      {!staff.isActive && staff.invitationStatus !== 'accepted' && (
                        <button type="button" onClick={() => void resendStaffInvitation(staff.id)} disabled={resendingStaffId === staff.id || Boolean(updatingStaffId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--primary-700)', fontSize: '.7rem', fontWeight: 800, cursor: resendingStaffId === staff.id ? 'wait' : 'pointer' }}>
                          <RefreshCw size={13} /> {resendingStaffId === staff.id ? 'Mengirim...' : 'Kirim ulang undangan'}
                        </button>
                      )}
                    </div>
                  </div>
                  {editingStaffId === staff.id && (
                    <form onSubmit={(event) => { event.preventDefault(); void saveStaffEdit(staff.id); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, paddingTop: 10, borderTop: '1px solid var(--slate-200)' }}>
                      <label style={{ display: 'grid', gap: 4, color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                        Nama lengkap
                        <input value={editingStaff.name} onChange={(event) => setEditingStaff((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={255} required style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 4, color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                        Email
                        <input type="email" value={editingStaff.email} onChange={(event) => setEditingStaff((current) => ({ ...current, email: event.target.value }))} maxLength={255} required style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 4, color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                        NIK (16 digit)
                        <input inputMode="numeric" pattern="[0-9]{16}" value={editingStaff.nik} onChange={(event) => setEditingStaff((current) => ({ ...current, nik: event.target.value }))} minLength={16} maxLength={16} required style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 4, color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700 }}>
                        Nomor telepon
                        <input type="tel" value={editingStaff.phone} onChange={(event) => setEditingStaff((current) => ({ ...current, phone: event.target.value }))} minLength={6} maxLength={50} required style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit' }} />
                      </label>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" onClick={() => setEditingStaffId('')} disabled={updatingStaffId === staff.id} style={{ padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                        <button type="submit" disabled={updatingStaffId === staff.id} style={{ padding: '8px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: updatingStaffId === staff.id ? 'var(--slate-300)' : 'var(--primary-700)', color: 'white', fontSize: '.72rem', fontWeight: 800, cursor: updatingStaffId === staff.id ? 'wait' : 'pointer' }}>
                          {updatingStaffId === staff.id ? 'Menyimpan...' : 'Simpan perubahan'}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Summary Cards */}
      <section aria-label="Ringkasan laporan instansi" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
        {summaryItems.map((item) => (
          <article key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 11, background: 'var(--slate-50)', color: item.color }}>{item.icon}</div>
            <div>
              <div style={{ color: 'var(--slate-500)', fontSize: '.75rem', fontWeight: 700 }}>{item.label}</div>
              <div style={{ marginTop: 3, color: item.color, fontSize: '1.6rem', fontWeight: 800 }}>{isLoading ? '—' : item.count}</div>
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Monitoring keterlambatan" style={{ marginBottom: 24, padding: 18, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--slate-800)', fontSize: '.96rem', fontWeight: 800 }}>
              <Clock3 size={18} color="var(--primary-700)" /> Monitoring keterlambatan
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: '.76rem' }}>Risiko terlambat: tenggat dalam 24 jam. Tenggat sudah lewat ditampilkan sebagai terlambat.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '.72rem', fontWeight: 800 }}>
            <span style={{ padding: '5px 8px', borderRadius: 5, background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>{overdueCount} terlambat</span>
            <span style={{ padding: '5px 8px', borderRadius: 5, background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>{atRiskCount} berisiko</span>
            {withoutDeadlineCount > 0 && <span style={{ padding: '5px 8px', borderRadius: 5, background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{withoutDeadlineCount} tanpa tenggat</span>}
          </div>
        </header>
        {deadlineReports.length === 0 ? (
          <p style={{ margin: 0, padding: '12px 0', color: 'var(--slate-500)', fontSize: '.8rem' }}>
            {withoutDeadlineCount > 0 ? 'Belum ada laporan yang mendekati tenggat atau terlambat. Lengkapi tenggat pada detail penugasan.' : 'Tidak ada laporan yang terlambat atau berisiko saat ini.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {deadlineReports.map(({ report, overdue }) => (
              <button
                key={report.id}
                type="button"
                onClick={() => void openReportDetails(report)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: `1px solid ${overdue ? 'var(--danger-border)' : 'var(--warning-border)'}`, borderRadius: 'var(--radius-sm)', background: overdue ? 'var(--danger-bg)' : 'var(--warning-bg)', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: 'var(--slate-800)', fontSize: '.78rem' }}>{report.ticketNumber} · {report.title}</strong>
                  <span style={{ display: 'block', marginTop: 3, color: 'var(--slate-600)', fontSize: '.72rem' }}>
                    {report.assignedStaffName ?? 'Belum ada petugas'} · Tenggat {new Date(report.dueAt as string).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </span>
                <strong style={{ flexShrink: 0, color: overdue ? 'var(--danger-text)' : 'var(--warning-text)', fontSize: '.72rem' }}>{overdue ? 'Terlambat' : '≤ 24 jam'}</strong>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Reports Section */}
      <section aria-label="Laporan instansi" style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate-800)', fontWeight: 800, fontSize: '.95rem' }}>
            <ClipboardList size={19} color="var(--primary-700)" />
            <span>Laporan Diteruskan ke Instansi</span>
            <span style={{ color: 'var(--slate-400)', fontWeight: 600, fontSize: '.82rem' }}>({filteredReports.length}{filteredReports.length !== (data?.reports.length ?? 0) ? ` dari ${data?.reports.length ?? 0}` : ''})</span>
          </div>
        </header>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 18px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: '1 1 240px', minWidth: 200, padding: '7px 11px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white' }}>
            <Search size={15} color="var(--slate-400)" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor tiket, judul, lokasi, pelapor..."
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '.78rem', color: 'var(--slate-800)' }}
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} style={{ border: 0, background: 'transparent', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }} aria-label="Bersihkan pencarian">
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Semua' | 'Menunggu' | 'Diproses' | 'Selesai')}
              aria-label="Filter status laporan"
              style={{ padding: '7px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.76rem', fontWeight: 600 }}
            >
              <option value="Semua">Semua Status</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Menunggu">Menunggu</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as 'Semua' | 'Darurat' | 'Tinggi' | 'Sedang' | 'Rendah')}
              aria-label="Filter prioritas laporan"
              style={{ padding: '7px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.76rem', fontWeight: 600 }}
            >
              <option value="Semua">Semua Prioritas</option>
              <option value="Darurat">⚡ Darurat</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>

            {/* Region Filter */}
            {availableRegions.length > 0 && (
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                aria-label="Filter wilayah laporan"
                style={{ padding: '7px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.76rem', fontWeight: 600 }}
              >
                <option value="Semua">Semua Wilayah</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            )}

            {(searchTerm || statusFilter !== 'Semua' || urgencyFilter !== 'Semua' || regionFilter !== 'Semua') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('Semua');
                  setUrgencyFilter('Semua');
                  setRegionFilter('Semua');
                }}
                style={{ padding: '6px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-600)', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <p style={{ padding: 32, color: 'var(--slate-500)', textAlign: 'center', fontSize: '.84rem' }}>Memuat laporan instansi...</p>
        ) : filteredReports.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'var(--slate-50)', color: 'var(--slate-500)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                <tr>
                  {['Nomor Tiket & Laporan', 'Kategori', 'Wilayah', 'Prioritas', 'Status', 'Progres Penanganan', 'Keputusan Instansi', 'Petugas / Tenggat', 'Tanggal Diteruskan', 'Aksi'].map((heading) => (
                    <th key={heading} scope="col" style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const urgencyStyle = getUrgencyBadge(report.urgency);
                  const progressStyle = getReportProgress(report);
                  return (
                    <tr
                      key={report.id}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      onClick={() => void openReportDetails(report)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--slate-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ color: 'var(--primary-700)', fontSize: '.72rem' }}>{report.ticketNumber}</strong>
                          {report.images.length > 0 && (
                            <span title={`${report.images.length} foto terlampir`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--slate-400)', fontSize: '.68rem' }}>
                              <ImageIcon size={12} /> {report.images.length}
                            </span>
                          )}
                        </div>
                        <span style={{ display: 'block', marginTop: 4, color: 'var(--slate-800)', fontSize: '.84rem', fontWeight: 700 }}>
                          {report.title}
                        </span>
                        <span style={{ display: 'block', marginTop: 3, color: 'var(--slate-500)', fontSize: '.72rem' }}>
                          {report.location}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 600 }}>
                          {report.category}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.78rem' }}>
                        {report.assignedRegion || '—'}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', border: `1px solid ${urgencyStyle.border}`, borderRadius: 4, background: urgencyStyle.bg, color: urgencyStyle.text, fontSize: '.68rem', fontWeight: 800 }}>
                          {report.urgency === 'Darurat' ? '⚡ ' : ''}{report.urgency}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 5, background: report.status === 'Selesai' ? 'var(--success-bg)' : report.status === 'Diproses' ? 'var(--primary-100)' : 'var(--slate-100)', color: report.status === 'Selesai' ? 'var(--success-text)' : report.status === 'Diproses' ? 'var(--primary-700)' : 'var(--slate-600)', fontSize: '.7rem', fontWeight: 800 }}>
                          {report.status}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 5, background: progressStyle.background, color: progressStyle.color, fontSize: '.7rem', fontWeight: 800 }}>
                          {progressStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap', color: report.agencyResponse === 'Diterima' ? 'var(--success-text)' : 'var(--warning-text)', fontSize: '.72rem', fontWeight: 800 }}>
                        {report.agencyResponse === 'Diterima' ? 'Diterima' : 'Menunggu konfirmasi'}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.72rem' }}>
                        {report.agencyResponse !== 'Diterima' ? (
                          <span style={{ color: 'var(--slate-400)' }}>Menunggu konfirmasi</span>
                        ) : (
                          <>
                            <strong style={{ display: 'block', color: report.assignedStaffName ? 'var(--slate-800)' : 'var(--warning-text)' }}>
                              {report.assignedStaffName ?? 'Belum ditetapkan'}
                            </strong>
                            <span style={{ display: 'block', marginTop: 3, color: report.dueAt && new Date(report.dueAt).getTime() < currentTime ? 'var(--danger-text)' : 'var(--slate-500)' }}>
                              {report.dueAt
                                ? `${new Date(report.dueAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}${new Date(report.dueAt).getTime() < currentTime ? ' · Terlambat' : ''}`
                                : 'Tenggat belum ditentukan'}
                            </span>
                          </>
                        )}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '.72rem', whiteSpace: 'nowrap' }}>
                        {new Date(report.forwardedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--slate-100)', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void openReportDetails(report)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 10px',
                            border: '1px solid var(--primary-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'white',
                            color: 'var(--primary-700)',
                            fontSize: '.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={14} /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ padding: 36, color: 'var(--slate-500)', textAlign: 'center', fontSize: '.84rem' }}>
            {searchTerm || statusFilter !== 'Semua' || urgencyFilter !== 'Semua' || regionFilter !== 'Semua'
              ? 'Tidak ada laporan yang sesuai dengan kriteria filter.'
              : 'Belum ada laporan yang diteruskan ke instansi ini.'}
          </p>
        )}
      </section>

      {/* DETAIL REPORT MODAL */}
      {selectedReport && (
        <div
          role="presentation"
          onClick={() => setSelectedReport(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'grid',
            placeItems: 'center',
            padding: '18px',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="agency-report-detail-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(940px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              background: 'white',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <header style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '18px 22px', borderBottom: '1px solid var(--slate-200)', background: 'white' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 800 }}>{selectedReport.ticketNumber}</span>
                  <span style={{ color: 'var(--slate-300)' }}>•</span>
                  <span style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: '0.72rem', fontWeight: 700 }}>{selectedReport.category}</span>
                  {selectedReport.urgency && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 7px',
                      border: `1px solid ${getUrgencyBadge(selectedReport.urgency).border}`,
                      borderRadius: 4,
                      background: getUrgencyBadge(selectedReport.urgency).bg,
                      color: getUrgencyBadge(selectedReport.urgency).text,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}>
                      {selectedReport.urgency === 'Darurat' ? '⚡ Prioritas Darurat' : `Prioritas: ${selectedReport.urgency}`}
                    </span>
                  )}
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: selectedReport.status === 'Selesai' ? 'var(--success-bg)' : selectedReport.status === 'Diproses' ? 'var(--primary-100)' : 'var(--slate-100)',
                    color: selectedReport.status === 'Selesai' ? 'var(--success-text)' : selectedReport.status === 'Diproses' ? 'var(--primary-700)' : 'var(--slate-600)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}>
                    {selectedReport.status}
                  </span>
                </div>
                <h2 id="agency-report-detail-title" style={{ margin: '6px 0 2px', color: 'var(--slate-900)', fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedReport.title}
                </h2>
                <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>
                  Dilaporkan oleh <strong>{selectedReport.reporterName}</strong> pada {selectedReport.date}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Tutup detail laporan"
                title="Tutup detail laporan"
                style={{
                  width: 34,
                  height: 34,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  color: 'var(--slate-700)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(260px, 0.95fr)', gap: 24, padding: '22px' }}>
              {/* Kolom Kiri: Detail Laporan */}
              <div style={{ minWidth: 0 }}>
                {/* Deskripsi */}
                <section style={{ marginBottom: 20 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}>
                    <ClipboardList size={16} color="var(--primary-700)" /> Deskripsi Laporan
                  </h3>
                  <div style={{ padding: '12px 14px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '0.85rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {selectedReport.description || 'Tidak ada deskripsi rinci.'}
                    </p>
                  </div>
                </section>

                {/* Foto Laporan */}
                <section style={{ marginBottom: 20 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 10px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}>
                    <ImageIcon size={16} color="var(--primary-700)" /> Foto Laporan ({selectedReport.images.length})
                  </h3>
                  {selectedReport.images.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {selectedReport.images.map((image, index) => (
                        <a
                          key={`${image.slice(0, 32)}-${index}`}
                          href={image}
                          target="_blank"
                          rel="noreferrer"
                          title="Klik untuk membuka foto ukuran penuh"
                          style={{
                            position: 'relative',
                            display: 'block',
                            aspectRatio: '4 / 3',
                            overflow: 'hidden',
                            border: '1px solid var(--slate-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--slate-100)',
                          }}
                        >
                          <Image src={image} alt={`Foto laporan ${index + 1}`} fill unoptimized sizes="180px" style={{ objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.8rem', fontStyle: 'italic' }}>Tidak ada foto yang diunggah oleh pelapor.</p>
                  )}
                </section>

                {/* Lokasi & Wilayah */}
                <section style={{ marginBottom: 20 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '0.875rem', fontWeight: 800 }}>
                    <MapPin size={16} color="var(--primary-700)" /> Lokasi Kejadian
                  </h3>
                  <div style={{ padding: '12px 14px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '0.84rem', fontWeight: 600 }}>
                      {selectedReport.location}
                    </p>
                    {selectedReport.assignedRegion && (
                      <p style={{ margin: '0 0 6px', color: 'var(--slate-600)', fontSize: '0.78rem' }}>
                        Wilayah penugasan: <strong>{selectedReport.assignedRegion}</strong>
                      </p>
                    )}
                    {selectedReport.coordinates?.lat != null && selectedReport.coordinates.lng != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <span style={{ color: 'var(--slate-500)', fontSize: '0.72rem' }}>
                          GPS: {selectedReport.coordinates.lat.toFixed(5)}, {selectedReport.coordinates.lng.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${selectedReport.coordinates.lat},${selectedReport.coordinates.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Buka di Google Maps <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : null}

                    {/* Lokasi Penanganan yang Dikirim oleh Petugas */}
                    {selectedReport.staffCoordinates?.lat != null && selectedReport.staffCoordinates?.lng != null && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                          <strong style={{ color: '#166534', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPin size={13} color="#16a34a" /> Lokasi Penanganan Petugas
                          </strong>
                          {selectedReport.staffLocationUpdatedAt && (
                            <span style={{ color: '#15803d', fontSize: '0.68rem' }}>
                              Diperbarui: {new Date(selectedReport.staffLocationUpdatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#14532d', fontSize: '0.76rem' }}>
                          {selectedReport.staffCoordinates.displayAddress || `${selectedReport.staffCoordinates.lat}, ${selectedReport.staffCoordinates.lng}`}
                          {selectedReport.staffCoordinates.accuracy ? ` (Akurasi ±${selectedReport.staffCoordinates.accuracy}m)` : ''}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <a
                            href={`https://www.google.com/maps?q=${selectedReport.staffCoordinates.lat},${selectedReport.staffCoordinates.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: '0.74rem', fontWeight: 700 }}
                          >
                            Buka Lokasi Petugas di Peta <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Kendala Penanganan Petugas (Jika Ada) */}
                {(selectedReport.staffWorkStatus === 'Terkendala' || obstacleHistory.length > 0 || (selectedReport.obstacles && selectedReport.obstacles.length > 0)) && (
                  <section aria-label="Kendala penanganan petugas" style={{ padding: 14, border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', background: '#fffbeb' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px', color: '#b45309', fontSize: '0.84rem', fontWeight: 800 }}>
                      <AlertTriangle size={16} color="#d97706" /> Kendala Penanganan Petugas
                      {selectedReport.staffWorkStatus === 'Terkendala' && (
                        <span style={{ padding: '2px 7px', borderRadius: 999, background: '#fef3c7', color: '#b45309', fontSize: '.68rem', border: '1px solid #fcd34d' }}>
                          Aktif / Terkendala
                        </span>
                      )}
                    </h3>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(obstacleHistory.length > 0 ? obstacleHistory : selectedReport.obstacles || []).map((obs, oIdx) => (
                        <div key={obs.id || oIdx} style={{ padding: 10, borderRadius: 4, background: 'white', border: `1px solid ${obs.status === 'Menunggu Solusi' ? '#fde68a' : 'var(--slate-200)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ color: obs.status === 'Menunggu Solusi' ? '#92400e' : 'var(--slate-800)', fontSize: '.78rem' }}>
                              {obs.category}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '.68rem', padding: '1px 6px', borderRadius: 4, background: obs.status === 'Menunggu Solusi' ? '#fef3c7' : 'var(--success-bg)', color: obs.status === 'Menunggu Solusi' ? '#b45309' : 'var(--success-text)', fontWeight: 700 }}>
                                {obs.status}
                              </span>
                              <time style={{ color: 'var(--slate-500)', fontSize: '.68rem' }}>
                                {new Date(obs.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                              </time>
                            </div>
                          </div>
                          <p style={{ margin: '6px 0 0', color: 'var(--slate-700)', fontSize: '.76rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {obs.reason}
                          </p>
                          {obs.photos && obs.photos.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                              {obs.photos.map((photo, pIdx) => (
                                <a key={pIdx} href={photo} target="_blank" rel="noreferrer" style={{ position: 'relative', width: 64, height: 48, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--slate-300)', display: 'block' }}>
                                  <Image src={photo} alt={`Foto kendala ${pIdx + 1}`} fill unoptimized style={{ objectFit: 'cover' }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {obs.resolutionNotes && (
                            <p style={{ margin: '6px 0 0', padding: '5px 8px', borderRadius: 4, background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '.72rem' }}>
                              <strong>Solusi:</strong> {obs.resolutionNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(selectedReport.agencyResponse === 'Diterima'
                  || selectedReport.completionNotes
                  || selectedReport.completionEvidence.length > 0
                  || selectedReport.completionSubmittedAt) && (
                  <section aria-label="Bukti penanganan petugas" style={{ padding: 14, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px', color: 'var(--success-text)', fontSize: '0.84rem', fontWeight: 800 }}>
                      <CheckCircle2 size={16} /> Bukti Penanganan Petugas
                    </h3>
                    {selectedReport.completionEvidence.length > 0 && (
                      <>
                        <p style={{ margin: '0 0 8px', color: 'var(--slate-600)', fontSize: '.72rem', fontWeight: 700 }}>
                          Foto bukti ({selectedReport.completionEvidence.length}) · Klik foto untuk melihat ukuran penuh
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 10 }}>
                          {selectedReport.completionEvidence.map((image, index) => (
                            <a
                              key={`evidence-${index}`}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              title={`Buka bukti penanganan ${index + 1} ukuran penuh`}
                              style={{ position: 'relative', display: 'block', aspectRatio: '4 / 3', overflow: 'hidden', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)' }}
                            >
                              <Image src={image} alt={`Bukti penanganan ${index + 1}`} fill unoptimized sizes="120px" style={{ objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                    {selectedReport.completionSubmittedAt && selectedReport.completionEvidence.length === 0 && (
                      <p style={{ margin: '0 0 8px', color: 'var(--warning-text)', fontSize: '.76rem' }}>Belum ada foto bukti yang tercatat.</p>
                    )}
                    {selectedReport.completionNotes && <p style={{ margin: '0 0 4px', color: 'var(--slate-500)', fontSize: '.7rem', fontWeight: 700 }}>Catatan petugas</p>}
                    {selectedReport.completionNotes && (
                      <p style={{ margin: '0 0 8px', color: 'var(--slate-800)', fontSize: '.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {selectedReport.completionNotes}
                      </p>
                    )}
                    {selectedReport.completionSubmittedAt && !selectedReport.completionNotes && (
                      <p style={{ margin: '0 0 8px', color: 'var(--warning-text)', fontSize: '.76rem' }}>Belum ada catatan penanganan.</p>
                    )}
                    {selectedReport.completionSubmittedAt ? (
                      <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.72rem' }}>
                        {selectedReport.completionSubmittedBy ? `Dikirim oleh ${selectedReport.completionSubmittedBy} · ` : ''}
                        {new Date(selectedReport.completionSubmittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.72rem' }}>Petugas belum mengirimkan bukti penanganan.</p>
                    )}
                  </section>
                )}
              </div>

              {/* Kolom Kanan: Ringkasan & Riwayat Laporan */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {selectedReport.agencyResponse === 'Diterima' && selectedReport.assignedStaffId && (
                  <section aria-label="Komunikasi dengan Petugas" style={{ padding: 14, border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 4px', color: 'var(--slate-800)', fontSize: '.84rem', fontWeight: 800 }}>
                      <MessageCircle size={16} color="var(--primary-700)" /> Komunikasi dengan Petugas
                    </h3>
                    <p style={{ margin: '0 0 10px', color: 'var(--slate-600)', fontSize: '.72rem' }}>
                      Tugas ditangani oleh <strong>{selectedReport.assignedStaffName || 'Petugas instansi'}</strong>. Pesan diperbarui otomatis.
                    </p>
                    <div aria-live="polite" style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 10 }}>
                      {taskMessagesReportId !== selectedReport.id && !taskMessageError ? (
                        <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Memuat percakapan...</p>
                      ) : (taskMessagesReportId !== selectedReport.id || taskMessages.length === 0) ? (
                        <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.74rem' }}>Belum ada pesan. Kirim catatan atau arahan kepada Petugas.</p>
                      ) : taskMessages.map((message) => {
                        const isOwnMessage = message.authorRole === 'Admin Instansi';
                        return (
                          <article key={message.id} style={{ justifySelf: isOwnMessage ? 'end' : 'start', width: 'min(95%, 460px)', padding: '8px 10px', border: `1px solid ${isOwnMessage ? 'var(--primary-200)' : 'var(--slate-200)'}`, borderRadius: 'var(--radius-sm)', background: isOwnMessage ? 'white' : 'var(--slate-50)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--slate-600)', fontSize: '.66rem' }}>
                              <strong>{isOwnMessage ? 'Anda' : message.authorName + ' · Petugas'}</strong>
                              <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</time>
                            </div>
                            <p style={{ margin: '5px 0 0', color: 'var(--slate-800)', fontSize: '.76rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</p>
                          </article>
                        );
                      })}
                    </div>
                    {taskMessageError && <p role="alert" style={{ margin: '0 0 8px', color: 'var(--danger-text)', fontSize: '.72rem' }}>{taskMessageError}</p>}
                    <form onSubmit={(event) => void submitTaskMessage(event)} style={{ display: 'grid', gap: 7 }}>
                      <label htmlFor={`agency-task-message-${selectedReport.id}`} style={{ color: 'var(--slate-700)', fontSize: '.72rem', fontWeight: 700 }}>Catatan atau arahan untuk Petugas</label>
                      <textarea
                        id={`agency-task-message-${selectedReport.id}`}
                        value={taskMessageDraft}
                        onChange={(event) => setTaskMessageDraft(event.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Tuliskan catatan atau arahan terkait tugas..."
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
                )}
                {selectedReport.agencyResponse === 'Menunggu' && selectedReport.status === 'Diproses' && (
                  <section aria-label="Keputusan penugasan instansi" style={{ padding: 14, border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)' }}>
                    <h3 style={{ margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '.84rem', fontWeight: 800 }}>Konfirmasi penugasan</h3>
                    <p style={{ margin: '0 0 12px', color: 'var(--slate-600)', fontSize: '.76rem', lineHeight: 1.5 }}>
                      Pastikan laporan ini termasuk kewenangan instansi Anda. Terima untuk mulai menangani, atau kembalikan ke Admin Platform dengan alasan.
                    </p>
                    {decisionError && <p role="alert" style={{ margin: '0 0 10px', color: 'var(--danger-text)', fontSize: '.75rem' }}>{decisionError}</p>}
                    {!isRejectionFormOpen ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => void decideAssignment('accept')} disabled={isSavingDecision} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--success-solid)', color: 'white', fontSize: '.74rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>
                          <CheckCircle2 size={15} /> {isSavingDecision ? 'Menyimpan...' : 'Terima laporan'}
                        </button>
                        <button type="button" onClick={() => { setIsRejectionFormOpen(true); setDecisionError(''); }} disabled={isSavingDecision} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--danger-text)', fontSize: '.74rem', fontWeight: 800, cursor: 'pointer' }}>
                          <AlertTriangle size={15} /> Tolak penugasan
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
                          Alasan pengembalian (wajib)
                          <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} rows={4} placeholder="Jelaskan mengapa laporan ini di luar kewenangan instansi" style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', resize: 'vertical' }} />
                        </label>
                        <span style={{ color: 'var(--slate-400)', fontSize: '.68rem' }}>{rejectionReason.length}/1.000 karakter (minimal 5)</span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button type="button" onClick={() => { setIsRejectionFormOpen(false); setRejectionReason(''); setDecisionError(''); }} disabled={isSavingDecision} style={{ padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                          <button type="button" onClick={() => void decideAssignment('reject')} disabled={isSavingDecision || rejectionReason.trim().length < 5} style={{ padding: '8px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: rejectionReason.trim().length >= 5 ? 'var(--danger-solid)' : 'var(--slate-300)', color: 'white', fontSize: '.74rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>
                            {isSavingDecision ? 'Mengembalikan...' : 'Kembalikan laporan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {selectedReport.agencyResponse === 'Diterima' && (
                  <section style={{ padding: 12, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '.78rem', fontWeight: 700 }}>
                    <CheckCircle2 size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                    Penugasan telah diterima instansi.
                  </section>
                )}
                {selectedReport.agencyResponse === 'Diterima' && selectedReport.status === 'Diproses' && !selectedReport.completionSubmittedAt && (
                  <section aria-label="Penugasan petugas dan tenggat" style={{ padding: 14, border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 6px', color: 'var(--slate-800)', fontSize: '.84rem', fontWeight: 800 }}>
                      <UserCheck size={16} color="var(--primary-700)" /> Petugas dan tenggat
                    </h3>
                    {selectedReport.assignedStaffName && (
                      <p style={{ margin: '0 0 10px', color: 'var(--slate-600)', fontSize: '.74rem' }}>
                        Saat ini: <strong>{selectedReport.assignedStaffName}</strong>
                        {selectedReport.dueAt ? ` · Tenggat ${new Date(selectedReport.dueAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ' · Tenggat belum ditentukan'}
                      </p>
                    )}
                    {data?.staff.length ? (
                      <div style={{ display: 'grid', gap: 9 }}>
                        <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
                          Pilih petugas
                          <select value={assignmentStaffId} onChange={(event) => setAssignmentStaffId(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit' }}>
                            <option value="">Pilih petugas instansi</option>
                            {data.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 5, color: 'var(--slate-700)', fontSize: '.74rem', fontWeight: 700 }}>
                          Tenggat penanganan
                          <input type="datetime-local" value={assignmentDueAt} onChange={(event) => setAssignmentDueAt(event.target.value)} min={toDateTimeLocal(new Date().toISOString())} style={{ width: '100%', boxSizing: 'border-box', padding: 9, border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit' }} />
                        </label>
                        <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.7rem' }}>Petugas menerima notifikasi saat tugas baru atau perubahan penugasan disimpan.</p>
                        {assignmentError && <p role="alert" style={{ margin: 0, color: 'var(--danger-text)', fontSize: '.74rem' }}>{assignmentError}</p>}
                        <button type="button" onClick={() => void saveStaffAssignment()} disabled={isSavingAssignment || !assignmentStaffId || !assignmentDueAt} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '9px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: isSavingAssignment || !assignmentStaffId || !assignmentDueAt ? 'var(--slate-300)' : 'var(--primary-700)', color: 'white', fontSize: '.74rem', fontWeight: 800, cursor: isSavingAssignment ? 'wait' : 'pointer' }}>
                          <UserCheck size={15} /> {isSavingAssignment ? 'Menyimpan...' : selectedReport.assignedStaffId ? 'Simpan perubahan' : 'Tetapkan petugas'}
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--warning-text)', fontSize: '.74rem' }}>Belum ada akun Petugas aktif yang terhubung ke instansi ini.</p>
                    )}
                  </section>
                )}
                {selectedReport.agencyResponse === 'Diterima'
                  && selectedReport.status === 'Diproses'
                  && selectedReport.completionSubmittedAt && (
                  <section aria-label="Pemeriksaan bukti penyelesaian" style={{ padding: 14, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)' }}>
                    <h3 style={{ margin: '0 0 6px', color: 'var(--success-text)', fontSize: '.84rem', fontWeight: 800 }}>Pemeriksaan penyelesaian</h3>
                    <p style={{ margin: '0 0 10px', color: 'var(--slate-700)', fontSize: '.76rem', lineHeight: 1.5 }}>
                      Petugas telah mengirim catatan dan foto bukti. Periksa bukti tersebut sebelum menandai laporan selesai.
                    </p>
                    {decisionError && <p role="alert" style={{ margin: '0 0 10px', color: 'var(--danger-text)', fontSize: '.75rem' }}>{decisionError}</p>}
                    <button type="button" onClick={() => void approveCompletion()} disabled={isSavingDecision} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', border: 0, borderRadius: 'var(--radius-sm)', background: isSavingDecision ? 'var(--slate-300)' : 'var(--success-solid)', color: 'white', fontSize: '.74rem', fontWeight: 800, cursor: isSavingDecision ? 'wait' : 'pointer' }}>
                      <CheckCircle2 size={15} /> {isSavingDecision ? 'Menyimpan...' : 'Setujui penyelesaian & tandai selesai'}
                    </button>
                  </section>
                )}
                {/* Detail Metadata Box */}
                <div style={{ padding: 14, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                  <h4 style={{ margin: '0 0 10px', color: 'var(--slate-800)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    Informasi Penugasan
                  </h4>
                  <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: '0.78rem' }}>
                    <div>
                      <dt style={{ color: 'var(--slate-500)', fontSize: '0.7rem' }}>Instansi Penanggung Jawab</dt>
                      <dd style={{ margin: '2px 0 0', color: 'var(--slate-800)', fontWeight: 700 }}>{selectedReport.assignedAgency || data?.agency.name}</dd>
                    </div>
                    <div>
                      <dt style={{ color: 'var(--slate-500)', fontSize: '0.7rem' }}>Wilayah Kerja</dt>
                      <dd style={{ margin: '2px 0 0', color: 'var(--slate-800)', fontWeight: 700 }}>{selectedReport.assignedRegion || 'Seluruh Wilayah'}</dd>
                    </div>
                    <div>
                      <dt style={{ color: 'var(--slate-500)', fontSize: '0.7rem' }}>Waktu Diteruskan</dt>
                      <dd style={{ margin: '2px 0 0', color: 'var(--slate-800)', fontWeight: 700 }}>
                        {new Date(selectedReport.forwardedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: 'var(--slate-500)', fontSize: '0.7rem' }}>Prioritas Penanganan</dt>
                      <dd style={{ margin: '2px 0 0', color: getUrgencyBadge(selectedReport.urgency).text, fontWeight: 800 }}>
                        {selectedReport.urgency}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Timeline Riwayat Laporan */}
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px', color: 'var(--slate-800)', fontSize: '0.84rem', fontWeight: 800 }}>
                    <History size={16} color="var(--primary-700)" /> Riwayat Perkembangan
                  </h3>

                  {isLoadingHistory ? (
                    <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.75rem' }}>Memuat riwayat laporan...</p>
                  ) : historyError ? (
                    <p role="alert" style={{ margin: 0, color: 'var(--danger-text)', fontSize: '0.75rem' }}>{historyError}</p>
                  ) : progressEntries.length === 0 ? (
                    <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.75rem' }}>Belum ada catatan riwayat untuk laporan ini.</p>
                  ) : (
                    <ol style={{ display: 'grid', gap: 12, margin: 0, padding: '0 0 0 16px', color: 'var(--slate-300)' }}>
                      {progressEntries.map((entry) => (
                        <li key={entry.id} style={{ paddingLeft: 4, color: 'var(--slate-800)' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                            {entry.title}
                          </div>
                          {entry.details && (
                            <div style={{ marginTop: 2, color: 'var(--slate-600)', fontSize: '0.72rem', lineHeight: 1.45 }}>
                              {entry.details}
                            </div>
                          )}
                          <time style={{ display: 'block', marginTop: 3, color: 'var(--slate-400)', fontSize: '0.66rem' }}>
                            {new Date(entry.occurredAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </time>
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
    </main>
  );
}
