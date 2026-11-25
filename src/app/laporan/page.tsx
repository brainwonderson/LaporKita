'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { ReportItem } from '@/types';
import ReportDetailModal from '@/components/ReportDetailModal';
import {
  MapPin,
  Search,
  Filter,
  RotateCcw,
  Heart,
  SlidersHorizontal,
  ExternalLink,
  Map as MapIcon,
  LayoutGrid,
  Columns2,
  Building,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Flame,
  Check,
  Copy,
  ChevronRight,
  Loader2
} from 'lucide-react';

// Dynamic import Leaflet map with SSR disabled
const ReportMap = dynamic(() => import('@/components/ReportMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '560px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--slate-100)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--slate-200)',
      }}
    >
      <div style={{ textAlign: 'center', color: 'var(--slate-500)' }}>
        <Loader2 size={36} color="var(--primary-600)" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-700)' }}>
          Menyiapkan Peta Sebaran Aduan Publik...
        </p>
        <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>Memuat koordinat lokasi dan data spasial wilayah</p>
      </div>
    </div>
  ),
});

const CATEGORIES = [
  'Semua Kategori',
  'Jalan Rusak',
  'Sampah Menumpuk',
  'Lampu Jalan Mati',
  'Banjir & Drainase',
  'Fasilitas Umum',
  'Lainnya',
] as const;

