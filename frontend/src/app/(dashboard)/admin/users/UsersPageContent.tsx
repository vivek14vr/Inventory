"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import {
  defaultWarehouseOperatorPermissions,
  hasWarehouseScopedPermission,
  type PermissionGrant,
} from "@/lib/auth/permissions";
import { ButtonSelect } from "@/components/ui/ButtonSelect";
import { PermissionEditor } from "@/components/users/PermissionEditor";
import type { PublicUser } from "@/types/auth";

type Warehouse = { id: string; name: string; code: string };

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "WAREHOUSE_USER" as "ADMIN" | "WAREHOUSE_USER",
  warehouseId: "",
  permissions: [] as PermissionGrant[],
};

export function UsersPageContent() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [editPermissions, setEditPermissions] = useState<PermissionGrant[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userList, warehouseList] = await Promise.all([
        api.users.list(),
        api.warehouses.list(),
      ]);
      setUsers(userList);
      setWarehouses(warehouseList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showForm || form.role !== "WAREHOUSE_USER" || warehouses.length === 0) return;
    if (form.warehouseId && form.permissions.length > 0) return;
    const wh = warehouses[0].id;
    setForm((f) => ({
      ...f,
      warehouseId: wh,
      permissions: defaultWarehouseOperatorPermissions(wh),
    }));
  }, [showForm, form.role, form.warehouseId, form.permissions.length, warehouses]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (
      form.role === "WAREHOUSE_USER" &&
      !hasWarehouseScopedPermission(form.permissions)
    ) {
      setError(
        'Choose a home warehouse and use "Full warehouse operator" or tick Stock/Inventory permissions for that warehouse.'
      );
      setSubmitting(false);
      return;
    }

    try {
      await api.users.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        warehouseId:
          form.role === "WAREHOUSE_USER" ? form.warehouseId || undefined : undefined,
        permissions:
          form.role === "WAREHOUSE_USER" ? form.permissions : undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePermissions() {
    if (!editing) return;
    setSubmitting(true);
    setError("");
    try {
      await api.users.update(editing.id, { permissions: editPermissions });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update permissions");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: PublicUser) {
    setError("");
    try {
      await api.users.update(user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  }

  function openEditPermissions(user: PublicUser) {
    setEditing(user);
    setEditPermissions(user.permissions ?? []);
  }

  function formatPermissions(user: PublicUser): string {
    if (user.role === "ADMIN") return "Full access";
    const count = user.permissions?.length ?? 0;
    if (count === 0) return "No permissions";
    return `${count} module grant${count === 1 ? "" : "s"}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Users & access</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Assign module-level permissions per warehouse (e.g. stock in/out only).
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
        >
          {showForm ? "Cancel" : "Add user"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4"
        >
          <h2 className="font-medium">New user</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
            <ButtonSelect
              label="Role"
              value={form.role}
              onChange={(v) =>
                setForm({
                  ...form,
                  role: v as "ADMIN" | "WAREHOUSE_USER",
                  permissions: [],
                })
              }
              options={[
                { value: "WAREHOUSE_USER", label: "Staff (custom permissions)" },
                { value: "ADMIN", label: "Admin (full access)" },
              ]}
            />
          </div>

          {form.role === "WAREHOUSE_USER" && (
            <>
              <div>
                <ButtonSelect
                  label="Home warehouse"
                  value={form.warehouseId}
                  onChange={(warehouseId) => {
                    setForm((f) => ({
                      ...f,
                      warehouseId,
                      permissions: warehouseId
                        ? defaultWarehouseOperatorPermissions(warehouseId)
                        : [],
                    }));
                  }}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                    sublabel: w.code,
                  }))}
                  emptyMessage="No warehouses available"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Used for the dashboard and default stock access. Password is stored once
                  (bcrypt hashed on the server only).
                </p>
              </div>
              <PermissionEditor
                value={form.permissions}
                onChange={(permissions) => setForm({ ...form, permissions })}
                warehouses={warehouses}
              />
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      {editing && (
        <div className="rounded-xl border border-orange-200 bg-white p-6 space-y-4">
          <h2 className="font-medium text-zinc-900">
            Module access — {editing.name}
          </h2>
          <PermissionEditor
            value={editPermissions}
            onChange={setEditPermissions}
            warehouses={warehouses}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSavePermissions()}
              className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save permissions"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                      {u.role === "ADMIN" ? "Admin" : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatPermissions(u)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.isActive
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {u.role === "WAREHOUSE_USER" && (
                      <button
                        type="button"
                        onClick={() => openEditPermissions(u)}
                        className="text-xs font-medium text-orange-700 hover:text-orange-900"
                      >
                        Edit access
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
