import { Types } from "mongoose";
import { AuditLog } from "../../models/AuditLog.js";
import { InventoryBalance } from "../../models/InventoryBalance.js";
import { Product } from "../../models/Product.js";
import { StockMovement } from "../../models/StockMovement.js";
import { Transfer } from "../../models/Transfer.js";
import { Warehouse } from "../../models/Warehouse.js";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError.js";
import type { AuthUser } from "../../shared/types/auth.js";
import { dbSession, runInTransaction } from "../../shared/utils/mongoTransaction.js";
import * as balanceService from "../stock/inventory.service.js";
import {
  DispatchType,
  StockMovementType,
  TransferStatus,
} from "../../shared/constants/roles.js";
import {
  buildPaginationMeta,
  filterBySearch,
  getPaginationParams,
  mongoSort,
  paginateArray,
  sortRows,
} from "../../shared/pagination/pagination.js";
import type {
  AdjustStockInput,
  LowStockQuery,
  MovementsQuery,
  StockFilters,
  StockItemDetailQuery,
  StockQuery,
} from "./inventory.validation.js";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export type StockRow = {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  quantity: number;
  updatedAt: Date;
};

async function fetchStockRows(query: StockFilters): Promise<StockRow[]> {
  const filter: Record<string, unknown> = {};

  if (!query.includeZero) {
    filter.quantity = { $gt: 0 };
  }
  if (query.warehouseId && Types.ObjectId.isValid(query.warehouseId)) {
    filter.warehouseId = query.warehouseId;
  }

  const balances = await InventoryBalance.find(filter)
    .populate<{ warehouseId: { _id: Types.ObjectId; name: string; code: string } }>(
      "warehouseId",
      "name code"
    )
    .populate<{ productId: { _id: Types.ObjectId; name: string; brandId: Types.ObjectId } }>({
      path: "productId",
      select: "name brandId",
      populate: { path: "brandId", select: "name" },
    })
    .sort({ updatedAt: -1 })
    .lean();

  let rows: StockRow[] = [];

  for (const b of balances) {
    if (!b.productId || typeof b.productId !== "object") continue;
    if (!b.warehouseId || typeof b.warehouseId !== "object") continue;

    const product = b.productId as unknown as {
      _id: Types.ObjectId;
      name: string;
      brandId: { _id: Types.ObjectId; name: string };
    };
    const warehouse = b.warehouseId as unknown as {
      _id: Types.ObjectId;
      name: string;
      code: string;
    };

    rows.push({
      warehouseId: String(warehouse._id),
      warehouseName: warehouse.name,
      warehouseCode: warehouse.code,
      productId: String(product._id),
      productName: product.name,
      brandId: String(product.brandId._id),
      brandName: product.brandId.name,
      quantity: b.quantity,
      updatedAt: b.updatedAt,
    });
  }

  if (query.brandId) {
    rows = rows.filter((r) => r.brandId === query.brandId);
  }
  if (query.productId) {
    rows = rows.filter((r) => r.productId === query.productId);
  }

  return rows;
}

const STOCK_SORT_FIELDS = {
  quantity: (r: StockRow) => r.quantity,
  productName: (r: StockRow) => r.productName,
  brandName: (r: StockRow) => r.brandName,
  warehouseName: (r: StockRow) => r.warehouseName,
  updatedAt: (r: StockRow) => r.updatedAt.getTime(),
} as const;

