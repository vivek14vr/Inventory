import { Types } from "mongoose";
import type mongoose from "mongoose";
import { AuditLog } from "../../models/AuditLog.js";
import { StockMovement } from "../../models/StockMovement.js";
import { Transfer } from "../../models/Transfer.js";
import { Permission } from "../../shared/constants/permissions.js";
import {
  StockMovementType,
  TransferStatus,
} from "../../shared/constants/roles.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError.js";
import type { AuthUser } from "../../shared/types/auth.js";
import {
  getWarehouseIdsForPermission,
  hasPermission,
  isAdmin,
} from "../../shared/utils/permissions.js";
import { dbSession, runInTransaction } from "../../shared/utils/mongoTransaction.js";
import {
  buildTransferAuditMetadata,
} from "../../shared/utils/auditMetadata.js";
import * as balanceService from "../stock/inventory.service.js";
import {
  buildPaginationMeta,
  getPaginationParams,
  mongoSort,
} from "../../shared/pagination/pagination.js";
import type {
  TransferHistoryQuery,
  UpdateTransferStatusInput,
} from "./transfers.validation.js";

function mapTransfer(t: {
  _id: Types.ObjectId;
  quantity: number;
  status: string;
  createdAt: Date;
  receivedAt?: Date;
  productId: unknown;
  brandId: unknown;
  sourceWarehouseId: unknown;
  destinationWarehouseId: unknown;
  createdBy?: unknown;
  receivedBy?: unknown;
  returnedBy?: unknown;
  returnedAt?: Date;
  returnNotes?: string;
}) {
  const product = t.productId as unknown as { _id: Types.ObjectId; name: string };
  const brand = t.brandId as unknown as { _id: Types.ObjectId; name: string };
  const source = t.sourceWarehouseId as unknown as {
    _id: Types.ObjectId;
    name: string;
    code: string;
  };
  const destination = t.destinationWarehouseId as unknown as {
    _id: Types.ObjectId;
    name: string;
    code: string;
  };
  const createdBy = t.createdBy as unknown as { _id: Types.ObjectId; name: string } | null;
  const receivedBy = t.receivedBy as unknown as { _id: Types.ObjectId; name: string } | null;
  const returnedBy = t.returnedBy as unknown as { _id: Types.ObjectId; name: string } | null;

  return {
    id: String(t._id),
    quantity: t.quantity,
    status: t.status,
    product: { id: String(product._id), name: product.name },
    brand: { id: String(brand._id), name: brand.name },
    sourceWarehouse: {
      id: String(source._id),
      name: source.name,
      code: source.code,
    },
    destinationWarehouse: {
      id: String(destination._id),
      name: destination.name,
      code: destination.code,
    },
    createdBy: createdBy
      ? { id: String(createdBy._id), name: createdBy.name }
      : undefined,
    receivedBy: receivedBy
      ? { id: String(receivedBy._id), name: receivedBy.name }
      : undefined,
    returnedBy: returnedBy
      ? { id: String(returnedBy._id), name: returnedBy.name }
      : undefined,
    createdAt: t.createdAt,
    receivedAt: t.receivedAt,
    returnedAt: t.returnedAt,
    returnNotes: t.returnNotes,
  };
}

async function transferAuditSnapshot(
  transferId: Types.ObjectId,
  session: mongoose.ClientSession | null
) {
  const doc = await Transfer.findById(transferId)
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("sourceWarehouseId", "name code")
    .populate("destinationWarehouseId", "name code")
    .populate("createdBy", "name email")
    .populate("receivedBy", "name email")
    .populate("returnedBy", "name email")
    .session(session ?? null)
    .lean();

  if (!doc) return null;

  const d = doc as unknown as {
    _id: Types.ObjectId;
    quantity: number;
    status: string;
    productId: { _id: Types.ObjectId; name: string };
    brandId: { _id: Types.ObjectId; name: string };
    sourceWarehouseId: { _id: Types.ObjectId; name: string; code: string };
    destinationWarehouseId: { _id: Types.ObjectId; name: string; code: string };
    createdBy?: { _id: Types.ObjectId; name: string; email?: string };
    receivedBy?: { _id: Types.ObjectId; name: string; email?: string };
    returnedBy?: { _id: Types.ObjectId; name: string; email?: string };
  };

  return {
    transferId: d._id,
    quantity: d.quantity,
    status: d.status,
    product: d.productId,
    brand: d.brandId,
    sourceWarehouse: d.sourceWarehouseId,
    destinationWarehouse: d.destinationWarehouseId,
    initiatedBy: d.createdBy,
    receivedBy: d.receivedBy,
    returnedBy: d.returnedBy,
  };
}

