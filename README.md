# BrewOps 🍺

A lean brewery **production + inventory** MVP. Not an ERP — it does production
batches, inventory, finished goods and sales orders, and nothing else.

**Core principle:** every operational action creates either a **batch event** or
a **stock movement**. Inventory quantity is never changed silently — every change
is an immutable `StockMovement` row, and the cached `currentQuantity` is updated
in the same transaction.

## Stack

- **Next.js (App Router)** + **TypeScript**, React Server Components + **Server Actions**
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **React Hook Form** + **Zod** for forms & validation
- **TanStack Table** for admin tables
- Vercel-ready

## Features

| Area | What it does |
|------|--------------|
| **Dashboard** | Active batches, low inventory, finished goods available, orders awaiting stock, recent movements |
| **Products** | CRUD — name, style, SKU, package type, unit size, active flag |
| **Recipes** | CRUD — linked product, target volume, ingredient lines with quantities |
| **Inventory** | Raw / packaging / finished goods. Manual stock movements. Low-stock flags |
| **Stock Movements** | Immutable ledger with type/quantity/reference filters |
| **Batches** | CRUD + actions: start, consume ingredients (scaled by recipe), change status, record yield, package into finished goods, add note — each writes a batch event |
| **Customers** | CRUD |
| **Orders** | CRUD + actions: confirm, allocate stock, fulfill, cancel. Allocation removes finished goods via stock movements; cancelling returns them |

## Getting started (local)

### 1. Prerequisites
- Node.js 18+ (tested on Node 20/25)
- A PostgreSQL database

Quick local Postgres with Docker:

```bash
docker run --name brewops-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=brewops -p 5432:5432 -d postgres:16
```

### 2. Install & configure

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL if needed
```

`.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brewops?schema=public"
```

### 3. Create the schema & seed

```bash
npm run db:push     # push the Prisma schema to the database
npm run db:seed     # load example brewery data
```

> Prefer migrations? Use `npm run db:migrate` instead of `db:push`.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

### Handy scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:push` | Sync schema to DB (no migration history) |
| `npm run db:migrate` | Create & apply a dev migration |
| `npm run db:seed` | Seed example data |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run db:studio` | Open Prisma Studio |

## Data model

10 models, all in `prisma/schema.prisma`:

`Product` · `Recipe` · `RecipeIngredient` · `InventoryItem` · `StockMovement` ·
`Batch` · `BatchEvent` · `Customer` · `Order` · `OrderLineItem`

**Inventory accounting.** `StockMovement.quantity` is a **signed delta** applied
to `InventoryItem.currentQuantity`. The sum of an item's movement quantities
equals its current quantity, so the ledger is the source of truth and the cached
quantity is just a fast read. The single helper `recordMovement()`
(`src/lib/inventory.ts`) is the only code path that mutates inventory, always
inside a transaction.

Movement sign rules:
- **In (+):** `PURCHASE`, `RETURN`, `PRODUCE`
- **Out (−):** `CONSUME`, `PACKAGE`, `ALLOCATE`
- **`ADJUSTMENT`:** signed exactly as entered (can be + or −)

## Project structure

```
prisma/
  schema.prisma        # all 10 models
  seed.ts              # example brewery data
src/
  app/
    page.tsx           # dashboard
    products/ recipes/ inventory/ stock-movements/
    batches/  batches/[id]/        # list + detail with actions
    customers/ orders/ orders/[id]/
    actions/           # server actions per domain
  components/
    ui/                # shadcn/ui primitives
    layout/app-shell   # sidebar + mobile nav
    data-table, page-header, status-badge, ...
  lib/
    db.ts              # Prisma client singleton
    inventory.ts       # recordMovement() + signedDelta()
    validations.ts     # Zod schemas (mirror Prisma enums)
    action-result.ts, utils.ts, nav.ts
```

## Deploying to Vercel

1. Push this repo to GitHub/GitLab.
2. **Provision Postgres** — Vercel Postgres, Neon, or Supabase all work.
3. In the Vercel project, set environment variables:
   - `DATABASE_URL` — your connection string.
   - `DIRECT_URL` *(only if your provider uses a connection pooler, e.g. Neon/Supabase)* —
     the non-pooled URL. Then uncomment `directUrl` in `prisma/schema.prisma`.
4. **Build command:** the default `npm run build` already runs `prisma generate`.
5. **Apply the schema** to the production DB once, from your machine pointed at the
   prod `DATABASE_URL`:
   ```bash
   npx prisma migrate deploy   # if using migrations
   # or
   npx prisma db push          # if using db push
   npm run db:seed             # optional: demo data
   ```
   (Or run these in a Vercel deploy/post-deploy step.)
6. Deploy. Pages are `force-dynamic`, so they render per-request against the DB.

## Notes & deliberate non-goals

There is **no authentication** — this is a single-tenant internal admin demo.
Add auth (e.g. Auth.js) before exposing it publicly.

Explicitly **out of scope** (by design): accounting, tax/duty reporting, delivery
routing, CRM automation, third-party integrations, AI features, multi-tenant SaaS,
and payments.

See [`TODO.md`](./TODO.md) for the future-features backlog.
