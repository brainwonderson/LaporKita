'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserRound } from 'lucide-react';

export default function StaffActivationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/staff/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Tidak dapat mengaktifkan akun.');
      router.replace('/petugas/login?activated=1');
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: '36px 20px', background: 'linear-gradient(145deg, var(--slate-50), #e8f4f1)' }}>
      <main style={{ width: '100%', maxWidth: '430px', padding: '30px', background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: '46px', height: '46px', display: 'grid', placeItems: 'center', marginBottom: '20px', borderRadius: '12px', background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
          <UserRound size={24} />
        </div>
        <p style={{ margin: '0 0 7px', color: 'var(--primary-700)', fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase' }}>LaporKita · Portal Petugas</p>
        <h1 style={{ margin: '0 0 8px', color: 'var(--slate-900)', fontSize: '1.6rem', fontWeight: 800 }}>Aktifkan akun Petugas</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--slate-600)', fontSize: '.9rem', lineHeight: 1.5 }}>Buat kata sandi untuk menyelesaikan aktivasi. Tautan undangan hanya dapat digunakan sekali dan berlaku selama 48 jam.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '7px', color: 'var(--slate-700)', fontSize: '.8125rem', fontWeight: 700 }}>
            Kata sandi baru
            <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-900)', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: '7px', color: 'var(--slate-700)', fontSize: '.8125rem', fontWeight: 700 }}>
            Ulangi kata sandi
            <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-900)', font: 'inherit' }} />
          </label>
          {error && <p role="alert" style={{ margin: 0, padding: '10px 12px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.8125rem' }}>{error}</p>}
          <button type="submit" disabled={isSubmitting || !token} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '11px 14px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontSize: '.875rem', fontWeight: 800, cursor: isSubmitting ? 'wait' : 'pointer' }}>
            {isSubmitting ? 'Mengaktifkan...' : 'Aktifkan akun'} <ArrowRight size={16} />
          </button>
        </form>
        {!token && <p role="alert" style={{ margin: '12px 0 0', color: 'var(--danger-text)', fontSize: '.8rem' }}>Tautan aktivasi tidak memiliki token. Gunakan tautan terbaru dari email undangan.</p>}
      </main>
    </div>
  );
}
