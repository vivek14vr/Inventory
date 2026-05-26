"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type {
  PermissionCode,
  PermissionGrant,
  PermissionModuleDefinition,
} from "@/lib/auth/permissions";

type Props = {
  value: PermissionGrant[];
  onChange: (grants: PermissionGrant[]) => void;
  warehouses: Array<{ id: string; name: string; code: string }>;
  disabled?: boolean;
};

function grantKey(g: PermissionGrant): string {
  return g.warehouseId ? `${g.code}:${g.warehouseId}` : g.code;
}

export function PermissionEditor({ value, onChange, warehouses, disabled }: Props) {
  const [modules, setModules] = useState<PermissionModuleDefinition[]>([]);

  useEffect(() => {
    api.permissions.catalog().then((r) => setModules(r.modules)).catch(() => {});
  }, []);

  function isChecked(code: PermissionCode, warehouseId?: string): boolean {
    return value.some(
      (g) => g.code === code && (warehouseId ? g.warehouseId === warehouseId : !g.warehouseId)
    );
  }

  function toggle(code: PermissionCode, warehouseId?: string) {
    const key = warehouseId ? `${code}:${warehouseId}` : code;
    if (value.some((g) => grantKey(g) === key)) {
      onChange(value.filter((g) => grantKey(g) !== key));
      return;
    }
    onChange([
      ...value,
      { code, ...(warehouseId ? { warehouseId } : {}) },
    ]);
  }

  function applyPreset(preset: "stock-only" | "warehouse-operator") {
    if (!warehouses.length) return;
    const wh = warehouses[0].id;
    if (preset === "stock-only") {
      onChange([
        { code: "stock.in", warehouseId: wh },
        { code: "stock.out", warehouseId: wh },
      ]);
    } else {
      onChange([
        { code: "dashboard.view" },
        { code: "stock.view", warehouseId: wh },
        { code: "stock.in", warehouseId: wh },
        { code: "stock.out", warehouseId: wh },
        { code: "transfers.view", warehouseId: wh },
        { code: "transfers.receive", warehouseId: wh },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !warehouses.length}
          onClick={() => applyPreset("stock-only")}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          Preset: Stock in/out only
        </button>
        <button
          type="button"
          disabled={disabled || !warehouses.length}
          onClick={() => applyPreset("warehouse-operator")}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          Preset: Full warehouse operator
        </button>
      </div>

      {modules.map((mod) => (
        <div
          key={mod.id}
          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
        >
          <h3 className="text-sm font-semibold text-zinc-900">{mod.label}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{mod.description}</p>

          <div className="mt-3 space-y-3">
            {mod.permissions.map((perm) => {
              if (!mod.warehouseScoped) {
                return (
                  <label
                    key={perm.code}
                    className="flex cursor-pointer items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={isChecked(perm.code)}
                      onChange={() => toggle(perm.code)}
                      className="mt-0.5 rounded border-zinc-300"
                    />
                    <span>
                      <span className="font-medium text-zinc-800">{perm.label}</span>
                      {perm.description && (
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {perm.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              }

              return (
                <div key={perm.code} className="space-y-2">
                  <p className="text-sm font-medium text-zinc-800">{perm.label}</p>
                  {perm.description && (
                    <p className="text-xs text-zinc-500">{perm.description}</p>
                  )}
                  <div className="ml-1 flex flex-wrap gap-3">
                    {warehouses.map((w) => (
                      <label
                        key={`${perm.code}-${w.id}`}
                        className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={isChecked(perm.code, w.id)}
                          onChange={() => toggle(perm.code, w.id)}
                          className="rounded border-zinc-300"
                        />
                        {w.name} ({w.code})
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {value.length > 0 && (
        <p className="text-xs text-zinc-500">
          {value.length} permission{value.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
