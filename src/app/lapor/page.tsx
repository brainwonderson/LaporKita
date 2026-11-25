'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  AlertOctagon,
  Trash2,
  Lightbulb,
  Droplets,
  Building2,
  ShieldAlert,
  UploadCloud,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  Sparkles,
  Info,
  ArrowLeft,
  Send,
  Camera,
  Check,
  Copy,
  FileText,
  Navigation,
  Crosshair,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { ReportItem, ReportCoordinates } from '@/types';

// Daftar Kategori dan Instansi Terkait
interface CategoryMeta {
  id: string;
  name: string;
  icon: React.ReactNode;
  defaultAgency: string;
  description: string;
  placeholderTitle: string;
  placeholderDesc: string;
  sampleImages: string[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'jalan-rusak',
    name: 'Jalan Rusak',
    icon: <AlertOctagon size={24} color="#f97316" />,
    defaultAgency: 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)',
    description: 'Aspal berlubang, amblas, retak besar, atau trotoar hancur membahayakan lalu lintas.',
    placeholderTitle: 'Contoh: Aspal Jalan Berlubang Sedalam 15 cm di Depan Pasar Sukamaju',
    placeholderDesc: 'Jelaskan kondisi jalan, perkiraan diameter/kedalaman lubang, dan resiko kecelakaan bagi pengendara roda dua terutama saat hujan...',
    sampleImages: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'sampah-menumpuk',
    name: 'Sampah Menumpuk',
    icon: <Trash2 size={24} color="#10b981" />,
    defaultAgency: 'Dinas Lingkungan Hidup & Kebersihan (DLHK)',
    description: 'Tumpukan sampah liar di bahu jalan, TPS meluber tidak diangkut, dan bau menyengat.',
    placeholderTitle: 'Contoh: Tumpukan Sampah Liar Menggunung di Pinggir Jembatan Kali Baru',
    placeholderDesc: 'Jelaskan perkiraan volume sampah, sudah berapa hari tidak diangkut armada, dan dampak bau terhadap pemukiman warga sekitar...',
    sampleImages: [
      'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'lampu-jalan-mati',
    name: 'Lampu Jalan Mati',
    icon: <Lightbulb size={24} color="#eab308" />,
    defaultAgency: 'Dinas Perhubungan (Dishub)',
    description: 'Penerangan Jalan Umum (PJU) padam atau korsleting sehingga jalan gelap gulita.',
    placeholderTitle: 'Contoh: 4 Tiang Lampu PJU Mati Total Sepanjang 150 Meter di Jl. Anggrek',
    placeholderDesc: 'Jelaskan berapa tiang lampu yang padam, perkiraan nomor tiang bila ada, serta tingkat kerawanan begal/kecelakaan saat malam...',
    sampleImages: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'banjir-drainase',
    name: 'Banjir & Drainase',
    icon: <Droplets size={24} color="#0284c7" />,
    defaultAgency: 'Dinas Sumber Daya Air & Pengairan (SDA)',
    description: 'Tutup saluran ambles, endapan lumpur menyumbat drainase, atau genangan air meluap.',
    placeholderTitle: 'Contoh: Saluran Drainase Ambles dan Meluap Membanjiri Jalan Raya',
    placeholderDesc: 'Jelaskan tinggi genangan air saat hujan, kondisi penutup gorong-gorong, serta bahaya bagi pejalan kaki...',
    sampleImages: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'fasilitas-umum',
    name: 'Fasilitas Umum',
    icon: <Building2 size={24} color="#8b5cf6" />,
    defaultAgency: 'Dinas Perumahan & Kawasan Permukiman (Disperkim)',
    description: 'Halte bus rusak, fasilitas taman kota roboh, jembatan penyeberangan lapuk, atau rambu patah.',
    placeholderTitle: 'Contoh: Atap Halte Bus Depan RSUD Copot dan Kursi Tunggu Patah',
    placeholderDesc: 'Sebutkan fasilitas publik spesifik yang rusak, bagian yang membahayakan warga, dan waktu kerusakan...',
    sampleImages: [
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'lainnya',
    name: 'Lainnya',
    icon: <ShieldAlert size={24} color="#0d9488" />,
    defaultAgency: 'Satuan Polisi Pamong Praja (Satpol PP)',
    description: 'Pohon rawan tumbang, gangguan ketertiban umum, atau masalah layanan warga lainnya.',
    placeholderTitle: 'Contoh: Dahan Pohon Besar Rapuh Nyaris Tumbang ke Kabel Listrik PLN',
    placeholderDesc: 'Uraikan permasalahan secara komprehensif, perkiraan dampak ke keselamatan warga, dan instansi yang diharapkan hadir...',
    sampleImages: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    ],
  },
];

