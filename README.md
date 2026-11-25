This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Admin Platform

Admin dapat masuk melalui `/admin/login` atau formulir masuk biasa di `/login`; setelah autentikasi, akun ber-role `Admin` langsung diarahkan ke dashboard `/admin`. Registrasi publik selalu membuat akun sebagai `Warga`; untuk memberi akses admin, promosikan akun terdaftar melalui koneksi PostgreSQL tepercaya:

```sql
UPDATE users
SET role = 'Admin'
WHERE email = 'email-admin@example.com';
```

Setelah itu admin masuk menggunakan email/NIK dan kata sandi akun tersebut. Sesi admin disimpan sebagai cookie `HttpOnly` dan berakhir setelah 8 jam. Dashboard `/admin` menampilkan daftar laporan dari PostgreSQL dan endpoint-nya menolak sesi yang tidak valid.

Laporan berstatus `Diproses` dapat diberi instansi dan wilayah tujuan dari detail laporan, lalu diteruskan satu kali. Penetapan dan penerusan disimpan pada riwayat routing. Saat ini penerusan tercatat di LaporKita; integrasi email, webhook, atau sistem tiket instansi eksternal belum dikonfigurasi.

### Undangan Admin Instansi

Admin platform membuat akun Admin Instansi dari dashboard. Akun baru belum aktif sampai penerima membuka undangan email, membuat kata sandi, dan menyelesaikan aktivasi. Tautan undangan hanya dapat digunakan sekali dan kedaluwarsa setelah 48 jam; Admin platform dapat mengirim ulang undangan yang belum digunakan.

Atur pengiriman email SMTP pada environment server (jangan menyimpan kredensial di repository):

```env
APP_URL=https://laporkita.example
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=akun-smtp
SMTP_PASSWORD=kata-sandi-smtp
SMTP_FROM="LaporKita <noreply@example.com>"
```

Gunakan SMTP port `465` untuk koneksi TLS implisit; port lain memakai koneksi SMTP STARTTLS sesuai dukungan server. Di production, `APP_URL` wajib memakai HTTPS. Pembuatan undangan akun Admin Instansi maupun Petugas ditolak jika konfigurasi SMTP belum lengkap; jika layanan email gagal sementara, akun tetap menunggu aktivasi dan Admin terkait dapat mengirim ulang undangannya setelah layanan pulih.

### Penetapan tenggat dan pemantauan progres

Admin Instansi dapat menetapkan Petugas dan tenggat penanganan pada detail laporan yang sudah diterima. Tenggat harus berada di masa mendatang; perubahan penugasan dan tenggat dicatat pada riwayat serta Petugas mendapat notifikasi. Dashboard Admin Instansi menampilkan kondisi tenggat dan progres laporan, termasuk menunggu konfirmasi, menunggu Petugas, sedang ditangani, bukti diajukan, dan selesai. Detail laporan menampilkan foto bukti dalam pratinjau yang dapat dibuka ukuran penuh, catatan Petugas, dan waktu pengiriman; data bukti dimuat ulang ketika detail dibuka.

### Login dan dashboard Petugas

Admin Instansi membuat akun Petugas dari dashboard instansinya dengan nama, email, NIK, dan nomor telepon. Akun terikat ke instansi pembuat dan belum aktif sampai Petugas membuka undangan email, membuat kata sandi, dan menyelesaikan aktivasi. Tautan hanya dapat digunakan sekali dan berlaku selama 48 jam; Admin Instansi dapat mengirim ulang undangan yang belum digunakan. Pengiriman memakai konfigurasi SMTP di atas.

Petugas dapat masuk melalui `/petugas/login` menggunakan email atau NIK dan kata sandi akun Petugas yang aktif. Endpoint login memvalidasi role Petugas sebelum membuat sesi; dashboard `/petugas` hanya menampilkan tugas yang secara khusus ditetapkan kepada Petugas tersebut. Daftar tugas dapat difilter menurut status. Setiap tugas menyediakan detail deskripsi masalah, kategori, foto laporan, lokasi beserta tautan peta, prioritas, dan tenggat waktu. Petugas memperbarui tahapan pekerjaan dari Belum Dimulai ke Sedang Dikerjakan, dan dapat menandai Menunggu Tindak Lanjut sebelum kembali melanjutkan pekerjaan. Jika terdapat kendala yang menghambat proses penanganan di lapangan (misal akses lokasi terhalang, cuaca buruk, kekurangan material/alat, atau perizinan), Petugas dapat melaporkan kendala beserta kategori, alasan terperinci (10–1.000 karakter), dan foto bukti pendukung; status tugas otomatis dialihkan ke Terkendala dan tercatat pada riwayat penanganan serta notifikasi instansi. Setelah kendala diatasi, Petugas dapat menandai kendala terselesaikan dan melanjutkan pengerjaan. Setelah seluruh pekerjaan siap, Petugas mengirim catatan (10–1.000 karakter) dan 1–4 foto bukti JPG, PNG, atau WebP (maksimal 3 MB per foto) kepada Admin Instansi. Admin Instansi memeriksa bukti pada detail laporan dan menyetujuinya untuk menandai tugas Selesai. Dashboard Petugas juga menampilkan ringkasan dan bukti penyelesaian untuk tugas yang sudah selesai.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
