// This file (src/lib/types.ts) can be used for general application-wide types
// or types that are shared between client and server but are not specific to Firestore documents.
// For Firestore specific document structures, prefer using src/lib/types/firestore.ts

export type UiChatMessage = { // Renamed to avoid conflict if ChatMessage is also defined for Firestore
  id: string;
  role: 'user' | 'assistant' | 'system'; // 'system' for initial messages or errors not from AI directly
  content: string;
  timestamp: Date; // Using JS Date for client-side state, Firestore will use Timestamps
};

export type InventoryItem = {
  id: string; // SKU
  name: string; // Product Name
  category?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  supplier?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};
