import { z } from "zod";
import { paginationQuerySchema } from "../../shared/pagination/pagination.validation.js";

export const listProductsQuerySchema = paginationQuerySchema.extend({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  brandId: z.string().optional(),
  sortBy: z.enum(["name", "brand", "createdAt"]).optional().default("name"),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(200),
  brandId: z.string().min(1, "Brand is required"),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  brandId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
