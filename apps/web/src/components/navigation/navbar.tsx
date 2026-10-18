'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@healthsync/shared-types';
import {
  Activity,
  FileText,
  Bot,
  MapPin,
  Calendar,
  ShieldCheck,
  Stethoscope,
  LogOut,
  User,
  UserCheck,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Menu,
  X,
  Heart,
  Building2,
  Users,
  FlaskConical,
} from 'lucide-react';

export function Navbar() {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      await logout();
    } catch (err: any) {
      setLogoutError(err.message || 'Logout failed. Please check your connection and try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLinks = React.useMemo(() => {
    if (!user) return [];

    if (role === UserRole.PATIENT) {
      return [
        { href: '/patient/dashboard', label: 'Dashboard', icon: Activity },
        { href: '/patient/profile', label: 'My Profile', icon: UserCheck },
        { href: '/patient/vitals', label: 'Daily Vitals', icon: Heart },
        { href: '/patient/records', label: 'Medical Records', icon: FileText },
        { href: '/patient/doctors', label: 'Find Doctors', icon: Stethoscope },
        { href: '/patient/hospitals', label: 'Find Hospitals', icon: MapPin },
        { href: '/patient/appointments', label: 'Appointments', icon: Calendar },
        { href: '/patient/consent', label: 'Consent', icon: ShieldCheck },
        { href: '/patient/ai-assistant', label: 'AI Assistant', icon: Bot },
      ];
    }

    if (role === UserRole.DOCTOR) {
      return [
        { href: '/doctor/dashboard', label: 'Clinical Dashboard', icon: Stethoscope },
        { href: '/patient/doctors', label: 'Doctor Directory', icon: Users },
        { href: '/patient/hospitals', label: 'Hospital Network', icon: MapPin },
      ];
    }

    if (role === UserRole.HOSPITAL_ADMIN) {
      return [
        { href: '/hospital-admin/dashboard', label: 'Hospital Console', icon: Building2 },
        { href: '/patient/doctors', label: 'Doctor Roster', icon: Stethoscope },
        { href: '/patient/hospitals', label: 'Facilities Map', icon: MapPin },
      ];
    }

    if (role === UserRole.LAB_ADMIN || role === UserRole.LAB_TECHNICIAN) {
      return [
        { href: '/lab-admin/dashboard', label: 'Laboratory Console', icon: FlaskConical },
        { href: '/patient/hospitals', label: 'Facility Directory', icon: MapPin },
      ];
    }

    // Platform Admin default
    return [
      { href: '/admin', label: 'Platform Operations', icon: Activity },
      { href: '/patient/doctors', label: 'Doctor Roster', icon: Stethoscope },
      { href: '/patient/hospitals', label: 'Facility Directory', icon: MapPin },
    ];
  }, [user, role]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Emergency Ribbon */}
      <div className="bg-emergency-600 text-white text-xs py-1 px-4 text-center font-medium flex items-center justify-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
        <span>Medical Emergency? Call <strong>112</strong> immediately. HealthSync is an informational platform, not an emergency dispatcher.</span>
      </div>

      {/* Logout Error Banner */}
      {logoutError && (
        <div className="bg-red-600 text-white text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 shadow-inner">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{logoutError}</span>
          <button
            type="button"
            onClick={() => setLogoutError(null)}
            className="ml-3 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Health<span className="text-brand-600">Sync</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1.5">
                    <span>{user.firstName} {user.lastName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-200">
                      {role || 'USER'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <item.icon className="w-4 h-4 text-brand-600" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">{user.firstName} {user.lastName}</div>
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold">
                    {role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{user.email}</div>
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  disabled={isLoggingOut}
                  className="w-full py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-semibold border rounded-lg hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
