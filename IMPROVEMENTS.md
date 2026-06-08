# SmartMiniScanKart — Improvements & Bug Fixes

## 🐛 Bugs Fixed

### 1. Missing Database Columns (Critical)
**Problem**: Checkout was failing with 400 errors because `orders` and `products` tables were missing required columns.

**Fix**: Updated `supabase/SETUP_ALL.sql` with all missing column migrations:
- `orders.order_number` — readable order ID
- `orders.payment_status` — payment tracking
- `orders.razorpay_order_id` / `razorpay_payment_id` — online payment tracking
- `orders.notes` — NEW: per-order notes
- `products.mrp` — Maximum Retail Price (for discount display)
- `products.sold_quantity` — inventory tracking
- `products.barcode` index — faster barcode lookups
- `customers.phone` index — faster customer lookups

**Action required**: Run `supabase/SETUP_ALL.sql` in Supabase SQL Editor.

### 2. Customer Management — No Edit or Delete
**Problem**: Customers could be added but never edited or deleted. Duplicate phone numbers would cause silent failures.

**Fix**: Full CRUD for customers:
- Edit customer (name, phone, email) with duplicate-phone guard
- Delete customer with confirmation dialog
- `updateCustomer` and `deleteCustomer` added to `useStore`

### 3. Orders — No Date/Payment Filtering
**Problem**: Orders page had only a search box — no way to filter by date range or payment method.

**Fix**: Added filter chips:
- Date: All Time / Today / This Week / This Month
- Payment: All / Cash / UPI / Card
- Filtered revenue total shown at top

### 4. Orders — Notes Not Displayed
**Problem**: Order notes field existed in schema but wasn't wired up in CartPage or displayed in OrderDetailModal.

**Fix**: Notes field in checkout dialog → saved to DB → shown in order detail.

## ✨ New Features

### Dashboard Improvements
- **Trend arrows** (↑↓) comparing today vs yesterday and month vs last month
- **Stock Alert section** — out-of-stock and low-stock items shown inline
- **Quick Scan CTA button** — prominent scan-to-bill shortcut
- **Recent Orders** — last 5 orders with one-tap navigation
- **Employee Summary** — only shows active employees with today's stats

### Customers Page Improvements
- **Top Customers** — top 3 by total spend shown at top (quick VIP view)
- **Average order value** badge per customer
- **Edit & Delete** with confirmation
- **Email search** — searches by email too, not just name/phone

### Orders Page Improvements
- **Date filter chips** — Today / This Week / This Month / All Time
- **Payment filter chips** — Cash / UPI / Card
- **Filtered revenue total** updates dynamically
- **Discount display** on order cards
- **Product search** — search by product name inside orders

### Cart / Checkout Improvements
- **Order Notes field** — add per-order notes (delivery instructions, etc.)
- Notes stored in DB and shown in order detail

### Store / Data Layer
- `searchProducts(query)` — search across name, barcode, category
- `updateCustomer(id, patch)` — edit customer details
- `deleteCustomer(id)` — remove customer
- `checkout(... notes)` — notes parameter added

## 🗃️ Database Migration Required

Run `supabase/SETUP_ALL.sql` in your Supabase SQL Editor to apply all schema changes before deploying.

Key additions:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
```
