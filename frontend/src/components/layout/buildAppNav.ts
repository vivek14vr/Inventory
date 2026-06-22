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
  const mainMenu: NavGroup["items"] = [];
  const moreMenu: NavGroup["items"] = [];

  if (
    hasAnyPermission(role, permissions, [
      Permission.DASHBOARD_VIEW,
      Permission.INVENTORY_DASHBOARD,
    ])
  ) {
    mainMenu.push({ href: AUTH_ROUTES.appDashboard, label: "Home" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.STOCK_IN,
      Permission.STOCK_OUT,
      Permission.STOCK_VIEW,
    ])
  ) {
    mainMenu.push({ href: AUTH_ROUTES.appStock, label: "Stock" });
  }
  if (hasAnyPermission(role, permissions, [Permission.TRANSFERS_RECEIVE])) {
    mainMenu.push({ href: AUTH_ROUTES.appReceive, label: "Send Stock" });
  }
  if (hasAnyPermission(role, permissions, [Permission.INVENTORY_VIEW])) {
    mainMenu.push({ href: AUTH_ROUTES.appInventory, label: "Check Stock" });
  }
  if (hasAnyPermission(role, permissions, [Permission.REPORTS_VIEW])) {
    mainMenu.push({ href: AUTH_ROUTES.appReports, label: "Reports" });
  }

  if (
    hasAnyPermission(role, permissions, [
      Permission.TRANSFERS_VIEW,
      Permission.TRANSFERS_RECEIVE,
      Permission.TRANSFERS_MANAGE,
    ])
  ) {
    moreMenu.push({ href: AUTH_ROUTES.appTransfers, label: "Transfer List" });
  }
  if (hasAnyPermission(role, permissions, [Permission.IMPORTS_MANAGE])) {
    moreMenu.push({ href: AUTH_ROUTES.appImports, label: "Import Sales" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.WAREHOUSES_VIEW,
      Permission.WAREHOUSES_MANAGE,
    ])
  ) {
    moreMenu.push({ href: AUTH_ROUTES.appWarehouses, label: "Warehouses" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.BRANDS_VIEW,
      Permission.BRANDS_MANAGE,
    ])
  ) {
    moreMenu.push({ href: AUTH_ROUTES.appBrands, label: "Brands" });
  }
  if (
    hasAnyPermission(role, permissions, [
      Permission.PRODUCTS_VIEW,
      Permission.PRODUCTS_MANAGE,
    ])
  ) {
    moreMenu.push({ href: AUTH_ROUTES.appProducts, label: "Products" });
  }
  if (hasAnyPermission(role, permissions, [Permission.USERS_MANAGE])) {
    moreMenu.push({ href: AUTH_ROUTES.appUsers, label: "Users" });
  }
  if (hasAnyPermission(role, permissions, [Permission.AUDIT_VIEW])) {
    moreMenu.push({ href: AUTH_ROUTES.appAudit, label: "Activity Log" });
  }
  if (hasAnyPermission(role, permissions, [Permission.CHECKLISTS_COMPLETE])) {
    mainMenu.push({ href: AUTH_ROUTES.appChecklists, label: "Daily Tasks" });
  }

  const groups: NavGroup[] = [];
  if (mainMenu.length) {
    groups.push({ title: "Main menu", items: mainMenu });
  }
  if (moreMenu.length) {
    groups.push({ title: "More", items: moreMenu });
  }
  return groups;
}