export async function listCurrentStock(query: StockQuery) {
  let rows = await fetchStockRows(query);
  rows = filterBySearch(rows, query.search, [
    (r) => r.productName,
    (r) => r.brandName,
    (r) => r.warehouseName,
    (r) => r.warehouseCode,
  ]);
  rows = sortRows(
    rows,
    query.sortBy,
    query.sortOrder ?? "desc",
    STOCK_SORT_FIELDS as Record<string, (row: StockRow) => string | number>
  );

  const byWarehouse = new Map<
    string,
    { warehouseId: string; name: string; code: string; totalUnits: number; skuCount: number }
  >();
  const byBrand = new Map<
    string,
    { brandId: string; name: string; totalUnits: number; skuCount: number }
  >();
  const byProduct = new Map<
    string,
    {
      productId: string;
      productName: string;
      brandId: string;
      brandName: string;
      totalUnits: number;
    }
  >();

  let totalUnits = 0;

  for (const r of rows) {
    totalUnits += r.quantity;

    const wh = byWarehouse.get(r.warehouseId) ?? {
      warehouseId: r.warehouseId,
      name: r.warehouseName,
      code: r.warehouseCode,
      totalUnits: 0,
      skuCount: 0,
    };
    wh.totalUnits += r.quantity;
    wh.skuCount += 1;
    byWarehouse.set(r.warehouseId, wh);

    const br = byBrand.get(r.brandId) ?? {
      brandId: r.brandId,
      name: r.brandName,
      totalUnits: 0,
      skuCount: 0,
    };
    br.totalUnits += r.quantity;
    br.skuCount += 1;
    byBrand.set(r.brandId, br);

    const key = `${r.productId}-${r.warehouseId}`;
    byProduct.set(key, {
      productId: r.productId,
      productName: r.productName,
      brandId: r.brandId,
      brandName: r.brandName,
      totalUnits: r.quantity,
    });
  }

  const { items, pagination } = paginateArray(rows, query);

  return {
    items,
    summary: {
      totalUnits,
      totalSkus: rows.length,
      byWarehouse: Array.from(byWarehouse.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      byBrand: Array.from(byBrand.values()).sort((a, b) => a.name.localeCompare(b.name)),
      byProduct: Array.from(byProduct.values()).sort((a, b) =>
        a.productName.localeCompare(b.productName)
      ),
    },
    pagination,
  };
}

type MovementDoc = {
  _id: Types.ObjectId;
  type: string;
  quantity: number;
  dispatchType?: string;
  clientName?: string;
  invoiceNumber?: string;
  notes?: string;
  transferId?: Types.ObjectId;
  createdAt: Date;
  productId?: unknown;
  brandId?: unknown;
  warehouseId?: unknown;
  destinationWarehouseId?: unknown;
};

function mapMovementRow(m: MovementDoc) {
  const product = m.productId as { _id: Types.ObjectId; name: string };
  const brand = m.brandId as { _id: Types.ObjectId; name: string };
  const warehouse = m.warehouseId as {
    _id: Types.ObjectId;
    name: string;
    code: string;
  };
  const dest = m.destinationWarehouseId as
    | { _id: Types.ObjectId; name: string; code: string }
    | undefined;

  return {
    id: String(m._id),
    type: m.type as "STOCK_IN" | "STOCK_OUT",
    quantity: m.quantity,
    dispatchType: m.dispatchType,
    clientName: m.clientName,
    invoiceNumber: m.invoiceNumber,
    notes: m.notes,
    transferId: m.transferId ? String(m.transferId) : undefined,
    product: { id: String(product._id), name: product.name },
    brand: { id: String(brand._id), name: brand.name },
    warehouse: {
      id: String(warehouse._id),
      name: warehouse.name,
      code: warehouse.code,
    },
    destinationWarehouse: dest
      ? { id: String(dest._id), name: dest.name, code: dest.code }
      : undefined,
    createdAt: m.createdAt,
  };
}

function describeMovement(m: {
  type: string;
  dispatchType?: string;
  clientName?: string;
  invoiceNumber?: string;
  notes?: string;
  destinationWarehouse?: { code: string; name: string };
}): string {
  if (m.type === StockMovementType.STOCK_IN) {
    if (m.notes?.toLowerCase().includes("transfer")) {
      return "Transfer received";
    }
    if (m.notes?.toLowerCase().includes("adjustment")) {
      return "Admin adjustment (increase)";
    }
    return m.notes?.trim() || "Stock in";
  }

  if (m.dispatchType === DispatchType.TRANSFER && m.destinationWarehouse) {
    return `Transfer to ${m.destinationWarehouse.name} (${m.destinationWarehouse.code})`;
  }
  if (m.dispatchType === DispatchType.DIRECT_SELLING) {
    const client = m.clientName?.trim() || "Client";
    const inv = m.invoiceNumber?.trim();
    return inv ? `Sale to ${client} · Invoice ${inv}` : `Sale to ${client}`;
  }
  if (m.notes?.toLowerCase().includes("adjustment")) {
    return "Admin adjustment (decrease)";
  }
  if (m.notes?.toLowerCase().includes("tally")) {
    return "Tally import deduction";
  }
  return m.notes?.trim() || "Stock out";
}

function applyRunningBalances(
  currentQuantity: number,
  movements: MovementDoc[]
): Array<
  ReturnType<typeof mapMovementRow> & {
    direction: "in" | "out";
    change: number;
    balanceAfter: number;
    description: string;
  }
> {
  let running = currentQuantity;

  return movements.map((m) => {
    const row = mapMovementRow(m);
    const balanceAfter = running;
    const direction = m.type === StockMovementType.STOCK_IN ? ("in" as const) : ("out" as const);
    const change = m.type === StockMovementType.STOCK_IN ? m.quantity : -m.quantity;

    if (m.type === StockMovementType.STOCK_IN) {
      running -= m.quantity;
    } else {
      running += m.quantity;
    }

    return {
      ...row,
      direction,
      change,
      balanceAfter,
      description: describeMovement({
        type: m.type,
        dispatchType: m.dispatchType,
        clientName: m.clientName,
        invoiceNumber: m.invoiceNumber,
        notes: m.notes,
        destinationWarehouse: row.destinationWarehouse,
      }),
    };
  });
}

export async function getStockItemDetail(query: StockItemDetailQuery) {
  if (
    !Types.ObjectId.isValid(query.warehouseId) ||
    !Types.ObjectId.isValid(query.productId)
  ) {
    throw new BadRequestError("Invalid warehouse or product");
  }

  const [balance, product] = await Promise.all([
    InventoryBalance.findOne({
      warehouseId: query.warehouseId,
      productId: query.productId,
    })
      .populate<{ productId: { _id: Types.ObjectId; name: string; brandId: Types.ObjectId } }>(
        "productId",
        "name brandId"
      )
      .populate<{ warehouseId: { _id: Types.ObjectId; name: string; code: string } }>(
        "warehouseId",
        "name code"
      )
      .lean(),
    Product.findById(query.productId)
      .populate<{ brandId: { _id: Types.ObjectId; name: string } }>("brandId", "name")
      .lean(),
  ]);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const brand = product.brandId as { _id: Types.ObjectId; name: string };
  const balanceWarehouse = balance?.warehouseId as
    | { _id: Types.ObjectId; name: string; code: string }
    | undefined;

  let whDoc: { name: string; code: string };
  if (balanceWarehouse) {
    whDoc = balanceWarehouse;
  } else {
    const wh = await Warehouse.findById(query.warehouseId).lean();
    if (!wh) {
      throw new NotFoundError("Warehouse not found");
    }
    whDoc = { name: wh.name, code: wh.code };
  }
  const currentQuantity = balance?.quantity ?? 0;

  const movementFilter: Record<string, unknown> = {
    warehouseId: query.warehouseId,
    productId: query.productId,
  };
  if (query.type) {
    movementFilter.type = query.type;
  }

  const allMovements = (await StockMovement.find(movementFilter)
    .sort({ createdAt: -1 })
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("warehouseId", "name code")
    .populate("destinationWarehouseId", "name code")
    .lean()) as MovementDoc[];

  const totalsByType = await StockMovement.aggregate([
    { $match: movementFilter },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$quantity" },
      },
    },
  ]);

  let totalStockIn = 0;
  let totalStockOut = 0;
  for (const t of totalsByType) {
    if (t._id === StockMovementType.STOCK_IN) totalStockIn = t.total;
    if (t._id === StockMovementType.STOCK_OUT) totalStockOut = t.total;
  }

  const ledger = applyRunningBalances(currentQuantity, allMovements);
  const { items, pagination } = paginateArray(ledger, query);

  return {
    item: {
      warehouseId: query.warehouseId,
      warehouseName: whDoc.name,
      warehouseCode: whDoc.code,
      productId: query.productId,
      productName: product.name,
      brandId: String(brand._id),
      brandName: brand.name,
      quantity: currentQuantity,
      updatedAt: balance?.updatedAt ?? null,
    },
    summary: {
      totalStockIn,
      totalStockOut,
      movementCount: allMovements.length,
    },
    items,
    pagination,
  };
}

