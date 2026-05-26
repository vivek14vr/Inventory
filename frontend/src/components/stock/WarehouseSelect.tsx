"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Warehouse } from "@/types/master";

type WarehouseSelectProps = {
  value: string;
  onChange: (warehouseId: string) => void;
  label?: string;
  required?: boolean;
  excludeWarehouseId?: string;
  /** When set, only these warehouses appear (module access). */
  allowedWarehouseIds?: string[];
  disabled?: boolean;
};

export function WarehouseSelect({
  value,
  onChange,
  label = "Warehouse",
  required = true,
  excludeWarehouseId,
  allowedWarehouseIds,
  disabled,
}: WarehouseSelectProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    api.warehouses.list().then(setWarehouses).catch(() => setWarehouses([]));
  }, []);

  let options = warehouses;
  if (allowedWarehouseIds?.length) {
    options = options.filter((w) => allowedWarehouseIds.includes(w.id));
  }
  if (excludeWarehouseId) {
    options = options.filter((w) => w.id !== excludeWarehouseId);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <select
        required={required && options.length > 0}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-select mt-1"
      >
        <option value="">Select warehouse</option>
        {options.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.code})
          </option>
        ))}
      </select>
    </div>
  );
}