export async function listPendingTransfers(
  user: AuthUser,
  destinationWarehouseId?: string
) {
  const filter: Record<string, unknown> = { status: TransferStatus.PENDING };

  if (isAdmin(user)) {
    if (
      destinationWarehouseId &&
      Types.ObjectId.isValid(destinationWarehouseId)
    ) {
      filter.destinationWarehouseId = destinationWarehouseId;
    }
  } else {
    const allowed = [
      ...getWarehouseIdsForPermission(user, Permission.TRANSFERS_VIEW),
      ...getWarehouseIdsForPermission(user, Permission.TRANSFERS_RECEIVE),
      ...getWarehouseIdsForPermission(user, Permission.TRANSFERS_MANAGE),
    ];
    const unique = [...new Set(allowed)];

    if (unique.length === 0) {
      throw new ForbiddenError("No warehouse access for transfers");
    }

    if (destinationWarehouseId) {
      if (!unique.includes(destinationWarehouseId)) {
        throw new ForbiddenError("You do not have access to this warehouse");
      }
      filter.destinationWarehouseId = destinationWarehouseId;
    } else if (unique.length === 1) {
      filter.destinationWarehouseId = unique[0];
    } else {
      filter.destinationWarehouseId = { $in: unique };
    }
  }

  const transfers = await Transfer.find(filter)
    .sort({ createdAt: -1 })
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("sourceWarehouseId", "name code")
    .populate("destinationWarehouseId", "name code")
    .lean();

  return transfers.map((t) => mapTransfer(t));
}

