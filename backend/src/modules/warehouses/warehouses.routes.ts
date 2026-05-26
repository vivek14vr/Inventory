import { Router } from "express";
import { AuditLog } from "../../models/AuditLog.js";
import { UserRole } from "../../shared/constants/roles.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/apiResponse.js";
import * as warehousesService from "./warehouses.service.js";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "./warehouses.validation.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const warehouses = await warehousesService.listWarehouses(
      isAdmin && includeInactive
    );
    sendSuccess(res, warehouses);
  })
);

router.use(authenticate, authorize(UserRole.ADMIN));

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const warehouse = await warehousesService.getWarehouseById(String(req.params.id));
    sendSuccess(res, warehouse);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createWarehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const warehouse = await warehousesService.createWarehouse(parsed.data);

    await AuditLog.create({
      action: "WAREHOUSE_CREATED",
      entity: "Warehouse",
      entityId: warehouse.id,
      userId: req.user!.id,
      metadata: { code: warehouse.code },
    });

    sendSuccess(res, warehouse, 201);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateWarehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const warehouse = await warehousesService.updateWarehouse(
      String(req.params.id),
      parsed.data
    );

    await AuditLog.create({
      action: "WAREHOUSE_UPDATED",
      entity: "Warehouse",
      entityId: warehouse.id,
      userId: req.user!.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    sendSuccess(res, warehouse);
  })
);

export const warehousesRoutes = router;
