"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Company, User } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { Field } from "@/components/form-field";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  companySchema,
  userSchema,
  type CompanyInput,
  type UserInput,
} from "@/lib/validations";
import { humanize } from "@/lib/utils";
import {
  saveCompany,
  createUser,
  updateUser,
  deleteUser,
} from "@/app/actions/settings";

const ROLES = ["OWNER", "ADMIN", "BREWER", "SALES", "VIEWER"] as const;

// ---------------- Company profile ----------------

function CompanyCard({ company }: { company: Company | null }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? "",
      email: company?.email ?? "",
      phone: company?.phone ?? "",
      address: company?.address ?? "",
      dutyRegistrationNumber: company?.dutyRegistrationNumber ?? "",
      notes: company?.notes ?? "",
    },
  });

  async function onSubmit(values: CompanyInput) {
    const res = await saveCompany(company?.id ?? null, values);
    if (res.ok) {
      toast.success("Company profile saved");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <CardDescription>Your brewery&rsquo;s details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Company name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Macintosh Ales" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
          </div>
          <Field label="Address" error={errors.address?.message}>
            <Textarea {...register("address")} rows={2} />
          </Field>
          <Field
            label="HMRC duty registration number"
            hint="Your alcohol producer / approval reference (optional)."
            error={errors.dutyRegistrationNumber?.message}
          >
            <Input {...register("dutyRegistrationNumber")} />
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea {...register("notes")} rows={2} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------- Users / team ----------------

function UserDialog({
  user,
  companyId,
  open,
  onOpenChange,
}: {
  user?: User;
  companyId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "VIEWER",
      companyId: user?.companyId ?? companyId ?? "",
    },
  });

  async function onSubmit(values: UserInput) {
    const res = user
      ? await updateUser(user.id, values)
      : await createUser(values);
    if (res.ok) {
      toast.success(user ? "User updated" : "User added");
      reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Dave Pullen" />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <Input {...register("email")} type="email" placeholder="name@example.com" />
          </Field>
          <Field label="Role" required>
            <Select
              value={watch("role")}
              onValueChange={(v) => setValue("role", v as UserInput["role"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {humanize(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function roleVariant(role: string) {
  if (role === "OWNER") return "default" as const;
  if (role === "ADMIN") return "info" as const;
  return "secondary" as const;
}

function UsersCard({
  users,
  companyId,
}: {
  users: User[];
  companyId: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={roleVariant(row.original.role)}>
          {humanize(row.original.role)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmButton
            title="Remove user?"
            description={`Remove ${row.original.name} from the team.`}
            confirmLabel="Remove"
            successMessage="User removed"
            action={() => deleteUser(row.original.id)}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          User profiles for your brewery (no login — profiles only).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search team…"
          toolbar={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          }
        />
      </CardContent>
      <UserDialog
        companyId={companyId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing && (
        <UserDialog
          user={editing}
          companyId={companyId}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </Card>
  );
}

export function SettingsClient({
  company,
  users,
}: {
  company: Company | null;
  users: User[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CompanyCard company={company} />
      <UsersCard users={users} companyId={company?.id ?? null} />
    </div>
  );
}
