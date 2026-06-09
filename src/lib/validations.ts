import { z } from "zod";

// Mirror the Prisma enums so client + server validation stay in lockstep.
export const PackageTypeEnum = z.enum(["KEG", "CASK", "CAN", "BOTTLE", "DRAFT"]);
export const InventoryTypeEnum = z.enum([
  "RAW",
  "PACKAGING",
  "FINISHED_GOODS",
]);
export const MovementTypeEnum = z.enum([
  "PURCHASE",
  "CONSUME",
  "PRODUCE",
  "PACKAGE",
  "ADJUSTMENT",
  "ALLOCATE",
  "RETURN",
]);
export const BatchStatusEnum = z.enum([
  "PLANNED",
  "BREWED",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGED",
  "COMPLETE",
  "DUMPED",
]);
export const OrderStatusEnum = z.enum([
  "DRAFT",
  "CONFIRMED",
  "ALLOCATED",
  "FULFILLED",
  "CANCELLED",
]);

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// ---------- Product ----------
export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  style: z.string().trim().min(1, "Style is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  packageType: PackageTypeEnum,
  unitSize: z.string().trim().min(1, "Unit size is required"),
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, "Price cannot be negative").optional()
  ),
  abv: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(100, "ABV must be 0–100").optional()
  ),
  taxableVolumeL: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Taxable volume must be > 0").optional()
  ),
  active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

// ---------- Recipe ----------
export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1, "Ingredient is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: optionalString,
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  productId: optionalString,
  targetBatchVolume: z.coerce
    .number()
    .positive("Target batch volume must be greater than 0"),
  notes: optionalString,
  ingredients: z.array(recipeIngredientSchema).default([]),
});
export type RecipeInput = z.infer<typeof recipeSchema>;

// ---------- Inventory ----------
export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: InventoryTypeEnum,
  category: z.string().trim().min(1, "Category is required"),
  unitOfMeasure: z.string().trim().min(1, "Unit of measure is required"),
  // currentQuantity is set as an opening balance on create (creates an ADJUSTMENT
  // movement) and is otherwise read-only — change it via stock movements.
  openingQuantity: z.coerce.number().min(0).default(0),
  reorderThreshold: z.coerce.number().min(0).default(0),
  supplier: optionalString,
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const inventoryItemUpdateSchema = inventoryItemSchema.omit({
  openingQuantity: true,
});
export type InventoryItemUpdateInput = z.infer<
  typeof inventoryItemUpdateSchema
>;

// ---------- Stock movement (manual) ----------
export const stockMovementSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item is required"),
  type: MovementTypeEnum,
  // Magnitude entered by the user; sign is derived from the movement type.
  quantity: z.coerce.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  notes: optionalString,
});
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

// ---------- Batch ----------
export const batchSchema = z.object({
  code: z.string().trim().min(1, "Batch code is required"),
  name: z.string().trim().min(1, "Name is required"),
  recipeId: optionalString,
  productId: optionalString,
  plannedVolume: z.coerce.number().positive("Planned volume must be > 0"),
  vessel: optionalString,
  brewDate: optionalString,
  notes: optionalString,
});
export type BatchInput = z.infer<typeof batchSchema>;

export const batchStatusUpdateSchema = z.object({
  batchId: z.string().min(1),
  status: BatchStatusEnum,
  notes: optionalString,
});

export const batchYieldSchema = z.object({
  batchId: z.string().min(1),
  actualVolume: z.coerce.number().positive("Actual volume must be > 0"),
});

export const batchPackageSchema = z.object({
  batchId: z.string().min(1),
  productId: z.string().min(1, "Choose a finished-goods product"),
  units: z.coerce.number().int().positive("Units must be a positive integer"),
  packagingItemId: optionalString,
  packagingPerUnit: z.coerce.number().min(0).default(1),
  notes: optionalString,
});

export const batchNoteSchema = z.object({
  batchId: z.string().min(1),
  notes: z.string().trim().min(1, "Note is required"),
});

// ---------- Customer ----------
export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contactName: optionalString,
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: optionalString,
  address: optionalString,
  notes: optionalString,
});
export type CustomerInput = z.infer<typeof customerSchema>;

// ---------- Order ----------
export const orderLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be > 0"),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  requestedDeliveryDate: optionalString,
  notes: optionalString,
  lineItems: z
    .array(orderLineItemSchema)
    .min(1, "Add at least one line item"),
});
export type OrderInput = z.infer<typeof orderSchema>;

// ---------- Company ----------
export const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: optionalString,
  address: optionalString,
  dutyRegistrationNumber: optionalString,
  notes: optionalString,
});
export type CompanyInput = z.infer<typeof companySchema>;

// ---------- User ----------
export const UserRoleEnum = z.enum([
  "OWNER",
  "ADMIN",
  "BREWER",
  "SALES",
  "VIEWER",
]);

export const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  role: UserRoleEnum,
  companyId: optionalString,
});
export type UserInput = z.infer<typeof userSchema>;

// ---------- Auth ----------
export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

// Shared password rule for setting/changing credentials.
const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

// Admin sets/resets another user's password.
export const setPasswordSchema = z.object({
  password: passwordField,
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

// A signed-in user changes their own password.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
