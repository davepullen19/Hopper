import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [company, dbUsers, currentUser] = await Promise.all([
    prisma.company.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        passwordHash: true,
      },
    }),
    getCurrentUser(),
  ]);

  // Never ship the password hash to the client — collapse it to a boolean.
  const users = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    hasPassword: !!u.passwordHash,
  }));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your brewery profile and team."
      />
      <SettingsClient
        company={company}
        users={users}
        currentUserId={currentUser?.id ?? null}
        isAdmin={isAdminRole(currentUser?.role)}
      />
    </div>
  );
}
