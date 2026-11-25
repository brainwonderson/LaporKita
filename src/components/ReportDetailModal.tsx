'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Building,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Image as ImageIcon,
  User,
  Map as MapIcon,
  Bell,
  BellOff,
  Share2,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Flag,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ReportItem } from '@/types';

interface ReportDetailModalProps {
  report: ReportItem | null;
  onClose: () => void;
  onLike?: (reportId: string) => void;
}

export default function ReportDetailModal({ report, onClose, onLike }: ReportDetailModalProps) {
  const { likeReport: authLikeReport, hasSupportedReport, addComment, deleteComment, getComments, followReport, hasFollowedReport, user, showToast } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showAbuseForm, setShowAbuseForm] = useState(false);
  const [abuseReason, setAbuseReason] = useState('spam');
  const [abuseDetails, setAbuseDetails] = useState('');
  const [abuseSubmitted, setAbuseSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);
  const [isSubmittingReportAction, setIsSubmittingReportAction] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Derived state for comments
  const reportComments = report ? getComments(report.id) : [];
  const isFollowed = report ? hasFollowedReport(report.id) : false;
  const reportId = report?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!reportId || !userId || userId === 'usr-89211') return;

    const controller = new AbortController();
    const loadReportActions = async () => {
      try {
        const params = new URLSearchParams({ reportId, userId });
        const response = await fetch(`/api/reports/feedback?${params}`, { signal: controller.signal });
        if (!response.ok) return;

        const result = await response.json();
        setAbuseSubmitted(Boolean(result.abuseSubmitted));
        if (result.feedback) {
          setFeedbackRating(Number(result.feedback.rating));
          setFeedbackText(result.feedback.feedback);
          setHasSavedFeedback(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Gagal memuat feedback laporan:', error);
        }
      }
    };

    loadReportActions();
    return () => controller.abort();
  }, [reportId, userId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeImageIndex !== null) {
          setActiveImageIndex(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeImageIndex]);

  // Close share menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShareMenu]);

  if (!report) return null;

  const isDone = report.status === 'Selesai';
  const isProcess = report.status === 'Diproses';
  const isRejected = report.status === 'Ditolak';

  const handleCopyTicket = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(report.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/laporan?selected=${report.id}`;
    navigator?.clipboard?.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/laporan?selected=${report.id}`;
    const text = encodeURIComponent(`🔔 *Laporan Aduan LaporKita*\n📌 ${report.title}\n📍 ${report.location}\n🎫 ${report.ticketNumber}\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareTwitter = () => {
    const url = `${window.location.origin}/laporan?selected=${report.id}`;
    const text = encodeURIComponent(`Laporan warga: ${report.title} di ${report.location}. #LaporKita #AduanWarga`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addComment(report.id, commentText);
    setCommentText('');
  };

  const handleSubmitAbuse = async () => {
    if (!user || user.id === 'usr-89211') {
      showToast('error', 'Masuk Diperlukan', 'Masuk dengan akun terdaftar untuk melaporkan penyalahgunaan.');
      return;
    }

    setIsSubmittingReportAction(true);
    try {
      const response = await fetch('/api/reports/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abuse',
          reportId: report.id,
          userId: user.id,
          reason: abuseReason,
          details: abuseDetails,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim laporan.');

      setAbuseSubmitted(true);
      setShowAbuseForm(false);
      showToast('success', 'Laporan Diterima', 'Terima kasih. Laporan ini akan ditinjau oleh tim kami.');
    } catch (error) {
      showToast('error', 'Gagal Melaporkan', error instanceof Error ? error.message : 'Silakan coba lagi.');
    } finally {
      setIsSubmittingReportAction(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || user.id === 'usr-89211') {
      showToast('error', 'Masuk Diperlukan', 'Masuk dengan akun terdaftar untuk memberi feedback.');
      return;
    }

    setIsSubmittingReportAction(true);
    try {
      const response = await fetch('/api/reports/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback',
          reportId: report.id,
          userId: user.id,
          rating: feedbackRating,
          feedback: feedbackText,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan feedback.');

      setHasSavedFeedback(true);
      showToast('success', 'Feedback Tersimpan', 'Terima kasih atas penilaian Anda terhadap penanganan laporan.');
    } catch (error) {
      showToast('error', 'Gagal Menyimpan Feedback', error instanceof Error ? error.message : 'Silakan coba lagi.');
    } finally {
      setIsSubmittingReportAction(false);
    }
  };

  const formatCommentTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} jam lalu`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} hari lalu`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '720px',
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
        {/* Modal Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  color: 'var(--primary-700)',
                  backgroundColor: 'var(--primary-50)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--primary-200)',
                }}
              >
                <span>{report.ticketNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copied ? 'var(--success-solid)' : 'var(--slate-400)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Salin Nomor Tiket"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>

              <span className="badge badge-neutral" style={{ fontWeight: 600 }}>{report.category}</span>

              {report.urgency && (
                <span
                  className={`badge ${
                    report.urgency === 'Darurat'
                      ? 'badge-danger'
                      : report.urgency === 'Tinggi'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                  style={{ fontSize: '0.75rem' }}
                >
                  Urgensi: {report.urgency}
                </span>
              )}

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
                style={{ fontWeight: 700 }}
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
                    <XCircle size={13} /> Tidak Dapat Diproses
                  </>
                ) : (
                  <>
                    <Clock size={13} /> Menunggu Verifikasi
                  </>
                )}
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.35 }}>
              {report.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '1px solid var(--slate-200)',
              backgroundColor: 'var(--slate-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--slate-600)',
              flexShrink: 0,
              transition: 'background var(--transition-fast)',
            }}
            title="Tutup Modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Evidence Photos Gallery */}
        {report.images && report.images.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--slate-700)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ImageIcon size={16} color="var(--primary-600)" />
              <span>Foto Bukti Masalah Lapangan ({report.images.length} Foto):</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: report.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
              }}
            >
              {report.images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--slate-200)',
                    backgroundColor: 'var(--slate-900)',
                    position: 'relative',
                    aspectRatio: '16 / 10',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)',
                  }}
                  title="Klik untuk perbesar foto"
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
                    Foto #{i + 1} • Klik untuk zoom
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox / Zoom view */}
        {activeImageIndex !== null && report.images && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.9)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setActiveImageIndex(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img
                src={report.images[activeImageIndex]}
                alt="Zoom view"
                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              />
              <button
                type="button"
                onClick={() => setActiveImageIndex(null)}
                style={{
                  position: 'absolute',
                  top: '-16px',
                  right: '-16px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Meta & Description Box */}
        <div
          style={{
            backgroundColor: 'var(--slate-50)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            border: '1px solid var(--slate-200)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '0.875rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '3px' }}>
              Instansi Penanggung Jawab:
            </div>
            <div style={{ fontWeight: 700, color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={16} color="var(--primary-600)" />
              {report.agency || 'Dinas Terkait Wilayah'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '3px' }}>
              Deskripsi Masalah Lengkap:
            </div>
            <p style={{ color: 'var(--slate-700)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {report.description}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--slate-200)',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-700)' }}>
              <MapPin size={15} color="var(--primary-600)" />
              <span style={{ fontWeight: 600 }}>{report.location}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--slate-500)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} />
                <span>{report.reporterName || (report.isAnonymous ? 'Warga Anonim' : 'Warga Peduli')}</span>
              </div>
              <span>•</span>
              <div>Tanggal: {report.date}</div>
            </div>
          </div>

          {/* GPS Coordinates */}
          {report.coordinates && (
            <div
              style={{
                marginTop: '4px',
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
                  <span style={{ fontWeight: 700, color: '#065f46' }}>Koordinat Presisi: </span>
                  <span style={{ fontFamily: 'monospace', color: '#047857' }}>
                    {report.coordinates.lat.toFixed(6)}, {report.coordinates.lng.toFixed(6)}
                  </span>
                  {report.coordinates.accuracy && (
                    <span style={{ color: '#059669', fontSize: '0.75rem', marginLeft: '6px' }}>
                      (Akurasi ±{report.coordinates.accuracy} meter)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link
                  href={`/laporan?selected=${report.id}`}
                  onClick={onClose}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--primary-700)',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MapIcon size={12} /> Buka di Peta LaporKita
                </Link>
                <a
                  href={`https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#047857',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ExternalLink size={12} /> Buka Peta Satelit
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Alur Tracking Timeline */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--slate-200)',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '12px' }}>
            Tahapan Penanganan Aduan:
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success-solid)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4px' }}>
                <CheckCircle size={14} /> 1. Diterima
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--slate-500)', fontWeight: 400 }}>Tiket tercatat</div>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isProcess || isDone || isRejected ? 'var(--success-bg)' : 'var(--slate-50)',
                border: `1px solid ${isProcess || isDone || isRejected ? 'var(--success-border)' : 'var(--slate-200)'}`,
                color: isProcess || isDone || isRejected ? 'var(--success-solid)' : 'var(--slate-400)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4px' }}>
                {isProcess || isDone || isRejected ? <CheckCircle size={14} /> : <Clock size={14} />} 2. Verifikasi
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--slate-500)', fontWeight: 400 }}>Cek kelayakan</div>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isDone ? 'var(--success-bg)' : isProcess ? 'var(--info-bg)' : isRejected ? '#fef2f2' : 'var(--slate-50)',
                border: `1px solid ${isDone ? 'var(--success-border)' : isProcess ? 'var(--info-border)' : isRejected ? '#fecaca' : 'var(--slate-200)'}`,
                color: isDone ? 'var(--success-solid)' : isProcess ? 'var(--info-solid)' : isRejected ? 'var(--danger-solid)' : 'var(--slate-400)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4px' }}>
                {isDone ? <CheckCircle size={14} /> : isProcess ? <RefreshCw size={14} /> : isRejected ? <XCircle size={14} /> : <Clock size={14} />} 3. Penanganan
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--slate-500)', fontWeight: 400 }}>
                {isRejected ? 'Objek di luar dinas' : 'Tindakan dinas'}
              </div>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isDone ? 'var(--success-bg)' : isRejected ? '#fef2f2' : 'var(--slate-50)',
                border: `1px solid ${isDone ? 'var(--success-border)' : isRejected ? '#fecaca' : 'var(--slate-200)'}`,
                color: isDone ? 'var(--success-solid)' : isRejected ? 'var(--danger-solid)' : 'var(--slate-400)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4px' }}>
                {isDone ? <CheckCircle size={14} /> : isRejected ? <XCircle size={14} /> : <Clock size={14} />} 4. Status Akhir
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--slate-500)', fontWeight: 400 }}>
                {isDone ? 'Pekerjaan tuntas' : isRejected ? 'Ditolak/Mediasi' : 'Menunggu selesai'}
              </div>
            </div>
          </div>
        </div>

        {/* === SOCIAL ACTION BAR: Follow, Share, Like === */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0 16px',
            borderTop: '1px solid var(--slate-200)',
            borderBottom: '1px solid var(--slate-200)',
            marginBottom: '20px',
          }}
        >
          {/* Like Button */}
          {(() => {
            const isSupported = hasSupportedReport ? hasSupportedReport(report.id) : false;
            const handleVote = () => {
              if (onLike) onLike(report.id);
              else if (authLikeReport) authLikeReport(report.id);
            };
            return (
              <button
                type="button"
                onClick={handleVote}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isSupported ? '#fda4af' : 'var(--slate-300)'}`,
                  backgroundColor: isSupported ? '#ffe4e6' : 'var(--slate-50)',
                  color: isSupported ? '#be123c' : 'var(--slate-600)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isSupported ? 'Batalkan dukungan' : 'Dukung laporan ini'}
              >
                <Heart size={15} fill={isSupported ? '#e11d48' : 'none'} color={isSupported ? '#e11d48' : 'var(--slate-500)'} />
                <span>{isSupported ? `Didukung (${report.likes})` : `Dukung (${report.likes})`}</span>
              </button>
            );
          })()}

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Follow Button */}
            <button
              type="button"
              onClick={() => followReport(report.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${isFollowed ? '#7c3aed' : 'var(--slate-300)'}`,
                backgroundColor: isFollowed ? '#ede9fe' : 'var(--slate-50)',
                color: isFollowed ? '#6d28d9' : 'var(--slate-600)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={isFollowed ? 'Berhenti mengikuti laporan' : 'Ikuti perkembangan laporan'}
            >
              {isFollowed ? <BellOff size={15} /> : <Bell size={15} />}
              <span>{isFollowed ? 'Berhenti Ikuti' : 'Ikuti Laporan'}</span>
            </button>

            {/* Share Button */}
            <div ref={shareRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowShareMenu((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: showShareMenu ? 'var(--primary-50)' : 'var(--slate-50)',
                  color: showShareMenu ? 'var(--primary-700)' : 'var(--slate-600)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Share2 size={15} />
                <span>Bagikan</span>
              </button>

              {/* Share Dropdown */}
              {showShareMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '190px',
                    zIndex: 100,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.12s ease-out',
                  }}
                >
                  {[
                    { icon: '💬', label: 'Bagikan ke WhatsApp', onClick: handleShareWhatsApp, color: '#16a34a' },
                    { icon: '🐦', label: 'Bagikan ke Twitter/X', onClick: handleShareTwitter, color: '#0ea5e9' },
                    { icon: linkCopied ? '✅' : '🔗', label: linkCopied ? 'Tautan Tersalin!' : 'Salin Tautan', onClick: handleCopyLink, color: 'var(--slate-700)' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={item.onClick}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'none',
                        border: 'none',
                        borderBottom: i < 2 ? '1px solid var(--slate-100)' : 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: item.color,
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--slate-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <section style={{ marginBottom: '20px', padding: '14px 16px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <Flag size={17} color="var(--danger-solid)" />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)' }}>Laporan palsu atau spam?</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  {abuseSubmitted ? 'Laporan penyalahgunaan sudah Anda kirim.' : 'Laporkan agar dapat ditinjau oleh tim.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAbuseForm((open) => !open)}
              disabled={abuseSubmitted}
              style={{ border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', background: abuseSubmitted ? 'var(--slate-100)' : 'var(--white)', color: 'var(--slate-700)', fontSize: '0.75rem', fontWeight: 700, cursor: abuseSubmitted ? 'default' : 'pointer', flexShrink: 0 }}
            >
              {abuseSubmitted ? 'Terkirim' : showAbuseForm ? 'Tutup' : 'Laporkan'}
            </button>
          </div>

          {showAbuseForm && (
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              {!user || user.id === 'usr-89211' ? (
                <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '0.8125rem' }}>Masuk dengan akun terdaftar untuk mengirim laporan.</p>
              ) : (
                <>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                    Alasan
                    <select value={abuseReason} onChange={(event) => setAbuseReason(event.target.value)} style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit' }}>
                      <option value="spam">Spam atau promosi</option>
                      <option value="penyalahgunaan">Penyalahgunaan fitur/laporan</option>
                      <option value="konten_tidak_pantas">Konten tidak pantas</option>
                      <option value="palsu">Informasi/foto diduga palsu</option>
                      <option value="duplikat">Laporan duplikat</option>
                      <option value="tidak_relevan">Tidak relevan atau salah kategori</option>
                      <option value="lainnya">Alasan lainnya</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                    Keterangan (opsional)
                    <textarea value={abuseDetails} onChange={(event) => setAbuseDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Jelaskan alasan laporan ini perlu ditinjau" style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', resize: 'vertical' }} />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={handleSubmitAbuse} disabled={isSubmittingReportAction} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: 'var(--radius-sm)', padding: '8px 12px', background: 'var(--danger-solid)', color: 'white', fontSize: '0.8125rem', fontWeight: 700, cursor: isSubmittingReportAction ? 'wait' : 'pointer' }}>
                      <Flag size={14} /> {isSubmittingReportAction ? 'Mengirim...' : 'Kirim laporan'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {isDone && report.reporterId === user?.id && (
          <section style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-bg)' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--slate-900)' }}>Bagaimana penanganan laporan ini?</div>
            <p style={{ margin: '4px 0 12px', fontSize: '0.8125rem', color: 'var(--slate-600)' }}>Beri rating dan ceritakan pengalaman Anda setelah laporan selesai ditangani.</p>
            <div role="group" aria-label="Rating penanganan" style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" onClick={() => setFeedbackRating(rating)} aria-label={`${rating} dari 5 bintang`} title={`${rating} dari 5 bintang`} style={{ width: '36px', height: '36px', display: 'grid', placeItems: 'center', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'white', color: rating <= feedbackRating ? '#d97706' : 'var(--slate-400)', cursor: 'pointer' }}>
                  <Star size={19} fill={rating <= feedbackRating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label style={{ display: 'grid', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)' }}>
              Feedback penyelesaian
              <textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} maxLength={1000} rows={3} placeholder="Apakah masalah sudah tertangani dengan baik?" style={{ padding: '9px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-800)', font: 'inherit', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{hasSavedFeedback ? 'Feedback Anda tersimpan dan dapat diperbarui.' : `${feedbackText.length}/1.000`}</span>
              <button type="button" onClick={handleSubmitFeedback} disabled={isSubmittingReportAction || feedbackRating === 0 || feedbackText.trim().length < 3} style={{ border: 0, borderRadius: 'var(--radius-sm)', padding: '8px 12px', background: feedbackRating > 0 && feedbackText.trim().length >= 3 ? 'var(--success-solid)' : 'var(--slate-300)', color: 'white', fontSize: '0.8125rem', fontWeight: 700, cursor: isSubmittingReportAction ? 'wait' : 'pointer' }}>
                {isSubmittingReportAction ? 'Menyimpan...' : hasSavedFeedback ? 'Perbarui feedback' : 'Kirim feedback'}
              </button>
            </div>
          </section>
        )}

        {/* === COMMENT SECTION === */}
        <div style={{ marginBottom: '20px' }}>
          {/* Comment Header Toggle */}
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--slate-800)',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0 0 12px 0',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <MessageCircle size={17} color="var(--primary-600)" />
            <span>Komentar Masyarakat ({reportComments.length})</span>
            <span style={{ marginLeft: 'auto', color: 'var(--slate-400)' }}>
              {showComments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {showComments && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Comment Input Box */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=warga`}
                  alt="Avatar"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    placeholder="Tulis komentar Anda... (Enter untuk kirim)"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--slate-300)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      color: 'var(--slate-800)',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--slate-300)')}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        backgroundColor: commentText.trim() ? 'var(--primary-600)' : 'var(--slate-300)',
                        color: 'white',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: commentText.trim() ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Send size={13} />
                      Kirim
                    </button>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              {reportComments.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--slate-400)',
                    fontSize: '0.875rem',
                    border: '1px dashed var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  💬 Belum ada komentar. Jadilah yang pertama berkomentar!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {reportComments.map((cmt) => (
                    <div
                      key={cmt.id}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        padding: '12px',
                        backgroundColor: cmt.isOwner ? 'var(--primary-50)' : 'var(--white)',
                        border: `1px solid ${cmt.isOwner ? 'var(--primary-200)' : 'var(--slate-200)'}`,
                        borderRadius: 'var(--radius-md)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <img
                        src={cmt.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cmt.authorName)}`}
                        alt={cmt.authorName}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--slate-900)' }}>{cmt.authorName}</span>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: cmt.authorRole === 'Petugas' ? '#dbeafe' : cmt.authorRole === 'Admin' || cmt.authorRole === 'Admin Instansi' ? '#fef9c3' : 'var(--slate-100)',
                              color: cmt.authorRole === 'Petugas' ? '#1d4ed8' : cmt.authorRole === 'Admin' || cmt.authorRole === 'Admin Instansi' ? '#854d0e' : 'var(--slate-600)',
                            }}
                          >
                            {cmt.authorRole}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginLeft: 'auto' }}>{formatCommentTime(cmt.createdAt)}</span>
                          {cmt.isOwner && (
                            <button
                              type="button"
                              onClick={() => deleteComment(cmt.id)}
                              title="Hapus komentar"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--slate-400)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--slate-700)', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {cmt.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* === MODAL FOOTER === */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
            <Copy size={13} />
            <button
              type="button"
              onClick={handleCopyTicket}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copied ? 'var(--success-solid)' : 'var(--slate-600)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={13} /> : null}
              {copied ? 'Tiket Tersalin!' : report.ticketNumber}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
