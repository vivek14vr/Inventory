# User Guide — SV Enterprises Inventory System

## Who uses what

| Role | Access |
|------|--------|
| **Admin** | Full system: master data, inventory, imports, reports, users, audit log |
| **Warehouse user** | Stock operations (in/out), pending transfers, warehouse inventory for assigned location |

Warehouses: **Vasai** and **Goregaon**.

---

## Signing in

1. Open the application URL (e.g. `http://localhost:3000/login`).
2. Enter your email and password.
3. You are redirected to the Admin panel or Warehouse dashboard based on your role.

Demo accounts (development only — change passwords in production):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inventory.local | Admin@123 |
| Vasai | vasai@inventory.local | Vasai@123 |
| Goregaon | goregaon@inventory.local | Goregaon@123 |

---

## Warehouse users

### Stock operations

One screen with two tabs: **Stock in** and **Stock out**.

**Stock in** — when goods arrive (purchases, production). Select brand → product → quantity, then submit.

**Stock out** — two dispatch types:

| Type | When to use |
|------|-------------|
| **Direct Selling** | Sale to a client — enter client name and invoice number |
| **Transfer** | Send stock to the other warehouse — select destination |

The system checks available quantity before allowing stock out.

**Admin:** Sidebar → **Stock** (`/admin/stock`). Pick warehouse, then use the in/out tabs.

**Warehouse user:** Sidebar → **Stock** (`/warehouse/stock`).

To receive an inter-warehouse transfer, use **Transfers** (warehouse) or **Receive** (admin) — not the stock in tab unless adding manual receipt.

### Transfers

- **Sending (e.g. Vasai):** Stock → Stock out tab → Transfer → choose Goregaon.
- **Receiving (Goregaon):** **Transfers** → Receive stock (or admin **Receive**).

### My inventory

View current balances for products at your warehouse.

---

## Admin

### Master data

- **Warehouses** — locations (Vasai, Goregaon).
- **Brands** — product brands.
- **Products** — each product belongs to one brand; name + brand must be unique.

### Inventory dashboard

- Totals across warehouses
- Recent movements
- Low stock list (default threshold: 10 units)
- **Update stock:** On **Inventory → Current stock**, use **Update** on any row to set quantity (requires a reason; logged in audit and movements)

### Tally import

1. Go to **Tally Import**.
2. Select warehouse and upload Excel (columns: Product, Brand, Quantity).
3. Review per-row results; successful rows deduct stock from the selected warehouse.

### Reports

Generate stock, movement, transfer, and sales reports. Use filters (date, warehouse, brand, etc.). Download **CSV** via the export button (`?format=csv`).

### Users

Create warehouse users and assign them to Vasai or Goregaon. Deactivate users instead of deleting when they leave.

### Audit log

View who did what and when. Filter by user, action, entity, or date range. Use this for accountability and troubleshooting.

### Transfer history

All inter-warehouse transfers with status (pending, received, cancelled).

For **pending** transfers, admins can:

- **Receive** — add stock at the destination and mark the transfer received
- **Cancel** — restore stock at the source warehouse and mark cancelled

---

## Business rules (quick reference)

- Inventory identity = **Product name + Brand name**.
- Stock Out never allows quantity above on-hand balance.
- Transfers reduce source warehouse immediately; destination increases only after receive (Stock In).
- Tally import deducts inventory — treat uploads as confirmed dispatches.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Cannot log in | Confirm email/password; ask Admin to reset; ensure database is seeded |
| “Insufficient stock” | Check warehouse inventory; verify product/brand selection |
| API / network error | Ensure backend is running; check `NEXT_PUBLIC_API_URL` |
| Blank or invisible text | Hard refresh; app uses light theme only |

For technical setup, see the root [README.md](../README.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
