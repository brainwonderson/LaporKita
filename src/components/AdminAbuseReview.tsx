'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Eye, Flag, X } from 'lucide-react';

type AbuseReviewStatus = 'pending' | 'dismissed' | 'action_required';

type AbuseReport = {
  id: string;
  reason: string;
  details: string;
  reviewStatus: AbuseReviewStatus;
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  reporterName: string;
  reporterEmail: string;
  report: {
    id: string;
    ticketNumber: string;
    title: string;
    category: string;
    location: string;
    description: string;
    status: string;
    images: string[];
  };
};

const reasonLabels: Record<string, string> = {
  spam: 'Spam atau promosi',
  penyalahgunaan: 'Penyalahgunaan',
  konten_tidak_pantas: 'Konten tidak pantas',
  palsu: 'Informasi/foto diduga palsu',
  duplikat: 'Laporan duplikat',
  tidak_relevan: 'Tidak relevan atau salah kategori',
  lainnya: 'Alasan lainnya',
};

const reviewStatusLabels: Record<AbuseReviewStatus, string> = {
  pending: 'Menunggu ditinjau',
  dismissed: 'Tidak perlu tindakan',
  action_required: 'Perlu tindak lanjut',
};

export default function AdminAbuseReview() {
  const router = useRouter();
  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>([]);
  const [selectedAbuseReport, setSelectedAbuseReport] = useState<AbuseReport | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/abuse-reports', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        if (!response.ok) throw new Error(result.error || 'Gagal memuat antrean peninjauan konten.');
        return result;
      })
      .then((result) => {
        if (active && result) setAbuseReports(Array.isArray(result.abuseReports) ? result.abuseReports as AbuseReport[] : []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat antrean peninjauan konten.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const pendingCount = useMemo(
    () => abuseReports.filter((report) => report.reviewStatus === 'pending').length,
    [abuseReports],
  );
  const visibleReports = statusFilter === 'pending'
    ? abuseReports.filter((report) => report.reviewStatus === 'pending')
    : abuseReports;

  const openReview = (report: AbuseReport) => {
    setSelectedAbuseReport(report);
    setReviewNote(report.reviewNote);
    setError('');
  };

  const saveReview = async (reviewStatus: Exclude<AbuseReviewStatus, 'pending'>) => {
    if (!selectedAbuseReport) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/abuse-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAbuseReport.id,
          reviewStatus,
          reviewNote,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan hasil peninjauan.');

      const updatedReport: AbuseReport = {
        ...selectedAbuseReport,
        ...result.abuseReport,
      };
      setAbuseReports((current) => current.map((report) => (
        report.id === updatedReport.id ? updatedReport : report
      )));
      setSelectedAbuseReport(updatedReport);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan hasil peninjauan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section aria-label="Peninjauan aduan konten" style={{ marginBottom: '20px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--slate-800)', fontSize: '1rem', fontWeight: 800 }}>
              <Flag size={18} color="var(--danger-solid)" /> Peninjauan aduan konten
              <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: pendingCount > 0 ? 'var(--danger-bg)' : 'var(--slate-100)', color: pendingCount > 0 ? 'var(--danger-text)' : 'var(--slate-600)', fontSize: '.7rem' }}>{pendingCount} baru</span>
            </h2>
            <p style={{ margin: '5px 0 0', color: 'var(--slate-500)', fontSize: '.75rem' }}>Tinjau laporan warga yang ditandai sebagai spam, penyalahgunaan, atau konten tidak pantas.</p>
          </div>
          <label style={{ display: 'grid', gap: '4px', color: 'var(--slate-600)', fontSize: '.7rem', fontWeight: 700 }}>
            Tampilkan
            <select aria-label="Filter status peninjauan aduan konten" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'pending' | 'all')} style={{ minWidth: '170px', padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', font: 'inherit' }}>
              <option value="pending">Menunggu ditinjau</option>
              <option value="all">Semua aduan</option>
            </select>
          </label>
        </header>
        {error && !selectedAbuseReport && <p role="alert" style={{ margin: 0, padding: '10px 16px', color: 'var(--danger-text)', fontSize: '.78rem' }}>{error}</p>}
        {isLoading ? (
          <p style={{ margin: 0, padding: '28px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>Memuat aduan konten...</p>
        ) : visibleReports.length === 0 ? (
          <p style={{ margin: 0, padding: '28px 16px', color: 'var(--slate-500)', textAlign: 'center', fontSize: '.8rem' }}>
            {statusFilter === 'pending' ? 'Tidak ada aduan konten yang menunggu peninjauan.' : 'Belum ada aduan konten.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ color: 'var(--slate-500)', background: 'var(--slate-50)', fontSize: '.68rem', textTransform: 'uppercase' }}>
                <tr>{['Aduan', 'Laporan terkait', 'Pelapor aduan', 'Dikirim', 'Status tinjauan', 'Aksi'].map((heading) => <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid var(--slate-200)' }}>{heading}</th>)}</tr>
              </thead>
              <tbody>{visibleReports.map((abuseReport) => (
                <tr key={abuseReport.id}>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)' }}>
                    <strong style={{ display: 'block', color: 'var(--slate-800)', fontSize: '.78rem' }}>{reasonLabels[abuseReport.reason] ?? abuseReport.reason}</strong>
                    {abuseReport.details && <span style={{ display: 'block', maxWidth: '240px', marginTop: '3px', color: 'var(--slate-500)', fontSize: '.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{abuseReport.details}</span>}
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)' }}>
                    <strong style={{ display: 'block', color: 'var(--primary-700)', fontSize: '.7rem' }}>{abuseReport.report.ticketNumber}</strong>
                    <span style={{ color: 'var(--slate-700)', fontSize: '.75rem' }}>{abuseReport.report.title}</span>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-700)', fontSize: '.75rem' }}>{abuseReport.reporterName}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-600)', fontSize: '.7rem', whiteSpace: 'nowrap' }}>{new Date(abuseReport.createdAt).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--slate-100)', color: abuseReport.reviewStatus === 'pending' ? 'var(--warning-text)' : abuseReport.reviewStatus === 'action_required' ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '.72rem', fontWeight: 700 }}>{reviewStatusLabels[abuseReport.reviewStatus]}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--slate-100)' }}>
                    <button type="button" onClick={() => openReview(abuseReport)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 8px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>
                      <Eye size={14} /> Tinjau
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <footer style={{ padding: '9px 16px', borderTop: '1px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '.7rem' }}>
          Hasil tinjauan dicatat untuk admin; laporan asli tidak dihapus atau disembunyikan otomatis.
        </footer>
      </section>

      {selectedAbuseReport && (
        <div role="presentation" onClick={() => { if (!isSaving) setSelectedAbuseReport(null); }} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(15, 23, 42, 0.62)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="abuse-review-title" onClick={(event) => event.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: 'var(--shadow-xl)' }}>
            <header style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', padding: '16px 18px', borderBottom: '1px solid var(--slate-200)', background: 'white' }}>
              <div>
                <div style={{ color: 'var(--danger-text)', fontSize: '.72rem', fontWeight: 800 }}>{reasonLabels[selectedAbuseReport.reason] ?? selectedAbuseReport.reason}</div>
                <h2 id="abuse-review-title" style={{ margin: '4px 0 0', color: 'var(--slate-900)', fontSize: '1.1rem', fontWeight: 800 }}>Tinjau aduan konten</h2>
              </div>
              <button type="button" onClick={() => setSelectedAbuseReport(null)} disabled={isSaving} aria-label="Tutup peninjauan aduan" style={{ width: '34px', height: '34px', display: 'grid', placeItems: 'center', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--slate-700)', cursor: 'pointer' }}><X size={17} /></button>
            </header>
            <div style={{ display: 'grid', gap: '16px', padding: '18px' }}>
              <section style={{ padding: '13px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', background: 'var(--slate-50)' }}>
                <div style={{ color: 'var(--primary-700)', fontSize: '.7rem', fontWeight: 800 }}>{selectedAbuseReport.report.ticketNumber} · {selectedAbuseReport.report.category} · {selectedAbuseReport.report.status}</div>
                <h3 style={{ margin: '5px 0', color: 'var(--slate-900)', fontSize: '.95rem', fontWeight: 800 }}>{selectedAbuseReport.report.title}</h3>
                <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.72rem' }}>{selectedAbuseReport.report.location}</p>
                <p style={{ margin: '11px 0 0', color: 'var(--slate-700)', fontSize: '.8rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{selectedAbuseReport.report.description || 'Laporan tidak memiliki deskripsi.'}</p>
                {selectedAbuseReport.report.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '7px', marginTop: '12px' }}>
                    {selectedAbuseReport.report.images.map((image, index) => (
                      <a key={`${image.slice(0, 24)}-${index}`} href={image} target="_blank" rel="noreferrer" aria-label={`Buka foto laporan ${index + 1}`} style={{ position: 'relative', display: 'block', aspectRatio: '4 / 3', overflow: 'hidden', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)' }}>
                        <Image src={image} alt={`Foto laporan ${index + 1}`} fill unoptimized sizes="120px" style={{ objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h3 style={{ margin: '0 0 5px', color: 'var(--slate-800)', fontSize: '.8rem', fontWeight: 800 }}>Alasan dan keterangan pelapor</h3>
                <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.78rem' }}>{reasonLabels[selectedAbuseReport.reason] ?? selectedAbuseReport.reason}</p>
                <p style={{ margin: '5px 0 0', color: 'var(--slate-700)', fontSize: '.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selectedAbuseReport.details || 'Pelapor tidak menambahkan keterangan.'}</p>
                <p style={{ margin: '7px 0 0', color: 'var(--slate-500)', fontSize: '.7rem' }}>Dikirim oleh {selectedAbuseReport.reporterName} ({selectedAbuseReport.reporterEmail}) · {new Date(selectedAbuseReport.createdAt).toLocaleString('id-ID')}</p>
              </section>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--slate-700)', fontSize: '.75rem', fontWeight: 700 }}>
                Catatan hasil peninjauan (opsional)
                <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} rows={3} placeholder="Catat alasan keputusan atau tindak lanjut yang diperlukan" style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-800)', font: 'inherit', resize: 'vertical' }} />
              </label>
              {selectedAbuseReport.reviewStatus !== 'pending' && (
                <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '.72rem' }}>
                  Status: {reviewStatusLabels[selectedAbuseReport.reviewStatus]}
                  {selectedAbuseReport.reviewerName ? ` · Ditinjau oleh ${selectedAbuseReport.reviewerName}` : ''}
                  {selectedAbuseReport.reviewedAt ? ` · ${new Date(selectedAbuseReport.reviewedAt).toLocaleString('id-ID')}` : ''}
                </p>
              )}
              {error && <p role="alert" style={{ margin: 0, color: 'var(--danger-text)', fontSize: '.78rem' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => void saveReview('dismissed')} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 11px', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'white', color: 'var(--success-text)', fontSize: '.75rem', fontWeight: 800, cursor: isSaving ? 'wait' : 'pointer' }}>
                  <CheckCircle2 size={15} /> Tidak perlu tindakan
                </button>
                <button type="button" onClick={() => void saveReview('action_required')} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 11px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--danger-solid)', color: 'white', fontSize: '.75rem', fontWeight: 800, cursor: isSaving ? 'wait' : 'pointer' }}>
                  <AlertTriangle size={15} /> Tandai perlu tindak lanjut
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
