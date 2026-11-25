export interface UserProfile {
  id: string;
  nik: string;
  name: string;
  email: string;
  phone: string;
  gender: 'L' | 'P';
  birthDate: string;
  address: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  avatarUrl: string;
  isVerified: boolean;
  createdAt: string;
  role: 'Warga' | 'Petugas' | 'Admin' | 'Admin Instansi';
}

export interface ReportCategory {
  id: string;
  name: string;
  defaultAgency: string;
  description: string;
}

export interface AgencyItem {
  id: string;
  name: string;
  shortName: string;
  field: string;
  slaHours: number;
}

export interface ReportCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  displayAddress?: string;
}

export interface ReportItem {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  agency: string;
  location: string;
  coordinates?: ReportCoordinates;
  date: string;
  status: 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak';
  urgency: 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat';
  description: string;
  images: string[];
  reporterName?: string;
  reporterId?: string;
  isAnonymous?: boolean;
  likes: number;
  staffCoordinates?: ReportCoordinates;
  staffLocationUpdatedAt?: string;
}

export interface CreateReportInput {
  title: string;
  category: string;
  agency: string;
  location: string;
  coordinates?: ReportCoordinates;
  urgency: 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat';
  description: string;
  images: string[];
  isAnonymous: boolean;
}

export interface NotificationSettings {
  whatsappUpdates: boolean;
  emailUpdates: boolean;
  webPush: boolean;
  publicAnonymous: boolean;
}

export interface ReportComment {
  id: string;
  reportId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'Warga' | 'Petugas' | 'Admin' | 'Admin Instansi';
  text: string;
  createdAt: string; // ISO string
  isOwner?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface ReportObstacle {
  id: string;
  reportId: string;
  staffId: string;
  staffName?: string;
  category: string;
  reason: string;
  photos: string[];
  status: 'Menunggu Solusi' | 'Terselesaikan';
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffHandlingLocation {
  id: string;
  reportId: string;
  staffId: string;
  staffName?: string;
  coordinates: ReportCoordinates;
  note?: string;
  createdAt: string;
}


