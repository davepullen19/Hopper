import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description="Sellable SKUs — what you package and ship."
      />
      <ProductsClient products={products} />
    </div>
  );
}
