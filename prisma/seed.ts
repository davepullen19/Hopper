import { PrismaClient, type PackageType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * SAFETY GUARD: this seed DELETES ALL DATA before inserting. Refuse to run it
 * against anything that isn't an obviously-local database, unless explicitly
 * forced. This prevents accidentally wiping a production/Neon database.
 *
 * To seed a remote DB on purpose (you will lose its data):
 *   ALLOW_DESTRUCTIVE_SEED=yes npm run db:seed
 */
function assertSafeToSeed() {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal =
    url.includes("@localhost") ||
    url.includes("@127.0.0.1") ||
    url.includes("@0.0.0.0");
  if (!isLocal && process.env.ALLOW_DESTRUCTIVE_SEED !== "yes") {
    console.error(
      "\n✋ Refusing to seed: DATABASE_URL does not look local, and this seed\n" +
        "   DELETES ALL DATA first. If you really mean to wipe and reseed this\n" +
        "   database, re-run with:  ALLOW_DESTRUCTIVE_SEED=yes npm run db:seed\n"
    );
    process.exit(1);
  }
}

async function main() {
  assertSafeToSeed();
  console.log("Clearing existing data…");
  // Delete in dependency order.
  await prisma.stockMovement.deleteMany();
  await prisma.batchEvent.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ---------------- Products (finished SKUs) ----------------
  console.log("Seeding products…");
  // taxableVolumeL = litres of beer per unit charged for duty (firkin/pin use the
  // taxable capacity from the container types; bottles use their fill volume).
  const products: {
    sku: string;
    name: string;
    style: string;
    packageType: PackageType;
    unitSize: string;
    price: number;
    abv: number;
    taxableVolumeL: number;
  }[] = [
    { sku: "BB503", name: "Best Bitter - 500ml Bottle", style: "Best Bitter", packageType: "BOTTLE", unitSize: "500ml", price: 1.8, abv: 4.2, taxableVolumeL: 0.5 },
    { sku: "BB504", name: "Best Bitter - 12 × 500ml Bottle", style: "Best Bitter", packageType: "BOTTLE", unitSize: "12 × 500ml", price: 21.6, abv: 4.2, taxableVolumeL: 6 },
    { sku: "BBFI1", name: "Best Bitter - Firkin", style: "Best Bitter", packageType: "CASK", unitSize: "Firkin (40.9L)", price: 90.0, abv: 4.2, taxableVolumeL: 39.5 },
    { sku: "BBPI2", name: "Best Bitter - Pin", style: "Best Bitter", packageType: "CASK", unitSize: "Pin (20.5L)", price: 45.0, abv: 4.2, taxableVolumeL: 19.75 },
    { sku: "PA307", name: "Pale Ale - 30L Keg", style: "Pale Ale", packageType: "KEG", unitSize: "30L", price: 90.0, abv: 4.5, taxableVolumeL: 30 },
    { sku: "PA508", name: "Pale Ale - 500ml Bottle", style: "Pale Ale", packageType: "BOTTLE", unitSize: "500ml", price: 1.8, abv: 4.5, taxableVolumeL: 0.5 },
    { sku: "PA509", name: "Pale Ale - 12 × 500ml Bottle", style: "Pale Ale", packageType: "BOTTLE", unitSize: "12 × 500ml", price: 21.6, abv: 4.5, taxableVolumeL: 6 },
    { sku: "PAFI5", name: "Pale Ale - Firkin", style: "Pale Ale", packageType: "CASK", unitSize: "Firkin (40.9L)", price: 90.0, abv: 4.5, taxableVolumeL: 39.5 },
    { sku: "PAPI6", name: "Pale Ale - Pin", style: "Pale Ale", packageType: "CASK", unitSize: "Pin (20.5L)", price: 45.0, abv: 4.5, taxableVolumeL: 19.75 },
  ];
  const productBySku: Record<string, string> = {};
  for (const p of products) {
    const created = await prisma.product.create({ data: p });
    productBySku[p.sku] = created.id;
  }

  // ---------------- Inventory: raw ingredients + packaging ----------------
  // Matches the source inventory exactly (all qty 0, no opening stock).
  console.log("Seeding inventory items…");
  const malt1 = await prisma.inventoryItem.create({
    data: { name: "Crushed Extra Pale Malt", type: "RAW", category: "Grain", unitOfMeasure: "kg" },
  });
  const marisOtter = await prisma.inventoryItem.create({
    data: { name: "Maris Otter", type: "RAW", category: "Grain", unitOfMeasure: "kg" },
  });
  const fuggles = await prisma.inventoryItem.create({
    data: { name: "Fuggles", type: "RAW", category: "Hop", unitOfMeasure: "kg" },
  });
  const goldings = await prisma.inventoryItem.create({
    data: { name: "Goldings", type: "RAW", category: "Hop", unitOfMeasure: "kg" },
  });
  const keyworth = await prisma.inventoryItem.create({
    data: { name: "Keyworth Early", type: "RAW", category: "Hop", unitOfMeasure: "kg" },
  });
  await prisma.inventoryItem.create({
    data: { name: "500ml Glass Bottle", type: "PACKAGING", category: "Packaging", unitOfMeasure: "units" },
  });

  // ---------------- Finished goods (one per product, 0 in stock) ----------------
  console.log("Seeding finished-goods records…");
  for (const p of products) {
    await prisma.inventoryItem.create({
      data: {
        name: p.name,
        type: "FINISHED_GOODS",
        category: p.style,
        unitOfMeasure: "units",
        productId: productBySku[p.sku],
      },
    });
  }

  // ---------------- Recipes (inferred from available malts/hops) ----------------
  console.log("Seeding recipes…");
  await prisma.recipe.create({
    data: {
      name: "Best Bitter",
      targetBatchVolume: 800,
      notes: "Inferred recipe — adjust quantities to your brewsheet.",
      ingredients: {
        create: [
          { inventoryItemId: marisOtter.id, quantity: 150 },
          { inventoryItemId: malt1.id, quantity: 20 },
          { inventoryItemId: fuggles.id, quantity: 3 },
          { inventoryItemId: goldings.id, quantity: 2 },
        ],
      },
    },
  });
  await prisma.recipe.create({
    data: {
      name: "Pale Ale",
      targetBatchVolume: 800,
      notes: "Inferred recipe — adjust quantities to your brewsheet.",
      ingredients: {
        create: [
          { inventoryItemId: malt1.id, quantity: 160 },
          { inventoryItemId: marisOtter.id, quantity: 20 },
          { inventoryItemId: keyworth.id, quantity: 3 },
          { inventoryItemId: goldings.id, quantity: 2 },
        ],
      },
    },
  });

  // ---------------- Customers ----------------
  console.log("Seeding customers…");
  const customers: {
    name: string;
    email: string;
    type: string;
    address?: string;
    phone?: string;
  }[] = [
    { name: "107 Wine Shop & Bar", email: "niall@pipclapton.co.uk", type: "Pub/Bar" },
    { name: "A Pint of Hops", email: "marius@apintofhops.co.uk", type: "Pub/Bar", address: "London, W3 6AX" },
    { name: "Abney Park Cafe", email: "accounts@sabelfood.co.uk", type: "Pub/Bar" },
    { name: "All Good Beer", email: "karen@allgoodbeer.co.uk", type: "Pub/Bar" },
    { name: "Ancestrel Wines", email: "laura@ancestrel.com", type: "Pub/Bar" },
    { name: "Auld Shillelagh", email: "info@theauldshillelagh.co.uk", type: "Pub/Bar", address: "London, N16 0UD", phone: "020 7249 5951" },
    { name: "Bruno", email: "accounts@bar-bruno.com", type: "Pub/Bar" },
    { name: "Cadet", email: "cadet@viewpointpartners.co.uk", type: "Pub/Bar" },
    { name: "Cafe Cecilia", email: "accounts@cafececilia.com", type: "Restaurant" },
    { name: "Cafe Deco", email: "hello@cafe-deco.co.uk", type: "Pub/Bar" },
    { name: "Camberwell Arms", email: "camberwellarms@viewpointpartners.co.uk", type: "Pub/Bar" },
    { name: "Coin Laundry", email: "invoices@ulg.co.uk", type: "Pub/Bar", address: "London, EC1R 4QP", phone: "07399 070603" },
  ];
  for (const c of customers) {
    await prisma.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone ?? null,
        address: c.address ?? null,
        notes: c.type,
      },
    });
  }

  // ---------------- Company + team ----------------
  console.log("Seeding company + user…");
  const company = await prisma.company.create({
    data: {
      name: "Macintosh Ales",
      email: "dpullen19@gmail.com",
    },
  });
  await prisma.user.create({
    data: {
      name: "Dave Pullen",
      email: "dpullen19@gmail.com",
      role: "OWNER",
      companyId: company.id,
    },
  });

  console.log("Seed complete ✔");
  console.log(
    `  ${products.length} products · 6 inventory items · ${products.length} finished-goods records · 2 recipes · ${customers.length} customers · 1 company · 1 user`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
