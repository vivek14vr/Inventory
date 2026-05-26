import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IInventoryBalance extends Document {
  warehouseId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const inventoryBalanceSchema = new Schema<IInventoryBalance>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

inventoryBalanceSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export const InventoryBalance: Model<IInventoryBalance> =
  mongoose.models.InventoryBalance ??
  mongoose.model<IInventoryBalance>("InventoryBalance", inventoryBalanceSchema);