const ALL_AGENCIES = [
  { name: 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)', sla: '1x24 Jam', badge: 'Infrastruktur Jalan & Bangunan' },
  { name: 'Dinas Lingkungan Hidup & Kebersihan (DLHK)', sla: '1x12 Jam', badge: 'Pengelolaan Sampah & Limbah' },
  { name: 'Dinas Perhubungan (Dishub)', sla: '1x24 Jam', badge: 'Penerangan Jalan (PJU) & Rambu' },
  { name: 'Dinas Sumber Daya Air & Pengairan (SDA)', sla: '1x12 Jam', badge: 'Drainase, Kali, & Banjir' },
  { name: 'Dinas Perumahan & Kawasan Permukiman (Disperkim)', sla: '2x24 Jam', badge: 'Taman Kota & Fasilitas Umum' },
  { name: 'Satuan Polisi Pamong Praja (Satpol PP)', sla: '1x12 Jam', badge: 'Ketertiban Umum & Perlindungan' },
  { name: 'Badan Penanggulangan Bencana Daerah (BPBD)', sla: '1x6 Jam', badge: 'Darurat Bencana & Pohon Tumbang' },
];

function ReportFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, createReport, showToast } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const initialCategoryQuery = searchParams.get('kategori')?.toLowerCase();
  const initialCategory = CATEGORIES.find((category) => category.id.toLowerCase() === initialCategoryQuery || category.name.toLowerCase() === initialCategoryQuery) ?? CATEGORIES[0];
  const [categories, setCategories] = useState<CategoryMeta[]>(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta>(initialCategory);
  const selectedCategoryId = useRef(initialCategory.id);
  const [activeAgencies, setActiveAgencies] = useState<Array<{ id: string; name: string }>>([]);
  const [agency, setAgency] = useState<string>(CATEGORIES[0].defaultAgency);
  const [title, setTitle] = useState<string>('');
  const [urgency, setUrgency] = useState<'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat'>('Tinggi');
  const [location, setLocation] = useState<string>('');
  const [coordinates, setCoordinates] = useState<ReportCoordinates | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);

  // Uploaded images state (Base64 or image URL)
  const [images, setImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Modal
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);
  const [copiedTicket, setCopiedTicket] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetch('/api/agencies', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const rows = await response.json();
        if (!active || !Array.isArray(rows)) return;
        const available = rows as Array<{ id: string; name: string }>;
        setActiveAgencies(available);
        if (available.length > 0) {
          setAgency((current) => available.some((entry) => entry.name === current) ? current : available[0].name);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Sync category from URL query parameter
  useEffect(() => {
    let active = true;
    fetch('/api/categories', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const rows = await response.json();
        if (!active || !Array.isArray(rows)) return;
        const dynamicCategories = rows.map((row: { id: string; name: string; default_agency: string }) => {
          const predefined = CATEGORIES.find((category) => category.name === row.name);
          return {
            ...(predefined ?? {
              icon: <ShieldAlert size={24} color="#0d9488" />,
              description: `Laporan untuk kategori ${row.name}.`,
              placeholderTitle: `Contoh: Permasalahan ${row.name} di lingkungan Anda`,
              placeholderDesc: 'Jelaskan lokasi, kondisi, dan dampak permasalahan secara rinci.',
              sampleImages: [],
            }),
            id: row.id,
            name: row.name,
            defaultAgency: row.default_agency,
          } satisfies CategoryMeta;
        });
        if (dynamicCategories.length > 0) {
          const categoryQuery = searchParams.get('kategori')?.toLowerCase();
          const queryCategory = dynamicCategories.find((category) => category.id.toLowerCase() === categoryQuery || category.name.toLowerCase() === categoryQuery);
          const nextSelectedCategory = queryCategory ?? dynamicCategories.find((category) => category.id === selectedCategoryId.current) ?? dynamicCategories[0];
          setCategories(dynamicCategories);
          selectedCategoryId.current = nextSelectedCategory.id;
          setSelectedCategory(nextSelectedCategory);
          setAgency(nextSelectedCategory.defaultAgency);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [searchParams]);

  // Handle category change
  const handleSelectCategory = (cat: CategoryMeta) => {
    selectedCategoryId.current = cat.id;
    setSelectedCategory(cat);
    setAgency(cat.defaultAgency);
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: '' }));
    }
  };

  // Quick fill user's profile address
  const handleUseProfileAddress = () => {
    if (user) {
      const profileAddress = `${user.address}, RT/RW ${user.rtRw}, Kel. ${user.kelurahan}, Kec. ${user.kecamatan}, ${user.city}`;
      setLocation(profileAddress);
      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: '' }));
      }
      showToast('info', 'Alamat Dimuat', 'Alamat domisili Anda dari profil berhasil diisikan ke kolom lokasi.');
    } else {
      showToast('error', 'Perhatian', 'Silakan masuk ke akun untuk memuat alamat domisili.');
    }
  };

  // GPS Location Handler
  const handleGetGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const errMsg = 'Browser Anda tidak mendukung fitur Geolocation / GPS.';
      setGpsError(errMsg);
      showToast('error', 'GPS Tidak Didukung', errMsg);
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);
    showToast('info', 'Mencari Sinyal GPS', 'Mengakses sensor GPS perangkat Anda. Izinkan akses lokasi jika browser meminta konfirmasi.');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        let reverseAddress = '';

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            {
              headers: {
                'Accept-Language': 'id, en',
              },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address || {};
              const road = addr.road || addr.pedestrian || addr.street || '';
              const village = addr.village || addr.suburb || addr.neighbourhood || '';
              const city = addr.city || addr.town || addr.county || addr.state || '';

              if (road && city) {
                reverseAddress = `${road}${village ? ', ' + village : ''}${city ? ', ' + city : ''}`;
              } else {
                reverseAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
              }
            }
          }
        } catch {
          reverseAddress = `Koordinat GPS (${lat}, ${lng})`;
        }

        const newCoords: ReportCoordinates = {
          lat,
          lng,
          accuracy,
          displayAddress: reverseAddress || undefined,
        };

        setCoordinates(newCoords);
        setIsLocatingGps(false);
        setGpsError(null);

        // Auto fill address if empty or starts with GPS
        if (reverseAddress && (!location.trim() || location.startsWith('Koordinat GPS'))) {
          setLocation(reverseAddress);
          if (errors.location) {
            setErrors((prev) => ({ ...prev, location: '' }));
          }
        }

        showToast(
          'success',
          'Lokasi GPS Terkunci',
          `Koordinat (${lat}, ${lng}) dengan akurasi ±${accuracy}m berhasil disimpan.`
        );
      },
      (err) => {
        setIsLocatingGps(false);
        let message = 'Gagal mengambil koordinat lokasi perangkat.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Izin akses lokasi ditolak oleh browser. Silakan aktifkan izin lokasi di pengaturan browser atau gunakan opsi Simulasi GPS.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia atau sinyal GPS lemah. Pastikan GPS perangkat aktif.';
            break;
          case err.TIMEOUT:
            message = 'Waktu permintaan sinyal GPS habis. Silakan coba lagi di tempat terbuka atau gunakan opsi Simulasi GPS.';
            break;
          default:
            message = err.message || 'Terjadi gangguan saat mengambil koordinat GPS.';
            break;
        }
        setGpsError(message);
        showToast('error', 'Gagal Mengakses GPS', message);
      },
      options
    );
  };

  // Preset simulation GPS for testing / desktop devices
  const handleSimulateGps = () => {
    const simulatedCoords: ReportCoordinates = {
      lat: -6.402484,
      lng: 106.828241,
      accuracy: 8,
      displayAddress: 'Jl. Margonda Raya No. 100, Beji, Kota Depok',
    };
    setCoordinates(simulatedCoords);
    setGpsError(null);
    if (!location.trim() || location.startsWith('Koordinat GPS')) {
      setLocation(simulatedCoords.displayAddress || 'Jl. Margonda Raya No. 100, Depok');
      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: '' }));
      }
    }
    showToast('info', 'Simulasi GPS Aktif', 'Koordinat uji coba Depok (-6.402484, 106.828241) berhasil dipasang.');
  };

  const handleClearGps = () => {
    setCoordinates(null);
    setGpsError(null);
    showToast('info', 'Koordinat Dihapus', 'Data titik GPS berhasil dilepas dari formulir laporan.');
  };

  // Preset demo photo sample
  const handleUsePresetPhotos = () => {
    setImages(selectedCategory.sampleImages);
    if (errors.images) {
      setErrors((prev) => ({ ...prev, images: '' }));
    }
    showToast('success', 'Foto Contoh Dimuat', 'Contoh foto bukti lapangan telah ditambahkan untuk pengujian instan.');
  };

  // File upload handlers
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      showToast('error', 'Batas Maksimal', 'Anda hanya dapat mengunggah maksimal 4 foto bukti.');
      return;
    }

    const newImagePromises: Promise<string>[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Format Tidak Didukung', `File ${file.name} bukan format gambar yang valid (JPG, PNG, WebP).`);
        return;
      }
      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Ukuran Terlalu Besar', `Foto ${file.name} melebihi batas maksimal 5MB.`);
        return;
      }

      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
      newImagePromises.push(promise);
    });

    Promise.all(newImagePromises).then((results) => {
      setImages((prev) => [...prev, ...results]);
      if (errors.images) {
        setErrors((prev) => ({ ...prev, images: '' }));
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form validation
  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Judul laporan masalah wajib diisi.';
    } else if (title.trim().length < 8) {
      errs.title = 'Judul laporan minimal 8 karakter agar jelas.';
    }

    if (!location.trim()) {
      errs.location = 'Alamat & lokasi kejadian wajib diisi.';
    } else if (location.trim().length < 6) {
      errs.location = 'Mohon sertakan lokasi yang lebih spesifik (nama jalan, RT/RW, atau patokan).';
    }

    if (!description.trim()) {
      errs.description = 'Deskripsi masalah wajib diisi.';
    } else if (description.trim().length < 20) {
      errs.description = 'Deskripsi terlalu singkat. Minimal 20 karakter agar petugas memahami masalah.';
    }

    if (images.length === 0) {
      errs.images = 'Wajib mengunggah minimal 1 foto bukti masalah agar dapat diproses oleh instansi.';
    }

    if (!agreedTerms) {
      errs.terms = 'Anda harus menyetujui pernyataan kebenaran data.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit report to agency
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Form Belum Lengkap', 'Mohon lengkapi semua kolom wajib dan lampirkan foto bukti.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createReport({
        title: title.trim(),
        category: selectedCategory.name,
        agency,
        location: location.trim(),
        coordinates: coordinates || undefined,
        urgency,
        description: description.trim(),
        images,
        isAnonymous,
      });

      setSubmittedReport(created);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal Mengirim Laporan', 'Terjadi kesalahan sistem saat mengajukan laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicket = (ticketNum: string) => {
    navigator.clipboard.writeText(ticketNum);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
    showToast('info', 'Tersalin', `Nomor tiket ${ticketNum} berhasil disalin ke clipboard.`);
  };

  const selectedAgencyMeta = ALL_AGENCIES.find((item) => item.name === agency) || { name: agency, sla: 'sesuai ketentuan', badge: 'Instansi penanggung jawab' };

  return (
    <div style={{ backgroundColor: 'var(--slate-50)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <section
        style={{
          background: 'radial-gradient(circle at 50% 0%, #ccfbf1 0%, #f0fdfa 50%, #f8fafc 100%)',
          paddingTop: '40px',
          paddingBottom: '36px',
          borderBottom: '1px solid var(--slate-200)',
          marginBottom: '32px',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--slate-500)',
                marginBottom: '14px',
              }}
            >
              <Link href="/" style={{ color: 'var(--primary-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft size={14} /> Beranda
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Formulir Buat Laporan Masalah</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--primary-100)',
                    color: 'var(--primary-800)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '10px',
                  }}
                >
                  <Sparkles size={14} /> Pengaduan Warga Berbasis NIK
                </div>
                <h1
                  style={{
                    fontSize: 'clamp(1.75rem, 3vw, 2.35rem)',
                    fontWeight: 800,
                    color: 'var(--slate-900)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    marginBottom: '8px',
                  }}
                >
                  Buat Laporan Masalah Publik
                </h1>
                <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', maxWidth: '640px', lineHeight: 1.5 }}>
                  Laporkan jalan rusak, tumpukan sampah liar, lampu penerangan padam, atau banjir. Laporan Anda langsung diteruskan ke dinas teknis berwenang untuk ditindaklanjuti.
                </p>
              </div>

              {/* SLA Badge card */}
              <div
                style={{
                  backgroundColor: 'var(--white)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-200)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                    Target Respon Instansi
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-800)' }}>
                    Maks. {selectedAgencyMeta.sla}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Form */}
      <div className="container">
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {/* Quick Notice */}
          <div
            style={{
              backgroundColor: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            <Info size={20} color="var(--info-solid)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--info-text)', lineHeight: 1.5 }}>
              <strong>Petunjuk Pelaporan Efektif:</strong> Unggah <strong>foto bukti yang jelas</strong> dari jarak dekat dan sudut pandang jalan sekitar. Deskripsikan lokasi secara spesifik agar tim peninjau instansi dapat langsung menuju titik kerusakan tanpa hambatan.
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* STEP 1: PILIH KATEGORI MASALAH */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 1 dari 4
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Pilih Kategori Masalah <span className="required" style={{ color: 'var(--danger-solid)' }}>*</span>
                  </h2>
                </div>
                <span className="badge badge-primary">{selectedCategory.name}</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                        backgroundColor: isSelected ? 'var(--primary-50)' : 'var(--white)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        boxShadow: isSelected ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--primary-300)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--slate-200)';
                      }}
                    >
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--white)' : 'var(--slate-100)',
                          boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                        }}
                      >
                        {cat.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)', marginBottom: '3px' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', lineHeight: 1.35 }}>
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* INSTANSI TUJUAN (AUTO-RECOMMENDED) */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-200)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <label htmlFor="agency-select" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={16} color="var(--primary-600)" />
                    Instansi Pemerintah Tujuan Penanganan <span style={{ color: 'var(--danger-solid)' }}>*</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--primary-700)',
                      backgroundColor: 'var(--primary-100)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    Rekomendasi Cerdas Terpilih
                  </span>
                </div>

                <select
                  id="agency-select"
                  className="form-control"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  {activeAgencies.map((activeAgency) => {
                    const metadata = ALL_AGENCIES.find((item) => item.name === activeAgency.name);
                    return <option key={activeAgency.id} value={activeAgency.name}>
                      {activeAgency.name}{metadata ? ` (${metadata.badge} — SLA: ${metadata.sla})` : ''}
                    </option>
                  })}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '6px' }}>
                  Laporan akan langsung didisposisikan ke sistem tiket dinas di atas dengan SLA respon {selectedAgencyMeta.sla}.
                </div>
              </div>
            </div>

            {/* STEP 2: UPLOAD FOTO BUKTI MASALAH (USER STORY 2) */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 2 dari 4 — User Story Bukti
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Upload Foto Bukti Masalah <span style={{ color: 'var(--danger-solid)' }}>*</span>
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                    Bukti foto sangat penting bagi petugas dinas untuk verifikasi lapangan & menyiapkan alat perbaikan (Maks. 4 foto).
                  </p>
                </div>

                {/* DEMO PRESET BUTTON */}
                <button
                  type="button"
                  onClick={handleUsePresetPhotos}
                  className="btn btn-sm btn-outline"
                  style={{
                    borderColor: 'var(--warning-border)',
                    backgroundColor: 'var(--warning-bg)',
                    color: 'var(--warning-text)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                  title="Klik untuk langsung mengisi foto bukti contoh yang realistis"
                >
                  <Sparkles size={15} /> Gunakan Contoh Foto Lapangan
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: dragActive
                    ? '2px dashed var(--primary-600)'
                    : errors.images
                    ? '2px dashed var(--danger-solid)'
                    : '2px dashed var(--slate-300)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: dragActive ? 'var(--primary-50)' : 'var(--slate-50)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  marginBottom: '16px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />

                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: dragActive ? 'var(--primary-100)' : 'var(--white)',
                    color: 'var(--primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <UploadCloud size={28} />
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '4px' }}>
                  Tarik & Lepas Foto Bukti di Sini, atau <span style={{ color: 'var(--primary-700)', textDecoration: 'underline' }}>Pilih Berkas</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginBottom: '8px' }}>
                  Mendukung format JPG, PNG, atau WebP (Maksimal 5MB per foto, maks. 4 foto)
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--slate-600)',
                    backgroundColor: 'var(--white)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--slate-200)',
                  }}
                >
                  <Camera size={13} /> {images.length} / 4 foto terunggah
                </div>
              </div>

              {errors.images && (
                <div className="form-error" style={{ marginBottom: '16px' }}>
                  {errors.images}
                </div>
              )}

              {/* Uploaded Images Preview Grid */}
              {images.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '10px' }}>
                    Foto Bukti Masalah Siap Dilampirkan ({images.length}):
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {images.map((imgUrl, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'var(--slate-900)',
                          aspectRatio: '4 / 3',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Bukti Laporan ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform var(--transition-fast)',
                          }}
                        />

                        {/* Top Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: index === 0 ? 'var(--primary-600)' : 'rgba(15, 23, 42, 0.75)',
                            color: 'var(--white)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {index === 0 ? 'Bukti Utama' : `Bukti #${index + 1}`}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            color: 'var(--white)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background var(--transition-fast)',
                          }}
                          title="Hapus foto ini"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: DETAIL LAPORAN & URGENSI */}
            <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Langkah 3 dari 4
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Detail Masalah & Tingkat Urgensi
                </h2>
              </div>

              {/* Judul Laporan */}
              <div className="form-group">
                <label className="form-label" htmlFor="report-title">
                  <span>Judul Laporan Masalah <span className="required">*</span></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontWeight: 400 }}>
                    {title.length}/100 Karakter
                  </span>
                </label>
                <input
                  id="report-title"
                  type="text"
                  maxLength={100}
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder={selectedCategory.placeholderTitle}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                />
                {errors.title && <div className="form-error">{errors.title}</div>}
              </div>

              {/* Tingkat Urgensi */}
              <div className="form-group">
                <label className="form-label">
                  <span>Tingkat Urgensi Penanganan <span className="required">*</span></span>
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {(
                    [
                      { level: 'Rendah', desc: 'Tidak mengganggu mobilitas langsung', color: 'var(--slate-600)', border: 'var(--slate-300)' },
                      { level: 'Sedang', desc: 'Mengganggu kenyamanan warga', color: 'var(--info-solid)', border: 'var(--info-border)' },
                      { level: 'Tinggi', desc: 'Membahayakan pengguna jalan', color: 'var(--warning-solid)', border: 'var(--warning-border)' },
                      { level: 'Darurat', desc: 'Kritis / resiko kecelakaan fatal', color: 'var(--danger-solid)', border: 'var(--danger-border)' },
                    ] as const
                  ).map((item) => {
                    const isSelected = urgency === item.level;
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setUrgency(item.level)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? `2px solid ${item.color}` : '1px solid var(--slate-200)',
                          backgroundColor: isSelected ? 'var(--white)' : 'var(--slate-50)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                          boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? item.color : 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.level}
                          {isSelected && <Check size={14} color={item.color} />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deskripsi Masalah */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="report-desc">
                  <span>Deskripsi Lengkap & Kronologi <span className="required">*</span></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontWeight: 400 }}>
                    {description.length} karakter (Min. 20)
                  </span>
                </label>
                <textarea
                  id="report-desc"
                  rows={4}
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  placeholder={selectedCategory.placeholderDesc}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  style={{ resize: 'vertical' }}
                />
                {errors.description ? (
                  <div className="form-error">{errors.description}</div>
                ) : (
                  <div className="form-helper">
                    Sertakan dampak fisik yang ditimbulkan bagi lingkungan, pengendara, atau pejalan kaki.
                  </div>
                )}
              </div>
            </div>

            {/* STEP 4: LOKASI & OPSI PRIVASI */}
            <div className="card" style={{ padding: '28px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Langkah 4 dari 4
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    Lokasi Kejadian & Privasi
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleGetGpsLocation}
                    disabled={isLocatingGps}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Ambil titik koordinat akurat melalui sensor GPS perangkat"
                  >
                    {isLocatingGps ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Mencari Sinyal GPS...
                      </>
                    ) : (
                      <>
                        <Navigation size={14} /> Ambil Lokasi GPS
                      </>
                    )}
                  </button>

                  {user && (
                    <button
                      type="button"
                      onClick={handleUseProfileAddress}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <MapPin size={14} color="var(--primary-600)" /> Gunakan Alamat Profil
                    </button>
                  )}
                </div>
              </div>

              {/* Lokasi Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="report-location">
                  <span>Alamat Lengkap & Patokan Lokasi <span className="required">*</span></span>
                </label>
                <div className="input-wrapper">
                  <div className="input-icon-left">
                    <MapPin size={18} />
                  </div>
                  <input
                    id="report-location"
                    type="text"
                    className={`form-control has-icon-left ${errors.location ? 'is-invalid' : ''}`}
                    placeholder="Contoh: Jl. Raya Sukamaju No. 15, depan SDN Sukamaju 01, Cilodong, Kota Depok"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors((prev) => ({ ...prev, location: '' }));
                    }}
                  />
                </div>
                {errors.location && <div className="form-error">{errors.location}</div>}

                {/* GPS Coordinates Locked Card */}
                {coordinates && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.15)',
                        }}
                      >
                        <Navigation size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Koordinat GPS Terkunci</span>
                          {coordinates.accuracy && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: '#d1fae5',
                                color: '#047857',
                                fontWeight: 700,
                              }}
                            >
                              Akurasi: ±{coordinates.accuracy} m
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#047857', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '3px' }}>
                          Latitude: <strong>{coordinates.lat.toFixed(6)}</strong> | Longitude: <strong>{coordinates.lng.toFixed(6)}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '6px 12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #6ee7b7',
                          color: '#065f46',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        <ExternalLink size={13} /> Buka Google Maps
                      </a>
                      <button
                        type="button"
                        onClick={handleClearGps}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '6px 10px',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          backgroundColor: '#ffffff',
                        }}
                        title="Hapus titik koordinat GPS ini"
                      >
                        Hapus GPS
                      </button>
                    </div>
                  </div>
                )}

                {/* GPS Error Notification */}
                {gpsError && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#991b1b', maxWidth: '580px' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Gagal Mengakses GPS:</strong> {gpsError}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleSimulateGps}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '5px 10px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #fca5a5',
                          color: '#b91c1c',
                          fontWeight: 600,
                        }}
                      >
                        Gunakan Simulasi GPS
                      </button>
                      <button
                        type="button"
                        onClick={handleGetGpsLocation}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Simulation Link if no GPS active yet */}
                {!coordinates && !gpsError && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={13} color="var(--slate-400)" />
                    <span>Perangkat desktop tanpa GPS?</span>
                    <button
                      type="button"
                      onClick={handleSimulateGps}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--primary-600)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      Uji coba dengan koordinat simulasi (Depok)
                    </button>
                  </div>
                )}
              </div>

              {/* Opsi Anonimitas */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <input
                  id="anonymous-check"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
                />
                <label htmlFor="anonymous-check" style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                    Ajukan Sebagai Laporan Anonim (Sembunyikan Identitas Publik)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', lineHeight: 1.4, marginTop: '2px' }}>
                    Nama Anda akan disamarkan sebagai &ldquo;Warga Anonim&rdquo; di daftar aduan terbuka publik. Pihak instansi tetap memverifikasi keabsahan aduan secara internal melalui NIK terdaftar.
                  </div>
                </label>
              </div>

              {/* Pernyataan Kebenaran */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <input
                  id="terms-check"
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                  }}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
                />
                <label htmlFor="terms-check" style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', cursor: 'pointer', lineHeight: 1.4 }}>
                  Saya menyatakan bahwa informasi, deskripsi, dan foto bukti masalah ini adalah fakta nyata di lapangan dan bukan laporan palsu (hoaks).
                </label>
              </div>
              {errors.terms && <div className="form-error" style={{ marginTop: '6px' }}>{errors.terms}</div>}
            </div>

            {/* Submit Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                backgroundColor: 'var(--white)',
                padding: '20px 28px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  Siap Mengajukan Laporan?
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Aduan akan diteruskan ke: <strong>{agency}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href="/" className="btn btn-secondary">
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Mengirim Laporan...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Kirim Laporan ke Instansi
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* SUCCESS MODAL POPUP */}
      {submittedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 999,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
              padding: '32px',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Success Icon */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success-solid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
              Laporan Berhasil Diajukan ke Instansi!
            </h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', marginBottom: '20px', lineHeight: 1.5 }}>
              Aspirasi dan foto bukti masalah Anda telah resmi masuk ke sistem antrean pelayanan publik.
            </p>

            {/* Ticket Card */}
            <div
              style={{
                backgroundColor: 'var(--primary-50)',
                border: '1px dashed var(--primary-400)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nomor Tiket Resmi Pelaporan:
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--primary-900)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {submittedReport.ticketNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyTicket(submittedReport.ticketNumber)}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  title="Salin nomor tiket"
                >
                  {copiedTicket ? <Check size={14} color="var(--success-solid)" /> : <Copy size={14} />}
                  {copiedTicket ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            {/* Summary Details */}
            <div
              style={{
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'left',
                fontSize: '0.8125rem',
                border: '1px solid var(--slate-200)',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--slate-500)' }}>Instansi Tujuan:</span>
                <span style={{ fontWeight: 700, color: 'var(--slate-900)', textAlign: 'right' }}>{submittedReport.agency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--slate-500)' }}>Kategori:</span>
                <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{submittedReport.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--slate-500)' }}>Tingkat Urgensi:</span>
                <span className="badge badge-warning">{submittedReport.urgency}</span>
              </div>
              {submittedReport.coordinates && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Koordinat GPS:</span>
                  <a
                    href={`https://www.google.com/maps?q=${submittedReport.coordinates.lat},${submittedReport.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'var(--primary-700)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                    title="Buka titik koordinat di Google Maps"
                  >
                    <Navigation size={12} /> {submittedReport.coordinates.lat.toFixed(6)}, {submittedReport.coordinates.lng.toFixed(6)}
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--slate-500)' }}>Foto Bukti Terlampir:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>{submittedReport.images.length} Foto Terverifikasi</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px' }}>
                <span style={{ color: 'var(--slate-500)' }}>Status Penanganan:</span>
                <span className="badge badge-neutral">Menunggu Verifikasi</span>
              </div>
            </div>

            {/* Image Preview thumbnails in modal */}
            {submittedReport.images.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '8px' }}>
                  Lampiran Foto Bukti Masalah:
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {submittedReport.images.map((imgUrl, i) => (
                    <img
                      key={i}
                      src={imgUrl}
                      alt={`Bukti ${i + 1}`}
                      style={{
                        width: '80px',
                        height: '60px',
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        border: '1px solid var(--slate-200)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setSubmittedReport(null);
                  router.push('/profile?tab=reports');
                }}
                className="btn btn-primary"
              >
                <FileText size={18} /> Pantau di Riwayat Laporan Saya
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmittedReport(null);
                  setTitle('');
                  setLocation('');
                  setCoordinates(null);
                  setGpsError(null);
                  setDescription('');
                  setImages([]);
                }}
                className="btn btn-secondary"
              >
                Buat Laporan Baru Lainnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LaporPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>Memuat formulir pelaporan...</div>}>
      <ReportFormContent />
    </Suspense>
  );
}
