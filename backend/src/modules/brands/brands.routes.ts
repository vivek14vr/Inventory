import { Router } from "express";
import { AuditLog } from "../../models/AuditLog.js";
import { UserRole } from "../../shared/constants/roles.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/apiResponse.js";
import * as brandsService from "./brands.service.js";
import { createBrandSchema, updateBrandSchema } from "./brands.validation.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const brands = await brandsService.listBrands(isAdmin && includeInactive);
    sendSuccess(res, brands);
  })
);

router.use(authenticate, authorize(UserRole.ADMIN));

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const brand = await brandsService.getBrandById(String(req.params.id));
    sendSuccess(res, brand);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createBrandSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const brand = await brandsService.createBrand(parsed.data);

    await AuditLog.create({
      action: "BRAND_CREATED",
      entity: "Brand",
      entityId: brand.id,
      userId: req.user!.id,
      metadata: { name: brand.name },
    });

    sendSuccess(res, brand, 201);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateBrandSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const brand = await brandsService.updateBrand(String(req.params.id), parsed.data);

    await AuditLog.create({
      action: "BRAND_UPDATED",
      entity: "Brand",
      entityId: brand.id,
      userId: req.user!.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    sendSuccess(res, brand);
  })
);

export const brandsRoutes = router;
