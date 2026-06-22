"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/lib/auth/constants";

const navGroups = [
  {
    title: "Main menu",
    items: [
      { href: AUTH_ROUTES.adminDashboard, label: "Home" },
      { href: AUTH_ROUTES.adminStock, label: "Stock" },
      { href: AUTH_ROUTES.adminReceive, label: "Send Stock" },
      { href: AUTH_ROUTES.adminInventory, label: "Check Stock" },
      { href: AUTH_ROUTES.adminReports, label: "Reports" },
    ],
  },
  {
    title: "More",
    items: [
      { href: AUTH_ROUTES.adminTransfers, label: "Transfer List" },
      { href: AUTH_ROUTES.adminImports, label: "Import Sales" },
      { href: AUTH_ROUTES.adminProducts, label: "Products" },
      { href: AUTH_ROUTES.adminWarehouses, label: "Warehouses" },
      { href: AUTH_ROUTES.adminBrands, label: "Brands" },
      { href: AUTH_ROUTES.adminUsers, label: "Users" },
      { href: AUTH_ROUTES.adminChecklists, label: "Daily Checklists" },
      { href: AUTH_ROUTES.adminAudit, label: "Activity Log" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      title="Stock Manager"
      subtitle="SV Enterprises"
      navGroups={navGroups}
    >
      {children}
    </DashboardShell>
  );
}
