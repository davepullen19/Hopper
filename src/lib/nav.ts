import {
  LayoutDashboard,
  Beer,
  ClipboardList,
  Boxes,
  ArrowLeftRight,
  FlaskConical,
  Users,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Beer },
  { href: "/recipes", label: "Recipes", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/stock-movements", label: "Stock Movements", icon: ArrowLeftRight },
  { href: "/batches", label: "Batches", icon: FlaskConical },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
];
