'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function StaffLoginPage() {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'Petugas') router.replace('/petugas');
  }, [router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const signedIn = await login(identifier, password, 'Petugas');
    if (signedIn) {
      router.replace('/petugas');
    } else {
      setError('Tidak dapat masuk. Pastikan akun Petugas aktif dan email/NIK serta kata sandi benar.');
    }
  };

  return (
    <main style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: '36px 20px', background: 'var(--slate-50)' }}>
      <section style={{ width: '100%', maxWidth: 440, padding: 28, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, display: 'inline-grid', placeItems: 'center', borderRadius: 14, background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <ClipboardList size={24} />
          </div>
          <h1 style={{ margin: '14px 0 6px', color: 'var(--slate-900)', fontSize: '1.4rem', fontWeight: 800 }}>Login Petugas</h1>
          <p style={{ margin: 0, color: 'var(--slate-600)', fontSize: '.85rem', lineHeight: 1.5 }}>Masuk untuk melihat dan menangani tugas lapangan yang ditugaskan kepada Anda.</p>
        </header>

        {error && <p role="alert" style={{ margin: '0 0 16px', padding: 10, border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '.8rem' }}>{error}</p>}

        <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, color: 'var(--slate-700)', fontSize: '.8rem', fontWeight: 700 }}>
            Email atau NIK
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)' }}>
              <UserRound size={16} color="var(--slate-400)" />
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                style={{ width: '100%', border: 0, outline: 0, color: 'var(--slate-800)', font: 'inherit' }}
              />
            </span>
          </label>
          <label style={{ display: 'grid', gap: 6, color: 'var(--slate-700)', fontSize: '.8rem', fontWeight: 700 }}>
            Kata sandi
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--slate-300)', borderRadius: 'var(--radius-sm)' }}>
              <LockKeyhole size={16} color="var(--slate-400)" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={{ width: '100%', border: 0, outline: 0, color: 'var(--slate-800)', font: 'inherit' }}
              />
            </span>
          </label>
          <button type="submit" disabled={isLoading} style={{ marginTop: 4, padding: '11px 14px', border: 0, borderRadius: 'var(--radius-sm)', background: isLoading ? 'var(--slate-400)' : 'var(--primary-700)', color: 'white', fontSize: '.84rem', fontWeight: 800, cursor: isLoading ? 'wait' : 'pointer' }}>
            {isLoading ? 'Memeriksa akun...' : 'Masuk ke Dashboard Petugas'}
          </button>
        </form>
        <p style={{ margin: '18px 0 0', textAlign: 'center', color: 'var(--slate-500)', fontSize: '.76rem' }}>
          Bukan akun Petugas? <Link href="/login" style={{ color: 'var(--primary-700)', fontWeight: 700 }}>Masuk melalui halaman umum</Link>
        </p>
      </section>
    </main>
  );
}
