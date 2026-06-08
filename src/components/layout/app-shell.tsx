"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Beer, LogOut } from "lucide-react";

import { cn, humanize } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-6 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Beer className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold">Hopper</div>
        <div className="text-xs text-muted-foreground">Brewery operations</div>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  if (!user) return null;
  return (
    <div className="border-t px-4 py-3">
      <div className="mb-2 px-2">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {user.email}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {humanize(user.role)}
          {user.company ? ` · ${user.company.name}` : ""}
        </div>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </form>
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: CurrentUser;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth pages render without the app chrome.
  if (pathname === "/sign-in") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Brand />
          <div className="flex-1 overflow-y-auto pb-6">
            <NavLinks />
          </div>
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-card">
            <div className="flex items-center justify-between">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <UserMenu user={user} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Hopper</span>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
