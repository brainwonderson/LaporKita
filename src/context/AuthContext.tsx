'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ReportItem, NotificationSettings, ToastMessage, CreateReportInput, ReportComment } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  reports: ReportItem[];
  supportedReports: string[];
  comments: ReportComment[];
  followedReports: string[];
  notifications: NotificationSettings;
  toast: ToastMessage | null;
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  hideToast: () => void;
  login: (identifier: string, password?: string, expectedRole?: 'Petugas') => Promise<boolean>;
  loginAsDemo: () => void;
  register: (data: {
    nik: string;
    name: string;
    email: string;
    phone: string;
    password?: string;
  }) => Promise<boolean>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<boolean>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateNotifications: (settings: NotificationSettings) => void;
  createReport: (data: CreateReportInput) => Promise<ReportItem>;
  likeReport: (reportId: string) => void;
  hasSupportedReport: (reportId: string) => boolean;
  addComment: (reportId: string, text: string) => ReportComment;
  deleteComment: (commentId: string) => void;
  getComments: (reportId: string) => ReportComment[];
  followReport: (reportId: string) => void;
  hasFollowedReport: (reportId: string) => boolean;
  logout: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr-89211',
  nik: '3271012304850002',
  name: 'Budi Santoso',
  email: 'budi.santoso@warga.id',
  phone: '081234567890',
  gender: 'L',
  birthDate: '1988-04-23',
  address: 'Jl. Melati Raya No. 42 Blok B3',
  rtRw: '005 / 008',
  kelurahan: 'Sukamaju',
  kecamatan: 'Cilodong',
  city: 'Kota Depok, Jawa Barat',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  isVerified: true,
  createdAt: '12 Januari 2025',
  role: 'Warga',
};

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'rep-01',
    ticketNumber: 'LPK-2026-0812',
    title: 'Jalan Berlubang di Depan SDN Sukamaju 01',
    category: 'Jalan Rusak',
    agency: 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)',
    location: 'Jl. Raya Sukamaju No. 15, Cilodong',
    coordinates: {
      lat: -6.402484,
      lng: 106.828241,
      accuracy: 8,
      displayAddress: 'Jl. Raya Sukamaju No. 15, Cilodong',
    },
    date: '10 Sep 2026',
    status: 'Selesai',
    urgency: 'Tinggi',
    description: 'Aspal terkelupas dengan diameter sekitar 70 cm dan kedalaman 10 cm, sangat membahayakan pengendara motor saat hujan.',
    images: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Budi Santoso',
    isAnonymous: false,
    likes: 24,
  },
  {
    id: 'rep-02',
    ticketNumber: 'LPK-2026-0902',
    title: 'Lampu PJU Padam Sepanjang 200 Meter',
    category: 'Lampu Jalan Mati',
    agency: 'Dinas Perhubungan (Dishub)',
    location: 'Jl. Melati RT 05 / RW 08',
    coordinates: {
      lat: -6.415829,
      lng: 106.839120,
      accuracy: 14,
      displayAddress: 'Jl. Melati RT 05 / RW 08, Cilodong',
    },
    date: '12 Sep 2026',
    status: 'Diproses',
    urgency: 'Sedang',
    description: 'Lampu penerangan mati total sejak 3 malam terakhir, rawan kecelakaan dan tindak kriminal.',
    images: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Budi Santoso',
    isAnonymous: false,
    likes: 18,
  },
  {
    id: 'rep-03',
    ticketNumber: 'LPK-2026-0911',
    title: 'Tumpukan Sampah Liar di Pinggir Saluran Kali Baru',
    category: 'Sampah Menumpuk',
    agency: 'Dinas Lingkungan Hidup & Kebersihan (DLHK)',
    location: 'Bantaran Kali Baru RT 02 / RW 04',
    coordinates: {
      lat: -6.398211,
      lng: 106.812401,
      accuracy: 10,
      displayAddress: 'Bantaran Kali Baru RT 02 / RW 04, Depok',
    },
    date: '13 Sep 2026',
    status: 'Menunggu',
    urgency: 'Sedang',
    description: 'Banyak kantong sampah menumpuk dan berbau menyengat, perlu segera diangkut armada kebersihan.',
    images: [
      'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Budi Santoso',
    isAnonymous: false,
    likes: 9,
  },
  {
    id: 'rep-04',
    ticketNumber: 'LPK-2026-0913',
    title: 'Tutup Drainase Pecah & Saluran Air Tersumbat',
    category: 'Banjir & Drainase',
    agency: 'Dinas Sumber Daya Air (SDA)',
    location: 'Pertigaan Pasar Pucung',
    coordinates: {
      lat: -6.421045,
      lng: 106.845612,
      accuracy: 6,
      displayAddress: 'Pertigaan Pasar Pucung, Cilodong',
    },
    date: '13 Sep 2026',
    status: 'Menunggu',
    urgency: 'Darurat',
    description: 'Tutup beton saluran ambles dan sampah menyumbat air, rawan memicu banjir saat hujan lebat.',
    images: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Budi Santoso',
    isAnonymous: false,
    likes: 12,
  },
  {
    id: 'rep-05',
    ticketNumber: 'LPK-2026-0915',
    title: 'Atap Halte Bus Depan RSUD Copot & Kursi Rusak',
    category: 'Fasilitas Umum',
    agency: 'Dinas Perumahan & Kawasan Permukiman (Disperkim)',
    location: 'Jl. Margonda Raya No. 88 (Depan RSUD)',
    coordinates: {
      lat: -6.372481,
      lng: 106.832410,
      accuracy: 5,
      displayAddress: 'Jl. Margonda Raya No. 88, Pancoran Mas',
    },
    date: '15 Sep 2026',
    status: 'Diproses',
    urgency: 'Sedang',
    description: 'Seng kanopi halte bus terhempas angin kencang dan kursi tunggu patah sehingga lansia tidak bisa duduk saat menunggu armada Trans.',
    images: [
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Siti Rahmawati',
    isAnonymous: false,
    likes: 31,
  },
  {
    id: 'rep-06',
    ticketNumber: 'LPK-2026-0918',
    title: 'Dahan Pohon Rawan Tumbang ke Jaringan Kabel Listrik',
    category: 'Lainnya',
    agency: 'Badan Penanggulangan Bencana Daerah (BPBD)',
    location: 'Jl. Siliwangi Dekat Gardu PLN',
    coordinates: {
      lat: -6.399120,
      lng: 106.824510,
      accuracy: 8,
      displayAddress: 'Jl. Siliwangi Dekat Gardu PLN, Depok',
    },
    date: '18 Sep 2026',
    status: 'Selesai',
    urgency: 'Tinggi',
    description: 'Dahan pohon trembesi tua lapuk dan menjuntai menyentuh kabel listrik tegangan menengah, telah dipangkas rapi oleh tim siaga.',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Warga Peduli Lingkungan',
    isAnonymous: true,
    likes: 15,
  },
  {
    id: 'rep-07',
    ticketNumber: 'LPK-2026-0920',
    title: 'Sengketa Pagar Garasi Pribadi Warga di Pekarangan Rumah',
    category: 'Lainnya',
    agency: 'Satuan Polisi Pamong Praja (Satpol PP)',
    location: 'Komplek Griya Asri Blok D2 No. 5',
    coordinates: {
      lat: -6.410200,
      lng: 106.831500,
      accuracy: 12,
      displayAddress: 'Komplek Griya Asri Blok D2 No. 5, Cilodong',
    },
    date: '20 Sep 2026',
    status: 'Ditolak',
    urgency: 'Rendah',
    description: 'Setelah verifikasi lapangan oleh Satpol PP, lokasi batas berada di dalam kavling bersertifikat hak milik pribadi dan bukan bahu jalan umum. Disarankan musyawarah RT/RW.',
    images: [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Warga Anonim',
    isAnonymous: true,
    likes: 3,
  },
  {
    id: 'rep-08',
    ticketNumber: 'LPK-2026-0922',
    title: 'Aspal Amblas Dekat Jembatan Serua Membahayakan Pemotor',
    category: 'Jalan Rusak',
    agency: 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)',
    location: 'Jl. Raya Sawangan KM 2, Depan Sawangan Elok',
    coordinates: {
      lat: -6.394120,
      lng: 106.802140,
      accuracy: 6,
      displayAddress: 'Jl. Raya Sawangan KM 2, Pancoran Mas',
    },
    date: '22 Sep 2026',
    status: 'Diproses',
    urgency: 'Darurat',
    description: 'Bahu jalan amblas sedalam 30 cm tepat di tikungan jembatan. Sudah ada 2 pemotor tergelincir saat malam hari karena minim penerangan jalan.',
    images: [
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Dimas Prasetyo',
    isAnonymous: false,
    likes: 47,
  },
  {
    id: 'rep-09',
    ticketNumber: 'LPK-2026-0923',
    title: 'Kontainer Sampah TPS Meluber ke Badan Jalan Pasar Kemiri',
    category: 'Sampah Menumpuk',
    agency: 'Dinas Lingkungan Hidup & Kebersihan (DLHK)',
    location: 'Pintu Masuk Barat Pasar Kemiri Muka',
    coordinates: {
      lat: -6.385410,
      lng: 106.819820,
      accuracy: 8,
      displayAddress: 'Pasar Kemiri Muka, Beji, Depok',
    },
    date: '23 Sep 2026',
    status: 'Menunggu',
    urgency: 'Tinggi',
    description: 'Sudah 4 hari armada truk sampah tidak mengangkut TPS. Sampah membusuk berceceran hingga memakan 1 lajur kendaraan dan bau busuk menyengat.',
    images: [
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'H. Suryadi',
    isAnonymous: false,
    likes: 36,
  },
  {
    id: 'rep-10',
    ticketNumber: 'LPK-2026-0925',
    title: 'Pembersihan Sedimen Saluran Gorong-Gorong Utama',
    category: 'Banjir & Drainase',
    agency: 'Dinas Sumber Daya Air (SDA)',
    location: 'Perumahan Bukit Sawangan Indah Blok C',
    coordinates: {
      lat: -6.418900,
      lng: 106.779200,
      accuracy: 5,
      displayAddress: 'Bukit Sawangan Indah Blok C, Sawangan',
    },
    date: '25 Sep 2026',
    status: 'Selesai',
    urgency: 'Tinggi',
    description: 'Tim satgas SDA telah berhasil mengeruk endapan lumpur tebal sepanjang 120 meter di saluran penghubung. Aliran air kini mengalir lancar.',
    images: [
      'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Ketua RW 11 Sawangan',
    isAnonymous: false,
    likes: 52,
  },
  {
    id: 'rep-11',
    ticketNumber: 'LPK-2026-0926',
    title: '3 Titik Lampu Jalan Tenaga Surya Padam di Jalur Cijago',
    category: 'Lampu Jalan Mati',
    agency: 'Dinas Perhubungan (Dishub)',
    location: 'Jl. Ir. H. Juanda Akses Tol Cijago KM 1.5',
    coordinates: {
      lat: -6.376200,
      lng: 106.852100,
      accuracy: 7,
      displayAddress: 'Jl. Ir. H. Juanda, Sukmajaya',
    },
    date: '26 Sep 2026',
    status: 'Menunggu',
    urgency: 'Sedang',
    description: 'Lampu solar cell di median jalan padam total, persimpangan U-Turn jadi gelap gulita dan rawan kecelakaan antar kendaraan malam hari.',
    images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Warga Penglaju Tol',
    isAnonymous: true,
    likes: 21,
  },
  {
    id: 'rep-12',
    ticketNumber: 'LPK-2026-0927',
    title: 'Pagar Pembatas Kolam Taman Lembah Roboh Membahayakan Warga',
    category: 'Fasilitas Umum',
    agency: 'Dinas Perumahan & Kawasan Permukiman (Disperkim)',
    location: 'Taman Lembah Gurame, Jl. Gurame Raya',
    coordinates: {
      lat: -6.391200,
      lng: 106.823900,
      accuracy: 5,
      displayAddress: 'Taman Lembah Gurame, Depok Jaya',
    },
    date: '27 Sep 2026',
    status: 'Diproses',
    urgency: 'Tinggi',
    description: 'Pagar besi pembatas kolam taman patah dan ambruk karena korosi. Sangat berbahaya bagi anak-anak balita yang bermain di sekitar jogging track.',
    images: [
      'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=600&auto=format&fit=crop&q=80',
    ],
    reporterName: 'Anisa Wulandari',
    isAnonymous: false,
    likes: 41,
  },
];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  whatsappUpdates: true,
  emailUpdates: true,
  webPush: false,
  publicAnonymous: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [supportedReports, setSupportedReports] = useState<string[]>(['rep-01', 'rep-05']);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [followedReports, setFollowedReports] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from LocalStorage and sync from PostgreSQL-backed API when available
  useEffect(() => {
    const initialize = async () => {
      try {
        const storedUser = localStorage.getItem('laporkita_user_session');
        const storedNotifs = localStorage.getItem('laporkita_notifs');
        const storedReports = localStorage.getItem('laporkita_reports');
        const storedSupported = localStorage.getItem('laporkita_supported_reports');
        const storedComments = localStorage.getItem('laporkita_comments');
        const storedFollowed = localStorage.getItem('laporkita_followed_reports');

        if (storedSupported) {
          try {
            const parsedSupported = JSON.parse(storedSupported);
            if (Array.isArray(parsedSupported)) {
              setSupportedReports(parsedSupported);
            }
          } catch {
            // ignore error
          }
        }

        if (storedComments) {
          try {
            const parsedComments = JSON.parse(storedComments);
            if (Array.isArray(parsedComments)) setComments(parsedComments);
          } catch { /* ignore */ }
        }

        if (storedFollowed) {
          try {
            const parsedFollowed = JSON.parse(storedFollowed);
            if (Array.isArray(parsedFollowed)) setFollowedReports(parsedFollowed);
          } catch { /* ignore */ }
        }

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as UserProfile;
          if (parsedUser.role === 'Warga' && parsedUser.id !== DEFAULT_USER.id) {
            const response = await fetch('/api/auth/profile', { cache: 'no-store' });
            if (response.status === 401) {
              localStorage.removeItem('laporkita_user_session');
              setUser(null);
            } else if (!response.ok) {
              throw new Error('Gagal memvalidasi sesi profil.');
            } else {
              const result = await response.json();
              if (!result.user) throw new Error('Server tidak mengembalikan profil sesi.');
              setUser(result.user as UserProfile);
              localStorage.setItem('laporkita_user_session', JSON.stringify(result.user));
            }
          } else {
            setUser(parsedUser);
          }
        } else {
          setUser(null);
        }

        if (storedNotifs) {
          setNotifications(JSON.parse(storedNotifs));
        }

        try {
          const response = await fetch('/api/reports');
          if (response.ok) {
            const remoteReports = await response.json();
            if (Array.isArray(remoteReports) && remoteReports.length > 0) {
              setReports(remoteReports);
              localStorage.setItem('laporkita_reports', JSON.stringify(remoteReports));
            } else if (storedReports) {
              const parsed = JSON.parse(storedReports);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setReports(parsed);
              } else {
                setReports(INITIAL_REPORTS);
                localStorage.setItem('laporkita_reports', JSON.stringify(INITIAL_REPORTS));
              }
            } else {
              setReports(INITIAL_REPORTS);
              localStorage.setItem('laporkita_reports', JSON.stringify(INITIAL_REPORTS));
            }
          } else if (storedReports) {
            const parsed = JSON.parse(storedReports);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setReports(parsed);
            } else {
              setReports(INITIAL_REPORTS);
              localStorage.setItem('laporkita_reports', JSON.stringify(INITIAL_REPORTS));
            }
          } else {
            setReports(INITIAL_REPORTS);
            localStorage.setItem('laporkita_reports', JSON.stringify(INITIAL_REPORTS));
          }
        } catch {
          if (storedReports) {
            try {
              const parsed = JSON.parse(storedReports);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setReports(parsed);
              } else {
                setReports(INITIAL_REPORTS);
              }
            } catch {
              setReports(INITIAL_REPORTS);
            }
          } else {
            setReports(INITIAL_REPORTS);
            localStorage.setItem('laporkita_reports', JSON.stringify(INITIAL_REPORTS));
          }
        }
      } catch (e) {
        console.error('Error loading session from localStorage', e);
        setUser(null);
        setReports(INITIAL_REPORTS);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({
      id: Date.now().toString(),
      type,
      title,
      message,
    });
  };

  const hideToast = () => {
    setToast(null);
  };

  const login = async (identifier: string, password = '', expectedRole?: 'Petugas'): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, ...(expectedRole ? { expectedRole } : {}) }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal.');
      }

      const loggedUser = data.user as UserProfile;
      setUser(loggedUser);
      localStorage.setItem('laporkita_user_session', JSON.stringify(loggedUser));
      setIsLoading(false);
      showToast('success', 'Berhasil Masuk', `Selamat datang kembali, ${loggedUser.name}!`);
      return true;
    } catch (error) {
      setIsLoading(false);
      showToast(
        'error',
        'Login Gagal',
        error instanceof Error ? error.message : 'Pastikan PostgreSQL sudah aktif dan kredensial Anda benar.',
      );

      setUser(null);
      localStorage.removeItem('laporkita_user_session');
      return false;
    }
  };

  const loginAsDemo = () => {
    const demoUser = { ...DEFAULT_USER };
    setUser(demoUser);
    localStorage.setItem('laporkita_user_session', JSON.stringify(demoUser));
    showToast('success', 'Mode Demo Aktif', 'Masuk sebagai akun warga contoh: Pak Budi Santoso.');
  };

  const register = async (data: {
    nik: string;
    name: string;
    email: string;
    phone: string;
    password?: string;
  }): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: data.nik,
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password || '',
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Registrasi gagal.');
      }

      const newUser = result.user as UserProfile;
      setUser(newUser);
      localStorage.setItem('laporkita_user_session', JSON.stringify(newUser));
      setIsLoading(false);
      showToast('success', 'Registrasi Berhasil', `Akun atas nama ${data.name} berhasil didaftarkan!`);
      return true;
    } catch (error) {
      setIsLoading(false);
      showToast(
        'error',
        'Registrasi Gagal',
        error instanceof Error ? error.message : 'Pastikan PostgreSQL sudah aktif dan DATABASE_URL benar.',
      );

      setUser(null);
      localStorage.removeItem('laporkita_user_session');
      return false;
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;

    if (user.id === DEFAULT_USER.id) {
      showToast(
        'error',
        'Akun Demo Tidak Dapat Menyimpan Perubahan',
        'Silakan masuk dengan akun terdaftar agar perubahan profil tersimpan di database.',
      );
      return false;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui profil.');
      }

      if (!result.user) {
        throw new Error('Server tidak mengembalikan profil yang tersimpan. Silakan coba lagi.');
      }

      const updated = result.user as UserProfile;
      setUser(updated);
      localStorage.setItem('laporkita_user_session', JSON.stringify(updated));
      setIsLoading(false);
      showToast('success', 'Profil Diperbarui', 'Data identitas Anda berhasil disimpan ke sistem.');
      return true;
    } catch (error) {
      const currentUser = user;
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem('laporkita_user_session', JSON.stringify(currentUser));
      }
      setIsLoading(false);
      showToast(
        'error',
        'Gagal Menyimpan Profil',
        error instanceof Error ? error.message : 'Data profil gagal disimpan ke database. Silakan coba lagi.',
      );
      return false;
    }
  };

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 600));

    if (!oldPassword || !newPassword) {
      setIsLoading(false);
      showToast('error', 'Gagal', 'Mohon isi semua kolom kata sandi.');
      return false;
    }

    setIsLoading(false);
    showToast('success', 'Kata Sandi Diubah', 'Kata sandi akun Anda berhasil diperbarui dengan aman.');
    return true;
  };

  const updateNotifications = (settings: NotificationSettings) => {
    setNotifications(settings);
    localStorage.setItem('laporkita_notifs', JSON.stringify(settings));
    showToast('info', 'Preferensi Disimpan', 'Pengaturan notifikasi berhasil diperbarui.');
  };

  const createReport = async (data: CreateReportInput): Promise<ReportItem> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          reporterName: user?.name || 'Warga Peduli',
          reporterId: user?.id === DEFAULT_USER.id ? null : user?.id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan laporan');
      }

      const newReport = result.report as ReportItem;

      setReports((prev) => {
        const updated = [newReport, ...prev];
        try {
          localStorage.setItem('laporkita_reports', JSON.stringify(updated));
        } catch (err) {
          console.warn('Gagal menyimpan laporan ke localStorage', err);
        }
        return updated;
      });

      setIsLoading(false);
      showToast(
        'success',
        'Laporan Berhasil Diajukan',
        `Tiket #${newReport.ticketNumber} telah diteruskan ke ${data.agency}.`
      );
      return newReport;
    } catch (error) {
      const today = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateString = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      const randomTicketSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketNumber = `LPK-${today.getFullYear()}-${randomTicketSuffix}`;

      const fallbackReport: ReportItem = {
        id: `rep-${Date.now()}`,
        ticketNumber,
        title: data.title,
        category: data.category,
        agency: data.agency,
        location: data.location,
        coordinates: data.coordinates || {
          lat: -6.402484 + (Math.random() - 0.5) * 0.04,
          lng: 106.828241 + (Math.random() - 0.5) * 0.04,
          accuracy: 10,
          displayAddress: data.location,
        },
        date: dateString,
        status: 'Menunggu',
        urgency: data.urgency,
        description: data.description,
        images: data.images.length > 0 ? data.images : [
          'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80'
        ],
        reporterName: data.isAnonymous ? 'Warga Anonim' : (user?.name || 'Warga Peduli'),
        reporterId: user?.id === DEFAULT_USER.id ? undefined : user?.id,
        isAnonymous: data.isAnonymous,
        likes: 1,
      };

      setReports((prev) => {
        const updated = [fallbackReport, ...prev];
        try {
          localStorage.setItem('laporkita_reports', JSON.stringify(updated));
        } catch (err) {
          console.warn('Gagal menyimpan laporan ke localStorage', err);
        }
        return updated;
      });

      setIsLoading(false);
      showToast(
        'error',
        'Penyimpanan Lokal Digunakan',
        error instanceof Error ? error.message : 'Data laporan tetap disimpan di browser saat PostgreSQL belum aktif.',
      );
      return fallbackReport;
    }
  };

  const hasSupportedReport = (reportId: string): boolean => {
    return supportedReports.includes(reportId);
  };

  const likeReport = (reportId: string) => {
    const isAlreadySupported = supportedReports.includes(reportId);
    let newSupported: string[];

    if (isAlreadySupported) {
      newSupported = supportedReports.filter((id) => id !== reportId);
      setReports((prev) => {
        const updated = prev.map((r) => {
          if (r.id === reportId) {
            return { ...r, likes: Math.max(0, (r.likes || 1) - 1) };
          }
          return r;
        });
        try {
          localStorage.setItem('laporkita_reports', JSON.stringify(updated));
        } catch (err) {
          console.warn('Gagal menyimpan update likes ke localStorage', err);
        }
        return updated;
      });
      showToast('info', 'Dukungan Dibatalkan', 'Dukungan Anda pada laporan aduan ini telah ditarik.');
    } else {
      newSupported = [...supportedReports, reportId];
      setReports((prev) => {
        const updated = prev.map((r) => {
          if (r.id === reportId) {
            return { ...r, likes: (r.likes || 0) + 1 };
          }
          return r;
        });
        try {
          localStorage.setItem('laporkita_reports', JSON.stringify(updated));
        } catch (err) {
          console.warn('Gagal menyimpan update likes ke localStorage', err);
        }
        return updated;
      });
      showToast('success', 'Dukungan Diberikan! ❤️', 'Terima kasih telah menyuarakan dukungan warga demi percepatan tindak lanjut!');
    }

    setSupportedReports(newSupported);
    try {
      localStorage.setItem('laporkita_supported_reports', JSON.stringify(newSupported));
    } catch (err) {
      console.warn('Gagal menyimpan supportedReports ke localStorage', err);
    }
  };

  const addComment = (reportId: string, text: string): ReportComment => {
    const now = new Date();
    const newComment: ReportComment = {
      id: `cmt-${Date.now()}`,
      reportId,
      authorName: user?.name || 'Warga Anonim',
      authorAvatar: user?.avatarUrl,
      authorRole: user?.role || 'Warga',
      text: text.trim(),
      createdAt: now.toISOString(),
      isOwner: true,
    };
    setComments((prev) => {
      const updated = [...prev, newComment];
      try { localStorage.setItem('laporkita_comments', JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast('success', 'Komentar Terkirim ✅', 'Komentar Anda berhasil ditambahkan.');
    return newComment;
  };

  const deleteComment = (commentId: string) => {
    setComments((prev) => {
      const updated = prev.filter((c) => c.id !== commentId);
      try { localStorage.setItem('laporkita_comments', JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast('info', 'Komentar Dihapus', 'Komentar Anda berhasil dihapus.');
  };

  const getComments = (reportId: string): ReportComment[] => {
    return comments.filter((c) => c.reportId === reportId);
  };

  const followReport = (reportId: string) => {
    const isFollowed = followedReports.includes(reportId);
    let newFollowed: string[];
    if (isFollowed) {
      newFollowed = followedReports.filter((id) => id !== reportId);
      showToast('info', 'Berhenti Mengikuti', 'Anda tidak lagi memantau perkembangan laporan ini.');
    } else {
      newFollowed = [...followedReports, reportId];
      showToast('success', 'Mengikuti Laporan 🔔', 'Anda akan mendapat notifikasi setiap perkembangan laporan ini.');
    }
    setFollowedReports(newFollowed);
    try { localStorage.setItem('laporkita_followed_reports', JSON.stringify(newFollowed)); } catch {}
  };

  const hasFollowedReport = (reportId: string): boolean => {
    return followedReports.includes(reportId);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('laporkita_user_session');
    showToast('info', 'Sesi Berakhir', 'Anda telah keluar dari akun LaporKita.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        reports,
        supportedReports,
        comments,
        followedReports,
        notifications,
        toast,
        isLoading,
        showToast,
        hideToast,
        login,
        loginAsDemo,
        register,
        updateProfile,
        updatePassword,
        updateNotifications,
        createReport,
        likeReport,
        hasSupportedReport,
        addComment,
        deleteComment,
        getComments,
        followReport,
        hasFollowedReport,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
