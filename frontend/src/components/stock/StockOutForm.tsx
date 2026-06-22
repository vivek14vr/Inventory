"use client";

import { useEffect, useMemo, useState } from "react";
import { StockFlowBar } from "@/components/stock/StockFlowBar";
import { resolveWarehouseId, shouldPickWarehouse } from "@/components/stock/stockFlowUtils";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api/client";
import type { Brand, Product, Warehouse } from "@/types/master";

type StockOutStep =
  | "warehouse"
  | "brand"
  | "product"
  | "dispatch"
  | "destination"
  | "confirm";

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
  const pickWarehouse = shouldPickWarehouse({ requireWarehouse, allowedWarehouseIds });

  const [step, setStep] = useState<StockOutStep>(() =>
    pickWarehouse ? "warehouse" : "brand"
  );

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(pickWarehouse);
  const [loadingBrands, setLoadingBrands] = useState(!pickWarehouse);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dispatchType, setDispatchType] = useState<"TRANSFER" | "DIRECT_SELLING" | "">(
    ""
  );
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolvedWarehouseId = resolveWarehouseId(
    warehouseId,
    defaultWarehouseId,
    allowedWarehouseIds
  );

  const warehouseOptions = useMemo(() => {
    let list = warehouses;
    if (allowedWarehouseIds?.length) {
      list = list.filter((w) => allowedWarehouseIds.includes(w.id));
    }
    return list.filter((w) => w.isActive);
  }, [warehouses, allowedWarehouseIds]);

  const destinationOptions = useMemo(
    () => warehouseOptions.filter((w) => w.id !== resolvedWarehouseId),
    [warehouseOptions, resolvedWarehouseId]
  );

  const selectedWarehouse = warehouseOptions.find((w) => w.id === resolvedWarehouseId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedProduct = products.find((p) => p.id === productId);
  const selectedDestination = destinationOptions.find(
    (w) => w.id === destinationWarehouseId
  );

  useEffect(() => {
    setLoadingWarehouses(true);
    api.warehouses
      .list()
      .then(setWarehouses)
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWarehouses(false));
  }, []);

  useEffect(() => {
    if (step === "brand" || step === "product" || step === "dispatch" || step === "destination" || step === "confirm") {
      setLoadingBrands(true);
      api.brands
        .list()
        .then(setBrands)
        .catch(() => setBrands([]))
        .finally(() => setLoadingBrands(false));
    }
  }, [step]);

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    api.products
      .listAll({ brandId })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [brandId]);

  function selectWarehouse(id: string) {
    setWarehouseId(id);
    setBrandId("");
    setProductId("");
    setDispatchType("");
    setDestinationWarehouseId("");
    setStep("brand");
  }

  function selectBrand(id: string) {
    setBrandId(id);
    setProductId("");
    setDispatchType("");
    setDestinationWarehouseId("");
    setStep("product");
  }

  function selectProduct(id: string) {
    setProductId(id);
    setDispatchType("");
    setDestinationWarehouseId("");
    setStep("dispatch");
  }

  function selectDispatch(type: "TRANSFER" | "DIRECT_SELLING") {
    setDispatchType(type);
    if (type === "TRANSFER") {
      setDestinationWarehouseId("");
      setStep("destination");
    } else {
      setStep("confirm");
    }
  }

  function selectDestination(id: string) {
    setDestinationWarehouseId(id);
    setStep("confirm");
  }

  function goBack() {
    setError("");
    if (step === "confirm") {
      if (dispatchType === "TRANSFER") {
        setDestinationWarehouseId("");
        setStep("destination");
      } else {
        setDispatchType("");
        setStep("dispatch");
      }
    } else if (step === "destination") {
      setDestinationWarehouseId("");
      setDispatchType("");
      setStep("dispatch");
    } else if (step === "dispatch") {
      setProductId("");
      setDispatchType("");
      setStep("product");
    } else if (step === "product") {
      setBrandId("");
      setProductId("");
      setStep("brand");
    } else if (step === "brand" && pickWarehouse) {
      setWarehouseId("");
      setBrandId("");
      setProductId("");
      setStep("warehouse");
    }
  }

  function resetFlow() {
    setBrandId("");
    setProductId("");
    setQuantity("");
    setDispatchType("");
    setDestinationWarehouseId("");
    setClientName("");
    setInvoiceNumber("");
    setNotes("");
    setStep(pickWarehouse ? "warehouse" : "brand");
    if (!pickWarehouse) {
      setWarehouseId(defaultWarehouseId);
    } else {
      setWarehouseId("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const type = dispatchType || defaultDispatchType;
    try {
      const result = await api.stock.stockOut({
        ...(resolvedWarehouseId ? { warehouseId: resolvedWarehouseId } : {}),
        brandId,
        productId,
        quantity: parseInt(quantity, 10),
        dispatchType: type,
        destinationWarehouseId:
          type === "TRANSFER" ? destinationWarehouseId : undefined,
        clientName: type === "DIRECT_SELLING" ? clientName : undefined,
        invoiceNumber: type === "DIRECT_SELLING" ? invoiceNumber : undefined,
        notes: notes || undefined,
      });
      const msg =
        type === "TRANSFER"
          ? `Transfer sent. Remaining balance: ${result.balance}`
          : `Sale recorded. Remaining balance: ${result.balance}`;
      setSuccess(msg);
      onSuccess?.(msg);
      resetFlow();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record stock out");
    } finally {
      setSubmitting(false);
    }
  }

  const dispatchLabel =
    dispatchType === "TRANSFER"
      ? "Transfer"
      : dispatchType === "DIRECT_SELLING"
        ? "Sale"
        : undefined;

  const flowSteps = [
    ...(pickWarehouse || selectedWarehouse
      ? [{ label: "From", value: selectedWarehouse?.name }]
      : []),
    { label: "Brand", value: selectedBrand?.name },
    { label: "Product", value: selectedProduct?.name },
    ...(dispatchLabel ? [{ label: "Type", value: dispatchLabel }] : []),
    ...(selectedDestination
      ? [{ label: "To", value: selectedDestination.name }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <StockFlowBar steps={flowSteps} />
      <Alert message={error} />
      <Alert message={success} type="success" />

      {step === "warehouse" && (
        <SelectionGrid
          title="Select warehouse"
          subtitle="Which warehouse are you taking stock from?"
          items={warehouseOptions.map((w) => ({
            id: w.id,
            title: w.name,
            subtitle: w.code,
          }))}
          onSelect={selectWarehouse}
          loading={loadingWarehouses}
          emptyMessage="No warehouses available"
        />
      )}

      {step === "brand" && (
        <SelectionGrid
          title="Select brand"
          subtitle={
            selectedWarehouse
              ? `Removing stock from ${selectedWarehouse.name}`
              : "Choose a brand"
          }
          items={brands
            .filter((b) => b.isActive)
            .map((b) => ({ id: b.id, title: b.name }))}
          onSelect={selectBrand}
          onBack={pickWarehouse ? goBack : undefined}
          loading={loadingBrands}
          emptyMessage="No brands found"
        />
      )}

      {step === "product" && (
        <SelectionGrid
          title="Select product"
          subtitle={selectedBrand ? `Brand: ${selectedBrand.name}` : undefined}
          items={products
            .filter((p) => p.isActive)
            .map((p) => ({ id: p.id, title: p.name }))}
          onSelect={selectProduct}
          onBack={goBack}
          loading={loadingProducts}
          emptyMessage="No products for this brand"
        />
      )}

      {step === "dispatch" && (
        <SelectionGrid
          title="What are you doing?"
          subtitle={selectedProduct ? `Product: ${selectedProduct.name}` : undefined}
          items={[
            {
              id: "DIRECT_SELLING",
              title: "Sell to client",
              subtitle: "Direct sale",
            },
            {
              id: "TRANSFER",
              title: "Send to warehouse",
              subtitle: "Transfer stock",
            },
          ]}
          onSelect={(id) => selectDispatch(id as "TRANSFER" | "DIRECT_SELLING")}
          onBack={goBack}
        />
      )}

      {step === "destination" && (
        <SelectionGrid
          title="Send to which warehouse?"
          subtitle={`From ${selectedWarehouse?.name ?? "warehouse"}`}
          items={destinationOptions.map((w) => ({
            id: w.id,
            title: w.name,
            subtitle: w.code,
          }))}
          onSelect={selectDestination}
          onBack={goBack}
          loading={loadingWarehouses}
          emptyMessage="No other warehouses available"
        />
      )}

      {step === "confirm" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <button
            type="button"
            onClick={goBack}
            className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-stone-200 bg-white px-5 text-base font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M11.78 4.22a.75.75 0 010 1.06L7.56 9.5h8.19a.75.75 0 010 1.5H7.56l4.22 4.22a.75.75 0 11-1.06 1.06l-5.5-5.5a.75.75 0 010-1.06l5.5-5.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
            Back
          </button>

          <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-stone-900">
              {dispatchType === "TRANSFER" ? "Confirm transfer" : "Confirm sale"}
            </h2>
            <p className="mt-1 text-base text-stone-500">
              {selectedProduct?.name}
              {selectedBrand ? ` · ${selectedBrand.name}` : ""}
              {dispatchType === "TRANSFER" && selectedDestination
                ? ` · To ${selectedDestination.name}`
                : selectedWarehouse
                  ? ` · From ${selectedWarehouse.name}`
                  : ""}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-base font-semibold text-stone-700">
                  How many units?
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="form-input mt-2 text-2xl font-bold"
                  placeholder="0"
                />
              </div>

              {dispatchType === "DIRECT_SELLING" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-base font-semibold text-stone-700">
                      Client name
                    </label>
                    <input
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="form-input mt-2"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-stone-700">
                      Invoice number
                    </label>
                    <input
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="form-input mt-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-stone-700">
                  Notes (optional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input mt-2"
                />
              </div>
            </div>

            <Button type="submit" size="xl" loading={submitting} className="mt-6 w-full">
              {dispatchType === "TRANSFER" ? "Send transfer" : "Record sale"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
