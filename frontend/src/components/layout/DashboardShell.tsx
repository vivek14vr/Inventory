"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/auth/BrandLogo";
import { NavIcon } from "@/components/layout/NavIcon";
import { useAuth } from "@/contexts/AuthContext";

export type NavItem = { href: string; label: string };

export type NavGroup = {
  title: string;
  items: NavItem[];
};

type DashboardShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  navGroups: NavGroup[];
};

function UserInitial({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-base font-bold text-orange-800">
      {initial}
    </span>
  );
}

export function DashboardShell({
  children,
  title,
  subtitle,
  navGroups,
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryGroup = navGroups[0];
  const moreGroups = navGroups.slice(1);
  const moreItems = moreGroups.flatMap((g) => g.items);
  const mobilePrimaryItems = navGroups.flatMap((g) => g.items).slice(0, 4);

  function isActive(href: string) {
    if (href.endsWith("/admin") || href.endsWith("/warehouse") || href.endsWith("/app")) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}
      >
        <NavIcon label={item.label} />
        {item.label}
      </Link>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-5 text-white">
        <BrandLogo size="sm" variant="light" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{title}</p>
          <p className="truncate text-sm text-orange-100">
            {subtitle ?? "SV Enterprises"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {primaryGroup && (
          <ul className="space-y-1">
            {primaryGroup.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} onClick={() => setMobileOpen(false)} />
              </li>
            ))}
          </ul>
        )}

        {moreItems.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="nav-link w-full nav-link-inactive"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 shrink-0">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              More options
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`ml-auto h-5 w-5 transition ${moreOpen ? "rotate-180" : ""}`}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {moreOpen && (
              <ul className="mt-1 space-y-1 border-l-2 border-orange-100 pl-2">
                {moreGroups.map((group) =>
                  group.items.map((item) => (
                    <li key={item.href}>
                      <NavLink item={item} onClick={() => setMobileOpen(false)} />
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-orange-100 bg-orange-50/50 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
          <UserInitial name={user?.name ?? "?"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-stone-900">{user?.name}</p>
            <p className="truncate text-sm text-stone-500">
              {user?.warehouse?.name ??
                (user?.role === "ADMIN"
                  ? "Administrator"
                  : user?.role?.replace("_", " ")) ??
                "Signed in"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-3 w-full min-h-12 rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-stone-900">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-orange-100 bg-white shadow-xl transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-orange-100 bg-white px-4 py-3 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-base font-bold text-stone-900">{title}</p>
          <UserInitial name={user?.name ?? "?"} />
        </header>

        <main className="px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        {/* Mobile bottom nav — large touch targets like PetPooja */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="flex justify-around gap-1">
            {mobilePrimaryItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
                    active
                      ? "bg-orange-100 text-orange-700"
                      : "text-stone-500"
                  }`}
                >
                  <span className={active ? "text-orange-600" : ""}>
                    <NavIcon label={item.label} />
                  </span>
                  <span className="truncate text-[11px] font-bold leading-tight">
                    {item.label.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-stone-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[11px] font-bold">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
