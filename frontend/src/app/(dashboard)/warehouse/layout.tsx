"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/lib/auth/constants";

const navGroups = [
  {
    title: "Overview",
    items: [{ href: AUTH_ROUTES.warehouseDashboard, label: "Dashboard" }],
  },
  {
    title: "Stock",
    items: [
      { href: AUTH_ROUTES.warehouseStock, label: "Stock" },
      { href: AUTH_ROUTES.warehouseInventory, label: "Inventory" },
      { href: AUTH_ROUTES.warehouseTransfers, label: "Transfers" },
    ],
  },
];

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      title="Warehouse"
      subtitle="Stock operations"
      navGroups={navGroups}
    >
      {children}
    </DashboardShell>
  );
}
