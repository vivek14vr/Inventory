import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  brandId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ brandId: 1, name: 1 }, { unique: true });

export const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>("Product", productSchema);
