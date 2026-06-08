import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  accent?: "default" | "warning" | "success";
}) {
  const body = (
    <Card className={cn("transition-colors", href && "hover:bg-accent/40")}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            accent === "warning" && "bg-amber-100 text-amber-700",
            accent === "success" && "bg-emerald-100 text-emerald-700",
            (!accent || accent === "default") &&
              "bg-secondary text-secondary-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
