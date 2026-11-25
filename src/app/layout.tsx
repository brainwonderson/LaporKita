import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "LaporKita - Sistem Pengaduan & Aspirasi Layanan Publik Warga",
  description:
    "Platform aduan masyarakat untuk jalan rusak, sampah menumpuk, lampu penerangan mati, banjir, dan fasilitas umum dengan tindak lanjut transparan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
