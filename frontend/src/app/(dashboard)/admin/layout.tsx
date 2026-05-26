"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/lib/auth/constants";

const navGroups = [
  {
    title: "Overview",
    items: [{ href: AUTH_ROUTES.adminDashboard, label: "Dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { href: AUTH_ROUTES.adminStock, label: "Stock" },
      { href: AUTH_ROUTES.adminReceive, label: "Receive" },
      { href: AUTH_ROUTES.adminInventory, label: "Inventory" },
      { href: AUTH_ROUTES.adminTransfers, label: "Transfers" },
      { href: AUTH_ROUTES.adminImports, label: "Tally Import" },
      { href: AUTH_ROUTES.adminReports, label: "Reports" },
    ],
  },
  {
    title: "Master data",
    items: [
      { href: AUTH_ROUTES.adminWarehouses, label: "Warehouses" },
      { href: AUTH_ROUTES.adminBrands, label: "Brands" },
      { href: AUTH_ROUTES.adminProducts, label: "Products" },
    ],
  },
  {
    title: "System",
    items: [
      { href: AUTH_ROUTES.adminUsers, label: "Users" },
      { href: AUTH_ROUTES.adminAudit, label: "Audit" },
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
      title="Admin"
      subtitle="Inventory Management"
      navGroups={navGroups}
    >
      {children}
    </DashboardShell>
  );
}
