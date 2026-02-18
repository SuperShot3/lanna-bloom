# Admin Dashboard v2 — Manual Test Checklist

## Prerequisites

- Supabase configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Dual-write enabled (`SUPABASE_DUAL_WRITE_ENABLED=true`) so orders exist in Supabase
- `AUTH_SECRET` set for NextAuth
- Admin user seeded: `ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... npm run seed-admin`
- Run migration: `supabase/migrations/20250218100000_admin_users_audit_logs.sql`

## Test Flow

### 1. Login

- [ ] Go to `http://localhost:3000/admin-v2`
- [ ] Redirects to `/admin-v2/login`
- [ ] Enter wrong email/password → see "Invalid email or password" message
- [ ] Enter correct credentials → redirect to `/admin-v2/overview`

### 2. Overview

- [ ] Overview page shows today stats: total orders, paid orders, revenue, profit, profit coverage
- [ ] "Needs attention" section lists orders (if any)
- [ ] "Orders" link goes to `/admin-v2/orders`

### 3. Orders list

- [ ] Orders table displays: created_at, order_id, status, payment, total, delivery_date, window, district, recipient
- [ ] Click order_id → navigates to detail page
- [ ] "Legacy admin" link goes to `/admin/orders`
- [ ] "Log out" clears session and redirects to login

### 4. Search

- [ ] Search by order_id (partial match) → filters results
- [ ] Search by recipient_phone (partial match) → filters results
- [ ] Click "Search" → URL updates, results refresh

### 5. Filters

- [ ] "Show filters" expands filter panel
- [ ] Status dropdown: All, NEW, PAID, etc. → filters
- [ ] Payment: All / Paid / Unpaid → filters
- [ ] District dropdown → filters
- [ ] "Today" / "Tomorrow" → filters by delivery_date
- [ ] Custom date range → filters

### 6. Pagination

- [ ] With 20+ orders: "Previous" / "Next" work
- [ ] Page info shows "Page X of Y"
- [ ] Changing filters resets to page 1

### 7. Order detail

- [ ] Order summary: order_id, created, status, payment, totals
- [ ] Items list: image (if present), name, size, price
- [ ] Delivery: date, window, address, maps link (if present)
- [ ] Recipient: name, phone
- [ ] Driver section (if data exists)
- [ ] Notes (if internal_notes exists)
- [ ] Status history timeline (if data exists)
- [ ] "View public page" opens `/order/[order_id]` in new tab
- [ ] "Back to orders" returns to list

### 8. Error states

- [ ] Supabase not configured → friendly error on list
- [ ] Order not found → 404 / not-found view
- [ ] Invalid order_id in URL → not-found

### 9. Mobile

- [ ] Table scrolls horizontally on small screens
- [ ] Filters wrap and remain usable
- [ ] Buttons and links are tappable

### 10. Export CSV

- [ ] "Export CSV" button on orders list downloads CSV with current filters
- [ ] CSV contains order columns (order_id, customer_name, etc.)

### 11. Legacy unchanged

- [ ] `/admin/orders` still works (legacy admin)
- [ ] Checkout flow unchanged
- [ ] Customer order details page unchanged

---

## Phase 2: Costs & Profit

### 12. Costs card

- [ ] Open `/admin-v2/orders/[order_id]`
- [ ] "Costs & Profit" card shows COGS, Delivery cost, Payment fee inputs
- [ ] Total displays (from total_amount or grand_total)
- [ ] Profit = Total - COGS - Delivery cost - Payment fee (nulls as 0)
- [ ] "Costs not set" warning when all costs are empty

### 13. Save costs

- [ ] Edit COGS, click Save → success message, page refreshes, values persist
- [ ] Save button disabled until a value changes
- [ ] Loading state ("Saving…") while saving
- [ ] "Costs last updated" shows updated_at timestamp after save

### 14. Validation

- [ ] Negative number → rejected with error message
- [ ] Non-numeric text → rejected
- [ ] Empty fields allowed (saves as null)

### 15. Error handling

- [ ] Supabase down / network error → clear error message, no crash
- [ ] Unauthorized (no cookie) → 401

### 16. RBAC (OWNER/MANAGER/SUPPORT)

- [ ] OWNER/MANAGER: can edit costs on order detail
- [ ] SUPPORT: costs card is read-only (no inputs, no Save button)

### 17. Legacy unchanged

- [ ] Legacy checkout and legacy admin still work
