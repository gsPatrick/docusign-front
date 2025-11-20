import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // <<< IMPORTAR
import 'react-international-phone/style.css'; // <<< Adicione esta linha

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Doculink",
  description: "Doculink",
};  

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider> {/* <<< ENVOLVER */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}