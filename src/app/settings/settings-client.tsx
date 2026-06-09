"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { Company } from "@prisma/client";

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
  DialogDescription,
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
  setPasswordSchema,
  changePasswordSchema,
  type CompanyInput,
  type UserInput,
  type SetPasswordInput,
  type ChangePasswordInput,
} from "@/lib/validations";
import { humanize } from "@/lib/utils";
import {
  saveCompany,
  createUser,
  updateUser,
  deleteUser,
  setUserPassword,
  changeOwnPassword,
} from "@/app/actions/settings";

const ROLES = ["OWNER", "ADMIN", "BREWER", "SALES", "VIEWER"] as const;

// Team member as sent from the server: no password hash, just a flag for
// whether one is set (i.e. whether the user can sign in).
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: (typeof ROLES)[number];
  companyId: string | null;
  hasPassword: boolean;
};

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

// ---------------- Change my password ----------------

function ChangePasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const res = await changeOwnPassword(values);
    if (res.ok) {
      toast.success("Password changed");
      reset();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your password</CardTitle>
        <CardDescription>Change the password you sign in with.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field
            label="Current password"
            required
            error={errors.currentPassword?.message}
          >
            <Input
              {...register("currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          </Field>
          <Field
            label="New password"
            hint="At least 8 characters."
            required
            error={errors.newPassword?.message}
          >
            <Input
              {...register("newPassword")}
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Confirm new password"
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Change password"}
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
  user?: TeamMember;
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

function SetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: TeamMember;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: SetPasswordInput) {
    const res = await setUserPassword(user.id, values);
    if (res.ok) {
      toast.success(`Password set for ${user.name}`);
      reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user.hasPassword ? "Reset password" : "Set password"}
          </DialogTitle>
          <DialogDescription>
            {user.hasPassword
              ? `Set a new sign-in password for ${user.name}.`
              : `Give ${user.name} a password so they can sign in.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field
            label="New password"
            hint="At least 8 characters. Share it with them securely."
            required
            error={errors.password?.message}
          >
            <Input
              {...register("password")}
              type="password"
              autoComplete="new-password"
            />
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
              {isSubmitting ? "Saving…" : "Save password"}
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
  isAdmin,
  currentUserId,
}: {
  users: TeamMember[];
  companyId: string | null;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [settingPasswordFor, setSettingPasswordFor] =
    useState<TeamMember | null>(null);

  const columns: ColumnDef<TeamMember>[] = [
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
      accessorKey: "hasPassword",
      header: "Login",
      cell: ({ row }) =>
        row.original.hasPassword ? (
          <Badge variant="success">Can sign in</Badge>
        ) : (
          <Badge variant="muted">No login</Badge>
        ),
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={row.original.hasPassword ? "Reset password" : "Set password"}
            onClick={() => setSettingPasswordFor(row.original)}
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit user"
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.original.id !== currentUserId && (
            <ConfirmButton
              title="Remove user?"
              description={`Remove ${row.original.name} from the team.`}
              confirmLabel="Remove"
              successMessage="User removed"
              action={() => deleteUser(row.original.id)}
              trigger={
                <Button variant="ghost" size="icon" title="Remove user">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
            />
          )}
        </div>
      ),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Manage your brewery's users and their sign-in passwords."
            : "User profiles for your brewery."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search team…"
          toolbar={
            isAdmin ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add user
              </Button>
            ) : undefined
          }
        />
      </CardContent>
      {isAdmin && (
        <>
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
          {settingPasswordFor && (
            <SetPasswordDialog
              user={settingPasswordFor}
              open={!!settingPasswordFor}
              onOpenChange={(o) => !o && setSettingPasswordFor(null)}
            />
          )}
        </>
      )}
    </Card>
  );
}

export function SettingsClient({
  company,
  users,
  currentUserId,
  isAdmin,
}: {
  company: Company | null;
  users: TeamMember[];
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CompanyCard company={company} />
      <UsersCard
        users={users}
        companyId={company?.id ?? null}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
      <ChangePasswordCard />
    </div>
  );
}
