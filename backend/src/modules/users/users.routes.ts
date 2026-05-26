import { Router } from "express";
import { AuditLog } from "../../models/AuditLog.js";
import { Permission } from "../../shared/constants/permissions.js";
import { BadRequestError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { requireAdminOrPermission } from "../../shared/middleware/requirePermission.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/apiResponse.js";
import * as usersService from "./users.service.js";
import { createUserSchema, updateUserSchema } from "./users.validation.js";

const router = Router();

router.use(authenticate, requireAdminOrPermission(Permission.USERS_MANAGE));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await usersService.listUsers();
    sendSuccess(res, users);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const user = await usersService.getUserById(id);
    sendSuccess(res, user);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const result = await usersService.createUser(parsed.data, req.user!);

    await AuditLog.create({
      action: "USER_CREATED",
      entity: "User",
      entityId: result.user.id,
      userId: req.user!.id,
      metadata: { email: result.user.email, role: result.user.role },
    });

    sendSuccess(res, result.user, 201);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid input");
    }

    const id = String(req.params.id);
    const result = await usersService.updateUser(id, parsed.data, req.user!);

    await AuditLog.create({
      action: "USER_UPDATED",
      entity: "User",
      entityId: result.user.id,
      userId: req.user!.id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    sendSuccess(res, result.user);
  })
);

export const usersRoutes = router;
