/**
 * Non-destructive profile seeder. Adds/updates the company + owner user only —
 * deletes NOTHING. Safe to run against any database, including production.
 *
 *   DATABASE_URL=... DIRECT_URL=... npx tsx prisma/seed-profiles.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // Upsert the owner user by unique email — won't duplicate or wipe.
  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Dave Pullen", role: "OWNER", companyId: company.id },
    create: {
      name: "Dave Pullen",
      email: ownerEmail,
      role: "OWNER",
      companyId: company.id,
    },
  });
  console.log(`Upserted user: ${user.name} <${user.email}> (${user.role})`);
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
