'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  AlertOctagon,
  Trash2,
  Lightbulb,
  Droplets,
  Building2,
  ShieldCheck,
  UserCheck,
  Smartphone,
  ChevronRight,
  PlusCircle,
  Map as MapIcon,
  Heart
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loginAsDemo } = useAuth();

  const handleDemoClick = () => {
    loginAsDemo();
    router.push('/profile');
  };

  const categories = [
    {
      slug: 'jalan-rusak',
      icon: <AlertOctagon size={28} color="#f97316" />,
      title: 'Jalan Rusak & Berlubang',
      desc: 'Aspal amblas, jalan berlubang dalam, atau trotoar hancur yang membahayakan pengendara.',
      count: '3.412 Aduan',
      bg: '#fff7ed',
    },
    {
      slug: 'sampah-menumpuk',
      icon: <Trash2 size={28} color="#10b981" />,
      title: 'Sampah Menumpuk & TPS Liar',
      desc: 'Tumpukan sampah liar di bahu jalan, TPS meluber, dan saluran air tersumbat limbah.',
      count: '2.840 Aduan',
      bg: '#ecfdf5',
    },
    {
      slug: 'lampu-jalan-mati',
      icon: <Lightbulb size={28} color="#eab308" />,
      title: 'Lampu Jalan (PJU) Padam',
      desc: 'Penerangan jalan umum mati berhari-hari sehingga menimbulkan titik rawan kriminalitas.',
      count: '1.924 Aduan',
      bg: '#fefce8',
    },
    {
      slug: 'banjir-drainase',
      icon: <Droplets size={28} color="#0284c7" />,
      title: 'Genangan Banjir & Drainase',
      desc: 'Saluran air tersumbat endapan lumpur atau beton drainase amblas saat musim hujan.',
      count: '2.115 Aduan',
      bg: '#f0f9ff',
    },
    {
      slug: 'fasilitas-umum',
      icon: <Building2 size={28} color="#8b5cf6" />,
      title: 'Fasilitas Umum Rusak',
      desc: 'Halte bus rusak, jembatan penyeberangan (JPO) rapuh, taman kota, dan rambu lalu lintas.',
      count: '1.450 Aduan',
      bg: '#f5f3ff',
    },
    {
      slug: 'lainnya',
      icon: <ShieldAlert size={28} color="#0d9488" />,
      title: 'Aspirasi & Masalah Lainnya',
      desc: 'Pohon rawan tumbang, gangguan ketertiban umum, dan keluhan layanan perizinan wilayah.',
      count: '3.079 Aduan',
      bg: '#f0fdfa',
    },
  ];

  return (
    <div>
      {/* HERO SECTION */}
      <section
        style={{
          background: 'radial-gradient(circle at 50% -20%, #ccfbf1 0%, #f0fdfa 40%, #f8fafc 100%)',
          paddingTop: '64px',
          paddingBottom: '80px',
          borderBottom: '1px solid var(--slate-200)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            {/* Top Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--white)',
                border: '1px solid var(--primary-200)',
                color: 'var(--primary-800)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: 'var(--shadow-xs)',
                marginBottom: '24px',
              }}
            >
              <Sparkles size={16} color="var(--primary-600)" />
              <span>Sistem Aspirasi & Aduan Publik Terpadu Berbasis NIK</span>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                fontWeight: 800,
                color: 'var(--slate-900)',
                lineHeight: 1.18,
                letterSpacing: '-0.03em',
                marginBottom: '20px',
              }}
            >
              Temukan Jalan Rusak, Sampah Menumpuk, atau Lampu Mati?{' '}
              <span
                style={{
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Laporkan di Sini.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
                color: 'var(--slate-600)',
                lineHeight: 1.6,
                marginBottom: '36px',
                maxWidth: '720px',
                marginInline: 'auto',
              }}
            >
              Sering bingung harus lapor ke mana dan apakah aduan Anda benar-benar ditindaklanjuti?
              Melalui <strong>LaporKita</strong>, keluhan Anda diteruskan langsung ke dinas berwenang
              dan dapat dipantau perkembangannya secara transparan sampai selesai.
            </p>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '40px',
              }}
            >
              {user ? (
                <>
                  <Link href="/lapor" className="btn btn-primary btn-lg">
                    <PlusCircle size={20} />
                    Buat Laporan Masalah Baru
                  </Link>
                  <Link href="/laporan" className="btn btn-secondary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <MapIcon size={18} color="var(--primary-700)" />
                    Lihat Peta Aduan Publik
                  </Link>
                  <Link href="/profile?tab=reports" className="btn btn-outline btn-lg">
                    Aduan Saya
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/lapor" className="btn btn-primary btn-lg">
                    <PlusCircle size={20} />
                    Buat Laporan Masalah <ArrowRight size={18} />
                  </Link>
                  <Link href="/laporan" className="btn btn-secondary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <MapIcon size={18} color="var(--primary-700)" />
                    Peta Aduan Publik
                  </Link>
                  <Link href="/register" className="btn btn-outline btn-lg">
                    Daftar Akun
                  </Link>
                  <button
                    type="button"
                    onClick={handleDemoClick}
                    className="btn btn-lg btn-outline"
                    style={{
                      borderColor: 'var(--warning-border)',
                      backgroundColor: 'var(--warning-bg)',
                      color: 'var(--warning-text)',
                    }}
                  >
                    <Sparkles size={18} /> Coba Demo
                  </button>
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px',
                fontSize: '0.8125rem',
                color: 'var(--slate-500)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="var(--success-solid)" />
                <span>NIK Terverifikasi Dukcapil</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--primary-600)" />
                <span>Tindak Lanjut Cepat 1x24 Jam</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="var(--info-solid)" />
                <span>Privasi Data Aman & Terlindungi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS METRICS */}
      <section style={{ backgroundColor: 'var(--white)', padding: '36px 0', borderBottom: '1px solid var(--slate-200)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                14.820+
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '2px' }}>
                Laporan Warga Ditangani
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-solid)' }}>
                98,4%
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '2px' }}>
                Penyelesaian Tuntas
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info-solid)' }}>
                48 Jam
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '2px' }}>
                Rata-rata Respon Pertama
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                12 Dinas
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '2px' }}>
                Instansi Wilayah Terkoneksi
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORI MASALAH LINGKUNGAN */}
      <section id="kategori" style={{ padding: '80px 0', backgroundColor: 'var(--slate-50)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
            <span className="badge badge-primary" style={{ marginBottom: '10px' }}>
              Klasifikasi Aduan
            </span>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--slate-900)',
                letterSpacing: '-0.02em',
                marginBottom: '12px',
              }}
            >
              Kategori Permasalahan yang Siap Ditangani
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Pilih dan laporkan kerusakan fasilitas di sekitar tempat tinggal Anda dengan mudah melalui akun LaporKita.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="card card-hover"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backgroundColor: 'var(--white)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: cat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cat.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '6px' }}>
                    {cat.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    {cat.desc}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--slate-100)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{cat.count}</span>
                  <Link
                    href={`/lapor?kategori=${cat.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--primary-700)',
                      fontWeight: 700,
                    }}
                  >
                    Laporkan <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FITUR UNGGULAN: PETA INTERAKTIF & DUKUNGAN WARGA */}
      <section style={{ padding: '80px 0', backgroundColor: 'var(--white)', borderTop: '1px solid var(--slate-200)' }}>
        <div className="container">
          <div
            style={{
              background: 'radial-gradient(circle at 100% 0%, #ccfbf1 0%, #f0fdfa 40%, #ffffff 100%)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(28px, 4vw, 48px)',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '36px',
                alignItems: 'center',
              }}
            >
              <div>
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
                    marginBottom: '14px',
                  }}
                >
                  <MapIcon size={14} color="var(--primary-600)" />
                  Peta Spasial Digital & Solidaritas Warga
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                    fontWeight: 800,
                    color: 'var(--slate-900)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.02em',
                    marginBottom: '16px',
                  }}
                >
                  Pantau Titik Masalah di Peta & Dukung Laporan Warga Lain
                </h2>

                <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Tidak hanya membuat aduan pribadi, Anda dapat menjelajahi sebaran ribuan laporan kerusakan fasilitas publik di seluruh wilayah. Berikan suara dukungan (upvote) untuk mempercepat prioritas penanganan oleh dinas terkait.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--slate-900)', fontSize: '0.9375rem' }}>Melihat Laporan di Peta Interaktif</strong>
                      <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: '2px' }}>Pin warna otomatis mengidentifikasi jalan rusak, sampah liar, saluran drainase, hingga lampu padam.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--info-bg)', color: 'var(--info-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--slate-900)', fontSize: '0.9375rem' }}>Eksplorasi Laporan Publik Transparan</strong>
                      <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: '2px' }}>Telusuri berdasarkan nomor tiket, alamat jalan, foto bukti masalah, hingga instansi penanggung jawab.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Heart size={16} fill="#e11d48" />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--slate-900)', fontSize: '0.9375rem' }}>Voting / Dukungan Warga Sekitar</strong>
                      <p style={{ color: 'var(--slate-500)', fontSize: '0.8125rem', marginTop: '2px' }}>Semakin banyak warga memberikan dukungan suara, semakin tinggi prioritas penanganan dinas teknis.</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link href="/laporan" className="btn btn-primary btn-lg" style={{ boxShadow: 'var(--shadow-teal)' }}>
                    <MapIcon size={18} />
                    Buka Peta & Laporan Publik
                  </Link>
                  <Link href="/lapor" className="btn btn-secondary btn-lg">
                    Buat Aduan Baru
                  </Link>
                </div>
              </div>

              {/* Right: Interactive Civic Card Previews */}
              <div
                style={{
                  backgroundColor: 'var(--slate-900)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  color: 'white',
                  boxShadow: 'var(--shadow-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-300)' }}>Peta Live Citra Wilayah</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 'var(--radius-sm)' }}>GPS Akurat</span>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316' }}>🚧 Jalan Rusak • Darurat</span>
                    <span style={{ fontSize: '0.6875rem', backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>✓ Sedang Diproses</span>
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '6px' }}>
                    Aspal Amblas Dekat Jembatan Serua KM 2
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginBottom: '10px' }}>
                    📍 Jl. Raya Sawangan, Cilodong
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: '#fda4af', fontSize: '0.8125rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ❤️ 47 Warga Mendukung
                    </span>
                    <Link href="/laporan?selected=rep-08" style={{ color: 'var(--primary-300)', fontSize: '0.75rem', fontWeight: 700 }}>
                      Lihat di Peta ➔
                    </Link>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>🗑️ Sampah Menumpuk • Tinggi</span>
                    <span style={{ fontSize: '0.6875rem', backgroundColor: '#fffbeb', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>⏳ Menunggu Verifikasi</span>
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '6px' }}>
                    Kontainer TPS Meluber ke Badan Jalan Pasar
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginBottom: '10px' }}>
                    📍 Pintu Masuk Barat Pasar Kemiri Muka
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: '#fda4af', fontSize: '0.8125rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ❤️ 36 Warga Mendukung
                    </span>
                    <Link href="/laporan?selected=rep-09" style={{ color: 'var(--primary-300)', fontSize: '0.75rem', fontWeight: 700 }}>
                      Lihat di Peta ➔
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALUR PENGADUAN TRANSPARAN */}
      <section id="alur" style={{ padding: '80px 0', backgroundColor: 'var(--white)', borderTop: '1px solid var(--slate-200)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 54px' }}>
            <span className="badge badge-success" style={{ marginBottom: '10px' }}>
              Transparansi Penuh
            </span>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--slate-900)',
                letterSpacing: '-0.02em',
                marginBottom: '12px',
              }}
            >
              Bagaimana Laporan Anda Ditindaklanjuti?
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Tidak ada lagi laporan yang mengendap tanpa kejelasan. Setiap langkah tercatat dan dapat Anda pantau langsung.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--primary-200)',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                01
              </div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Daftar & Registrasi NIK
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                Daftarkan akun warga dengan NIK 16 digit terverifikasi untuk memastikan keabsahan dan menghindari pengaduan fiktif.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--primary-200)',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                02
              </div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Kirim Foto & Lokasi
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                Sertakan foto titik kerusakan, lokasi spesifik, dan detail permasalahan langsung dari ponsel Anda.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--primary-200)',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                03
              </div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Penugasan Dinas Terkait
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                Sistem mendistribusikan tiket ke dinas teknis (PUPR, Kebersihan, Dishub, PLN) sesuai kewenangan wilayah.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--primary-200)',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                04
              </div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Perbaikan & Bukti Tuntas
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                Petugas mengunggah foto hasil pekerjaan fisik. Anda menerima notifikasi WhatsApp dan dapat memberi ulasan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM BANNER */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%)',
          color: 'var(--white)',
          padding: '72px 0',
        }}
      >
        <div className="container" style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}
          >
            Mari Bersama Ciptakan Lingkungan yang Lebih Nyaman
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--primary-100)',
              maxWidth: '620px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Satu laporan Anda sangat berarti bagi ribuan warga yang melintas setiap hari. Daftar sekarang secara gratis dan mudah.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/lapor"
              className="btn btn-lg"
              style={{
                backgroundColor: 'var(--white)',
                color: 'var(--primary-800)',
                fontWeight: 700,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <PlusCircle size={20} />
              Buat Laporan Sekarang
            </Link>
            {user ? (
              <Link
                href="/profile?tab=reports"
                className="btn btn-lg btn-outline"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  color: 'var(--white)',
                }}
              >
                Pantau Laporan Saya
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn btn-lg btn-outline"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  color: 'var(--white)',
                }}
              >
                Daftar Akun Warga
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
