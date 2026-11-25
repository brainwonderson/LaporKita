CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nik VARCHAR(16) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  gender VARCHAR(1) DEFAULT 'L',
  birth_date DATE,
  address TEXT DEFAULT '',
  rt_rw VARCHAR(50) DEFAULT '',
  kelurahan VARCHAR(255) DEFAULT '',
  kecamatan VARCHAR(255) DEFAULT '',
  city VARCHAR(255) DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'Warga',
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  agency VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  coordinates JSONB DEFAULT '{}',
  date TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Menunggu',
  urgency VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  reporter_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  assigned_agency TEXT,
  assigned_region TEXT,
  forwarded_at TIMESTAMPTZ,
  forwarded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  agency_response VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
  agency_response_reason TEXT,
  agency_responded_at TIMESTAMPTZ,
  agency_responded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  staff_work_status VARCHAR(30) NOT NULL DEFAULT 'Belum Dimulai',
  staff_work_updated_at TIMESTAMPTZ,
  staff_work_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_agency TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_region TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS forwarded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS agency_response_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS agency_responded_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS agency_responded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'reports'::regclass AND attname = 'agency_response' AND NOT attisdropped
  ) THEN
    ALTER TABLE reports ADD COLUMN agency_response VARCHAR(20) NOT NULL DEFAULT 'Menunggu';
    UPDATE reports
    SET agency_response = 'Diterima',
        agency_responded_at = forwarded_at,
        agency_responded_by = forwarded_by
    WHERE forwarded_at IS NOT NULL;
  END IF;
END;
$$;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_evidence JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_submitted_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS staff_work_status VARCHAR(30) NOT NULL DEFAULT 'Belum Dimulai';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS staff_work_updated_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS staff_work_updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS staff_coordinates JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS staff_location_updated_at TIMESTAMPTZ;
UPDATE reports
SET staff_work_status = CASE
  WHEN status = 'Selesai' THEN 'Selesai'
  WHEN completion_submitted_at IS NOT NULL THEN 'Bukti Diajukan'
  ELSE 'Sedang Dikerjakan'
END
WHERE staff_work_status = 'Belum Dimulai'
  AND (status = 'Selesai' OR completion_submitted_at IS NOT NULL OR assigned_staff_id IS NOT NULL);

