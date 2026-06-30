import mongoose, { Types } from "mongoose";
import { InventoryBalance } from "../../models/InventoryBalance.js";
import { Product } from "../../models/Product.js";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError.js";

export async function getBalance(
  warehouseId: string,
  productId: string,
  session?: mongoose.ClientSession | null
): Promise<number> {
  const balance = await InventoryBalance.findOne({ warehouseId, productId }).session(
    session ?? null
  );
  return balance?.quantity ?? 0;
}

export async function adjustBalance(
  warehouseId: string,
  productId: string,
  delta: number,
  session?: mongoose.ClientSession | null
): Promise<number> {
  const existing = await InventoryBalance.findOne({ warehouseId, productId }).session(
    session ?? null
  );
  const current = existing?.quantity ?? 0;
  const next = current + delta;

  if (next < 0) {
    throw new BadRequestError(
      `Insufficient stock. Available: ${current}, requested: ${Math.abs(delta)}`
    );
  }

  await InventoryBalance.findOneAndUpdate(
    { warehouseId, productId },
    { $set: { quantity: next } },
    { upsert: true, ...(session ? { session } : {}) }
  );

  return next;
}

export async function setBalance(
  warehouseId: string,
  productId: string,
  quantity: number,
  session?: mongoose.ClientSession | null
): Promise<{ previous: number; next: number; delta: number }> {
  if (quantity < 0) {
    throw new BadRequestError("Quantity cannot be negative");
  }

  const previous = await getBalance(warehouseId, productId, session);
  const delta = quantity - previous;

  if (delta === 0) {
    return { previous, next: previous, delta: 0 };
  }

  const next = await adjustBalance(warehouseId, productId, delta, session);
  return { previous, next, delta };
}

export async function assertSufficientStock(
  warehouseId: string,
  productId: string,
  quantity: number,
  session?: mongoose.ClientSession | null
): Promise<void> {
  const available = await getBalance(warehouseId, productId, session);
  if (available < quantity) {
    throw new BadRequestError(
      `Insufficient stock. Available: ${available}, requested: ${quantity}`
    );
  }
}

export async function validateProductForBrand(
  productId: string,
  brandId: string
): Promise<{ productId: Types.ObjectId; brandId: Types.ObjectId; name: string }> {
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(brandId)) {
    throw new BadRequestError("Invalid product or brand");
  }

  const product = await Product.findOne({
    _id: productId,
    brandId,
    isActive: true,
  }).populate<{ brandId: { _id: Types.ObjectId; name: string; isActive: boolean } }>(
    "brandId",
    "name isActive"
  );

  if (!product) {
    throw new NotFoundError("Product not found or does not belong to the selected brand");
  }

  const brand = product.brandId as { _id: Types.ObjectId; name: string; isActive: boolean };
  if (!brand?.isActive) {
    throw new BadRequestError("Selected brand is inactive");
  }

  return {
    productId: product._id,
    brandId: brand._id,
    name: product.name,
  };
}

export async function listBalances(warehouseId: string) {
  const balances = await InventoryBalance.find({ warehouseId, quantity: { $gt: 0 } })
    .populate<{ productId: { _id: Types.ObjectId; name: string; secondaryName?: string; stockUnit?: string; unitsPerStockUnit?: number; brandId: Types.ObjectId } }>({
      path: "productId",
      select: "name secondaryName stockUnit unitsPerStockUnit brandId",
      populate: { path: "brandId", select: "name" },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return balances
    .filter((b) => b.productId && typeof b.productId === "object")
    .map((b) => {
      const product = b.productId as unknown as {
        _id: Types.ObjectId;
        name: string;
        secondaryName?: string;
        stockUnit?: string;
        unitsPerStockUnit?: number;
        brandId: { _id: Types.ObjectId; name: string };
      };
      return {
        productId: String(product._id),
        productName: product.name,
        secondaryProductName: product.secondaryName,
        brandId: String(product.brandId._id),
        brandName: product.brandId.name,
        stockUnit: product.stockUnit ?? "unit",
        unitsPerStockUnit: product.unitsPerStockUnit ?? 1,
        quantity: b.quantity,
        updatedAt: b.updatedAt,
      };
    });
}
