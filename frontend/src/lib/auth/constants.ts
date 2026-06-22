/** Short-lived JWT for API + Next.js middleware */
export const ACCESS_TOKEN_COOKIE = "inventory_access";
export const ACCESS_TOKEN_STORAGE_KEY = "inventory_access";

/** Rotating refresh token (sessionStorage; httpOnly cookie also set when same-site) */
export const REFRESH_TOKEN_STORAGE_KEY = "inventory_refresh";

/** @deprecated Use ACCESS_TOKEN_COOKIE */
export const TOKEN_COOKIE = ACCESS_TOKEN_COOKIE;
/** @deprecated Use ACCESS_TOKEN_STORAGE_KEY */
export const TOKEN_STORAGE_KEY = ACCESS_TOKEN_STORAGE_KEY;

export const AUTH_ROUTES = {
  login: "/login",
  adminDashboard: "/admin",
  adminUsers: "/admin/users",
  adminWarehouses: "/admin/warehouses",
  adminBrands: "/admin/brands",
  adminProducts: "/admin/products",
  adminTransfers: "/admin/transfers",
  adminInventory: "/admin/inventory",
  adminInventoryItem: (warehouseId: string, productId: string) =>
    `/admin/inventory/${warehouseId}/${productId}`,
  adminStock: "/admin/stock",
  /** @deprecated Use adminStock with ?tab=in */
  adminStockIn: "/admin/stock?tab=in",
  /** @deprecated Use adminStock with ?tab=out */
  adminStockOut: "/admin/stock?tab=out",
  adminReceive: "/admin/receive",
  adminImports: "/admin/imports",
  adminReports: "/admin/reports",
  adminAudit: "/admin/audit",
  adminChecklists: "/admin/checklists",
  warehouseDashboard: "/warehouse",
  warehouseStock: "/warehouse/stock",
  /** @deprecated Use warehouseStock with ?tab=in */
  warehouseStockIn: "/warehouse/stock?tab=in",
  /** @deprecated Use warehouseStock with ?tab=out */
  warehouseStockOut: "/warehouse/stock?tab=out",
  warehouseInventory: "/warehouse/inventory",
  warehouseTransfers: "/warehouse/transfers",
  appDashboard: "/app",
  appStock: "/app/stock",
  appInventory: "/app/inventory",
  appReceive: "/app/receive",
  appTransfers: "/app/transfers",
  appReports: "/app/reports",
  appImports: "/app/imports",
  appWarehouses: "/app/warehouses",
  appBrands: "/app/brands",
  appProducts: "/app/products",
  appUsers: "/app/users",
  appAudit: "/app/audit",
  appChecklists: "/app/checklists",
  warehouseChecklists: "/warehouse/checklists",
} as const;
