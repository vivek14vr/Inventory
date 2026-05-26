import { Types } from "mongoose";
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
  isAdmin,
} from "../../shared/utils/permissions.js";
import { dbSession, runInTransaction } from "../../shared/utils/mongoTransaction.js";
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
    createdAt: t.createdAt,
    receivedAt: t.receivedAt,
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

    if (input.status === TransferStatus.CANCELLED) {
      const newQty = await balanceService.adjustBalance(
        String(transfer.sourceWarehouseId),
        String(transfer.productId),
        transfer.quantity,
        session
      );

      transfer.status = TransferStatus.CANCELLED;
      await transfer.save(dbSession(session));

      await AuditLog.create(
        [
          {
            action: "TRANSFER_CANCELLED",
            entity: "Transfer",
            entityId: transfer._id,
            userId: user.id,
            metadata: {
              quantity: transfer.quantity,
              restoredBalance: newQty,
              notes: input.notes,
            },
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

      await AuditLog.create(
        [
          {
            action: "TRANSFER_RECEIVED",
            entity: "Transfer",
            entityId: transfer._id,
            userId: user.id,
            metadata: {
              quantity: transfer.quantity,
              destinationBalance: newQty,
              adminOverride: true,
              notes: input.notes,
            },
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
      .lean();

    return mapTransfer(updated!);
  });
}
