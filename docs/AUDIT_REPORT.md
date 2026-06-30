# Project Audit Report

**Date:** 30 June 2026  
**Scope:** Full project validation — RBAC, stock/transfer flows, API contracts, navigation, and UX  
**Build status:** Backend and frontend TypeScript builds pass. Backend test suite: 16 passing unit tests (`npm test`). All audit items addressed.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 5 |
| Medium | 14 |
| Low | 6 |

**Recommended fix order:** Products pagination → `/app/inventory` route guard → Transfer history scoping → Middleware fallback → Return flow permissions → Staff routes for invoice fix and audit links.

---

## Fix status (30 June 2026)

The following items have been **fixed** (builds pass, no lint errors):

| # | Item | Status |
|---|------|--------|
| 1 | Products API pagination shape | Fixed — route sends `{ pagination }` meta |
| 2 | Transfer history warehouse scoping | Fixed — scoped by user's transfer warehouses |
| 3 | `/app/*` middleware fallback fails closed; `/app/notifications` added | Fixed |
| 4 | `/app/inventory` route guard includes `STOCK_VIEW` | Fixed |
| 5 | Return flow permissions (history API allows `transfers.receive`; `assertCanReturnTransfer` adds `STOCK_IN`; ReturnPanel filters by warehouse) | Fixed |
| 6 | Pending transfer return/cancel creates compensating `STOCK_IN` movement | Fixed |
| 10 | `checklists.manage` default path no longer points to `/admin` | Fixed |
| 11 | Users page audit link is context-aware (`/app/audit` vs `/admin/audit`) | Fixed |
| 12 | Save permissions validates warehouse-scoped grants | Fixed |
| 13 | ReturnPanel filters transfers by user warehouse | Fixed |
| 14 | Transfer history `dateTo` now end-of-day | Fixed |
| 15 | Sort `$unwind` preserves orphaned refs (`preserveNullAndEmptyArrays`) | Fixed |
| 16 | Stock balances search includes secondary product name | Fixed |
| 17 | Admin transfer page can return received transfers | Fixed |
| 18 | Pending transfer cancellation now uses `CANCELLED`; `RETURNED` is reserved for received goods returned to source | Fixed |
| 19 | `STOCK_ADJUSTED` audit formatter + names in metadata | Fixed |
| 20 | Audit user filter no longer requires `users.manage`; it uses `/audit/users` under `audit.view` | Fixed |
| 21 | Transfer screens/reports now use `productDisplayName`; transfer lists use stock-unit quantity display where transfer APIs return product unit data | Fixed |
| 22 | Backend default permission bundle no longer stores `warehouseId` on global codes | Fixed |
| 23 | Added backend test script and regression tests for transfer status validation, permission scoping middleware, default grants, and ambiguous product lookup | Expanded |
| 25 | Catalog list endpoints are no longer auth-only; they require relevant module/flow permissions while still supporting stock and transfer dropdowns | Fixed |
| 26 | Notifications API requires checklist permissions | Fixed |
| 27 | `getDefaultAppPath` includes `inventory.adjust` | Fixed |
| 28 | `USER_UPDATED` audit hides raw `password` field | Fixed |

| 7 (High) | Manual warehouse return now warns about pending incoming transfers (lists them + links to Return transfer) to prevent double-counting stock | Fixed |
| 9 | Staff invoice-fix page under `/app/wrong-invoice` with `inventory.adjust` route guard | Fixed |
| 29 | Removed silent `.catch(() => ...)` handlers; visible UI flows now show load errors instead of failing quietly | Fixed |
| 30 | Client API exposes single-record `get` methods for users, products, brands, and warehouses | Fixed |
| 31 | Product primary/secondary label collisions are rejected; import lookup now fails clearly on ambiguous existing data | Fixed |
| 32 | Warehouse-scoped permission middleware now requires a warehouse id by default; service-scoped routes must explicitly opt in | Fixed |

**All audit items are now addressed.**

- **23** — Test suite expanded to **16 passing unit tests** (transfer status validation, permission scoping middleware, default grants, ambiguous product lookup, product-name normalization/display, permission label formatting + grant diffing). Broader end-to-end/integration tests against a live DB remain a future enhancement, but core pure logic is now covered.
- **24** — **Fixed.** The legacy `(dashboard)/warehouse/*` directory has been removed. The 3 implementations still in use (`page`, `inventory/page`, `transfers/page`) were relocated into their `(dashboard)/app/*` counterparts (previously thin re-exports), and the dashboard page was simplified to use `/app` routes directly. `AUTH_ROUTES.warehouse*` entries were deleted. The middleware `/warehouse/* → /app/*` redirect is retained as a harmless safety net for old bookmarks. Frontend production build passes.

