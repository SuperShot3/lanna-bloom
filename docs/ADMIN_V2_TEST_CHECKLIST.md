# Admin Dashboard v2 — Manual Test Checklist

## Prerequisites

- Supabase configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Dual-write enabled (`SUPABASE_DUAL_WRITE_ENABLED=true`) so orders exist in Supabase
- `ORDERS_ADMIN_SECRET` set for admin auth

## Test Flow

### 1. Login

- [ ] Go to `http://localhost:3000/admin-v2`
- [ ] Enter wrong secret → see "Invalid secret" message
- [ ] Enter correct secret → redirect to `/admin-v2/orders`

### 2. Orders list

- [ ] Orders table displays: created_at, order_id, status, payment, total, delivery_date, window, district, recipient
- [ ] Click order_id → navigates to detail page
- [ ] "Legacy admin" link goes to `/admin/orders`
- [ ] "Log out" clears session and redirects to login

### 3. Search

- [ ] Search by order_id (partial match) → filters results
- [ ] Search by recipient_phone (partial match) → filters results
- [ ] Click "Search" → URL updates, results refresh

### 4. Filters

- [ ] "Show filters" expands filter panel
- [ ] Status dropdown: All, NEW, PAID, etc. → filters
- [ ] Payment: All / Paid / Unpaid → filters
- [ ] District dropdown → filters
- [ ] "Today" / "Tomorrow" → filters by delivery_date
- [ ] Custom date range → filters

### 5. Pagination

- [ ] With 20+ orders: "Previous" / "Next" work
- [ ] Page info shows "Page X of Y"
- [ ] Changing filters resets to page 1

### 6. Order detail

- [ ] Order summary: order_id, created, status, payment, totals
- [ ] Items list: image (if present), name, size, price
- [ ] Delivery: date, window, address, maps link (if present)
- [ ] Recipient: name, phone
- [ ] Driver section (if data exists)
- [ ] Notes (if internal_notes exists)
- [ ] Status history timeline (if data exists)
- [ ] "View public page" opens `/order/[order_id]` in new tab
- [ ] "Back to orders" returns to list

### 7. Error states

- [ ] Supabase not configured → friendly error on list
- [ ] Order not found → 404 / not-found view
- [ ] Invalid order_id in URL → not-found

### 8. Mobile

- [ ] Table scrolls horizontally on small screens
- [ ] Filters wrap and remain usable
- [ ] Buttons and links are tappable

### 9. Legacy unchanged

- [ ] `/admin/orders` still works (legacy admin)
- [ ] Checkout flow unchanged
- [ ] Customer order details page unchanged
