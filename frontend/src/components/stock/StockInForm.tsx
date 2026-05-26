"use client";

import { useState } from "react";
import { BrandProductFields } from "@/components/stock/BrandProductFields";
import { WarehouseSelect } from "@/components/stock/WarehouseSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api/client";
import type { PendingTransfer } from "@/types/stock";

type StockInFormProps = {
  /** Admin must pick a warehouse; warehouse users use their assigned location */
  requireWarehouse?: boolean;
  /** Pre-filled when receiving an inter-warehouse transfer */
  transfer?: PendingTransfer;
  defaultWarehouseId?: string;
  allowedWarehouseIds?: string[];
  onSuccess?: (message: string) => void;
};

export function StockInForm({
  requireWarehouse = false,
  transfer,
  defaultWarehouseId = "",
  allowedWarehouseIds,
  onSuccess,
}: StockInFormProps) {
  const [warehouseId, setWarehouseId] = useState(
    transfer?.destinationWarehouse?.id ?? defaultWarehouseId
  );
  const [brandId, setBrandId] = useState(transfer?.brand.id ?? "");
  const [productId, setProductId] = useState(transfer?.product.id ?? "");
  const [quantity, setQuantity] = useState(transfer ? String(transfer.quantity) : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const resolvedWarehouseId = transfer?.destinationWarehouse?.id ?? warehouseId;

      const result = await api.stock.stockIn({
        ...(resolvedWarehouseId ? { warehouseId: resolvedWarehouseId } : {}),
        brandId,
        productId,
        quantity: parseInt(quantity, 10),
        transferId: transfer?.id,
        notes: notes || undefined,
      });
      const msg = transfer
        ? `Transfer received. New balance: ${result.balance}`
        : `Stock added. New balance: ${result.balance}`;
      setSuccess(msg);
      onSuccess?.(msg);
      if (!transfer) {
        setBrandId("");
        setProductId("");
        setQuantity("");
        setNotes("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record stock in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card space-y-4">
      <Alert message={error} />
      <Alert message={success} type="success" />

      {transfer && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Receiving transfer</p>
          <p className="mt-1 text-emerald-800">
            {transfer.quantity} × {transfer.product.name} from{" "}
            {transfer.sourceWarehouse.name} ({transfer.sourceWarehouse.code})
            {transfer.destinationWarehouse && (
              <>
                {" "}
                → {transfer.destinationWarehouse.name} (
                {transfer.destinationWarehouse.code})
              </>
            )}
          </p>
        </div>
      )}

      {!transfer &&
        (requireWarehouse ||
          (allowedWarehouseIds && allowedWarehouseIds.length > 1)) && (
          <WarehouseSelect
            value={warehouseId}
            onChange={setWarehouseId}
            label="Warehouse"
            allowedWarehouseIds={allowedWarehouseIds}
          />
        )}

      {transfer?.destinationWarehouse && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Receiving at:{" "}
          <strong>
            {transfer.destinationWarehouse.name} ({transfer.destinationWarehouse.code})
          </strong>
        </div>
      )}

      {!transfer && (
        <BrandProductFields
          brandId={brandId}
          productId={productId}
          onBrandChange={setBrandId}
          onProductChange={setProductId}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700">Quantity</label>
        <input
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          readOnly={!!transfer}
          className="form-input mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="form-input mt-1"
          placeholder="Purchase receipt, production batch, etc."
        />
      </div>

      <Button type="submit" loading={submitting} className="w-full sm:w-auto">
        {transfer ? "Confirm receive" : "Add stock"}
      </Button>
    </form>
  );
}
