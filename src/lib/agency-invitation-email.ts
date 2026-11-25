import nodemailer from 'nodemailer';

type InvitationEmail = {
  name: string;
  email: string;
  agencyName: string;
  token: string;
  role: 'Admin Instansi' | 'Petugas';
};

export class InvitationEmailConfigurationError extends Error {}

function getSmtpConfiguration() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  const appUrl = process.env.APP_URL;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from || !appUrl) {
    throw new InvitationEmailConfigurationError('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, dan APP_URL wajib diatur.');
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(appUrl);
  } catch {
    throw new InvitationEmailConfigurationError('APP_URL harus berupa URL absolut yang valid.');
  }
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') {
    throw new InvitationEmailConfigurationError('APP_URL harus menggunakan HTTPS di production.');
  }

  return { host, port, user, password, from, baseUrl };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function assertInvitationEmailConfigured() {
  getSmtpConfiguration();
}

async function sendInvitationEmail({ name, email, agencyName, token, role }: InvitationEmail) {
  const { host, port, user, password, from, baseUrl } = getSmtpConfiguration();
  const activationUrl = new URL(role === 'Petugas' ? '/petugas/aktivasi' : '/instansi/aktivasi', baseUrl);
  activationUrl.searchParams.set('token', token);
  const safeName = escapeHtml(name);
  const safeAgencyName = escapeHtml(agencyName);
  const safeRole = escapeHtml(role);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: `Undangan aktivasi ${role} LaporKita`,
    text: `Halo ${name},\n\nAnda diundang menjadi ${role} untuk ${agencyName} di LaporKita. Aktifkan akun dan buat kata sandi melalui tautan berikut (berlaku 48 jam):\n${activationUrl.toString()}\n\nJika Anda tidak mengenali undangan ini, abaikan email ini.`,
    html: `<p>Halo ${safeName},</p><p>Anda diundang menjadi ${safeRole} untuk <strong>${safeAgencyName}</strong> di LaporKita.</p><p><a href="${activationUrl.toString()}">Aktifkan akun dan buat kata sandi</a></p><p>Tautan berlaku selama 48 jam. Jika Anda tidak mengenali undangan ini, abaikan email ini.</p>`,
  });
}

export function sendAgencyInvitationEmail(invitation: Omit<InvitationEmail, 'role'>) {
  return sendInvitationEmail({ ...invitation, role: 'Admin Instansi' });
}

export function sendStaffInvitationEmail(invitation: Omit<InvitationEmail, 'role'>) {
  return sendInvitationEmail({ ...invitation, role: 'Petugas' });
}
