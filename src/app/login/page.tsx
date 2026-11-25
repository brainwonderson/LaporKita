'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  X,
  Mail,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo, isLoading, showToast } = useAuth();

  const [identifier, setIdentifier] = useState('budi.santoso@warga.id');
  const [password, setPassword] = useState('SandiWarga2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  // Modal lupa kata sandi state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Mohon masukkan Email, NIK, atau Nomor HP Anda.');
      return;
    }

    if (!password) {
      setError('Mohon masukkan kata sandi.');
      return;
    }

    const success = await login(identifier, password);
    if (success) {
      const storedUser = localStorage.getItem('laporkita_user_session');
      const loggedInUser = storedUser ? JSON.parse(storedUser) as { role?: string } : null;
      router.replace(loggedInUser?.role === 'Admin' ? '/admin' : loggedInUser?.role === 'Admin Instansi' ? '/instansi' : loggedInUser?.role === 'Petugas' ? '/petugas' : '/profile');
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    router.push('/profile');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      showToast('success', 'Tautan Terkirim', 'Instruksi reset sandi telah dikirimkan ke email Anda.');
    }, 500);
  };

  return (
    <div
      style={{
        paddingTop: '48px',
        paddingBottom: '80px',
        background: 'var(--hero-gradient)',
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="container-auth">
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'var(--primary-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--white)',
              boxShadow: 'var(--shadow-teal)',
              marginBottom: '16px',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 800,
              color: 'var(--slate-900)',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            Selamat Datang di LaporKita
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem' }}>
            Masuk untuk melaporkan masalah lingkungan atau memantau progres aduan Anda.
          </p>
        </div>

        {/* Card Form */}
        <div className="card" style={{ padding: '32px 28px', backgroundColor: 'var(--white)' }}>
          {/* Quick Demo Button Box */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--warning-solid)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning-text)' }}>
                Akun Demo Pengujian Cepat
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--slate-700)', lineHeight: 1.4 }}>
              Masuk langsung sebagai <strong>Pak Budi Santoso</strong> (NIK & 4 Laporan Warga aktif) tanpa repot mengetik.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn btn-sm btn-block"
              style={{
                backgroundColor: 'var(--warning-solid)',
                color: 'var(--white)',
                marginTop: '4px',
                fontWeight: 700,
              }}
            >
              <Sparkles size={15} /> Masuk Akun Demo Sekarang
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <div style={{ borderTop: '1px solid var(--slate-200)' }} />
            <span
              style={{
                position: 'relative',
                top: '-10px',
                backgroundColor: 'var(--white)',
                padding: '0 12px',
                fontSize: '0.8125rem',
                color: 'var(--slate-400)',
                fontWeight: 600,
              }}
            >
              atau masuk dengan data akun
            </span>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger-text)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Input Identitas */}
            <div className="form-group">
              <label className="form-label" htmlFor="identifier">
                <span>Email, NIK, atau No. WhatsApp</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <User size={18} />
                </span>
                <input
                  id="identifier"
                  type="text"
                  placeholder="Contoh: 327101xxxxxx atau nama@email.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="form-control has-icon-left"
                  required
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotSent(false);
                    setForgotEmail(identifier.includes('@') ? identifier : '');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-700)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="input-wrapper" style={{ marginTop: '6px' }}>
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control has-icon-left has-icon-right"
                  required
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.875rem',
                  color: 'var(--slate-600)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Ingat saya di perangkat ini
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block btn-lg"
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  Masuk ke LaporKita <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Alternatif IKD / Google */}
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => {
                showToast('info', 'Simulasi IKD', 'Fitur integrasi Identitas Kependudukan Digital (IKD) aktif.');
                handleDemoLogin();
              }}
              className="btn btn-secondary btn-block"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '0.875rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Masuk dengan Akun Google
            </button>
          </div>

          {/* Register Redirect */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--slate-100)',
              fontSize: '0.875rem',
              color: 'var(--slate-600)',
            }}
          >
            Belum terdaftar sebagai warga?{' '}
            <Link
              href="/register"
              style={{
                color: 'var(--primary-700)',
                fontWeight: 700,
              }}
            >
              Daftar Akun Baru
            </Link>
            <p style={{ margin: '12px 0 0', fontSize: '.8rem' }}>
              Petugas lapangan?{' '}
              <Link href="/petugas/login" style={{ color: 'var(--primary-700)', fontWeight: 700 }}>
                Masuk melalui Login Petugas
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal Lupa Kata Sandi */}
      {forgotModalOpen && (
        <div className="modal-overlay" onClick={() => setForgotModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                Pemulihan Kata Sandi
              </h3>
              <button
                onClick={() => setForgotModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--success-bg)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={32} color="var(--success-solid)" />
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                  Tautan Pemulihan Dikirim!
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                  Kami telah mengirimkan tautan reset kata sandi ke <strong>{forgotEmail}</strong>. Silakan periksa kotak masuk atau folder spam Anda.
                </p>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '20px' }}
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Masukkan alamat email yang terdaftar pada akun LaporKita Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgotEmail">
                    Alamat Email Terdaftar
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon-left">
                      <Mail size={18} />
                    </span>
                    <input
                      id="forgotEmail"
                      type="email"
                      required
                      placeholder="contoh: budi.santoso@warga.id"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="form-control has-icon-left"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Kirim Tautan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
