import { Router } from "express";
import { AuditLog } from "../../models/AuditLog.js";
import { UserRole } from "../../shared/constants/roles.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/apiResponse.js";
import * as productsService from "./products.service.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "./products.validation.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = listProductsQuerySchema.safeParse({
      ...req.query,
      includeInactive:
        req.user?.role === UserRole.ADMIN && req.query.includeInactive === "true"
          ? "true"
          : "false",
    });
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid query");
    }
    const { items, pagination } = await productsService.listProducts(parsed.data);
    sendSuccess(res, items, 200, { pagination });
  })
);

router.use(authenticate, authorize(UserRole.ADMIN));

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await productsService.getProductById(String(req.params.id));
    sendSuccess(res, product);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const product = await productsService.createProduct(parsed.data);

    await AuditLog.create({
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      userId: req.user!.id,
      metadata: { name: product.name, brandId: product.brandId },
    });

    sendSuccess(res, product, 201);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const product = await productsService.updateProduct(
      String(req.params.id),
      parsed.data
    );

    await AuditLog.create({
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: product.id,
      userId: req.user!.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    sendSuccess(res, product);
  })
);

export const productsRoutes = router;
