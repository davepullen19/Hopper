# Hopper — future features

Backlog for after the MVP. Ordered roughly by value-to-effort. Kept deliberately
out of the MVP to stay lean.

## Near-term (rounding out the MVP)

- [ ] **Auth & users** — Auth.js (email/password or SSO), per-user audit trail
      (`createdBy` on movements/events).
- [ ] **Edit recipe/order safety** — block edits that would invalidate batches
      already brewed from a recipe; version recipes instead of overwriting.
- [ ] **Stock availability vs. allocated** — track "on hand" vs "available"
      separately so allocation reserves rather than removes (currently ALLOCATE
      decrements stock directly; RETURN on cancel adds it back).
- [ ] **Negative stock guard** — optional setting to block CONSUME/ALLOCATE that
      would push an item below zero.
- [ ] **Batch → finished-goods traceability** — surface "which orders shipped from
      which batch" via the existing movement `batchId`/`orderId` links.
- [ ] **CSV export** on every data table; CSV import for inventory + products.
- [ ] **Dashboard date range** and simple production/sales trend charts.

## Medium-term

- [ ] **Purchase orders & receiving** — formalize PURCHASE movements behind a PO
      workflow with expected vs received quantities.
- [ ] **Recipe costing** — cost per ingredient → cost per batch → cost per unit.
- [ ] **Fermentation tracking** — gravity/temperature readings as batch events,
      plotted on the batch timeline.
- [ ] **Tank/vessel management** — vessel occupancy calendar, capacity checks.
- [ ] **Lot / best-before tracking** on finished goods.
- [ ] **Partial fulfilment & backorders** for orders.
- [ ] **Soft deletes / archiving** instead of hard deletes.

## Nice-to-have

- [ ] Barcode/QR scanning for stock counts.
- [ ] Email notifications for low stock and order status changes.
- [ ] Role-based permissions (brewer / sales / admin).
- [ ] Dark mode toggle (theme tokens already in place).
- [ ] Optimistic UI updates on actions.
- [ ] Unit/integration tests around `recordMovement` and the order allocation flow.

## Explicit non-goals (do not build)

Accounting · tax/duty reporting · delivery routing · CRM automation · third-party
integrations · AI features · multi-tenant SaaS · Stripe/payments.