export async function listMovementHistory(query: MovementsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.warehouseId && Types.ObjectId.isValid(query.warehouseId)) {
    filter.warehouseId = query.warehouseId;
  }
  if (query.brandId && Types.ObjectId.isValid(query.brandId)) {
    filter.brandId = query.brandId;
  }
  if (query.productId && Types.ObjectId.isValid(query.productId)) {
    filter.productId = query.productId;
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      (filter.createdAt as Record<string, Date>).$lte = new Date(query.dateTo);
    }
  }

  const { page, limit, skip, sortOrder } = getPaginationParams(query);
  const sortField = mongoSort(query.sortBy ?? "createdAt", sortOrder);

  const [total, movements] = await Promise.all([
    StockMovement.countDocuments(filter),
    StockMovement.find(filter)
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("warehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .lean(),
  ]);

  const items = (movements as MovementDoc[]).map((m) => mapMovementRow(m));

  return {
    items,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function listLowStock(query: LowStockQuery) {
  const threshold = query.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const rows = await fetchStockRows({
    warehouseId: query.warehouseId,
    includeZero: false,
  });
  let lowItems = rows
    .filter((r) => r.quantity > 0 && r.quantity <= threshold)
    .filter(
      (r) =>
        !query.search?.trim() ||
        [r.productName, r.brandName, r.warehouseName, r.warehouseCode].some((s) =>
          s.toLowerCase().includes(query.search!.trim().toLowerCase())
        )
    );

  lowItems = sortRows(
    lowItems,
    query.sortBy ?? "quantity",
    query.sortOrder ?? "asc",
    {
      quantity: (r) => r.quantity,
      productName: (r) => r.productName,
      brandName: (r) => r.brandName,
      warehouseName: (r) => r.warehouseName,
    }
  );

  const { items, pagination } = paginateArray(lowItems, query);

  return {
    threshold,
    count: lowItems.length,
    items,
    pagination,
  };
}

export async function getAdminDashboard() {
  const allRows = await fetchStockRows({ includeZero: false });
  const stockSummary = buildStockSummary(allRows);

  const [recentMovements, pendingTransfers, warehouses, recentSales] =
    await Promise.all([
      listMovementHistory({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      Transfer.countDocuments({ status: TransferStatus.PENDING }),
      Warehouse.find({ isActive: true }).select("name code").lean(),
      StockMovement.find({
        type: StockMovementType.STOCK_OUT,
        dispatchType: DispatchType.DIRECT_SELLING,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("productId", "name")
        .populate("brandId", "name")
        .populate("warehouseId", "name code")
        .lean(),
    ]);

  const lowStock = await listLowStock({
    threshold: DEFAULT_LOW_STOCK_THRESHOLD,
    page: 1,
    limit: 1,
    sortBy: "quantity",
    sortOrder: "asc",
  });

  const sales = recentSales.map((m) => {
    const product = m.productId as unknown as { _id: Types.ObjectId; name: string };
    const brand = m.brandId as unknown as { _id: Types.ObjectId; name: string };
    const warehouse = m.warehouseId as unknown as {
      _id: Types.ObjectId;
      name: string;
      code: string;
    };
    return {
      id: String(m._id),
      quantity: m.quantity,
      clientName: m.clientName,
      invoiceNumber: m.invoiceNumber,
      product: product.name,
      brand: brand.name,
      warehouse: warehouse.name,
      createdAt: m.createdAt,
    };
  });

  return {
    totalInventoryUnits: stockSummary.totalUnits,
    totalSkus: stockSummary.totalSkus,
    warehouseCount: warehouses.length,
    pendingTransfers,
    lowStockCount: lowStock.count,
    lowStockThreshold: lowStock.threshold,
    warehouseSummaries: stockSummary.byWarehouse,
    recentMovements: recentMovements.items,
    recentSales: sales,
  };
}

function buildStockSummary(rows: StockRow[]) {
  const byWarehouse = new Map<
    string,
    { warehouseId: string; name: string; code: string; totalUnits: number; skuCount: number }
  >();
  let totalUnits = 0;

  for (const r of rows) {
    totalUnits += r.quantity;
    const wh = byWarehouse.get(r.warehouseId) ?? {
      warehouseId: r.warehouseId,
      name: r.warehouseName,
      code: r.warehouseCode,
      totalUnits: 0,
      skuCount: 0,
    };
    wh.totalUnits += r.quantity;
    wh.skuCount += 1;
    byWarehouse.set(r.warehouseId, wh);
  }

  return {
    totalUnits,
    totalSkus: rows.length,
    byWarehouse: Array.from(byWarehouse.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  };
}

export async function adjustStockBalance(input: AdjustStockInput, user: AuthUser) {
  if (!Types.ObjectId.isValid(input.warehouseId)) {
    throw new BadRequestError("Invalid warehouse");
  }

  const warehouse = await Warehouse.findOne({
    _id: input.warehouseId,
    isActive: true,
  });
  if (!warehouse) {
    throw new NotFoundError("Warehouse not found");
  }

  const { productId, brandId } = await balanceService.validateProductForBrand(
    input.productId,
    input.brandId
  );

  return runInTransaction(async (session) => {
    const { previous, next, delta } = await balanceService.setBalance(
      input.warehouseId,
      String(productId),
      input.quantity,
      session
    );

    if (delta !== 0) {
      const movementType =
        delta > 0 ? StockMovementType.STOCK_IN : StockMovementType.STOCK_OUT;

      const [movement] = await StockMovement.create(
        [
          {
            type: movementType,
            warehouseId: input.warehouseId,
            productId,
            brandId,
            quantity: Math.abs(delta),
            notes: `Admin adjustment: ${input.reason}`,
            createdBy: user.id,
          },
        ],
        dbSession(session)
      );

      await AuditLog.create(
        [
          {
            action: "STOCK_ADJUSTED",
            entity: "StockMovement",
            entityId: movement._id,
            userId: user.id,
            metadata: {
              warehouseId: input.warehouseId,
              productId: String(productId),
              previous,
              next,
              reason: input.reason,
            },
          },
        ],
        dbSession(session)
      );
    }

    return {
      warehouseId: input.warehouseId,
      productId: String(productId),
      brandId: String(brandId),
      previousQuantity: previous,
      quantity: next,
      changed: delta !== 0,
    };
  });
}
