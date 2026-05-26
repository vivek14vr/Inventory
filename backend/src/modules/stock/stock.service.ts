import { Types } from "mongoose";
import type mongoose from "mongoose";
import { AuditLog } from "../../models/AuditLog.js";
import { StockMovement } from "../../models/StockMovement.js";
import { Transfer } from "../../models/Transfer.js";
import { Warehouse } from "../../models/Warehouse.js";
import {
  DispatchType,
  StockMovementType,
  TransferStatus,
} from "../../shared/constants/roles.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError.js";
import type { AuthUser } from "../../shared/types/auth.js";
import { dbSession, runInTransaction } from "../../shared/utils/mongoTransaction.js";
import { Permission } from "../../shared/constants/permissions.js";
import {
  getWarehouseIdsForPermission,
  isAdmin,
} from "../../shared/utils/permissions.js";
import { resolveWarehouseId } from "../../shared/utils/warehouseAccess.js";
import {
  filterBySearch,
  paginateArray,
  sortRows,
} from "../../shared/pagination/pagination.js";
import * as inventoryService from "./inventory.service.js";
import type { BalancesQuery, StockInInput, StockOutInput } from "./stock.validation.js";

function toMovementResponse(doc: {
  _id: Types.ObjectId;
  type: string;
  quantity: number;
  dispatchType?: string;
  clientName?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: Date;
  productId?: { _id: Types.ObjectId; name: string };
  brandId?: { _id: Types.ObjectId; name: string };
  warehouseId?: { _id: Types.ObjectId; name: string; code: string };
  destinationWarehouseId?: { _id: Types.ObjectId; name: string; code: string };
  transferId?: Types.ObjectId;
}) {
  const product = doc.productId as { _id: Types.ObjectId; name: string } | undefined;
  const brand = doc.brandId as { _id: Types.ObjectId; name: string } | undefined;
  const warehouse = doc.warehouseId as
    | { _id: Types.ObjectId; name: string; code: string }
    | undefined;
  const dest = doc.destinationWarehouseId as
    | { _id: Types.ObjectId; name: string; code: string }
    | undefined;

  return {
    id: String(doc._id),
    type: doc.type,
    quantity: doc.quantity,
    dispatchType: doc.dispatchType,
    clientName: doc.clientName,
    invoiceNumber: doc.invoiceNumber,
    notes: doc.notes,
    product: product ? { id: String(product._id), name: product.name } : undefined,
    brand: brand ? { id: String(brand._id), name: brand.name } : undefined,
    warehouse: warehouse
      ? { id: String(warehouse._id), name: warehouse.name, code: warehouse.code }
      : undefined,
    destinationWarehouse: dest
      ? { id: String(dest._id), name: dest.name, code: dest.code }
      : undefined,
    transferId: doc.transferId ? String(doc.transferId) : undefined,
    createdAt: doc.createdAt,
  };
}

export async function listMovements(user: AuthUser, limit = 50) {
  let filter: Record<string, unknown> = {};

  if (!isAdmin(user)) {
    const allowed = getWarehouseIdsForPermission(user, Permission.STOCK_VIEW);
    if (allowed.length === 1) {
      filter = { warehouseId: allowed[0] };
    } else if (allowed.length > 1) {
      filter = { warehouseId: { $in: allowed } };
    } else {
      filter = { warehouseId: null };
    }
  }

  const movements = await StockMovement.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("warehouseId", "name code")
    .populate("destinationWarehouseId", "name code")
    .lean();

  return movements.map((m) =>
    toMovementResponse(m as unknown as Parameters<typeof toMovementResponse>[0])
  );
}

export async function listBalancesForUser(user: AuthUser, query: BalancesQuery) {
  const warehouseId = resolveWarehouseId(
    user,
    query.warehouseId,
    Permission.STOCK_VIEW
  );
  const rows = await inventoryService.listBalances(warehouseId);

  let filtered = filterBySearch(rows, query.search, [
    (r) => r.productName,
    (r) => r.brandName,
  ]);
  filtered = sortRows(filtered, query.sortBy, query.sortOrder ?? "desc", {
    quantity: (r) => r.quantity,
    productName: (r) => r.productName,
    brandName: (r) => r.brandName,
    updatedAt: (r) => r.updatedAt.getTime(),
  });
  return paginateArray(filtered, query);
}

export async function stockIn(input: StockInInput, user: AuthUser) {
  return runInTransaction(async (session) => {
    const warehouseId = resolveWarehouseId(
      user,
      input.warehouseId,
      Permission.STOCK_IN
    );

    if (input.transferId) {
      return receiveTransfer(input, user, warehouseId, session);
    }

    const { productId, brandId } = await inventoryService.validateProductForBrand(
      input.productId,
      input.brandId
    );

    const newQty = await inventoryService.adjustBalance(
      warehouseId,
      String(productId),
      input.quantity,
      session
    );

    const [movement] = await StockMovement.create(
      [
        {
          type: StockMovementType.STOCK_IN,
          warehouseId,
          productId,
          brandId,
          quantity: input.quantity,
          notes: input.notes,
          createdBy: user.id,
        },
      ],
      dbSession(session)
    );

    await AuditLog.create(
      [
        {
          action: "STOCK_IN",
          entity: "StockMovement",
          entityId: movement._id,
          userId: user.id,
          metadata: { quantity: input.quantity, warehouseId },
        },
      ],
      dbSession(session)
    );

    const populated = await StockMovement.findById(movement._id)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("warehouseId", "name code")
      .lean();

    return {
      movement: toMovementResponse(
        populated as unknown as Parameters<typeof toMovementResponse>[0]
      ),
      balance: newQty,
    };
  });
}

