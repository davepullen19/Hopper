import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  });
  return (
    <div>
      <PageHeader title="Customers" description="Accounts you sell to." />
      <CustomersClient customers={customers} />
    </div>
  );
}
