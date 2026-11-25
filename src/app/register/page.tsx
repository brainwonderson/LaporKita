'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  CreditCard,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, showToast } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score++;
    return score;
  };

  const passStrength = getPasswordStrength(formData.password);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field being typed
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numbers up to 16 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 16);
    handleInputChange('nik', cleaned);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d+]/g, '').slice(0, 15);
    handleInputChange('phone', cleaned);
  };

  const handleQuickFill = () => {
    setFormData({
      name: 'Rian Pratama',
      nik: '3201011508940003',
      email: 'rian.pratama@gmail.com',
      phone: '081298765432',
      password: 'SandiWarga2026!',
      confirmPassword: 'SandiWarga2026!',
      agreeTerms: true,
    });
    setErrors({});
    showToast('info', 'Form Terisi', 'Data contoh warga berhasil diisikan ke dalam formulir.');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi sesuai KTP.';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nama minimal terdiri dari 3 karakter.';
    }

    if (!formData.nik) {
      newErrors.nik = 'NIK 16 digit wajib diisi.';
    } else if (formData.nik.length !== 16) {
      newErrors.nik = `NIK harus tepat 16 digit angka (saat ini ${formData.nik.length} digit).`;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format alamat email tidak valid.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp / Handphone wajib diisi.';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Nomor telepon minimal 10 digit.';
    }

    if (!formData.password) {
      newErrors.password = 'Kata sandi tidak boleh kosong.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Kata sandi minimal 8 karakter.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Ulangi kata sandi Anda.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Kata sandi konfirmasi tidak cocok.';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const success = await register({
      nik: formData.nik,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    if (success) {
      router.push('/profile');
    }
  };

  return (
    <div
      style={{
        paddingTop: '48px',
        paddingBottom: '80px',
        background: 'var(--hero-gradient)',
        minHeight: 'calc(100vh - 72px)',
      }}
    >
      <div className="container-auth">
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-800)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={16} color="var(--primary-700)" />
            Pendaftaran Warga Resmi
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
            Buat Akun LaporKita
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            Satu akun untuk melaporkan, memantau perbaikan, dan berpartisipasi membangun fasilitas publik yang lebih baik.
          </p>
        </div>

        {/* Card Form */}
        <div className="card" style={{ padding: '32px 28px', backgroundColor: 'var(--white)' }}>
          {/* Quick Demo Fill Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-50)',
              border: '1px dashed var(--primary-300)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary-600)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--primary-900)', fontWeight: 600 }}>
                Mau coba cepat tanpa ketik manual?
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="btn btn-sm btn-outline"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderColor: 'var(--primary-500)',
                color: 'var(--primary-700)',
              }}
            >
              Isi Otomatis
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Nama Lengkap */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                <span>Nama Lengkap (KTP) <span className="required">*</span></span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <User size={18} />
                </span>
                <input
                  id="name"
                  type="text"
                  placeholder="Contoh: Rian Pratama"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`form-control has-icon-left ${errors.name ? 'is-invalid' : ''}`}
                />
              </div>
              {errors.name ? (
                <div className="form-error">
                  <AlertCircle size={14} /> {errors.name}
                </div>
              ) : (
                <span className="form-helper">Tuliskan nama lengkap sesuai kartu identitas resmi.</span>
              )}
            </div>

            {/* NIK */}
            <div className="form-group">
              <label className="form-label" htmlFor="nik">
                <span>Nomor Induk Kependudukan (NIK) <span className="required">*</span></span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: formData.nik.length === 16 ? 'var(--success-solid)' : 'var(--slate-400)' }}>
                  {formData.nik.length}/16 Digit
                </span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <CreditCard size={18} />
                </span>
                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 3201011508940003"
                  value={formData.nik}
                  onChange={handleNikChange}
                  className={`form-control has-icon-left ${errors.nik ? 'is-invalid' : ''}`}
                />
              </div>
              {errors.nik ? (
                <div className="form-error">
                  <AlertCircle size={14} /> {errors.nik}
                </div>
              ) : (
                <span className="form-helper">
                  Data NIK dienkripsi & hanya digunakan untuk validasi laporan warga.
                </span>
              )}
            </div>

            {/* Email & Phone 2-Column Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  <span>Alamat Email <span className="required">*</span></span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`form-control has-icon-left ${errors.email ? 'is-invalid' : ''}`}
                  />
                </div>
                {errors.email && (
                  <div className="form-error">
                    <AlertCircle size={14} /> {errors.email}
                  </div>
                )}
              </div>

              {/* No. Handphone / WhatsApp */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  <span>No. WhatsApp <span className="required">*</span></span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Phone size={18} />
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`form-control has-icon-left ${errors.phone ? 'is-invalid' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <div className="form-error">
                    <AlertCircle size={14} /> {errors.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Kata Sandi */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span>Kata Sandi <span className="required">*</span></span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter kombinasi"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`form-control has-icon-left has-icon-right ${errors.password ? 'is-invalid' : ''}`}
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

              {/* Strength Meter */}
              {formData.password.length > 0 && (
                <div>
                  <div className="strength-meter">
                    <div className={`strength-bar ${passStrength >= 1 ? (passStrength === 1 ? 'weak' : passStrength === 2 ? 'medium' : 'strong') : ''}`} />
                    <div className={`strength-bar ${passStrength >= 2 ? (passStrength === 2 ? 'medium' : 'strong') : ''}`} />
                    <div className={`strength-bar ${passStrength >= 3 ? 'strong' : ''}`} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      Kekuatan: {passStrength === 1 ? 'Lemah' : passStrength === 2 ? 'Sedang' : passStrength >= 3 ? 'Kuat & Aman' : 'Terlalu Pendek'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Min. 8 karakter</span>
                  </div>
                </div>
              )}

              {errors.password && (
                <div className="form-error">
                  <AlertCircle size={14} /> {errors.password}
                </div>
              )}
            </div>

            {/* Konfirmasi Kata Sandi */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                <span>Konfirmasi Kata Sandi <span className="required">*</span></span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ketik ulang kata sandi di atas"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`form-control has-icon-left has-icon-right ${errors.confirmPassword ? 'is-invalid' : ''}`}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--success-solid)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> Kata sandi cocok
                </div>
              )}

              {errors.confirmPassword && (
                <div className="form-error">
                  <AlertCircle size={14} /> {errors.confirmPassword}
                </div>
              )}
            </div>

            {/* Checkbox Syarat & Ketentuan */}
            <div style={{ marginTop: '16px', marginBottom: '24px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--slate-700)',
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                  style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>
                  Saya menyatakan kebenaran data di atas serta menyetujui{' '}
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Syarat & Ketentuan</span>{' '}
                  serta <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Kebijakan Privasi</span>{' '}
                  LaporKita.
                </span>
              </label>
              {errors.agreeTerms && (
                <div className="form-error" style={{ marginTop: '6px' }}>
                  <AlertCircle size={14} /> {errors.agreeTerms}
                </div>
              )}
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
                  Mendaftarkan Akun...
                </>
              ) : (
                <>
                  Daftar Sekarang <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
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
            Sudah memiliki akun warga?{' '}
            <Link
              href="/login"
              style={{
                color: 'var(--primary-700)',
                fontWeight: 700,
              }}
            >
              Masuk di sini
            </Link>
          </div>
        </div>

        {/* Security badge note */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--slate-500)',
            fontSize: '0.8125rem',
          }}
        >
          <ShieldCheck size={16} color="var(--primary-600)" />
          Kerahasiaan data kependudukan terjamin dan terlindungi undang-undang perlindungan data pribadi.
        </div>
      </div>
    </div>
  );
}
