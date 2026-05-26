"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import type { PaginationMeta } from "@/types/pagination";
import type { AuditFilters, AuditLogEntry, AuditSummary } from "@/types/audit";
import type { PublicUser } from "@/types/auth";

const ENTITY_OPTIONS = [
  "",
  "User",
  "Warehouse",
  "Brand",
  "Product",
  "StockMovement",
  "Transfer",
  "TallyImport",
  "Auth",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  useEffect(() => {
    api.users.list().then(setUsers).catch(() => setUsers([]));
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [logResult, summaryData] = await Promise.all([
        api.audit.list({ ...filters, page, limit }),
        api.audit.summary(),
      ]);
      setLogs(logResult.items);
      setPagination(logResult.pagination);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load audit logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  function updateFilter<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    resetPage();
  }

  return (
    <div className="space-y-6 text-zinc-900">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
        <p className="mt-1 text-sm text-zinc-600">
          User activity and system changes — filter by user, action, or date
        </p>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Total events</p>
            <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Last 7 days</p>
            <p className="mt-1 text-2xl font-semibold">{summary.last7Days}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Top actions</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {summary.topActions.slice(0, 3).map((a) => (
                <li key={a.action}>
                  {a.action} <span className="text-zinc-400">({a.count})</span>
                </li>
              ))}
              {summary.topActions.length === 0 && (
                <li className="text-zinc-400">No data yet</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">User</label>
            <select
              value={filters.userId ?? ""}
              onChange={(e) => updateFilter("userId", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Action</label>
            <input
              placeholder="e.g. LOGIN, STOCK_OUT"
              value={filters.action ?? ""}
              onChange={(e) => updateFilter("action", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Entity</label>
            <select
              value={filters.entity ?? ""}
              onChange={(e) => updateFilter("entity", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            >
              {ENTITY_OPTIONS.map((e) => (
                <option key={e || "all"} value={e}>
                  {e || "All entities"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">From date</label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => updateFilter("dateFrom", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">To date</label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => updateFilter("dateTo", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
        </div>
      </div>

      <Alert message={error} />

      {loading ? (
        <LoadingSpinner label="Loading audit log…" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3 hidden md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No audit entries match your filters
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-zinc-800">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium">{log.user.name}</p>
                          <p className="text-xs text-zinc-500">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3">
                      {log.entity}
                      {log.entityId ? (
                        <span className="block text-xs text-zinc-400">{log.entityId}</span>
                      ) : null}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-zinc-500 md:table-cell">
                      {log.metadata
                        ? JSON.stringify(log.metadata)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !loading && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  );
}
