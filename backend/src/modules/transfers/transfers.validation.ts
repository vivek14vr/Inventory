import { z } from "zod";
import { TransferStatus } from "../../shared/constants/roles.js";
import { paginationQuerySchema } from "../../shared/pagination/pagination.validation.js";

export const transferHistoryQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      TransferStatus.PENDING,
      TransferStatus.RECEIVED,
      TransferStatus.CANCELLED,
      TransferStatus.RETURNED,
    ])
    .optional(),
  sourceWarehouseId: z.string().optional(),
  destinationWarehouseId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["createdAt", "quantity", "status"]).optional().default("createdAt"),
});

export type TransferHistoryQuery = z.infer<typeof transferHistoryQuerySchema>;

export const updateTransferStatusSchema = z.object({
  status: z.enum([
    TransferStatus.RECEIVED,
    TransferStatus.CANCELLED,
    TransferStatus.RETURNED,
  ]),
  notes: z.string().trim().max(500).optional(),
});

export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;

export const returnTransferSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type ReturnTransferInput = z.infer<typeof returnTransferSchema>;

export const transferActivityQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export type TransferActivityQuery = z.infer<typeof transferActivityQuerySchema>;
