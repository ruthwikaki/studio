import {
  LayoutDashboard,
  UploadCloud,
  MessageCircle,
  BarChart3,
  Settings,
  Box,
  Boxes, // For Inventory
  Truck, // For Suppliers
  ClipboardList, // For Orders
  Bell, // For Notifications (used in Header)
  Search, // For Global Search (used in Header)
  FilePlus2, // For Create PO (Dashboard Quick Action)
  ListChecks, // For Recent Activity (Dashboard)
  TrendingUp, // For Inventory Turnover Chart (Dashboard)
  Award, // For Top Products (Dashboard)
  Paperclip, // For AI Chat Attachment
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchSegments?: number; 
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, matchSegments: 1 },
  { href: '/inventory', label: 'Inventory', icon: Boxes, matchSegments: 1 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, matchSegments: 1 },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, matchSegments: 1 },
  { href: '/orders', label: 'Orders', icon: ClipboardList, matchSegments: 1 },
  { href: '/ai-chat', label: 'AI Assistant', icon: MessageCircle, matchSegments: 1 },
  { href: '/settings', label: 'Settings', icon: Settings, matchSegments: 1 },
];

export const APP_NAME = "SupplyChainAI";
export const APP_LOGO_ICON = Box; // Main app logo

// Icons for specific UI elements not in NAV_ITEMS
export const NOTIFICATION_ICON = Bell;
export const GLOBAL_SEARCH_ICON = Search;
export const CREATE_PO_ICON = FilePlus2;
export const RECENT_ACTIVITY_ICON = ListChecks;
export const TURNOVER_CHART_ICON = TrendingUp;
export const TOP_PRODUCTS_ICON = Award;
export const AI_CHAT_ATTACHMENT_ICON = Paperclip;


// Mock data for inventory items for AI Chat placeholder
export const MOCK_INVENTORY_DATA = [
  { id: "SKU001", name: "Blue T-Shirt", category: "Apparel", quantity: 150, unitCost: 12.50, reorderPoint: 50, supplier: "ApparelCo", status: "In Stock" },
  { id: "SKU002", name: "Wireless Mouse", category: "Electronics", quantity: 80, unitCost: 25.00, reorderPoint: 30, supplier: "TechGadgets", status: "In Stock" },
  { id: "SKU003", name: "Coffee Beans 1kg", category: "Groceries", quantity: 200, unitCost: 15.00, reorderPoint: 100, supplier: "Global Foods", status: "In Stock" },
  { id: "SKU004", name: "Yoga Mat", category: "Sports", quantity: 15, unitCost: 30.00, reorderPoint: 20, supplier: "FitLife Inc.", status: "Low Stock" },
  { id: "SKU005", name: "Laptop Stand", category: "Office Supplies", quantity: 5, unitCost: 22.00, reorderPoint: 10, supplier: "OfficePro", status: "Low Stock" },
  { id: "SKU006", name: "Organic Green Tea", category: "Groceries", quantity: 0, unitCost: 8.00, reorderPoint: 25, supplier: "Healthy Beverages", status: "Out of Stock" },
];

export const MOCK_INVENTORY_JSON_STRING = JSON.stringify(MOCK_INVENTORY_DATA.map(({ status, ...rest }) => rest), null, 2); // For AI Chat, remove dynamic status