---

## Critical

### 1. Products API pagination shape is broken

| | |
|---|---|
| **Files** | `backend/src/modules/products/products.routes.ts`, `frontend/src/lib/api/client.ts`, `frontend/src/lib/api/pagination.ts` |
| **Issue** | `listProducts` returns `{ items, pagination }`, but the route sends it as `data` without `meta.pagination`. The client requires `meta.pagination` and throws `"Missing pagination metadata"`. |
| **Impact** | Admin Products page fails to load. `api.products.listAll()` fails on page 1. Stock In / Stock Out forms swallow the error and show **zero products** (silent failure in `StockInForm.tsx`, `StockOutForm.tsx`, `BrandProductFields.tsx`). |

---

### 2. Transfer history leaks company-wide data

| | |
|---|---|
| **Files** | `backend/src/modules/transfers/transfers.service.ts` (`listTransferHistory`), `backend/src/modules/transfers/transfers.routes.ts` |
| **Issue** | `listPendingTransfers` scopes by the user’s warehouses. `listTransferHistory` does not — it only filters by query params. Any user with `transfers.view` for one warehouse can list all transfers company-wide. |
| **Impact** | `ReturnPanel` calls `api.transfers.history()` with no warehouse filter. Operators can see transfers for warehouses they should not access. |

---

### 3. `/app/*` middleware allows unlisted routes

| | |
|---|---|
| **File** | `frontend/src/lib/auth/permissions.ts` (`canAccessAppPath`) |
| **Issue** | Fallback: `if (!match) return pathname.startsWith("/app")` — any authenticated staff user can open `/app/*` paths not listed in `APP_ROUTE_PERMISSIONS` via direct URL. |
| **Example** | `/app/notifications` is not in `APP_ROUTE_PERMISSIONS` but is reachable by any staff user. Nav only shows it for `checklists.complete` users. |

---

## High

### 4. “Check Stock” quick action blocked for default staff

| | |
|---|---|
| **Files** | `frontend/src/app/(dashboard)/warehouse/page.tsx`, `frontend/src/lib/auth/permissions.ts` |
| **Issue** | Dashboard shows “Check Stock” when user has `stock.view` (`canViewStockDashboard`). Link goes to `/app/inventory`. Middleware requires `inventory.view` or `inventory.adjust`. Default staff bundle has `stock.view` but not `inventory.view`. |
| **Impact** | User sees the card, clicks it, gets bounced home with no error. The page itself calls `api.stock.balances()` (`stock.view`), so the route guard should include `STOCK_VIEW`. |

---

### 5. Return transfer flow blocked for default staff

| | |
|---|---|
| **Files** | `frontend/src/components/stock/ReturnPanel.tsx`, `backend/src/modules/transfers/transfers.routes.ts` |
| **Issue** | “Return transfer” tab loads `api.transfers.history({ status: "RECEIVED" })`, which requires `transfers.view` or `transfers.manage`. Default staff have `transfers.receive` + `stock.in` only. |
| **Impact** | Return transfer tab shows error or empty list. Only “Manual return” works. |

---

### 6. Return route vs service permission mismatch

| | |
|---|---|
| **Files** | `backend/src/modules/transfers/transfers.routes.ts`, `backend/src/modules/transfers/transfers.service.ts` (`assertCanReturnTransfer`) |
| **Issue** | Route middleware allows `TRANSFERS_MANAGE`, `TRANSFERS_RECEIVE`, or `STOCK_IN`. Service checks `TRANSFERS_MANAGE`, `STOCK_OUT`, or `TRANSFERS_RECEIVE` — not `STOCK_IN`. |
| **Impact** | Users with only `stock.in` pass the route and get `ForbiddenError` in the service. Frontend `/app/return` also allows `STOCK_IN`-only access. |

---

### 7. Manual warehouse return can inflate stock — FIXED

| | |
|---|---|
| **Files** | `frontend/src/components/stock/ReturnPanel.tsx`, `frontend/src/components/stock/StockInForm.tsx`, `backend/src/modules/stock/stock.service.ts` |
| **Issue** | “Manual return” is a plain stock-in with no link to an open transfer. If a pending transfer still exists for the same goods and someone receives it later, stock can be double-counted. |
| **Impact** | UI offers both manual return and transfer receive without guarding against duplicate restocking. |
| **Fix** | The Manual return tab now loads pending incoming transfers for the warehouse and shows a prominent warning listing them, advising the operator to use **Return transfer** / receive instead. Includes a shortcut button to the Return transfer tab. Best-effort and non-blocking — manual return still works when there are genuinely no transfer records. |

