import Link from "next/link";
import { Landmark, AlertTriangle } from "lucide-react";

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  calcDuty,
  isDraughtPackage,
  ratePerLpa,
  SPR_DISCOUNT_PCT,
  DUTY_RATES_EFFECTIVE,
} from "@/lib/duty";

export const dynamic = "force-dynamic";

export default async function DutyPage() {
  const [records, products] = await Promise.all([
    prisma.dutyRecord.findMany({
      orderBy: { dutyPointDate: "desc" },
      include: {
        product: { select: { name: true } },
        batch: { select: { id: true, code: true } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Current calendar month boundaries.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = records.filter(
    (r) => new Date(r.dutyPointDate) >= monthStart
  );

  const sum = (arr: typeof records, key: "dutyAmount" | "lpaTotal") =>
    arr.reduce((s, r) => s + r[key], 0);

  const monthLabel = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Alcohol Duty"
        description={`UK beer duty owed at the point of packaging. Rates effective ${DUTY_RATES_EFFECTIVE}.`}
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Estimate to support your HMRC Alcohol Duty Return — <strong>not tax
          advice</strong>. Draught Relief is applied to kegs/casks (containers ≥
          20 L). Small Producer Relief is modelled as a flat{" "}
          {SPR_DISCOUNT_PCT}% discount (edit in <code>src/lib/duty.ts</code>);
          verify your eligibility and the live rates with HMRC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Duty this month (${monthLabel})`}
          value={formatCurrency(sum(monthRecords, "dutyAmount"))}
          icon={Landmark}
          accent="warning"
        />
        <StatCard
          label="LPA this month"
          value={formatNumber(sum(monthRecords, "lpaTotal"))}
          icon={Landmark}
        />
        <StatCard
          label="Duty all-time"
          value={formatCurrency(sum(records, "dutyAmount"))}
          icon={Landmark}
        />
        <StatCard
          label="Duty points recorded"
          value={records.length}
          icon={Landmark}
        />
      </div>

      {/* Recorded duty ledger — the figures for your return */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recorded duty points</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No duty recorded yet. Duty is logged automatically when you{" "}
              <strong>package a batch into a product</strong> (the duty point).
              Set ABV + taxable volume on your products first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duty point</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">ABV</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">LPA</TableHead>
                  <TableHead className="text-right">Rate (£/LPA)</TableHead>
                  <TableHead className="text-right">Duty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.dutyPointDate)}
                    </TableCell>
                    <TableCell>
                      {r.batch ? (
                        <Link
                          href={`/batches/${r.batch.id}`}
                          className="hover:underline"
                        >
                          {r.batch.code}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.product.name}</TableCell>
                    <TableCell className="text-right">{r.units}</TableCell>
                    <TableCell className="text-right">{r.abv}%</TableCell>
                    <TableCell>
                      <Badge variant={r.draught ? "info" : "muted"}>
                        {r.draught ? "Draught" : "Non-draught"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(r.lpaTotal, 3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(r.effectiveRate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.dutyAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Live per-product duty (no packaging needed to see this) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Duty per product (current rates)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">ABV</TableHead>
                <TableHead className="text-right">Taxable vol (L)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">LPA / unit</TableHead>
                <TableHead className="text-right">Rate (£/LPA)</TableHead>
                <TableHead className="text-right">Duty / unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                if (p.abv == null || p.taxableVolumeL == null) {
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground"
                      >
                        Set ABV + taxable volume on this product to calculate
                        duty.
                      </TableCell>
                    </TableRow>
                  );
                }
                const draught = isDraughtPackage(p.packageType);
                const d = calcDuty({
                  abv: p.abv,
                  volumePerUnitL: p.taxableVolumeL,
                  units: 1,
                  draught,
                  sprDiscountPct: SPR_DISCOUNT_PCT,
                });
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.abv}%</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(p.taxableVolumeL)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={draught ? "info" : "muted"}>
                        {draught ? "Draught" : "Non-draught"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(d.lpaPerUnit, 3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(ratePerLpa(p.abv, draught))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(d.dutyPerUnit)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
