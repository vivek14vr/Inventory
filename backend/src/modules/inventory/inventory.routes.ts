import { Router } from "express";
import { Permission } from "../../shared/constants/permissions.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { requireAdminOrPermission } from "../../shared/middleware/requirePermission.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/apiResponse.js";
import * as inventoryAdminService from "./inventory.service.js";
import {
  adjustStockSchema,
  lowStockQuerySchema,
  movementsQuerySchema,
  stockItemDetailQuerySchema,
  stockQuerySchema,
} from "./inventory.validation.js";

const router = Router();

router.use(authenticate);

router.get(
  "/dashboard",
  requireAdminOrPermission(Permission.INVENTORY_DASHBOARD),
  asyncHandler(async (_req, res) => {
    const data = await inventoryAdminService.getAdminDashboard();
    sendSuccess(res, data);
  })
);

router.get(
  "/stock",
  requireAdminOrPermission(Permission.INVENTORY_VIEW),
  asyncHandler(async (req, res) => {
    const parsed = stockQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid query");
    }
    const { pagination, ...data } = await inventoryAdminService.listCurrentStock(
      parsed.data
    );
    sendSuccess(res, data, 200, { pagination });
  })
);

router.get(
  "/items/detail",
  requireAdminOrPermission(Permission.INVENTORY_VIEW),
  asyncHandler(async (req, res) => {
    const parsed = stockItemDetailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid query");
    }
    const { pagination, ...data } = await inventoryAdminService.getStockItemDetail(
      parsed.data
    );
    sendSuccess(res, data, 200, { pagination });
  })
);

router.get(
  "/movements",
  requireAdminOrPermission(Permission.INVENTORY_VIEW),
  asyncHandler(async (req, res) => {
    const parsed = movementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid query");
    }
    const { items, pagination } = await inventoryAdminService.listMovementHistory(
      parsed.data
    );
    sendSuccess(res, items, 200, { pagination });
  })
);

router.get(
  "/low-stock",
  requireAdminOrPermission(Permission.INVENTORY_VIEW),
  asyncHandler(async (req, res) => {
    const parsed = lowStockQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid query");
    }
    const { pagination, ...data } = await inventoryAdminService.listLowStock(parsed.data);
    sendSuccess(res, data, 200, { pagination });
  })
);

router.patch(
  "/stock",
  requireAdminOrPermission(Permission.INVENTORY_ADJUST),
  asyncHandler(async (req, res) => {
    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }
    const result = await inventoryAdminService.adjustStockBalance(
      parsed.data,
      req.user!
    );
    sendSuccess(res, result);
  })
);

export const inventoryRoutes = router;