---

### 8. Pending admin “Returned” skips stock movements

| | |
|---|---|
| **File** | `backend/src/modules/transfers/transfers.service.ts` (`updateTransferStatus`) |
| **Issue** | Marking a **pending** transfer as Returned or Cancelled restores source balance via `adjustBalance` but does not create compensating stock movements. Transfer creation already logged a `STOCK_OUT`. |
| **Impact** | On-hand quantity at source is correct, but movement ledger shows an outbound with no matching inbound/reversal. Audit/reconciliation break. `returnTransfer` (post-receive) correctly creates movements; pending admin path does not. |

---

## Medium

### 9. No staff-accessible invoice-fix page

| | |
|---|---|
| **Files** | `frontend/src/middleware.ts`, `frontend/src/app/(dashboard)/admin/wrong-invoice/page.tsx`, `backend/src/modules/inventory/inventory.routes.ts` |
| **Issue** | Invoice correction UI lives only at `/admin/wrong-invoice`. Middleware blocks non-admins from `/admin/*`. Backend APIs correctly require `inventory.adjust`, but staff with that permission have no `/app` route. |

---

### 10. `checklists.manage` default path causes redirect loop

| | |
|---|---|
| **Files** | `frontend/src/lib/auth/permissions.ts` (`getDefaultAppPath`), `frontend/src/middleware.ts` |
| **Issue** | `getDefaultAppPath` sends `checklists.manage` holders to `/admin/checklists`. Middleware redirects non-admins away from `/admin/*` back to `getDefaultAppPath` → potential redirect loop. `/app/checklists` only renders task completion UI, not admin management. |

---

### 11. Users page activity-log link wrong for staff

| | |
|---|---|
| **File** | `frontend/src/app/(dashboard)/admin/users/UsersPageContent.tsx` |
| **Issue** | Links to `AUTH_ROUTES.adminAudit` (`/admin/audit`). Non-admin with `users.manage` on `/app/users` gets redirected away by middleware. Should use `appAudit` when on staff route. |

---

### 12. Save permissions skips warehouse-scoped validation

| | |
|---|---|
| **File** | `frontend/src/app/(dashboard)/admin/users/UsersPageContent.tsx` |
| **Issue** | `handleCreate` checks `hasWarehouseScopedPermission`. `handleSavePermissions` does not. Staff can be saved with no warehouse-scoped grants. |

---

### 13. ReturnPanel lists transfers the user cannot return

| | |
|---|---|
| **File** | `frontend/src/components/stock/ReturnPanel.tsx` |
| **Issue** | Loads all `RECEIVED` transfers globally. No `destinationWarehouseId` filter from `allowedWarehouseIds` / `defaultWarehouseId`. Users see “Return to source” for transfers at other warehouses. |

---

### 14. Transfer history `dateTo` excludes most of the selected day

| | |
|---|---|
| **File** | `backend/src/modules/transfers/transfers.service.ts` |
| **Issue** | `listTransferHistory` uses `new Date(query.dateTo)` (start of day). `listTransferActivity` sets end-of-day (`23:59:59.999`). Filtering “to Jan 15” in history drops transfers created later that day. |

---

### 15. Transfer history sort can drop rows and skew pagination

| | |
|---|---|
| **File** | `backend/src/modules/transfers/transfers.service.ts` (`fetchTransferHistoryIds`) |
| **Issue** | Sorting on `productName`, `brandName`, and `route` uses `$lookup` + `$unwind` without `preserveNullAndEmptyArrays`. Transfers with missing/deleted product, brand, or warehouse refs are excluded from the sorted page while `countDocuments` still counts them. |

---

### 16. Stock balances search ignores secondary product name

| | |
|---|---|
| **File** | `backend/src/modules/stock/stock.service.ts` (`listBalancesForUser`) |
| **Issue** | Search only uses `productName` and `brandName`. Admin inventory search includes `secondaryName`. Warehouse stock balance API is inconsistent. |

---

### 17. Admin transfer page cannot return received transfers

| | |
|---|---|
| **Files** | `frontend/src/app/(dashboard)/admin/transfers/page.tsx`, `backend/src/modules/transfers/transfers.service.ts` (`returnTransfer`) |
| **Issue** | Admin UI only acts on `PENDING` (Receive / Returned via `updateStatus`). Post-receive returns require `POST /transfers/:id/return`. Admins with `TRANSFERS_MANAGE` can call the API, but admin transfer history has no “Return received transfer” action. |

