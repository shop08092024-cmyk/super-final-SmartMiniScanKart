# SmartMiniScanKart

A mobile-first POS (Point of Sale) app for small grocery/retail shops. Scan barcodes, manage inventory, checkout customers, track credits, and manage staff — all in one app.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Barcode Scanning**: html5-qrcode
- **Invoices**: html2pdf.js

---

## Quick Start

### 1. Set Up Supabase Database

> **IMPORTANT**: Run `supabase/SETUP_ALL.sql` in your Supabase SQL Editor before starting the app. This creates all tables, indexes, RLS policies, and seeds the plans data.

1. Go to [app.supabase.com](https://app.supabase.com) → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/SETUP_ALL.sql`
4. Click **Run**

### 2. Configure Environment Variables

Copy `.env.local` or `.env` and fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:8080`

---

## Features

### Admin (Shop Owner)
- 📊 Dashboard with daily/monthly sales stats
- 🔍 Barcode scanner + manual product search
- 🛒 Cart with discount, GST, UPI QR code checkout
- 📦 Product management with CSV bulk import/export
- 📋 Order history with invoice download/WhatsApp share
- 👥 Customer management + loyalty points
- 💳 Credits / Pending Payments tracker
- 👨‍💼 Employee management with balance tracking
- 📈 Analytics with revenue charts
- ⚙️ Settings: Shop profile, theme, subscription

### Employee (Staff)
- Dashboard with today's balance/orders summary
- Barcode scan + cart + checkout
- Products & orders (read-only view)
- Customer lookup

---

## Employee Invite Flow

1. Admin adds employee by name + email in **Employees** page
2. Employee signs up at the app URL using that **same email**
3. App automatically detects the employee record and grants staff access

> Note: Employees must use the **exact email** the admin registered for them.

---

## Subscription Plans

| Plan    | Price/month | Products | Orders/month |
|---------|-------------|----------|--------------|
| Free    | ₹0          | 50       | 100          |
| Starter | ₹199        | 500      | 1,000        |
| Pro     | ₹499        | Unlimited| Unlimited    |

New accounts get a **14-day free trial** automatically.

---

## Database Files

| File | Purpose |
|------|---------|
| `supabase/SETUP_ALL.sql` | ✅ **Run this** — Complete setup (all tables, RLS, migrations) |
| `supabase/schema.sql` | Reference schema (informational) |
| `supabase/credits-migration.sql` | Already included in SETUP_ALL.sql |
| `supabase/staff-invite-setup.sql` | Already included in SETUP_ALL.sql |
| `fix-database.sql` | Legacy fix script (superseded by SETUP_ALL.sql) |

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Netlify, Vercel, or any static host.

The `netlify.toml` and `vercel.json` config files are already included.