export async function listTransferHistory(query: TransferHistoryQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.sourceWarehouseId && Types.ObjectId.isValid(query.sourceWarehouseId)) {
    filter.sourceWarehouseId = query.sourceWarehouseId;
  }
  if (
    query.destinationWarehouseId &&
    Types.ObjectId.isValid(query.destinationWarehouseId)
  ) {
    filter.destinationWarehouseId = query.destinationWarehouseId;
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

  const [total, transfers] = await Promise.all([
    Transfer.countDocuments(filter),
    Transfer.find(filter)
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("sourceWarehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .populate("createdBy", "name")
      .populate("receivedBy", "name")
      .populate("returnedBy", "name")
      .lean(),
  ]);

  return {
    items: transfers.map((t) => mapTransfer(t)),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function updateTransferStatus(
  transferId: string,
  input: UpdateTransferStatusInput,
  user: AuthUser
) {
  if (!Types.ObjectId.isValid(transferId)) {
    throw new BadRequestError("Invalid transfer ID");
  }

  return runInTransaction(async (session) => {
    const transfer = await Transfer.findById(transferId).session(session ?? null);
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestError(
        `Only pending transfers can be updated (current: ${transfer.status})`
      );
    }

    if (
      input.status === TransferStatus.CANCELLED ||
      input.status === TransferStatus.RETURNED
    ) {
      const newQty = await balanceService.adjustBalance(
        String(transfer.sourceWarehouseId),
        String(transfer.productId),
        transfer.quantity,
        session
      );

      const isReturn = input.status === TransferStatus.RETURNED;
      transfer.status = isReturn ? TransferStatus.RETURNED : TransferStatus.CANCELLED;
      if (isReturn) {
        transfer.returnedBy = new Types.ObjectId(user.id);
        transfer.returnedAt = new Date();
        transfer.returnNotes = input.notes?.trim();
      }
      await transfer.save(dbSession(session));

      const snapshot = await transferAuditSnapshot(transfer._id, session);

      await AuditLog.create(
        [
          {
            action: isReturn ? "TRANSFER_RETURNED" : "TRANSFER_CANCELLED",
            entity: "Transfer",
            entityId: transfer._id,
            userId: user.id,
            metadata: buildTransferAuditMetadata({
              transferId: transfer._id,
              quantity: transfer.quantity,
              status: isReturn ? TransferStatus.RETURNED : TransferStatus.CANCELLED,
              product: snapshot?.product ?? null,
              brand: snapshot?.brand ?? null,
              sourceWarehouse: snapshot?.sourceWarehouse ?? null,
              destinationWarehouse: snapshot?.destinationWarehouse ?? null,
              initiatedBy: snapshot?.initiatedBy ?? null,
              returnedBy: isReturn
                ? { _id: new Types.ObjectId(user.id), name: user.name }
                : undefined,
              extra: {
                restoredBalance: newQty,
                notes: input.notes,
              },
            }),
          },
        ],
        dbSession(session)
      );
    } else {
      const destWarehouseId = String(transfer.destinationWarehouseId);
      const newQty = await balanceService.adjustBalance(
        destWarehouseId,
        String(transfer.productId),
        transfer.quantity,
        session
      );

      const note =
        input.notes?.trim() ||
        "Received via admin (transfer marked as received)";

      const [movement] = await StockMovement.create(
        [
          {
            type: StockMovementType.STOCK_IN,
            warehouseId: transfer.destinationWarehouseId,
            productId: transfer.productId,
            brandId: transfer.brandId,
            quantity: transfer.quantity,
            transferId: transfer._id,
            notes: note,
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

      const snapshot = await transferAuditSnapshot(transfer._id, session);

      await AuditLog.create(
        [
          {
            action: "TRANSFER_RECEIVED",
            entity: "Transfer",
            entityId: transfer._id,
            userId: user.id,
            metadata: buildTransferAuditMetadata({
              transferId: transfer._id,
              quantity: transfer.quantity,
              status: TransferStatus.RECEIVED,
              product: snapshot?.product ?? null,
              brand: snapshot?.brand ?? null,
              sourceWarehouse: snapshot?.sourceWarehouse ?? null,
              destinationWarehouse: snapshot?.destinationWarehouse ?? null,
              initiatedBy: snapshot?.initiatedBy ?? null,
              receivedBy: { _id: new Types.ObjectId(user.id), name: user.name },
              extra: {
                destinationBalance: newQty,
                adminOverride: true,
                notes: input.notes,
              },
            }),
          },
        ],
        dbSession(session)
      );
    }

    const updated = await Transfer.findById(transferId)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("sourceWarehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .populate("createdBy", "name")
      .populate("receivedBy", "name")
      .populate("returnedBy", "name")
      .lean();

    return mapTransfer(updated!);
  });
}

function assertCanReturnTransfer(user: AuthUser, transfer: {
  destinationWarehouseId: Types.ObjectId;
}) {
  if (isAdmin(user)) return;
  const destId = String(transfer.destinationWarehouseId);
  const allowed =
    hasPermission(user, Permission.TRANSFERS_MANAGE, destId) ||
    hasPermission(user, Permission.STOCK_OUT, destId) ||
    hasPermission(user, Permission.TRANSFERS_RECEIVE, destId);
  if (!allowed) {
    throw new ForbiddenError("You do not have permission to return this transfer");
  }
}

export async function returnTransfer(
  transferId: string,
  input: { notes?: string },
  user: AuthUser
) {
  if (!Types.ObjectId.isValid(transferId)) {
    throw new BadRequestError("Invalid transfer ID");
  }

  return runInTransaction(async (session) => {
    const transfer = await Transfer.findById(transferId).session(session ?? null);
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }

    if (transfer.status !== TransferStatus.RECEIVED) {
      throw new BadRequestError(
        `Only received transfers can be returned (current: ${transfer.status})`
      );
    }

    assertCanReturnTransfer(user, transfer);

    const sourceId = String(transfer.sourceWarehouseId);
    const destId = String(transfer.destinationWarehouseId);
    const productId = String(transfer.productId);
    const qty = transfer.quantity;

    await balanceService.assertSufficientStock(destId, productId, qty, session);

    const note =
      input.notes?.trim() ||
      `Goods returned to ${sourceId} — transfer ${transferId}`;

    const [outMovement] = await StockMovement.create(
      [
        {
          type: StockMovementType.STOCK_OUT,
          warehouseId: transfer.destinationWarehouseId,
          productId: transfer.productId,
          brandId: transfer.brandId,
          quantity: qty,
          transferId: transfer._id,
          notes: `Return to source warehouse: ${note}`,
          createdBy: user.id,
        },
      ],
      dbSession(session)
    );

    const destBalance = await balanceService.adjustBalance(
      destId,
      productId,
      -qty,
      session
    );

    const [inMovement] = await StockMovement.create(
      [
        {
          type: StockMovementType.STOCK_IN,
          warehouseId: transfer.sourceWarehouseId,
          productId: transfer.productId,
          brandId: transfer.brandId,
          quantity: qty,
          transferId: transfer._id,
          notes: `Return from destination warehouse: ${note}`,
          createdBy: user.id,
        },
      ],
      dbSession(session)
    );

    const sourceBalance = await balanceService.adjustBalance(
      sourceId,
      productId,
      qty,
      session
    );

    transfer.status = TransferStatus.RETURNED;
    transfer.returnedBy = new Types.ObjectId(user.id);
    transfer.returnedAt = new Date();
    transfer.returnNotes = input.notes?.trim();
    transfer.stockReturnOutMovementId = outMovement._id;
    transfer.stockReturnInMovementId = inMovement._id;
    await transfer.save(dbSession(session));

    const snapshot = await transferAuditSnapshot(transfer._id, session);

    await AuditLog.create(
      [
        {
          action: "TRANSFER_RETURNED",
          entity: "Transfer",
          entityId: transfer._id,
          userId: user.id,
          metadata: buildTransferAuditMetadata({
            transferId: transfer._id,
            quantity: qty,
            status: TransferStatus.RETURNED,
            product: snapshot?.product ?? null,
            brand: snapshot?.brand ?? null,
            sourceWarehouse: snapshot?.sourceWarehouse ?? null,
            destinationWarehouse: snapshot?.destinationWarehouse ?? null,
            initiatedBy: snapshot?.initiatedBy ?? null,
            receivedBy: snapshot?.receivedBy ?? null,
            returnedBy: { _id: new Types.ObjectId(user.id), name: user.name },
            extra: {
              sourceBalance,
              destinationBalance: destBalance,
              notes: input.notes,
            },
          }),
        },
      ],
      dbSession(session)
    );

    const updated = await Transfer.findById(transferId)
      .populate("productId", "name")
      .populate("brandId", "name")
      .populate("sourceWarehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .populate("createdBy", "name")
      .populate("receivedBy", "name")
      .populate("returnedBy", "name")
      .lean();

    return mapTransfer(updated!);
  });
}

export async function listTransferActivity(query: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = end;
    }
  }

  const limit = query.limit ?? 100;

  const transfers = await Transfer.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("productId", "name")
    .populate("brandId", "name")
    .populate("sourceWarehouseId", "name code")
    .populate("destinationWarehouseId", "name code")
    .populate("createdBy", "name email")
    .populate("receivedBy", "name email")
    .populate("returnedBy", "name email")
    .lean();

  const grouped = new Map<string, ReturnType<typeof mapTransfer>[]>();

  for (const t of transfers) {
    const mapped = mapTransfer(t);
    const day = new Date(t.createdAt).toISOString().slice(0, 10);
    const bucket = grouped.get(day) ?? [];
    bucket.push(mapped);
    grouped.set(day, bucket);
  }

  const byDate = [...grouped.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));

  return {
    total: transfers.length,
    byDate,
    items: transfers.map((t) => mapTransfer(t)),
  };
}