---

### 18. Two different flows share `RETURNED` status

| | |
|---|---|
| **File** | `backend/src/modules/transfers/transfers.service.ts` |
| **Issue** | `updateTransferStatus(RETURNED)` on pending: restore source only, no movements. `returnTransfer` on received: dest −qty, source +qty, with out + in movements. Same status label, different semantics and audit trail. |

---

### 19. `STOCK_ADJUSTED` audit entries lack readable details

| | |
|---|---|
| **Files** | `frontend/src/lib/audit/formatAuditDetails.ts`, `backend/src/modules/inventory/inventory.service.ts` |
| **Issue** | No dedicated `STOCK_ADJUSTED` handler. Backend logs `previous` / `next` in metadata without product/warehouse names. Activity log lines are sparse. |

---

### 20. Audit user filter requires `users.manage`

| | |
|---|---|
| **File** | `frontend/src/app/(dashboard)/admin/audit/AuditPageContent.tsx` |
| **Issue** | `api.users.list()` requires `users.manage`. Users with only `audit.view` get empty user dropdown silently (`.catch(() => setUsers([]))`). |

---

### 21. Product display and quantity terminology inconsistent

| | |
|---|---|
| **Files** | `frontend/src/lib/products/productDisplayName.ts` (unused), `TransferPanel.tsx`, `warehouse/transfers/page.tsx`, `ReturnPanel.tsx`, `admin/transfers/page.tsx` |
| **Issue** | `productDisplayName` helper has zero imports. Mixed patterns: separate columns vs inline `name · secondaryName`. Transfer lists show raw base units (e.g. `90`) instead of stock-unit display (e.g. `3 cartons`) via `StockQuantityDisplay`. |

---

### 22. Backend default permission bundle stores extra `warehouseId` on global codes

| | |
|---|---|
| **Files** | `backend/src/shared/constants/permissions.ts`, `frontend/src/lib/auth/permissions.ts`, `backend/src/modules/users/users.service.ts` |
| **Issue** | Backend `defaultWarehouseOperatorPermissions` attaches `warehouseId` to all codes including `dashboard.view` and `checklists.complete`. Frontend correctly omits `warehouseId` for non-scoped codes. Stored grants are inconsistent (authorization still works). |

---

## Low

### 23. No automated tests — ADDRESSED

| | |
|---|---|
| **Issue** | No `*.test.ts` or `*.spec.ts` files in the repo. Regressions rely on manual QA. |
| **Fix** | Backend test suite added (`tsx --test`), now **16 passing tests** covering transfer status validation, permission scoping middleware, default grants, ambiguous product lookup, product-name utils, and permission label/diff helpers. Broader integration tests against a live DB remain a future enhancement. |

---

### 24. Legacy `warehouse/*` routes and layout — FIXED

| | |
|---|---|
| **Files** | `frontend/src/app/(dashboard)/warehouse/*` (removed), `frontend/src/app/(dashboard)/app/*`, `frontend/src/lib/auth/constants.ts`, `frontend/src/middleware.ts` |
| **Issue** | Middleware redirects `/warehouse/*` → `/app/*`. The live `/app/*` pages re-exported implementations from `(dashboard)/warehouse/*`; warehouse layout/constants still referenced legacy paths. |
| **Fix** | Deleted the `(dashboard)/warehouse/` directory. Relocated the in-use implementations (`page`, `inventory/page`, `transfers/page`) into their `(dashboard)/app/*` counterparts and simplified the dashboard to use `/app` routes directly. Removed `AUTH_ROUTES.warehouse*`. Kept the middleware redirect as a safety net for old bookmarks. Frontend production build passes. |

---

### 25. Catalog list endpoints require only authentication

| | |
|---|---|
| **Files** | `backend/src/modules/products/products.routes.ts`, `brands.routes.ts`, `warehouses.routes.ts` |
| **Issue** | `GET /products`, `GET /brands`, `GET /warehouses` use `authenticate` only. Any logged-in user can enumerate the full catalog (inactive items hidden unless user has `*_MANAGE`). May be intentional for stock-form dropdowns, but is a gap vs `*.view` permissions. |

---

### 26. Notifications API has no permission check

| | |
|---|---|
| **File** | `backend/src/modules/notifications/notifications.routes.ts` |
| **Issue** | All routes use only `authenticate`. Data is scoped to `userId` in the service, but there is no tie to `checklists.complete` or any other permission module. |

