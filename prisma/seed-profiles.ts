/**
 * Non-destructive profile seeder. Adds/updates the company + owner user only —
 * deletes NOTHING. Safe to run against any database, including production.
 *
 *   DATABASE_URL=... DIRECT_URL=... npx tsx prisma/seed-profiles.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sets the owner password ONLY if they don't already have one (won't clobber a
// password you've since changed). Override the default via SEED_OWNER_PASSWORD.
const DEFAULT_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "hopper2026";

async function main() {
  const companyName = "Macintosh Ales";
  const ownerEmail = "dpullen19@gmail.com";

  // Find-or-create the company (name isn't unique, so we look it up first).
  let company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName, email: ownerEmail },
    });
    console.log(`Created company: ${company.name}`);
  } else {
    console.log(`Company already exists: ${company.name}`);
  }

  // Upsert the owner by unique email — won't duplicate or wipe.
  const existing = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });
  const passwordHash =
    existing?.passwordHash ?? (await bcrypt.hash(DEFAULT_PASSWORD, 10));

  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Dave Pullen", role: "OWNER", companyId: company.id, passwordHash },
    create: {
      name: "Dave Pullen",
      email: ownerEmail,
      role: "OWNER",
      companyId: company.id,
      passwordHash,
    },
  });
  console.log(`Upserted user: ${user.name} <${user.email}> (${user.role})`);
  console.log(
    existing?.passwordHash
      ? "Kept existing password."
      : `Set password to "${DEFAULT_PASSWORD}" — change it after signing in.`
  );
  console.log("Done ✔ (no data deleted)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
