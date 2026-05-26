import { AUTH_ROUTES } from "@/lib/auth/constants";
import {
  hasAnyPermission,
  Permission,
  type PermissionGrant,
} from "@/lib/auth/permissions";

export type NavGroup = {
  title: string;
  items: Array<{ href: string; label: string }>;
};

export function buildAppNavGroups(
  role: string,
  permissions?: PermissionGrant[]
): NavGroup[] {
  const groups: NavGroup[] = [];

  const overview: NavGroup["items"] = [];
  if (
    hasAnyPermission(role, permissions, [
      Permission.DASHBOARD_VIEW,
      Permission.INVENTORY_DASHBOARD,
    ])
  ) {
    overview.push({ href: AUTH_ROUTES.appDashboard, label: "Dashboard" });
  }
  if (overview.length) {
    groups.push({ title: "Overview", items: overview });
  }

  const operations: NavGroup["items"] = [];
  if (
    hasAnyPermission(role, permissions, [
      Permission.STOCK_IN,
      Permission.STOCK_OUT,
      Permission.STOCK_VIEW,
    ])
  ) {
    operations.push({ href: AUTH_ROUTES.appStock, label: "Stock" });
  }
  if (hasAnyPermission(role, permissions, [Permission.TRANSFERS_RECEIVE])) {
    operations.push({ href: AUTH_ROUTES.appReceive, label: "Receive" });
  }
  if (hasAnyPermission(role, permissions, [Permission.INVENTORY_VIEW])) {
    operations.push({ href: AUTH_ROUTES.appInventory, label: "Inventory" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.TRANSFERS_VIEW,
      Permission.TRANSFERS_RECEIVE,
      Permission.TRANSFERS_MANAGE,
    ])
  ) {
    operations.push({ href: AUTH_ROUTES.appTransfers, label: "Transfers" });
  }
  if (hasAnyPermission(role, permissions, [Permission.IMPORTS_MANAGE])) {
    operations.push({ href: AUTH_ROUTES.appImports, label: "Tally Import" });
  }
  if (hasAnyPermission(role, permissions, [Permission.REPORTS_VIEW])) {
    operations.push({ href: AUTH_ROUTES.appReports, label: "Reports" });
  }
  if (operations.length) {
    groups.push({ title: "Operations", items: operations });
  }

  const master: NavGroup["items"] = [];
  if (
    hasAnyPermission(role, permissions, [
      Permission.WAREHOUSES_VIEW,
      Permission.WAREHOUSES_MANAGE,
    ])
  ) {
    master.push({ href: AUTH_ROUTES.appWarehouses, label: "Warehouses" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.BRANDS_VIEW,
      Permission.BRANDS_MANAGE,
    ])
  ) {
    master.push({ href: AUTH_ROUTES.appBrands, label: "Brands" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.PRODUCTS_VIEW,
      Permission.PRODUCTS_MANAGE,
    ])
  ) {
    master.push({ href: AUTH_ROUTES.appProducts, label: "Products" });
  }
  if (master.length) {
    groups.push({ title: "Master data", items: master });
  }

  const system: NavGroup["items"] = [];
  if (hasAnyPermission(role, permissions, [Permission.USERS_MANAGE])) {
    system.push({ href: AUTH_ROUTES.appUsers, label: "Users" });
  }
  if (hasAnyPermission(role, permissions, [Permission.AUDIT_VIEW])) {
    system.push({ href: AUTH_ROUTES.appAudit, label: "Audit" });
  }
  if (system.length) {
    groups.push({ title: "System", items: system });
  }

  return groups;
}
