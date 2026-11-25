'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, LockKeyhole } from 'lucide-react';

export default function AgencyLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activationMessage, setActivationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get('activated') === '1') {
        setActivationMessage('Akun berhasil diaktifkan. Silakan masuk dengan kata sandi yang baru dibuat.');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/agency/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Tidak dapat masuk sebagai Admin Instansi.');
      router.replace('/instansi');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: '36px 20px', background: 'linear-gradient(145deg, var(--slate-50), #e8f4f1)' }}>
      <main style={{ width: '100%', maxWidth: '430px', padding: '30px', background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: '46px', height: '46px', display: 'grid', placeItems: 'center', marginBottom: '20px', borderRadius: '12px', background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
          <Building2 size={24} />
        </div>
        <p style={{ margin: '0 0 7px', color: 'var(--primary-700)', fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase' }}>LaporKita · Portal Instansi</p>
        <h1 style={{ margin: '0 0 8px', color: 'var(--slate-900)', fontSize: '1.6rem', fontWeight: 800 }}>Masuk Admin Instansi</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--slate-600)', fontSize: '.9rem', lineHeight: 1.5 }}>Gunakan akun resmi yang ditautkan ke instansi oleh Admin LaporKita.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          {activationMessage && <p role="status" style={{ margin: 0, padding: '10px 12px', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '.8125rem' }}>{activationMessage}</p>}
          <label style={{ display: 'grid', gap: '7px', color: 'var(--slate-700)', fontSize: '.8125rem', fontWeight: 700 }}>
            Email atau NIK
            <input autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-900)', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: '7px', color: 'var(--slate-700)', fontSize: '.8125rem', fontWeight: 700 }}>
            Kata sandi
            <span style={{ position: 'relative', display: 'block' }}>
              <LockKeyhole size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--slate-400)' }} />
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 38px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-900)', font: 'inherit' }} />
            </span>
          </label>
          {error && <p role="alert" style={{ margin: 0, padding: '10px 12px', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.8125rem' }}>{error}</p>}
          <button type="submit" disabled={isSubmitting} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '11px 14px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--primary-700)', color: 'white', fontSize: '.875rem', fontWeight: 800, cursor: isSubmitting ? 'wait' : 'pointer' }}>
            {isSubmitting ? 'Memverifikasi...' : 'Masuk ke dashboard'} <ArrowRight size={16} />
          </button>
        </form>
      </main>
    </div>
  );
}
