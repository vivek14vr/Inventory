import type { StockMovement } from "./stock";

export type StockRow = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  quantity: number;
  updatedAt: string;
};

export type StockSummary = {
  totalUnits: number;
  totalSkus: number;
  byWarehouse: Array<{
    warehouseId: string;
    name: string;
    code: string;
    totalUnits: number;
    skuCount: number;
  }>;
  byBrand: Array<{
    brandId: string;
    name: string;
    totalUnits: number;
    skuCount: number;
  }>;
  byProduct: Array<{
    productId: string;
    productName: string;
    brandId: string;
    brandName: string;
    totalUnits: number;
  }>;
};

export type StockResponse = {
  items: StockRow[];
  summary: StockSummary;
};

export type LowStockResponse = {
  threshold: number;
  count: number;
  items: StockRow[];
};

export type StockItemLedgerRow = {
  id: string;
  type: "STOCK_IN" | "STOCK_OUT";
  quantity: number;
  direction: "in" | "out";
  change: number;
  balanceAfter: number;
  description: string;
  dispatchType?: string;
  clientName?: string;
  invoiceNumber?: string;
  notes?: string;
  transferId?: string;
  createdAt: string;
};

export type StockItemDetailResponse = {
  item: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    productId: string;
    productName: string;
    brandId: string;
    brandName: string;
    quantity: number;
    updatedAt: string | null;
  };
  summary: {
    totalStockIn: number;
    totalStockOut: number;
    movementCount: number;
  };
  items: StockItemLedgerRow[];
};

export type AdminDashboard = {
  totalInventoryUnits: number;
  totalSkus: number;
  warehouseCount: number;
  pendingTransfers: number;
  lowStockCount: number;
  lowStockThreshold: number;
  warehouseSummaries: StockSummary["byWarehouse"];
  recentMovements: StockMovement[];
  recentSales: Array<{
    id: string;
    quantity: number;
    clientName?: string;
    invoiceNumber?: string;
    product: string;
    brand: string;
    warehouse: string;
    createdAt: string;
  }>;
};