---

### 27. `getDefaultAppPath` omits `inventory.adjust`

| | |
|---|---|
| **File** | `frontend/src/lib/auth/permissions.ts` |
| **Issue** | `inventory.adjust` is in `APP_ROUTE_PERMISSIONS` for `/app/inventory` but not in `getDefaultAppPath` checks. Latent issue if a user has only global permissions without dashboard access. |

---

### 28. `USER_UPDATED` audit may list `password` in changes

| | |
|---|---|
| **Files** | `backend/src/modules/users/users.routes.ts`, `frontend/src/lib/audit/formatAuditDetails.ts` |
| **Issue** | `USER_UPDATED` metadata includes raw `changes` array keys, which may display `"password"` in the activity log. |

---

### 29. API errors swallowed without user feedback

| | |
|---|---|
| **Files** | `StockInForm.tsx`, `StockOutForm.tsx`, `BrandProductFields.tsx`, `PermissionEditor.tsx`, `UsersPageContent.tsx`, `admin/inventory/page.tsx` |
| **Issue** | Multiple `.catch(() => setX([]))` patterns hide failures. Empty dropdowns or permission UI with no explanation. |

---

### 30. Missing client API endpoints

| | |
|---|---|
| **File** | `frontend/src/lib/api/client.ts` |
| **Issue** | Backend has `GET /users/:id`, `GET /products/:id`, `GET /brands/:id`, `GET /warehouses/:id` — not exposed in client (unused today). |

---

### 31. Product secondary-name collisions in Tally import lookup

| | |
|---|---|
| **Files** | `backend/src/shared/utils/productLookup.ts`, `backend/src/modules/products/products.service.ts` |
| **Issue** | Uniqueness enforced on primary `nameNormalized` only. If product B’s primary name equals product A’s `secondaryName` under the same brand, import lookup can resolve incorrectly. Stock forms use product ID — not affected. |

---

### 32. Route permission weak when `warehouseId` omitted

| | |
|---|---|
| **File** | `backend/src/shared/utils/permissions.ts` |
| **Issue** | `hasPermission(user, code)` without `warehouseId` returns true if any warehouse grant exists. Route middleware without `warehouseIdFrom` is weaker than it appears; service layer often compensates. |

---

## Navigation and RBAC gaps (UX)

| Route | In `APP_ROUTE_PERMISSIONS` | In `buildAppNav` | Notes |
|-------|---------------------------|------------------|-------|
| `/app/receive` | Yes | No | Redirects to `/app/transfer` |
| `/app/return` | Yes | No | Hidden from nav |
| `/app/stock` | Yes | No | Nav needs `stock.in` or `stock.out` |
| `/app/notifications` | **No** | Yes (with `checklists.complete`) | Middleware allows any staff via fallback |

---

## What works correctly

- Backend and frontend TypeScript builds pass
- `/admin/*` blocked for non-admins via middleware
- Stock in/out warehouse scoping on API
- Transfer create → receive balance updates
- Invoice delete restores stock in a transaction
- RBAC on most modules (stock, inventory, users, audit, imports, checklists)
- Transfer history sorting (status priority: Pending → Cancelled → Returned → Received, plus column sorts)
- Product lookup in forms by primary/secondary name (UI search; API uses product ID)
- Permission editor + audit logging for grant/revoke (`USER_PERMISSIONS_UPDATED`, `USER_CREATED`)
- `transfers.manage` scoping aligned between backend catalog and frontend `WAREHOUSE_SCOPED`

---

## Recommended fix priority

1. **Products pagination** — `sendSuccess(res, items, 200, { pagination })` in products route
2. **`/app/inventory` guard** — add `STOCK_VIEW` to `APP_ROUTE_PERMISSIONS`
3. **Transfer history scoping** — mirror `listPendingTransfers` warehouse filter in `listTransferHistory`
4. **Middleware fallback** — deny unknown `/app/*` paths; add `/app/notifications` with explicit permission
5. **Return flow** — allow `transfers.receive` on history API; add `STOCK_IN` to `assertCanReturnTransfer`; filter `ReturnPanel` by warehouse
6. **Staff routes** — `/app/wrong-invoice` for `inventory.adjust`; fix audit link on `/app/users`
7. **Pending transfer return** — create stock movements when admin marks pending transfer as returned/cancelled
8. **UX polish** — `StockQuantityDisplay` on transfer lists; `STOCK_ADJUSTED` audit formatter; permission save validation
