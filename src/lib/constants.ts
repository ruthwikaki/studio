
import {
  LayoutDashboard,
  MessageCircle,
  BarChart3,
  Settings,
  Box,
  Boxes,
  Truck,
  ClipboardList,
  Bell,
  Search,
  FilePlus2,
  ListChecks,
  TrendingUp,
  Award,
  Paperclip,
  FileText,
  UploadCloud, // Added for Data Import
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/data-import', label: 'Data Import', icon: UploadCloud },
  { href: '/ai-chat', label: 'AI Assistant', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const APP_NAME = "ARIA";
export const APP_LOGO_ICON = Box;

export const NOTIFICATION_ICON = Bell;
export const GLOBAL_SEARCH_ICON = Search;
export const CREATE_PO_ICON = FilePlus2;
export const RECENT_ACTIVITY_ICON = ListChecks;
export const TURNOVER_CHART_ICON = TrendingUp;
export const TOP_PRODUCTS_ICON = Award;
export const AI_CHAT_ATTACHMENT_ICON = Paperclip;


export const MOCK_INVENTORY_DATA = [
  { id: "SKU001", name: "Blue T-Shirt", category: "Apparel", quantity: 150, unitCost: 12.50, reorderPoint: 50, supplier: "ApparelCo" },
  { id: "SKU002", name: "Wireless Mouse", category: "Electronics", quantity: 80, unitCost: 25.00, reorderPoint: 30, supplier: "TechGadgets" },
  { id: "SKU003", name: "Coffee Beans 1kg", category: "Groceries", quantity: 200, unitCost: 15.00, reorderPoint: 100, supplier: "Global Foods" },
  { id: "SKU004", name: "Yoga Mat", category: "Sports", quantity: 15, unitCost: 30.00, reorderPoint: 20, supplier: "FitLife Inc." },
];

export const MOCK_INVENTORY_JSON_STRING = JSON.stringify(MOCK_INVENTORY_DATA, null, 2);
