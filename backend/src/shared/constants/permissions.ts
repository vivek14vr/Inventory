/** Module.action permission codes — assign per user (optionally per warehouse). */
export const Permission = {
  DASHBOARD_VIEW: "dashboard.view",

  STOCK_VIEW: "stock.view",
  STOCK_IN: "stock.in",
  STOCK_OUT: "stock.out",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_DASHBOARD: "inventory.dashboard",

  TRANSFERS_VIEW: "transfers.view",
  TRANSFERS_RECEIVE: "transfers.receive",
  TRANSFERS_MANAGE: "transfers.manage",

  WAREHOUSES_VIEW: "warehouses.view",
  WAREHOUSES_MANAGE: "warehouses.manage",

  BRANDS_VIEW: "brands.view",
  BRANDS_MANAGE: "brands.manage",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",

  REPORTS_VIEW: "reports.view",

  IMPORTS_MANAGE: "imports.manage",

  USERS_MANAGE: "users.manage",

  AUDIT_VIEW: "audit.view",

  CHECKLISTS_MANAGE: "checklists.manage",
  CHECKLISTS_COMPLETE: "checklists.complete",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export type PermissionGrant = {
  code: PermissionCode;
  warehouseId?: string;
};

export type PermissionModuleDefinition = {
  id: string;
  label: string;
  description: string;
  warehouseScoped: boolean;
  permissions: Array<{
    code: PermissionCode;
    label: string;
    description?: string;
  }>;
};

export const PERMISSION_MODULES: PermissionModuleDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview and summary widgets",
    warehouseScoped: false,
    permissions: [{ code: Permission.DASHBOARD_VIEW, label: "View dashboard" }],
  },
  {
    id: "stock",
    label: "Stock",
    description: "Stock in, stock out, and balances at a warehouse",
    warehouseScoped: true,
    permissions: [
      { code: Permission.STOCK_VIEW, label: "View balances" },
      { code: Permission.STOCK_IN, label: "Stock in" },
      { code: Permission.STOCK_OUT, label: "Stock out" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Company-wide inventory, movements, and adjustments",
    warehouseScoped: false,
    permissions: [
      { code: Permission.INVENTORY_DASHBOARD, label: "Admin dashboard stats" },
      { code: Permission.INVENTORY_VIEW, label: "View inventory & movements" },
      { code: Permission.INVENTORY_ADJUST, label: "Adjust quantities" },
    ],
  },
  {
    id: "transfers",
    label: "Transfers",
    description: "Inter-warehouse transfers",
    warehouseScoped: true,
    permissions: [
      {
        code: Permission.TRANSFERS_VIEW,
        label: "View pending (destination)",
        description: "See transfers arriving at the selected warehouse",
      },
      {
        code: Permission.TRANSFERS_RECEIVE,
        label: "Receive transfers",
        description: "Receive stock against pending transfers",
      },
      {
        code: Permission.TRANSFERS_MANAGE,
        label: "Manage all transfers",
        description: "History, cancel, and receive from admin (not warehouse-scoped)",
      },
    ],
  },
  {
    id: "warehouses",
    label: "Warehouses",
    description: "Warehouse master data",
    warehouseScoped: false,
    permissions: [
      { code: Permission.WAREHOUSES_VIEW, label: "View warehouses" },
      { code: Permission.WAREHOUSES_MANAGE, label: "Create & edit warehouses" },
    ],
  },
  {
    id: "brands",
    label: "Brands",
    description: "Brand master data",
    warehouseScoped: false,
    permissions: [
      { code: Permission.BRANDS_VIEW, label: "View brands" },
      { code: Permission.BRANDS_MANAGE, label: "Create & edit brands" },
    ],
  },
  {
    id: "products",
    label: "Products",
    description: "Product master data",
    warehouseScoped: false,
    permissions: [
      { code: Permission.PRODUCTS_VIEW, label: "View products" },
      { code: Permission.PRODUCTS_MANAGE, label: "Create & edit products" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    description: "Reports and CSV export",
    warehouseScoped: false,
    permissions: [{ code: Permission.REPORTS_VIEW, label: "View & export reports" }],
  },
  {
    id: "imports",
    label: "Tally import",
    description: "Import stock from Tally",
    warehouseScoped: false,
    permissions: [{ code: Permission.IMPORTS_MANAGE, label: "Run Tally imports" }],
  },
  {
    id: "users",
    label: "Users",
    description: "User accounts and access control",
    warehouseScoped: false,
    permissions: [{ code: Permission.USERS_MANAGE, label: "Manage users & permissions" }],
  },
  {
    id: "audit",
    label: "Audit",
    description: "System audit trail",
    warehouseScoped: false,
    permissions: [{ code: Permission.AUDIT_VIEW, label: "View audit log" }],
  },
  {
    id: "checklists",
    label: "Daily checklists",
    description: "Assign and track daily tasks for staff",
    warehouseScoped: false,
    permissions: [
      { code: Permission.CHECKLISTS_MANAGE, label: "Create & assign checklists" },
      { code: Permission.CHECKLISTS_COMPLETE, label: "Complete daily tasks" },
    ],
  },
];

const WAREHOUSE_SCOPED = new Set<PermissionCode>(
  PERMISSION_MODULES.filter((m) => m.warehouseScoped).flatMap((m) =>
    m.permissions.map((p) => p.code)
  )
);

export function isWarehouseScopedPermission(code: string): boolean {
  return WAREHOUSE_SCOPED.has(code as PermissionCode);
}

export const ALL_PERMISSION_CODES: PermissionCode[] = PERMISSION_MODULES.flatMap((m) =>
  m.permissions.map((p) => p.code)
);

/** Default bundle for legacy warehouse operators */
export function defaultWarehouseOperatorPermissions(
  warehouseId: string
): PermissionGrant[] {
  return [
    Permission.DASHBOARD_VIEW,
    Permission.STOCK_VIEW,
    Permission.STOCK_IN,
    Permission.STOCK_OUT,
    Permission.TRANSFERS_VIEW,
    Permission.TRANSFERS_RECEIVE,
    Permission.CHECKLISTS_COMPLETE,
  ].map((code) => ({ code, warehouseId }));
}
