import type { Request, Response, NextFunction } from "express";
import type { PermissionCode } from "../constants/permissions.js";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { assertPermission, hasPermission, isAdmin } from "../utils/permissions.js";

/** Full admin or holder of the given permission (global grants). */
export function requireAdminOrPermission(code: PermissionCode) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (isAdmin(req.user) || hasPermission(req.user, code)) {
      next();
      return;
    }
    next(new ForbiddenError("You do not have permission to perform this action"));
  };
}

type WarehouseIdSource = "query" | "body";

export function requirePermission(
  code: PermissionCode,
  options?: { warehouseIdFrom?: WarehouseIdSource; warehouseIdField?: string }
) {
  const field = options?.warehouseIdField ?? "warehouseId";
  const source = options?.warehouseIdFrom ?? "body";

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    let warehouseId: string | undefined;
    if (options?.warehouseIdFrom) {
      const bag = source === "query" ? req.query : req.body;
      const raw = bag?.[field];
      warehouseId = typeof raw === "string" ? raw : undefined;
    }

    assertPermission(req.user, code, warehouseId);
    next();
  };
}

export function requireAnyPermission(
  codes: PermissionCode[],
  options?: { warehouseIdFrom?: WarehouseIdSource; warehouseIdField?: string }
) {
  const field = options?.warehouseIdField ?? "warehouseId";
  const source = options?.warehouseIdFrom ?? "body";

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    let warehouseId: string | undefined;
    if (options?.warehouseIdFrom) {
      const bag = source === "query" ? req.query : req.body;
      const raw = bag?.[field];
      warehouseId = typeof raw === "string" ? raw : undefined;
    }

    const allowed = codes.some((code) =>
      hasPermission(req.user!, code, warehouseId)
    );

    if (!allowed) {
      next(new ForbiddenError("You do not have permission to perform this action"));
      return;
    }

    next();
  };
}
