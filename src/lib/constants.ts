import {
  LayoutDashboard,
  UploadCloud,
  MessageCircle,
  BarChart3,
  ShoppingCart,
  Settings,
  Box,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchSegments?: number; // Number of path segments to match for active state
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, matchSegments: 1 },
  { href: '/data-import', label: 'Data Import', icon: UploadCloud, matchSegments: 1 },
  { href: '/ai-chat', label: 'AI Assistant', icon: MessageCircle, matchSegments: 1 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, matchSegments: 1 },
  { href: '/reordering', label: 'Reordering', icon: ShoppingCart, matchSegments: 1 },
];

export const APP_NAME = "SupplyChainAI";
export const APP_LOGO_ICON = Box;

// Mock data for inventory items for AI Chat placeholder
export const MOCK_INVENTORY_DATA = [
  { id: "SKU001", name: "Blue T-Shirt", category: "Apparel", quantity: 150, reorderPoint: 50, supplier: "ApparelCo" },
  { id: "SKU002", name: "Wireless Mouse", category: "Electronics", quantity: 80, reorderPoint: 30, supplier: "TechGadgets" },
  { id: "SKU003", name: "Coffee Beans 1kg", category: "Groceries", quantity: 200, reorderPoint: 100, supplier: "Global Foods" },
  { id: "SKU004", name: "Yoga Mat", category: "Sports", quantity: 30, reorderPoint: 20, supplier: "FitLife Inc." },
  { id: "SKU005", name: "Laptop Stand", category: "Office Supplies", quantity: 5, reorderPoint: 10, supplier: "OfficePro" },
];

export const MOCK_INVENTORY_JSON_STRING = JSON.stringify(MOCK_INVENTORY_DATA, null, 2);

