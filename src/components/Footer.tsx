'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, PhoneCall, Mail, MapPin, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--slate-900)',
        color: 'var(--slate-300)',
        paddingTop: '64px',
        paddingBottom: '36px',
        marginTop: 'auto',
        borderTop: '1px solid var(--slate-800)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand & Description */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--white)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--primary-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--white)',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Lapor<span style={{ color: 'var(--primary-400)' }}>Kita</span>
              </span>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: 'var(--slate-400)',
                marginBottom: '20px',
              }}
            >
              Platform digital partisipatif yang menjembatani warga dengan pihak berwenang.
              Laporkan jalan rusak, tumpukan sampah, lampu padam, dan gangguan fasilitas publik
              dengan aman, transparan, dan dapat dipantau tuntas.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                color: 'var(--primary-300)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} /> Terintegrasi Standar Layanan Pengaduan Publik
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              style={{
                color: 'var(--white)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                marginBottom: '18px',
              }}
            >
              Menu Layanan
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.875rem',
              }}
            >
              <li>
                <Link
                  href="/register"
                  style={{ color: 'var(--slate-400)', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
                >
                  Registrasi Akun Warga
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  style={{ color: 'var(--slate-400)', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
                >
                  Masuk ke Akun
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  style={{ color: 'var(--slate-400)', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
                >
                  Kelola Profil & Keamanan
                </Link>
              </li>
              <li>
                <Link
                  href="/profile?tab=reports"
                  style={{ color: 'var(--slate-400)', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
                >
                  Pantau Laporan Saya
                </Link>
              </li>
              <li>
                <Link
                  href="/laporan"
                  style={{ color: 'var(--primary-400)', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--primary-400)')}
                >
                  🗺️ Laporan Publik & Peta Aduan
                </Link>
              </li>
            </ul>
          </div>

          {/* Kategori Pengaduan Populer */}
          <div>
            <h4
              style={{
                color: 'var(--white)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                marginBottom: '18px',
              }}
            >
              Aduan Prioritas
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.875rem',
                color: 'var(--slate-400)',
              }}
            >
              <li>🚧 Jalan Berlubang & Aspal Rusak</li>
              <li>🗑️ Tumpukan Sampah Liar & TPS</li>
              <li>💡 Lampu Penerangan Jalan (PJU) Mati</li>
              <li>🌊 Saluran Air Tersumbat & Genangan Banjir</li>
              <li>🚏 Kerusakan Fasilitas Halte & Taman Kota</li>
            </ul>
          </div>

          {/* Kontak & Pusat Bantuan */}
          <div>
            <h4
              style={{
                color: 'var(--white)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                marginBottom: '18px',
              }}
            >
              Kontak Layanan Cepat
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PhoneCall size={16} color="var(--primary-400)" />
                <span>Hotline: 1500-848 (Bebas Pulsa)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} color="var(--primary-400)" />
                <span>bantuan@laporkita.go.id</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={16} color="var(--primary-400)" style={{ marginTop: '3px' }} />
                <span>Gedung Pelayanan Publik Lantai 2, Layanan Pengaduan Terpadu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--slate-800)',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            fontSize: '0.8125rem',
            color: 'var(--slate-500)',
          }}
        >
          <div>
            © 2026 LaporKita. Hak Cipta Dilindungi. Dikembangkan untuk transparansi pelayanan warga.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Privasi Data Kependudukan Terlindungi</span>
            <span>Enkripsi TLS 1.3</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
