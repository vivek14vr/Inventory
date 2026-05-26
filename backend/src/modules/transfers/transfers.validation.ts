import { z } from "zod";
import { TransferStatus } from "../../shared/constants/roles.js";
import { paginationQuerySchema } from "../../shared/pagination/pagination.validation.js";

export const transferHistoryQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      TransferStatus.PENDING,
      TransferStatus.RECEIVED,
      TransferStatus.CANCELLED,
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
  status: z.enum([TransferStatus.RECEIVED, TransferStatus.CANCELLED]),
  notes: z.string().trim().max(500).optional(),
});

export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;