async function receiveTransfer(
  input: StockInInput,
  user: AuthUser,
  warehouseId: string,
  session: mongoose.ClientSession | null
) {
  if (!input.transferId || !Types.ObjectId.isValid(input.transferId)) {
    throw new BadRequestError("Invalid transfer ID");
  }

  const transfer = await Transfer.findById(input.transferId).session(session ?? null);
  if (!transfer) {
    throw new NotFoundError("Transfer not found");
  }

  if (String(transfer.destinationWarehouseId) !== warehouseId) {
    throw new ForbiddenError("This transfer is not for your warehouse");
  }

  if (transfer.status !== TransferStatus.PENDING) {
    throw new BadRequestError("Transfer is already received or cancelled");
  }

  if (input.productId !== String(transfer.productId)) {
    throw new BadRequestError("Product does not match the transfer");
  }

  if (input.brandId !== String(transfer.brandId)) {
    throw new BadRequestError("Brand does not match the transfer");
  }

  if (input.quantity !== transfer.quantity) {
    throw new BadRequestError(
      `Quantity must match transfer quantity (${transfer.quantity})`
    );
  }

  const newQty = await inventoryService.adjustBalance(
    warehouseId,
    String(transfer.productId),
    transfer.quantity,
    session
  );

  const [movement] = await StockMovement.create(
    [
      {
        type: StockMovementType.STOCK_IN,
        warehouseId,
        productId: transfer.productId,
        brandId: transfer.brandId,
        quantity: transfer.quantity,
        transferId: transfer._id,
        notes: input.notes ?? "Received from inter-warehouse transfer",
        createdBy: user.id,
      },
    ],
    dbSession(session)
  );

  transfer.status = TransferStatus.RECEIVED;
  transfer.stockInMovementId = movement._id;
  transfer.receivedBy = new Types.ObjectId(user.id);
  transfer.receivedAt = new Date();
  await transfer.save(dbSession(session));

  await AuditLog.create(
    [
      {
        action: "TRANSFER_RECEIVED",
        entity: "Transfer",
        entityId: transfer._id,
        userId: user.id,
        metadata: { quantity: transfer.quantity },
      },
    ],
    dbSession(session)
  );

  const populated = await StockMovement.findById(movement._id)
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("warehouseId", "name code")
    .lean();

  return {
    movement: toMovementResponse(
      populated as unknown as Parameters<typeof toMovementResponse>[0]
    ),
    balance: newQty,
    transferId: String(transfer._id),
  };
}

export async function stockOut(input: StockOutInput, user: AuthUser) {
  return runInTransaction(async (session) => {
    const warehouseId = resolveWarehouseId(
      user,
      input.warehouseId,
      Permission.STOCK_OUT
    );
    const { productId, brandId } = await inventoryService.validateProductForBrand(
      input.productId,
      input.brandId
    );

    await inventoryService.assertSufficientStock(
      warehouseId,
      String(productId),
      input.quantity,
      session
    );

    const newQty = await inventoryService.adjustBalance(
      warehouseId,
      String(productId),
      -input.quantity,
      session
    );

    let transferId: Types.ObjectId | undefined;
    let destinationWarehouseId: Types.ObjectId | undefined;

    if (input.dispatchType === DispatchType.TRANSFER) {
      if (!input.destinationWarehouseId) {
        throw new BadRequestError("Destination warehouse is required");
      }
      if (input.destinationWarehouseId === warehouseId) {
        throw new BadRequestError("Cannot transfer to the same warehouse");
      }

      const destination = await Warehouse.findOne({
        _id: input.destinationWarehouseId,
        isActive: true,
      }).session(session ?? null);

      if (!destination) {
        throw new NotFoundError("Destination warehouse not found");
      }

      destinationWarehouseId = destination._id;
    }

    const [movement] = await StockMovement.create(
      [
        {
          type: StockMovementType.STOCK_OUT,
          warehouseId,
          productId,
          brandId,
          quantity: input.quantity,
          dispatchType: input.dispatchType,
          clientName:
            input.dispatchType === DispatchType.DIRECT_SELLING
              ? input.clientName?.trim()
              : undefined,
          invoiceNumber:
            input.dispatchType === DispatchType.DIRECT_SELLING
              ? input.invoiceNumber?.trim()
              : undefined,
          destinationWarehouseId,
          notes: input.notes,
          createdBy: user.id,
        },
      ],
      dbSession(session)
    );

    if (input.dispatchType === DispatchType.TRANSFER && destinationWarehouseId) {
      const [transfer] = await Transfer.create(
        [
          {
            sourceWarehouseId: warehouseId,
            destinationWarehouseId,
            productId,
            brandId,
            quantity: input.quantity,
            status: TransferStatus.PENDING,
            stockOutMovementId: movement._id,
            createdBy: user.id,
          },
        ],
        dbSession(session)
      );
      transferId = transfer._id;
      movement.transferId = transferId;
      await movement.save(dbSession(session));
    }

    await AuditLog.create(
      [
        {
          action: "STOCK_OUT",
          entity: "StockMovement",
          entityId: movement._id,
          userId: user.id,
          metadata: {
            quantity: input.quantity,
            dispatchType: input.dispatchType,
            warehouseId,
          },
        },
      ],
      dbSession(session)
    );

    const populated = await StockMovement.findById(movement._id)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("warehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .lean();

    return {
      movement: toMovementResponse(
        populated as unknown as Parameters<typeof toMovementResponse>[0]
      ),
      balance: newQty,
      transferId: transferId ? String(transferId) : undefined,
    };
  });
}
