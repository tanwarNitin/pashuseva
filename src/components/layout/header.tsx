"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslation, useLocale } from "@/i18n/client";
import Link from "next/link";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X, Stethoscope, Calendar, Users, LogIn, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { logoutAction } from "@/actions/auth.actions";

export interface HeaderUser {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface HeaderProps {
  user?: HeaderUser | null;
}

export function Header({ user }: HeaderProps) {
  const dict = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(user ?? null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setCurrentUser(user ?? null);
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
      setCurrentUser(null);
      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Build navigation items based on user role
  const navItems = (() => {
    if (currentUser?.role === "VET_DOCTOR" || currentUser?.role === "PARAVET_WORKER") {
      return [
        { href: `/${locale}/dashboard`, icon: Calendar, label: dict.nav.dashboard },
        { href: `/${locale}/discover`, icon: Stethoscope, label: dict.nav.discover },
      ];
    }
    if (currentUser?.role === "ADMIN") {
      return [
        { href: `/${locale}/admin/providers/verify`, icon: Shield, label: "Admin" },
        { href: `/${locale}/admin/disputes`, icon: Shield, label: "Disputes" },
        { href: `/${locale}/discover`, icon: Stethoscope, label: dict.nav.discover },
      ];
    }
    return [
      { href: `/${locale}/discover`, icon: Stethoscope, label: dict.nav.discover },
      { href: `/${locale}/requests`, icon: Calendar, label: dict.nav.requests },
      { href: `/${locale}/cattle`, icon: Users, label: dict.nav.cattle },
    ];
  })();

  const loginLabel = dict.nav.login || dict.auth.login.title || "Login";
  const logoutLabel = isLoggingOut
    ? dict.common.loading
    : (dict.nav.logout || dict.auth.logout || "Logout");

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={`/${locale}/discover`}
            className="flex items-center gap-2 text-xl font-bold text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            aria-label={dict.common.appName}
          >
            <span className="text-2xl">🐄</span>
            <span className="hidden sm:inline">{dict.common.appName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side - User session / Auth / Language switcher / Mobile menu button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher />

            {/* Desktop Auth Controls */}
            <div className="hidden md:flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-semibold text-gray-900 leading-tight">
                      {currentUser.name || currentUser.phone}
                    </span>
                    {currentUser.name && (
                      <span className="text-xs text-gray-500 leading-tight">
                        {currentUser.phone}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    id="header-logout-button"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    aria-label={logoutLabel}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>{logoutLabel}</span>
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  id="header-login-link"
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{loginLabel}</span>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden py-4 border-t border-gray-200"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Mobile Auth Controls */}
              {currentUser ? (
                <div className="pt-3 mt-2 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {currentUser.name || currentUser.phone}
                    </p>
                    {currentUser.name && (
                      <p className="text-xs text-gray-500">{currentUser.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    id="mobile-header-logout-button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                    <span>{logoutLabel}</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 mt-2 border-t border-gray-200 px-3">
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileMenuOpen(false)}
                    id="mobile-header-login-link"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    <LogIn className="w-5 h-5" aria-hidden="true" />
                    <span>{loginLabel}</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}