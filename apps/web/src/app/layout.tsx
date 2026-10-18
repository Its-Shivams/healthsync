import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Navbar } from '@/components/navigation/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HealthSync | Digital Healthcare Interoperability Platform',
  description:
    'Patient-centric digital healthcare platform with consent-based record sharing, AI clinical assistant, and cryptographic trust layer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 text-center">
              <div className="max-w-7xl mx-auto px-4 space-y-2">
                <p>
                  HealthSync Interoperability Platform • Demonstrator Edition • Cryptographic Trust Layer Active
                </p>
                <p className="text-slate-400">
                  Medical Disclaimer: HealthSync and HealthSync Assistant are informational software tools and do not substitute for formal medical evaluation, clinical diagnosis, or treatment by a licensed physician. In case of emergency, call 112 immediately.
                </p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