CREATE TABLE IF NOT EXISTS report_agencies (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_agencies_name_ci ON report_agencies (LOWER(name));

INSERT INTO report_agencies (id, name) VALUES
  ('pupr', 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)'),
  ('dlhk', 'Dinas Lingkungan Hidup & Kebersihan (DLHK)'),
  ('dishub', 'Dinas Perhubungan (Dishub)'),
  ('sda', 'Dinas Sumber Daya Air & Pengairan (SDA)'),
  ('disperkim', 'Dinas Perumahan & Kawasan Permukiman (Disperkim)'),
  ('satpol-pp', 'Satuan Polisi Pamong Praja (Satpol PP)'),
  ('bpbd', 'Badan Penanggulangan Bencana Daerah (BPBD)')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id TEXT REFERENCES report_agencies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS report_regions (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES report_agencies(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_regions_agency_name_ci
  ON report_regions (agency_id, LOWER(name));

CREATE TABLE IF NOT EXISTS report_categories (
  id TEXT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  default_agency TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_categories_name_ci ON report_categories (LOWER(name));

INSERT INTO report_categories (id, name, default_agency) VALUES
  ('jalan-rusak', 'Jalan Rusak', 'Dinas Pekerjaan Umum & Penataan Ruang (PUPR)'),
  ('sampah-menumpuk', 'Sampah Menumpuk', 'Dinas Lingkungan Hidup & Kebersihan (DLHK)'),
  ('lampu-jalan-mati', 'Lampu Jalan Mati', 'Dinas Perhubungan (Dishub)'),
  ('banjir-drainase', 'Banjir & Drainase', 'Dinas Sumber Daya Air & Pengairan (SDA)'),
  ('fasilitas-umum', 'Fasilitas Umum', 'Dinas Perumahan & Kawasan Permukiman (Disperkim)'),
  ('lainnya', 'Lainnya', 'Satuan Polisi Pamong Praja (Satpol PP)')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS report_status_history (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_routing_history (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('Ditetapkan', 'Diteruskan')),
  agency TEXT NOT NULL,
  region TEXT NOT NULL,
  performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE report_routing_history DROP CONSTRAINT IF EXISTS report_routing_history_action_check;
ALTER TABLE report_routing_history
  ADD CONSTRAINT report_routing_history_action_check
  CHECK (action IN ('Ditetapkan', 'Diteruskan', 'Diterima', 'Dikembalikan')) NOT VALID;

CREATE TABLE IF NOT EXISTS report_staff_assignment_history (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  previous_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  previous_due_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_report_id ON admin_activity_log (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_unread ON admin_notifications (admin_id, read_at, created_at DESC);

INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
SELECT u.id, history.report_id, 'agency_returned', 'Penugasan dikembalikan instansi',
       'Instansi ' || history.agency || ' mengembalikan laporan ' || report.ticket_number || ': '
         || regexp_replace(history.details, '^Alasan pengembalian: ', '')
FROM report_routing_history history
JOIN reports report ON report.id = history.report_id
CROSS JOIN users u
WHERE history.action = 'Dikembalikan'
  AND u.role = 'Admin' AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM admin_notifications notification
    WHERE notification.admin_id = u.id
      AND notification.report_id = history.report_id
      AND notification.kind = 'agency_returned'
      AND notification.message =
        'Instansi ' || history.agency || ' mengembalikan laporan ' || report.ticket_number || ': '
          || regexp_replace(history.details, '^Alasan pengembalian: ', '')
  );

CREATE OR REPLACE FUNCTION notify_admin_report_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'Menunggu' THEN
    INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
        SELECT u.id, NEW.id, 'new_report', 'Laporan baru masuk',
          'Laporan ' || NEW.ticket_number || ' menunggu validasi admin.'
    FROM users u
    WHERE u.role = 'Admin' AND u.is_active = true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'Ditolak' THEN
    INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
    SELECT u.id, NEW.id, 'report_issue', 'Laporan mengalami kendala',
           'Laporan ' || NEW.ticket_number || ' ditolak: ' || COALESCE(NULLIF(BTRIM(NEW.rejection_reason), ''), 'perlu ditinjau kembali.')
    FROM users u
    WHERE u.role = 'Admin' AND u.is_active = true;
  ELSIF TG_OP = 'UPDATE' AND NEW.completion_submitted_at IS DISTINCT FROM OLD.completion_submitted_at
        AND NEW.completion_submitted_at IS NOT NULL THEN
    INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
    SELECT u.id, NEW.id, 'needs_validation', 'Bukti penyelesaian perlu divalidasi',
           'Petugas mengirim bukti penyelesaian untuk laporan ' || NEW.ticket_number || '.'
    FROM users u
    WHERE u.role = 'Admin' AND u.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'reports_admin_notifications_trigger'
  ) THEN
    CREATE TRIGGER reports_admin_notifications_trigger
    AFTER INSERT OR UPDATE OF status, completion_submitted_at ON reports
    FOR EACH ROW EXECUTE FUNCTION notify_admin_report_events();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION record_report_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO report_status_history (report_id, previous_status, new_status, note)
    VALUES (NEW.id, NULL, NEW.status, 'Laporan dibuat');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO report_status_history (report_id, previous_status, new_status, note)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      CASE
        WHEN OLD.status = 'Menunggu' AND NEW.status = 'Diproses' THEN 'Laporan diverifikasi dan disetujui Admin'
        WHEN OLD.status = 'Diproses' AND NEW.status = 'Selesai' THEN 'Penanganan oleh instansi selesai dan dikonfirmasi Admin'
        WHEN NEW.status = 'Ditolak' AND NULLIF(BTRIM(NEW.rejection_reason), '') IS NOT NULL THEN 'Ditolak: ' || BTRIM(NEW.rejection_reason)
        ELSE 'Status laporan diperbarui'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'reports_status_history_trigger'
  ) THEN
    CREATE TRIGGER reports_status_history_trigger
    AFTER INSERT OR UPDATE OF status ON reports
    FOR EACH ROW EXECUTE FUNCTION record_report_status_history();
  END IF;
END;
$$;

INSERT INTO report_status_history (report_id, previous_status, new_status, note, changed_at)
SELECT r.id, NULL, r.status, 'Snapshot saat riwayat diaktifkan; perubahan sebelumnya tidak tersedia', NOW()
FROM reports r
WHERE NOT EXISTS (
  SELECT 1 FROM report_status_history h WHERE h.report_id = r.id
);

CREATE TABLE IF NOT EXISTS report_comments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_role VARCHAR(20) DEFAULT 'Warga',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_owner BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS report_task_messages (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role VARCHAR(20) NOT NULL CHECK (author_role IN ('Petugas', 'Admin Instansi')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_task_messages_report_created
  ON report_task_messages (report_id, created_at, id);

CREATE TABLE IF NOT EXISTS report_supports (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS report_followers (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS report_abuse_reports (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(40) NOT NULL,
  details TEXT DEFAULT '',
  review_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE report_abuse_reports ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE report_abuse_reports ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE report_abuse_reports ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE report_abuse_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_report_abuse_reports_review_queue
  ON report_abuse_reports (review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS report_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS report_obstacles (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  photos JSONB DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'Menunggu Solusi',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_obstacles_report_id ON report_obstacles (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_obstacles_staff_id ON report_obstacles (staff_id, created_at DESC);

CREATE TABLE IF NOT EXISTS report_staff_locations (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coordinates JSONB NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_staff_locations_report_id
  ON report_staff_locations (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_staff_locations_staff_id
  ON report_staff_locations (staff_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resident_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_invitations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_user_created
  ON agency_invitations (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  whatsapp_updates BOOLEAN DEFAULT true,
  email_updates BOOLEAN DEFAULT true,
  web_push BOOLEAN DEFAULT false,
  public_anonymous BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports (category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_status_history_report_id ON report_status_history (report_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_report_routing_history_report_id ON report_routing_history (report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_report_staff_assignment_history_report_id
  ON report_staff_assignment_history (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_staff_unread
  ON staff_notifications (staff_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_staff_deadline
  ON reports (assigned_staff_id, due_at)
  WHERE assigned_staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON report_comments (report_id);
CREATE INDEX IF NOT EXISTS idx_supports_report_id ON report_supports (report_id);
CREATE INDEX IF NOT EXISTS idx_followers_report_id ON report_followers (report_id);
