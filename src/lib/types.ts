export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export type InventoryItem = {
  id: string; // SKU
  name: string; // Product Name
  category?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  supplier?: string;
  // status is often derived: (quantity <= reorderPoint ? (quantity === 0 ? 'Out of Stock' : 'Low Stock') : 'In Stock')
  // It can be pre-calculated or calculated on the fly. For simplicity in mock data, it can be a string.
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'; 
};
