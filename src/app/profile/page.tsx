'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  ShieldCheck,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Bell,
  FileText,
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Navigation,
  Laptop,
  Smartphone,
  Save,
  Key,
  Shield,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  LogOut,
  PlusCircle,
  Building,
  X,
  Image as ImageIcon,
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Heart,
  XCircle,
} from 'lucide-react';
import { ReportItem } from '@/types';
import ReportDetailModal from '@/components/ReportDetailModal';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    reports,
    notifications,
    updateProfile,
    updatePassword,
    updateNotifications,
    isLoading,
    showToast,
    likeReport,
    hasSupportedReport,
  } = useAuth();

  // Tab State
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'security' || tabParam === 'reports' || tabParam === 'notifications'
    ? tabParam
    : 'personal';
  const setActiveTab = (tab: 'personal' | 'security' | 'reports' | 'notifications') => {
    router.replace(tab === 'personal' ? '/profile' : `/profile?tab=${tab}`, { scroll: false });
  };
  const selectedReportId = searchParams.get('reportId');
  const selectedReportDetail = reports.find((report) => report.id === selectedReportId) ?? null;
  const openReportDetail = (report: ReportItem) => {
    router.push(`/profile?tab=reports&reportId=${encodeURIComponent(report.id)}`);
  };
  const closeReportDetail = () => {
    router.replace('/profile?tab=reports', { scroll: false });
  };

  // Form State for Personal Data
  const [profileData, setProfileData] = useState({
    name: '',
    nik: '',
    email: '',
    phone: '',
    gender: 'L' as 'L' | 'P',
    birthDate: '',
    address: '',
    rtRw: '',
    kelurahan: '',
    kecamatan: '',
    city: '',
    avatarUrl: '',
  });

  const [showNik, setShowNik] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar picker modal
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Rian',
  ];

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Notification settings state
  const [notifState, setNotifState] = useState(notifications);

  // Report search & filter state
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<'Semua' | 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak'>('Semua');
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('Semua');
  const [reportSortBy, setReportSortBy] = useState<'terbaru' | 'terlama' | 'urgensi' | 'dukungan'>('terbaru');

  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        nik: user.nik,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        birthDate: user.birthDate,
        address: user.address,
        rtRw: user.rtRw,
        kelurahan: user.kelurahan,
        kecamatan: user.kecamatan,
        city: user.city,
        avatarUrl: user.avatarUrl,
      });
    }
  }, [user]);

  useEffect(() => {
    setNotifState(notifications);
  }, [notifications]);

  if (isLoading && !user) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh' }}>
        Memuat profil...
      </div>
    );
  }

  if (!user || user.role !== 'Warga' || user.id === 'usr-89211') {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-700)',
              marginBottom: '16px',
            }}
          >
            <User size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
            Akses Profil Warga
          </h2>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Masuk dengan akun Warga untuk melihat dan mengelola profil pribadi Anda.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/login" className="btn btn-secondary btn-block">
              Masuk dengan Akun Pribadi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    await updateProfile(profileData);
    setIsSavingProfile(false);
  };

  // Handle Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      showToast('error', 'Gagal', 'Kata sandi baru dan konfirmasi tidak cocok.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showToast('error', 'Gagal', 'Kata sandi baru minimal 8 karakter.');
      return;
    }

    setIsChangingPass(true);
    const success = await updatePassword(passwordData.currentPassword, passwordData.newPassword);
    setIsChangingPass(false);
    if (success) {
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    }
  };

  // Handle Notification Toggle
  const handleNotificationChange = (key: keyof typeof notifState) => {
    const updated = { ...notifState, [key]: !notifState[key] };
    setNotifState(updated);
    updateNotifications(updated);
  };

  const filteredReports = reports
    .filter((rep) => {
      // Status Filter
      if (reportStatusFilter !== 'Semua' && rep.status !== reportStatusFilter) {
        return false;
      }

      // Category Filter
      if (reportCategoryFilter !== 'Semua' && rep.category !== reportCategoryFilter) {
        return false;
      }

      // Search Query
      if (reportSearch.trim()) {
        const q = reportSearch.toLowerCase().trim();
        const matchTicket = rep.ticketNumber.toLowerCase().includes(q);
        const matchTitle = rep.title.toLowerCase().includes(q);
        const matchDesc = rep.description.toLowerCase().includes(q);
        const matchLoc = rep.location.toLowerCase().includes(q);
        const matchAgency = (rep.agency || '').toLowerCase().includes(q);
        const matchCategory = rep.category.toLowerCase().includes(q);
        const matchReporter = (rep.reporterName || '').toLowerCase().includes(q);

        if (!matchTicket && !matchTitle && !matchDesc && !matchLoc && !matchAgency && !matchCategory && !matchReporter) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (reportSortBy === 'dukungan') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (reportSortBy === 'urgensi') {
        const urgencyScore: Record<string, number> = { Darurat: 4, Tinggi: 3, Sedang: 2, Rendah: 1 };
        return (urgencyScore[b.urgency] || 0) - (urgencyScore[a.urgency] || 0);
      }
      if (reportSortBy === 'terlama') {
        return a.id.localeCompare(b.id);
      }
      return b.id.localeCompare(a.id);
    });

  const countCompleted = reports.filter((r) => r.status === 'Selesai').length;
  const countInProgress = reports.filter((r) => r.status === 'Diproses').length;
  const countPending = reports.filter((r) => r.status === 'Menunggu').length;
  const countRejected = reports.filter((r) => r.status === 'Ditolak').length;

  const handleResetFilters = () => {
    setReportSearch('');
    setReportStatusFilter('Semua');
    setReportCategoryFilter('Semua');
    setReportSortBy('terbaru');
  };

  return (
    <div style={{ backgroundColor: 'var(--slate-50)', paddingBottom: '80px', minHeight: 'calc(100vh - 72px)' }}>
      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f766e 100%)',
          color: 'var(--white)',
          paddingTop: '40px',
          paddingBottom: '80px',
          position: 'relative',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="badge badge-primary"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)', color: 'var(--primary-300)', borderColor: 'rgba(20, 184, 166, 0.4)' }}
              >
                Portal Warga LaporKita
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Pusat Pengelolaan Akun & Identitas
            </h1>
            <p style={{ color: 'var(--slate-300)', fontSize: '0.9375rem', maxWidth: '640px' }}>
              Perbarui identitas kependudukan Anda, kelola keamanan sandi, dan pantau penyelesaian laporan publik di lingkungan Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="container" style={{ marginTop: '-48px' }}>
        {/* Profile Card Header */}
        <div
          className="card"
          style={{
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          {/* User info & avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={profileData.avatarUrl || user.avatarUrl}
                alt={user.name}
                className="avatar avatar-lg"
              />
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                title="Ganti Foto Profil"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-600)',
                  color: 'var(--white)',
                  border: '2px solid var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Camera size={16} />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {user.name}
                </h2>
                {user.isVerified && (
                  <span className="badge badge-success">
                    <ShieldCheck size={13} /> NIK Terverifikasi
                  </span>
                )}
                <span className="badge badge-neutral">ID: {user.id}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  marginTop: '6px',
                  color: 'var(--slate-500)',
                  fontSize: '0.875rem',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CreditCard size={15} />
                  NIK: {showNik ? user.nik : `${user.nik.slice(0, 6)}******${user.nik.slice(-4)}`}
                  <button
                    onClick={() => setShowNik(!showNik)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 0 }}
                    title={showNik ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                  >
                    {showNik ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={15} /> {user.city}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={15} /> Bergabung: {user.createdAt}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              backgroundColor: 'var(--slate-50)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                {reports.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                Total Laporan
              </div>
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--slate-200)' }} />
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-solid)' }}>
                {countCompleted}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                Selesai
              </div>
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--slate-200)' }} />
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning-solid)' }}>
                {countInProgress + countPending}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                Berjalan
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="profile-tabs" style={{ padding: '8px 16px 0', backgroundColor: 'var(--white)' }}>
            <button
              className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <User size={18} />
              Data Pribadi
            </button>
            <button
              className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={18} />
              Keamanan Akun
            </button>
            <button
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={18} />
              Aktivitas Laporan ({reports.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={18} />
              Notifikasi & Privasi
            </button>
          </div>

          {/* TAB 1: DATA PRIBADI */}
          {activeTab === 'personal' && (
            <div style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Informasi Data Kependudukan
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                  Pastikan informasi sesuai dengan KTP agar laporan Anda dapat diverifikasi dengan cepat oleh dinas terkait.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit}>
                {/* 2 Column Form */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {/* Nama Lengkap */}
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap (Sesuai KTP)</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <User size={18} />
                      </span>
                      <input
                        type="text"
                        className="form-control has-icon-left"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* NIK (ReadOnly with Verified Badge) */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Nomor Induk Kependudukan (NIK)</span>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Terkunci Resmi
                      </span>
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <CreditCard size={18} />
                      </span>
                      <input
                        type="text"
                        className="form-control has-icon-left"
                        value={profileData.nik}
                        readOnly
                        style={{ backgroundColor: 'var(--slate-100)', cursor: 'not-allowed', color: 'var(--slate-600)' }}
                      />
                    </div>
                    <span className="form-helper">
                      NIK tidak dapat diubah sembarangan karena terhubung dengan sertifikasi kependudukan.
                    </span>
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">Alamat Email</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        className="form-control has-icon-left"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Nomor WhatsApp */}
                  <div className="form-group">
                    <label className="form-label">Nomor WhatsApp / HP</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Phone size={18} />
                      </span>
                      <input
                        type="tel"
                        className="form-control has-icon-left"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <span className="form-helper">Digunakan untuk konfirmasi otomatis dari tim penanganan.</span>
                  </div>

                  {/* Jenis Kelamin */}
                  <div className="form-group">
                    <label className="form-label">Jenis Kelamin</label>
                    <select
                      className="form-control"
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value as 'L' | 'P' })}
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  {/* Tanggal Lahir */}
                  <div className="form-group">
                    <label className="form-label">Tanggal Lahir</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Calendar size={18} />
                      </span>
                      <input
                        type="date"
                        className="form-control has-icon-left"
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Alamat Domisili Warga
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                    Membantu sistem mengidentifikasi kelurahan dan kecamatan domisili pelapor secara otomatis.
                  </p>
                </div>

                {/* Alamat Jalan */}
                <div className="form-group">
                  <label className="form-label">Alamat Lengkap (Jalan, Nomor Rumah, Patokan)</label>
                  <div className="input-wrapper">
                    <span className="input-icon-left">
                      <MapPin size={18} />
                    </span>
                    <input
                      type="text"
                      className="form-control has-icon-left"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Contoh: Jl. Melati Raya No. 42 Blok B3"
                    />
                  </div>
                </div>

                {/* Grid Alamat Wilayah */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">RT / RW</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.rtRw}
                      onChange={(e) => setProfileData({ ...profileData, rtRw: e.target.value })}
                      placeholder="005 / 008"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kelurahan / Desa</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.kelurahan}
                      onChange={(e) => setProfileData({ ...profileData, kelurahan: e.target.value })}
                      placeholder="Sukamaju"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kecamatan</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.kecamatan}
                      onChange={(e) => setProfileData({ ...profileData, kecamatan: e.target.value })}
                      placeholder="Cilodong"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kota / Kabupaten</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      placeholder="Kota Depok"
                    />
                  </div>
                </div>

                {/* Save Button Bar */}
                <div
                  style={{
                    marginTop: '32px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--slate-200)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                  }}
                >
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn btn-primary btn-lg"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="spinner" />
                        Menyimpan Perubahan...
                      </>
                    ) : (
                      <>
                        <Save size={18} /> Simpan Data Pribadi
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: KEAMANAN AKUN */}
          {activeTab === 'security' && (
            <div style={{ padding: '32px' }}>
              <div style={{ maxWidth: '640px' }}>
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Pengaturan Keamanan & Sandi
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                    Jaga kerahasiaan akun LaporKita Anda dengan mengganti kata sandi berkala dan mengaktifkan proteksi ganda.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  {/* Kata Sandi Sekarang */}
                  <div className="form-group">
                    <label className="form-label">Kata Sandi Saat Ini</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        placeholder="Ketik sandi saat ini"
                        className="form-control has-icon-left has-icon-right"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        className="input-icon-right"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                      >
                        {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Kata Sandi Baru */}
                  <div className="form-group">
                    <label className="form-label">Kata Sandi Baru</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Key size={18} />
                      </span>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter kombinasi"
                        className="form-control has-icon-left has-icon-right"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        className="input-icon-right"
                        onClick={() => setShowNewPass(!showNewPass)}
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <span className="form-helper">
                      Gunakan kombinasi huruf kapital, angka, dan simbol untuk keamanan maksimal.
                    </span>
                  </div>

                  {/* Konfirmasi Kata Sandi Baru */}
                  <div className="form-group">
                    <label className="form-label">Konfirmasi Kata Sandi Baru</label>
                    <div className="input-wrapper">
                      <span className="input-icon-left">
                        <Key size={18} />
                      </span>
                      <input
                        type="password"
                        placeholder="Ketik ulang kata sandi baru"
                        className="form-control has-icon-left"
                        value={passwordData.confirmNewPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="btn btn-primary"
                    style={{ marginTop: '12px' }}
                  >
                    {isChangingPass ? (
                      <>
                        <div className="spinner" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Perbarui Kata Sandi
                      </>
                    )}
                  </button>
                </form>

                {/* 2FA Section */}
                <div
                  style={{
                    marginTop: '40px',
                    paddingTop: '28px',
                    borderTop: '1px solid var(--slate-200)',
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                    Verifikasi 2 Langkah (2FA OTP)
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '16px' }}>
                    Saat aktif, sistem akan mengirim kode OTP melalui WhatsApp ke nomor <strong>{user.phone}</strong> setiap kali Anda masuk dari perangkat baru.
                  </p>

                  <div className="switch-label">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--primary-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary-700)',
                        }}
                      >
                        <Shield size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                          Proteksi OTP WhatsApp
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Status: Aktif untuk keamanan akun
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="switch-input"
                      onChange={(e) =>
                        showToast(
                          'info',
                          'Verifikasi 2 Langkah',
                          e.target.checked ? '2FA diaktifkan.' : '2FA dinonaktifkan sementara.'
                        )
                      }
                    />
                  </div>
                </div>

                {/* Sesi Perangkat Aktif */}
                <div
                  style={{
                    marginTop: '40px',
                    paddingTop: '28px',
                    borderTop: '1px solid var(--slate-200)',
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                    Sesi Masuk Aktif
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '16px' }}>
                    Daftar browser dan perangkat yang sedang terhubung ke akun Anda.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Device 1 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        backgroundColor: 'var(--slate-50)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Laptop size={24} color="var(--primary-600)" />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                            Windows 11 • Chrome 128.0
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                            Depok, Indonesia • IP 182.253.xx.xx
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-success">Perangkat Ini (Aktif)</span>
                    </div>

                    {/* Device 2 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        backgroundColor: 'var(--white)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Smartphone size={24} color="var(--slate-500)" />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                            Samsung Galaxy A54 • Mobile App
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                            Terakhir aktif 2 jam yang lalu
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast('info', 'Sesi Diputus', 'Sesi perangkat mobile berhasil dikeluarkan.')}
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--danger-solid)' }}
                      >
                        Keluarkan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT & AKTIVITAS LAPORAN */}
          {activeTab === 'reports' && (
            <div style={{ padding: '32px' }}>
              {/* Header Title & CTA */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Pantau Status Aduan & Aspirasi Saya
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Cari dan filter riwayat aduan Anda berdasarkan kata kunci, kategori masalah, atau tahapan penyelesaian.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Link
                    href="/laporan"
                    className="btn btn-sm btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> Jelajah Semua Laporan Publik
                  </Link>
                  <Link
                    href="/lapor"
                    className="btn btn-sm btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <PlusCircle size={15} />
                    Buat Laporan Baru
                  </Link>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS CARD */}
              <div
                style={{
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--slate-200)',
                  padding: '20px',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Search Bar Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--slate-400)',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Cari berdasarkan nomor tiket (LPK-...), judul aduan, lokasi jalan, atau dinas penangan..."
                    className="form-control"
                    style={{
                      paddingLeft: '44px',
                      paddingRight: reportSearch ? '44px' : '14px',
                      fontSize: '0.9375rem',
                      height: '46px',
                      backgroundColor: 'var(--white)',
                    }}
                  />
                  {reportSearch && (
                    <button
                      type="button"
                      onClick={() => setReportSearch('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--slate-400)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                      }}
                      title="Hapus pencarian"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filter Options Row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-600)', marginRight: '4px' }}>
                      Status:
                    </span>
                    {(
                      [
                        { id: 'Semua', label: 'Semua', count: reports.length },
                        { id: 'Menunggu', label: 'Menunggu', count: countPending },
                        { id: 'Diproses', label: 'Diproses', count: countInProgress },
                        { id: 'Selesai', label: 'Selesai', count: countCompleted },
                        { id: 'Ditolak', label: 'Ditolak', count: countRejected },
                      ] as const
                    ).map((st) => {
                      const isActive = reportStatusFilter === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setReportStatusFilter(st.id)}
                          className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            fontSize: '0.8125rem',
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: isActive ? 700 : 500,
                          }}
                        >
                          {st.label}{' '}
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--slate-200)',
                              color: isActive ? 'white' : 'var(--slate-700)',
                              marginLeft: '4px',
                            }}
                          >
                            {st.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Category & Sorting Dropdowns */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Category Select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-600)' }}>
                        Kategori:
                      </span>
                      <select
                        value={reportCategoryFilter}
                        onChange={(e) => setReportCategoryFilter(e.target.value)}
                        className="form-control"
                        style={{
                          fontSize: '0.8125rem',
                          padding: '6px 12px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          width: 'auto',
                          minWidth: '150px',
                          backgroundColor: 'var(--white)',
                        }}
                      >
                        <option value="Semua">Semua Kategori</option>
                        <option value="Jalan Rusak">Jalan Rusak</option>
                        <option value="Sampah Menumpuk">Sampah Menumpuk</option>
                        <option value="Lampu Jalan Mati">Lampu Jalan Mati</option>
                        <option value="Banjir & Drainase">Banjir & Drainase</option>
                        <option value="Fasilitas Umum">Fasilitas Umum</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    {/* Sort Select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-600)' }}>
                        Urutkan:
                      </span>
                      <select
                        value={reportSortBy}
                        onChange={(e) => setReportSortBy(e.target.value as any)}
                        className="form-control"
                        style={{
                          fontSize: '0.8125rem',
                          padding: '6px 12px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          width: 'auto',
                          minWidth: '130px',
                          backgroundColor: 'var(--white)',
                        }}
                      >
                        <option value="terbaru">Paling Baru</option>
                        <option value="terlama">Paling Lama</option>
                        <option value="urgensi">Urgensi Tertinggi</option>
                        <option value="dukungan">Dukungan Terbanyak</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Active Filter Pills & Summary Row */}
                {(reportSearch || reportStatusFilter !== 'Semua' || reportCategoryFilter !== 'Semua') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--slate-200)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Filter Aktif:</span>

                      {reportSearch && (
                        <span
                          className="badge badge-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Cari: &ldquo;{reportSearch}&rdquo;
                          <button
                            type="button"
                            onClick={() => setReportSearch('')}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )}

                      {reportStatusFilter !== 'Semua' && (
                        <span
                          className="badge badge-info"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Status: {reportStatusFilter}
                          <button
                            type="button"
                            onClick={() => setReportStatusFilter('Semua')}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )}

                      {reportCategoryFilter !== 'Semua' && (
                        <span
                          className="badge badge-warning"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Kategori: {reportCategoryFilter}
                          <button
                            type="button"
                            onClick={() => setReportCategoryFilter('Semua')}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )}

                      <span style={{ color: 'var(--slate-600)', fontWeight: 700 }}>
                        (Ditemukan {filteredReports.length} laporan)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="btn btn-sm btn-ghost"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--danger-solid)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RotateCcw size={12} /> Reset Semua Filter
                    </button>
                  </div>
                )}
              </div>

              {/* Reports Count Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  color: 'var(--slate-500)',
                }}
              >
                <div>
                  Menampilkan <strong>{filteredReports.length}</strong> dari {reports.length} total laporan
                </div>
              </div>

              {/* Reports List or Empty State */}
              {filteredReports.length === 0 ? (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--slate-300)',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--slate-100)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--slate-400)',
                      marginBottom: '16px',
                    }}
                  >
                    <Search size={28} />
                  </div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '6px' }}>
                    Tidak Ada Laporan yang Sesuai
                  </h4>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 20px' }}>
                    Tidak ditemukan aduan dengan kata kunci &ldquo;{reportSearch}&rdquo; atau filter yang dipilih. Coba ganti kata kunci atau reset filter.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={14} /> Atur Ulang Filter Pencarian
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredReports.map((report) => {
                    const isDone = report.status === 'Selesai';
                    const isProcess = report.status === 'Diproses';
                    const isRejected = report.status === 'Ditolak';

                    return (
                      <div
                        key={report.id}
                        style={{
                          padding: '20px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'var(--white)',
                          boxShadow: 'var(--shadow-xs)',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary-300)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--slate-200)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                        }}
                      >
                        {/* Top Meta Bar */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                color: 'var(--primary-700)',
                                backgroundColor: 'var(--primary-50)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--primary-200)',
                              }}
                            >
                              {report.ticketNumber}
                            </span>
                            <span className="badge badge-neutral">{report.category}</span>
                            {report.urgency && (
                              <span
                                className={`badge ${
                                  report.urgency === 'Darurat'
                                    ? 'badge-danger'
                                    : report.urgency === 'Tinggi'
                                    ? 'badge-warning'
                                    : 'badge-info'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                Urgensi: {report.urgency}
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`badge ${
                              isDone
                                ? 'badge-success'
                                : isProcess
                                ? 'badge-info'
                                : isRejected
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle size={13} /> Selesai Ditangani
                              </>
                            ) : isProcess ? (
                              <>
                                <RefreshCw size={13} /> Sedang Dikerjakan
                              </>
                            ) : isRejected ? (
                              <>
                                <XCircle size={13} /> Tidak Diproses
                              </>
                            ) : (
                              <>
                                <Clock size={13} /> Menunggu Verifikasi
                              </>
                            )}
                          </span>
                        </div>

                        {/* Agency Badge */}
                        {report.agency && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--primary-800)',
                              backgroundColor: 'var(--primary-50)',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              marginBottom: '10px',
                              border: '1px solid var(--primary-200)',
                            }}
                          >
                            <Building size={13} color="var(--primary-600)" />
                            <span>Dinas Penangan: {report.agency}</span>
                          </div>
                        )}

                        {/* Title & Description */}
                        <h4
                          style={{
                            fontSize: '1.0625rem',
                            fontWeight: 700,
                            color: 'var(--slate-900)',
                            marginBottom: '6px',
                          }}
                        >
                          {report.title}
                        </h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '14px' }}>
                          {report.description}
                        </p>

                        {/* Photo Evidence Thumbnails */}
                        {report.images && report.images.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--slate-600)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px',
                              }}
                            >
                              <ImageIcon size={14} color="var(--primary-600)" />
                              <span>Foto Bukti Masalah ({report.images.length} Lampiran):</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                              {report.images.map((imgUrl, i) => (
                                <div
                                  key={i}
                                  onClick={() => openReportDetail(report)}
                                  style={{
                                    position: 'relative',
                                    width: '84px',
                                    height: '62px',
                                    borderRadius: 'var(--radius-sm)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--slate-200)',
                                    backgroundColor: 'var(--slate-900)',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'transform var(--transition-fast)',
                                  }}
                                  title="Klik untuk melihat foto bukti dalam ukuran besar"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Bukti ${i + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                      color: 'white',
                                      fontSize: '0.625rem',
                                      textAlign: 'center',
                                      padding: '1px',
                                    }}
                                  >
                                    Foto #{i + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timeline Progress Bar */}
                        <div
                          style={{
                            backgroundColor: 'var(--slate-50)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 16px',
                            marginBottom: '16px',
                            border: '1px solid var(--slate-100)',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px' }}>
                            Alur Tindak Lanjut:
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--success-solid)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={12} /> 1. Diterima
                            </span>
                            <span style={{ color: 'var(--slate-300)' }}>➔</span>
                            <span
                              style={{
                                color: isDone || isProcess || isRejected ? 'var(--success-solid)' : 'var(--slate-400)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle size={12} /> 2. Verifikasi Lapangan
                            </span>
                            <span style={{ color: 'var(--slate-300)' }}>➔</span>
                            <span
                              style={{
                                color: isDone ? 'var(--success-solid)' : isProcess ? 'var(--info-solid)' : isRejected ? 'var(--danger-solid)' : 'var(--slate-400)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isRejected ? <XCircle size={12} /> : <CheckCircle size={12} />} 3. Penanganan Fisik
                            </span>
                            <span style={{ color: 'var(--slate-300)' }}>➔</span>
                            <span
                              style={{
                                color: isDone ? 'var(--success-solid)' : isRejected ? 'var(--danger-solid)' : 'var(--slate-400)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isRejected ? <XCircle size={12} /> : <CheckCircle size={12} />} 4. Status Akhir
                            </span>
                          </div>
                        </div>

                        {/* Location, Date & Action Buttons Footer */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            fontSize: '0.8125rem',
                            color: 'var(--slate-500)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={14} color="var(--primary-600)" />
                              <span>{report.location}</span>
                            </div>
                            {report.coordinates && (
                              <a
                                href={`https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.6875rem',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  textDecoration: 'none',
                                  fontWeight: 700,
                                }}
                                title="Buka titik koordinat di Google Maps"
                              >
                                <Navigation size={10} /> GPS ({report.coordinates.lat.toFixed(4)}, {report.coordinates.lng.toFixed(4)})
                              </a>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Like Button */}
                            <button
                              type="button"
                              onClick={() => likeReport(report.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'none',
                                border: '1px solid var(--slate-200)',
                                borderRadius: 'var(--radius-full)',
                                padding: '3px 10px',
                                fontSize: '0.75rem',
                                color: '#e11d48',
                                backgroundColor: '#fff1f2',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                              title="Dukung Laporan Warga Ini"
                            >
                              <Heart size={12} fill="#e11d48" /> {report.likes || 0}
                            </button>

                            <span>Tanggal: {report.date}</span>

                            <button
                              type="button"
                              onClick={() => openReportDetail(report)}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            >
                              Detail Tiket & Bukti
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PENGATURAN NOTIFIKASI & PRIVASI */}
          {activeTab === 'notifications' && (
            <div style={{ padding: '32px' }}>
              <div style={{ maxWidth: '640px' }}>
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Preferensi Pemberitahuan & Privasi Warga
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                    Tentukan saluran notifikasi yang Anda inginkan saat ada perkembangan laporan jalan rusak, sampah, lampu mati, atau aduan lainnya.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* WhatsApp Notification */}
                  <label className="switch-label">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--success-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--success-solid)',
                        }}
                      >
                        <Phone size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                          Pemberitahuan Instan WhatsApp
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Dapatkan pesan saat petugas tiba di lokasi & perbaikan selesai ke {user.phone}.
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={notifState.whatsappUpdates}
                      onChange={() => handleNotificationChange('whatsappUpdates')}
                    />
                  </label>

                  {/* Email Notification */}
                  <label className="switch-label">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--info-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--info-solid)',
                        }}
                      >
                        <Mail size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                          Laporan Berkala via Email
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Kirim ringkasan laporan & bukti foto perbaikan ke {user.email}.
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={notifState.emailUpdates}
                      onChange={() => handleNotificationChange('emailUpdates')}
                    />
                  </label>

                  {/* Web Push */}
                  <label className="switch-label">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--warning-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--warning-solid)',
                        }}
                      >
                        <Bell size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                          Notifikasi Browser / Web Push
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Tampilkan banner popup saat aplikasi sedang dibuka.
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={notifState.webPush}
                      onChange={() => handleNotificationChange('webPush')}
                    />
                  </label>

                  {/* Privacy Toggle */}
                  <label className="switch-label" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--slate-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--slate-700)',
                        }}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                          Mode Anonim di Papan Publik
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Nama Anda disamarkan sebagai &quot;Warga Peduli&quot; di daftar laporan terbuka publik.
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={notifState.publicAnonymous}
                      onChange={() => handleNotificationChange('publicAnonymous')}
                    />
                  </label>
                </div>

                {/* Zona Bahaya */}
                <div
                  style={{
                    marginTop: '48px',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-border)',
                    backgroundColor: 'var(--danger-bg)',
                  }}
                >
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '4px' }}>
                    Zona Bahaya: Penonaktifan Akun
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--danger-text)', opacity: 0.9, marginBottom: '14px', lineHeight: 1.4 }}>
                    Jika Anda menonaktifkan akun warga ini, Anda tidak akan lagi menerima riwayat penanganan laporan yang sedang berjalan.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      showToast('error', 'Aksi Dibatasi', 'Penonaktifan akun hanya dapat dilakukan dengan melampirkan formulir pembatalan ke dinas.')
                    }
                    className="btn btn-sm btn-danger"
                  >
                    Minta Penonaktifan Akun
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {avatarModalOpen && (
        <div className="modal-overlay" onClick={() => setAvatarModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
              Pilih Foto Profil Warga
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '20px' }}>
              Pilih salah satu avatar representasi identitas akun Anda di LaporKita.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {AVATAR_PRESETS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProfileData((prev) => ({ ...prev, avatarUrl: url }));
                    updateProfile({ avatarUrl: url });
                    setAvatarModalOpen(false);
                  }}
                  style={{
                    border: (profileData.avatarUrl || user.avatarUrl) === url ? '3px solid var(--primary-600)' : '2px solid var(--slate-200)',
                    borderRadius: '50%',
                    padding: '2px',
                    background: 'none',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    width: '84px',
                    height: '84px',
                    margin: '0 auto',
                    transition: 'transform var(--transition-fast)',
                  }}
                >
                  <img
                    src={url}
                    alt={`Avatar option ${idx + 1}`}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAvatarModalOpen(false)}
              className="btn btn-secondary btn-block"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* DETAIL TIKET & BUKTI FOTO MODAL */}
      {selectedReportDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 999,
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={closeReportDetail}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
              padding: '28px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: 'var(--primary-700)',
                      backgroundColor: 'var(--primary-50)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--primary-200)',
                    }}
                  >
                    {selectedReportDetail.ticketNumber}
                  </span>
                  <span className="badge badge-neutral">{selectedReportDetail.category}</span>
                  {selectedReportDetail.urgency && (
                    <span className="badge badge-warning">Urgensi: {selectedReportDetail.urgency}</span>
                  )}
                  <span
                    className={`badge ${
                      selectedReportDetail.status === 'Selesai'
                        ? 'badge-success'
                        : selectedReportDetail.status === 'Diproses'
                        ? 'badge-info'
                        : 'badge-warning'
                    }`}
                  >
                    Status: {selectedReportDetail.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.3 }}>
                  {selectedReportDetail.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeReportDetail}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--slate-200)',
                  backgroundColor: 'var(--slate-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--slate-600)',
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Evidence Photos Gallery */}
            {selectedReportDetail.images && selectedReportDetail.images.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={16} color="var(--primary-600)" />
                  <span>Foto Bukti Masalah Lapangan ({selectedReportDetail.images.length} Foto Terlampir):</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: selectedReportDetail.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {selectedReportDetail.images.map((img, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--slate-200)',
                        backgroundColor: 'var(--slate-900)',
                        position: 'relative',
                        aspectRatio: '16 / 10',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Foto Bukti ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          backgroundColor: 'rgba(15, 23, 42, 0.8)',
                          color: 'white',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        Foto Bukti #{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta & Description Box */}
            <div
              style={{
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--slate-200)',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.875rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '2px' }}>
                  Instansi Pemerintah Penanggung Jawab:
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building size={16} color="var(--primary-600)" />
                  {selectedReportDetail.agency || 'Dinas Terkait Wilayah'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '2px' }}>
                  Deskripsi & Kronologi Masalah:
                </div>
                <p style={{ color: 'var(--slate-700)', lineHeight: 1.5 }}>
                  {selectedReportDetail.description}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--slate-200)',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-600)' }}>
                  <MapPin size={14} color="var(--primary-600)" />
                  <span>{selectedReportDetail.location}</span>
                </div>
                <div style={{ color: 'var(--slate-500)' }}>
                  Diajukan pada: {selectedReportDetail.date}
                </div>
              </div>

              {/* GPS Coordinates in detail modal */}
              {selectedReportDetail.coordinates && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Navigation size={15} color="#059669" />
                    <div>
                      <span style={{ fontWeight: 700, color: '#065f46' }}>Titik GPS: </span>
                      <span style={{ fontFamily: 'monospace', color: '#047857' }}>
                        {selectedReportDetail.coordinates.lat.toFixed(6)}, {selectedReportDetail.coordinates.lng.toFixed(6)}
                      </span>
                      {selectedReportDetail.coordinates.accuracy && (
                        <span style={{ color: '#059669', fontSize: '0.75rem', marginLeft: '6px' }}>
                          (±{selectedReportDetail.coordinates.accuracy} m)
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedReportDetail.coordinates.lat},${selectedReportDetail.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={12} /> Buka Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div
              style={{
                backgroundColor: 'var(--primary-50)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                border: '1px solid var(--primary-100)',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', marginBottom: '8px' }}>
                Alur Progres Penanganan Instansi:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--success-solid)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={13} /> 1. Diterima Instansi
                </span>
                <span style={{ color: 'var(--slate-400)' }}>➔</span>
                <span
                  style={{
                    color: selectedReportDetail.status === 'Diproses' || selectedReportDetail.status === 'Selesai' ? 'var(--success-solid)' : 'var(--slate-400)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle size={13} /> 2. Verifikasi Lapangan
                </span>
                <span style={{ color: 'var(--slate-400)' }}>➔</span>
                <span
                  style={{
                    color: selectedReportDetail.status === 'Selesai' ? 'var(--success-solid)' : selectedReportDetail.status === 'Diproses' ? 'var(--info-solid)' : 'var(--slate-400)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle size={13} /> 3. Penanganan Fisik
                </span>
                <span style={{ color: 'var(--slate-400)' }}>➔</span>
                <span
                  style={{
                    color: selectedReportDetail.status === 'Selesai' ? 'var(--success-solid)' : 'var(--slate-400)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle size={13} /> 4. Selesai Ditutup
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeReportDetail}
                className="btn btn-secondary"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '12px', color: 'var(--slate-600)' }}>Memuat profil warga...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
