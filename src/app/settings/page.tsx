import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [company, users] = await Promise.all([
    prisma.company.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your brewery profile and team."
      />
      <SettingsClient company={company} users={users} />
    </div>
  );
}
