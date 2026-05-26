"use client";

import { useState } from "react";
import { BrandProductFields } from "@/components/stock/BrandProductFields";
import { WarehouseSelect } from "@/components/stock/WarehouseSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api/client";

type StockOutFormProps = {
  requireWarehouse?: boolean;
  defaultWarehouseId?: string;
  allowedWarehouseIds?: string[];
  defaultDispatchType?: "TRANSFER" | "DIRECT_SELLING";
  onSuccess?: (message: string) => void;
};

export function StockOutForm({
  requireWarehouse = false,
  defaultWarehouseId = "",
  allowedWarehouseIds,
  defaultDispatchType = "DIRECT_SELLING",
  onSuccess,
}: StockOutFormProps) {
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dispatchType, setDispatchType] = useState<"TRANSFER" | "DIRECT_SELLING">(
    defaultDispatchType
  );
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
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
      const result = await api.stock.stockOut({
        ...(warehouseId ? { warehouseId } : {}),
        brandId,
        productId,
        quantity: parseInt(quantity, 10),
        dispatchType,
        destinationWarehouseId:
          dispatchType === "TRANSFER" ? destinationWarehouseId : undefined,
        clientName: dispatchType === "DIRECT_SELLING" ? clientName : undefined,
        invoiceNumber:
          dispatchType === "DIRECT_SELLING" ? invoiceNumber : undefined,
        notes: notes || undefined,
      });
      const msg =
        dispatchType === "TRANSFER"
          ? `Transfer initiated (pending receive at destination). Remaining balance: ${result.balance}`
          : `Sale recorded. Remaining balance: ${result.balance}`;
      setSuccess(msg);
      onSuccess?.(msg);
      setBrandId("");
      setProductId("");
      setQuantity("");
      setClientName("");
      setInvoiceNumber("");
      setNotes("");
      if (dispatchType === "TRANSFER") {
        setDestinationWarehouseId("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record stock out");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card space-y-4">
      <Alert message={error} />
      <Alert message={success} type="success" />

      {(requireWarehouse ||
        (allowedWarehouseIds && allowedWarehouseIds.length > 1)) && (
        <WarehouseSelect
          value={warehouseId}
          onChange={setWarehouseId}
          label="From warehouse"
          allowedWarehouseIds={allowedWarehouseIds}
          excludeWarehouseId={
            dispatchType === "TRANSFER" ? destinationWarehouseId : undefined
          }
        />
      )}

      <BrandProductFields
        brandId={brandId}
        productId={productId}
        onBrandChange={setBrandId}
        onProductChange={setProductId}
      />

      <div>
        <label className="block text-sm font-medium text-zinc-700">Quantity</label>
        <input
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="form-input mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Dispatch type</label>
        <select
          value={dispatchType}
          onChange={(e) =>
            setDispatchType(e.target.value as "TRANSFER" | "DIRECT_SELLING")
          }
          className="form-select mt-1"
        >
          <option value="DIRECT_SELLING">Direct selling (client sale)</option>
          <option value="TRANSFER">Transfer to another warehouse</option>
        </select>
      </div>

      {dispatchType === "TRANSFER" && (
        <WarehouseSelect
          value={destinationWarehouseId}
          onChange={setDestinationWarehouseId}
          label="To warehouse"
          excludeWarehouseId={requireWarehouse ? warehouseId : undefined}
        />
      )}

      {dispatchType === "DIRECT_SELLING" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Client name</label>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="form-input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Invoice number</label>
            <input
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="form-input mt-1"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700">Notes (optional)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="form-input mt-1"
        />
      </div>

      <Button type="submit" loading={submitting} className="w-full sm:w-auto">
        {dispatchType === "TRANSFER" ? "Send transfer" : "Record sale"}
      </Button>
    </form>
  );
}
