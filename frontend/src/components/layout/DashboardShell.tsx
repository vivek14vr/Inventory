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
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
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

  const allItems = navGroups.flatMap((g) => g.items);

  function isActive(href: string) {
    if (href.endsWith("/admin") || href.endsWith("/warehouse")) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-5">
        <BrandLogo size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{title}</p>
          <p className="truncate text-xs text-zinc-500">
            {subtitle ?? "SV Enterprises"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-emerald-700 text-white shadow-sm shadow-emerald-900/15"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      <NavIcon label={item.label} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-3">
          <UserInitial name={user?.name ?? "?"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {user?.warehouse?.name ?? user?.role?.replace("_", " ") ?? "User"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-900"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-100/80 text-zinc-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] border-r border-zinc-200/80 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <UserInitial name={user?.name ?? "?"} />
        </header>

        {/* Mobile horizontal nav fallback for quick access */}
        <div className="overflow-x-auto border-b border-zinc-200/80 bg-white px-4 py-2 lg:hidden">
          <div className="flex min-w-max gap-1">
            {allItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-zinc-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
