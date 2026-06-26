import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  brandId: Types.ObjectId;
  /** Label for the stocking unit, e.g. Carton, Box. */
  stockUnit: string;
  /** How many base units (pieces) are in one stock unit. */
  unitsPerStockUnit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    stockUnit: { type: String, trim: true, default: "unit" },
    unitsPerStockUnit: { type: Number, min: 1, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ brandId: 1, name: 1 }, { unique: true });

export const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>("Product", productSchema);