function LaporanPublikContent() {
  const searchParams = useSearchParams();
  const { reports, likeReport, hasSupportedReport, user } = useAuth();

  // URL query params
  const initialSelected = searchParams.get('selected');
  const initialCategory = searchParams.get('kategori');
  const initialView = (searchParams.get('view') as 'map' | 'grid' | 'split') || 'split';

  // Component state
  const [viewMode, setViewMode] = useState<'map' | 'grid' | 'split'>(initialView);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialSelected);
  const [modalReport, setModalReport] = useState<ReportItem | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategory ? initialCategory : 'Semua Kategori'
  );
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak'>('Semua');
  const [urgencyFilter, setUrgencyFilter] = useState<'Semua' | 'Darurat' | 'Tinggi' | 'Sedang' | 'Rendah'>('Semua');
  const [sortBy, setSortBy] = useState<'likes' | 'date' | 'urgency'>('likes');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If URL changes, sync selected report
  useEffect(() => {
    if (initialSelected) {
      setSelectedReportId(initialSelected);
      const found = reports.find((r) => r.id === initialSelected);
      if (found) {
        setModalReport(found);
      }
    }
  }, [initialSelected, reports]);

  // Handle ticket copy
  const handleCopyTicket = (ticket: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ticket);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filtered and Sorted Reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((item) => {
        // Search Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTicket = item.ticketNumber.toLowerCase().includes(q);
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchLoc = item.location.toLowerCase().includes(q);
          const matchAgency = item.agency.toLowerCase().includes(q);
          const matchReporter = item.reporterName?.toLowerCase().includes(q);
          if (!matchTicket && !matchTitle && !matchLoc && !matchAgency && !matchReporter) {
            return false;
          }
        }

        // Category Filter
        if (categoryFilter !== 'Semua Kategori' && item.category !== categoryFilter) {
          return false;
        }

        // Status Filter
        if (statusFilter !== 'Semua' && item.status !== statusFilter) {
          return false;
        }

        // Urgency Filter
        if (urgencyFilter !== 'Semua' && item.urgency !== urgencyFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') {
          return (b.likes || 0) - (a.likes || 0);
        }
        if (sortBy === 'urgency') {
          const weight: Record<string, number> = { Darurat: 4, Tinggi: 3, Sedang: 2, Rendah: 1 };
          return (weight[b.urgency] || 0) - (weight[a.urgency] || 0);
        }
        // default by date / ID
        return b.id.localeCompare(a.id);
      });
  }, [reports, searchTerm, categoryFilter, statusFilter, urgencyFilter, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const selesai = reports.filter((r) => r.status === 'Selesai').length;
    const proses = reports.filter((r) => r.status === 'Diproses').length;
    const totalLikes = reports.reduce((acc, r) => acc + (r.likes || 0), 0);
    return { total, selesai, proses, totalLikes };
  }, [reports]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('Semua Kategori');
    setStatusFilter('Semua');
    setUrgencyFilter('Semua');
    setSortBy('likes');
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    categoryFilter !== 'Semua Kategori' ||
    statusFilter !== 'Semua' ||
    urgencyFilter !== 'Semua' ||
    sortBy !== 'likes';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--slate-50)', paddingBottom: '80px' }}>
      {/* HERO BANNER SECTION */}
      <section
        style={{
          background: 'radial-gradient(circle at 50% 0%, #ccfbf1 0%, #f0fdfa 45%, #f8fafc 100%)',
          paddingTop: '36px',
          paddingBottom: '32px',
          borderBottom: '1px solid var(--slate-200)',
          marginBottom: '28px',
        }}
      >
        <div className="container">
          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8125rem',
              color: 'var(--slate-500)',
              marginBottom: '12px',
            }}
          >
            <Link href="/" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
              Beranda
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>Laporan Publik & Peta Aduan</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ maxWidth: '720px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(13, 148, 136, 0.1)',
                  color: 'var(--primary-800)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '12px',
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                }}
              >
                <Sparkles size={14} color="var(--primary-600)" />
                Transparansi Masalah Lingkungan & Solidaritas Warga
              </div>

              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: 'var(--slate-900)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  marginBottom: '10px',
                }}
              >
                Peta & Eksplorasi Laporan Publik Warga
              </h1>

              <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Pantau sebaran titik kerusakan fasilitas umum di peta kota, periksa kemajuan tindak lanjut dari dinas terkait,
                dan <strong>berikan dukungan suara (upvote)</strong> pada aduan masyarakat lain agar segera diprioritaskan.
              </p>
            </div>

            {/* Quick Action Button */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/lapor" className="btn btn-primary" style={{ boxShadow: 'var(--shadow-teal)' }}>
                <PlusCircle size={18} />
                <span>Laporkan Masalah Baru</span>
              </Link>
              <Link href="/profile?tab=reports" className="btn btn-secondary">
                <span>Aduan Saya</span>
              </Link>
            </div>
          </div>

          {/* KEY METRICS SUMMARY BAR */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginTop: '28px',
            }}
          >
            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderLeft: '4px solid var(--primary-600)',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '2px' }}>
                  Total Titik Laporan Publik
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderLeft: '4px solid var(--success-solid)',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success-solid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-solid)', lineHeight: 1.1 }}>
                  {stats.selesai}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '2px' }}>
                  Aduan Tuntas Dikerjakan
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderLeft: '4px solid var(--info-solid)',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--info-bg)',
                  color: 'var(--info-solid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--info-solid)', lineHeight: 1.1 }}>
                  {stats.proses}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '2px' }}>
                  Sedang Ditindaklanjuti
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderLeft: '4px solid #f43f5e',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#fff1f2',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={22} fill="#e11d48" />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', lineHeight: 1.1 }}>
                  {stats.totalLikes}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '2px' }}>
                  Total Dukungan Suara Warga
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="container">
        {/* VIEW MODE SWITCHER & SEARCH CONTROLS */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-sm)',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Top Row: Search Input + View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Search Input Bar */}
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari tiket (LPK-...), judul aduan, nama jalan, pelapor, atau dinas penangan..."
                className="form-control"
                style={{
                  paddingLeft: '42px',
                  paddingRight: searchTerm ? '40px' : '14px',
                  height: '46px',
                  fontSize: '0.9375rem',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-400)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Toggle Switch */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--slate-100)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('split')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'split' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'split' ? 'var(--primary-800)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'split' ? 'var(--shadow-xs)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
                title="Tampilan Belah: Peta di sisi kiri dan daftar aduan di sisi kanan"
              >
                <Columns2 size={16} />
                <span className="hide-on-mobile">Mode Belah</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'map' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'map' ? 'var(--primary-800)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'map' ? 'var(--shadow-xs)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
                title="Tampilan Peta Penuh dengan filter interaktif"
              >
                <MapIcon size={16} />
                <span>Peta Interaktif</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'grid' ? 'var(--white)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--primary-800)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
                title="Tampilan Daftar Kartu Masalah"
              >
                <LayoutGrid size={16} />
                <span>Daftar Kartu</span>
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = categoryFilter === cat;
              const count =
                cat === 'Semua Kategori'
                  ? reports.length
                  : reports.filter((r) => r.category === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 700 : 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? 'var(--primary-600)' : 'var(--slate-200)'}`,
                    backgroundColor: isActive ? 'var(--primary-600)' : 'var(--white)',
                    color: isActive ? 'white' : 'var(--slate-700)',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{cat}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--slate-100)',
                      color: isActive ? 'white' : 'var(--slate-600)',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub Filters Row: Status, Urgency, Sort, Reset */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--slate-100)',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--slate-500)' }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="form-control"
                  style={{ height: '34px', padding: '0 10px', fontSize: '0.8125rem', width: 'auto' }}
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Menunggu">⏳ Menunggu</option>
                  <option value="Diproses">⚙️ Diproses</option>
                  <option value="Selesai">✓ Selesai</option>
                  <option value="Ditolak">✕ Ditolak</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--slate-500)' }}>Urgensi:</span>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value as any)}
                  className="form-control"
                  style={{ height: '34px', padding: '0 10px', fontSize: '0.8125rem', width: 'auto' }}
                >
                  <option value="Semua">Semua Urgensi</option>
                  <option value="Darurat">🚨 Darurat</option>
                  <option value="Tinggi">⚠️ Tinggi</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>

              {/* Sorting Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--slate-500)' }}>Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="form-control"
                  style={{ height: '34px', padding: '0 10px', fontSize: '0.8125rem', width: 'auto' }}
                >
                  <option value="likes">🔥 Dukungan Warga Terbanyak (Voting)</option>
                  <option value="date">🕒 Laporan Terbaru</option>
                  <option value="urgency">⚡ Tingkat Urgensi Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={13} />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* RESULTS INFO BAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            fontSize: '0.875rem',
            color: 'var(--slate-600)',
          }}
        >
          <div>
            Menampilkan <strong style={{ color: 'var(--slate-900)' }}>{filteredReports.length}</strong> aduan
            {categoryFilter !== 'Semua Kategori' && (
              <span> dalam kategori <strong>{categoryFilter}</strong></span>
            )}
            {statusFilter !== 'Semua' && (
              <span> status <strong>{statusFilter}</strong></span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            💡 Klik tombol <strong>Hati / Dukung</strong> untuk memberi suara pada masalah di lingkungan Anda.
          </div>
        </div>

        {/* ============================================================
            VIEW MODE 1: INTERACTIVE MAP VIEW (PETA PENUH)
           ============================================================ */}
        {viewMode === 'map' && (
          <div style={{ marginBottom: '32px' }}>
            <ReportMap
              reports={filteredReports}
              selectedReportId={selectedReportId}
              onSelectReport={(report) => {
                setSelectedReportId(report.id);
                setModalReport(report);
              }}
              onLikeReport={likeReport}
              hasSupportedReport={hasSupportedReport}
              height="640px"
            />
          </div>
        )}

        {/* ============================================================
            VIEW MODE 2: SPLIT VIEW (PETA & KARTU BERDAMPINGAN)
           ============================================================ */}
        {viewMode === 'split' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(320px, 0.9fr)',
              gap: '24px',
              alignItems: 'start',
              marginBottom: '32px',
            }}
            className="split-layout"
          >
            {/* Left Column: Sticky Interactive Map */}
            <div style={{ position: 'sticky', top: '90px' }}>
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapIcon size={16} color="var(--primary-600)" />
                  <span>Sebaran Titik Peta</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Klik kartu aduan untuk sorot lokasi
                </span>
              </div>
              <ReportMap
                reports={filteredReports}
                selectedReportId={selectedReportId}
                onSelectReport={(report) => {
                  setSelectedReportId(report.id);
                  setModalReport(report);
                }}
                onLikeReport={likeReport}
                hasSupportedReport={hasSupportedReport}
                height="620px"
              />
            </div>

            {/* Right Column: Scrollable Report Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredReports.length === 0 ? (
                <EmptyState onReset={handleResetFilters} />
              ) : (
                filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    isSelected={selectedReportId === report.id}
                    isSupported={hasSupportedReport(report.id)}
                    copiedId={copiedId}
                    onCopyTicket={handleCopyTicket}
                    onOpenDetail={() => {
                      setSelectedReportId(report.id);
                      setModalReport(report);
                    }}
                    onFocusMap={() => {
                      setSelectedReportId(report.id);
                    }}
                    onLike={() => likeReport(report.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            VIEW MODE 3: CARD GRID VIEW (DAFTAR KARTU 3 KOLOM)
           ============================================================ */}
        {viewMode === 'grid' && (
          <div>
            {filteredReports.length === 0 ? (
              <EmptyState onReset={handleResetFilters} />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '24px',
                  marginBottom: '32px',
                }}
              >
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    isSelected={selectedReportId === report.id}
                    isSupported={hasSupportedReport(report.id)}
                    copiedId={copiedId}
                    onCopyTicket={handleCopyTicket}
                    onOpenDetail={() => {
                      setSelectedReportId(report.id);
                      setModalReport(report);
                    }}
                    onFocusMap={() => {
                      setSelectedReportId(report.id);
                      setViewMode('map');
                    }}
                    onLike={() => likeReport(report.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <ReportDetailModal
        key={modalReport?.id ?? 'closed'}
        report={modalReport}
        onClose={() => setModalReport(null)}
        onLike={likeReport}
      />
    </div>
  );
}

// -------------------------------------------------------------
// INDIVIDUAL REPORT CARD COMPONENT
// -------------------------------------------------------------
interface ReportCardProps {
  report: ReportItem;
  isSelected: boolean;
  isSupported: boolean;
  copiedId: string | null;
  onCopyTicket: (ticket: string, id: string, e: React.MouseEvent) => void;
  onOpenDetail: () => void;
  onFocusMap: () => void;
  onLike: () => void;
}

function ReportCard({
  report,
  isSelected,
  isSupported,
  copiedId,
  onCopyTicket,
  onOpenDetail,
  onFocusMap,
  onLike,
}: ReportCardProps) {
  const isDone = report.status === 'Selesai';
  const isProcess = report.status === 'Diproses';
  const isRejected = report.status === 'Ditolak';

  return (
    <div
      className={`card card-hover ${isSelected ? 'selected-card-glow' : ''}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--white)',
        border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
        boxShadow: isSelected ? 'var(--shadow-teal)' : 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Card Image Banner */}
      <div
        style={{
          position: 'relative',
          height: '180px',
          width: '100%',
          backgroundColor: 'var(--slate-900)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={onOpenDetail}
      >
        <img
          src={
            report.images && report.images[0]
              ? report.images[0]
              : 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80'
          }
          alt={report.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
        />

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0) 40%, rgba(15,23,42,0.6) 100%)',
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
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
            style={{ fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {isDone ? (
              <>
                <CheckCircle size={12} /> Selesai
              </>
            ) : isProcess ? (
              <>
                <RefreshCw size={12} /> Diproses
              </>
            ) : isRejected ? (
              <>
                <XCircle size={12} /> Ditolak
              </>
            ) : (
              <>
                <Clock size={12} /> Menunggu
              </>
            )}
          </span>

          {/* Urgency Badge */}
          {report.urgency && (
            <span
              className={`badge ${
                report.urgency === 'Darurat'
                  ? 'badge-danger'
                  : report.urgency === 'Tinggi'
                  ? 'badge-warning'
                  : 'badge-neutral'
              }`}
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                backgroundColor: report.urgency === 'Darurat' ? '#dc2626' : undefined,
                color: report.urgency === 'Darurat' ? 'white' : undefined,
              }}
            >
              {report.urgency === 'Darurat' && '🚨 '}
              {report.urgency}
            </span>
          )}
        </div>

        {/* Bottom Image Info: Category & Photo Count */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {report.category}
          </span>

          {report.images && report.images.length > 1 && (
            <span
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backdropFilter: 'blur(4px)',
              }}
            >
              📷 {report.images.length} Foto
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
        {/* Ticket Number & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
          <div
            onClick={(e) => onCopyTicket(report.ticketNumber, report.id, e)}
            style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              color: 'var(--primary-700)',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Klik untuk salin nomor tiket"
          >
            <span>{report.ticketNumber}</span>
            {copiedId === report.id ? <Check size={11} color="var(--success-solid)" /> : <Copy size={11} />}
          </div>

          <div style={{ color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} />
            <span>{report.date}</span>
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={onOpenDetail}
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--slate-900)',
            lineHeight: 1.4,
            cursor: 'pointer',
          }}
          className="hover-underline"
        >
          {report.title}
        </h3>

        {/* Description snippet */}
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--slate-600)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {report.description}
        </p>

        {/* Meta Info: Location & Agency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--slate-600)', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="var(--primary-600)" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {report.location}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="var(--slate-400)" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--primary-800)', fontWeight: 600 }}>
              {report.agency}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-500)', fontSize: '0.75rem' }}>
            <User size={13} style={{ flexShrink: 0 }} />
            <span>Pelapor: <strong>{report.reporterName || (report.isAnonymous ? 'Warga Anonim' : 'Warga Peduli')}</strong></span>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid var(--slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* VOTING / SUPPORT BUTTON */}
          <button
            type="button"
            onClick={onLike}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${isSupported ? '#fda4af' : '#e2e8f0'}`,
              backgroundColor: isSupported ? '#ffe4e6' : '#f8fafc',
              color: isSupported ? '#be123c' : '#475569',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: isSupported ? '0 0 0 2px rgba(244, 63, 94, 0.2)' : 'none',
            }}
            title={isSupported ? 'Klik untuk membatalkan dukungan Anda' : 'Klik untuk memberikan dukungan warga'}
          >
            <Heart size={15} fill={isSupported ? '#e11d48' : 'none'} color="#e11d48" />
            <span>{report.likes || 0} Dukungan</span>
          </button>

          {/* Action Buttons: Fokus Peta & Buka Detail */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={onFocusMap}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Lihat titik ini di peta"
            >
              <MapIcon size={13} color="var(--primary-600)" />
              <span className="hide-on-mobile">Peta</span>
            </button>

            <button
              type="button"
              onClick={onOpenDetail}
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <span>Detail</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// EMPTY STATE COMPONENT
// -------------------------------------------------------------
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--slate-200)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-50)',
          color: 'var(--primary-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Search size={28} />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
        Tidak Ditemukan Laporan yang Sesuai
      </h3>
      <p style={{ color: 'var(--slate-600)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.875rem', lineHeight: 1.5 }}>
        Coba ubah kata kunci pencarian, sesuaikan filter status, atau reset filter untuk menampilkan semua laporan publik warga.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn btn-primary btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <RotateCcw size={14} />
        <span>Reset Seluruh Filter</span>
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN EXPORT WITH SUSPENSE (NEXT.JS APP ROUTER SAFE)
// -------------------------------------------------------------
export default function LaporanPublikPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Loader2 className="spin" size={36} color="var(--primary-600)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--slate-600)' }}>Memuat Portal Laporan Publik...</p>
        </div>
      }
    >
      <LaporanPublikContent />
    </Suspense>
  );
}
