
"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { useToast } from './use-toast';
import { z } from 'zod';
import { useAuth } from './useAuth';

export const INVENTORY_QUERY_KEY = 'inventoryItems';

// --- Schemas for API validation ---
export const CreateInventoryItemSchema = z.object({
  sku: z.string().min(1, "SKU is required").trim(),
  name: z.string().min(1, "Product name is required").trim(),
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative"),
  unitCost: z.coerce.number().min(0, "Unit cost must be non-negative"),
  reorderPoint: z.coerce.number().int().min(0, "Reorder point must be non-negative"),
  category: z.string().optional().nullable().transform(val => val?.trim() || undefined),
  description: z.string().optional().nullable().transform(val => val?.trim() || undefined),
  reorderQuantity: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().optional().nullable().transform(val => val?.trim() || undefined),
  imageUrl: z.string().url({ message: "Invalid URL format" }).optional().nullable().or(z.literal('')),
});
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;


interface PaginatedInventoryResponse {
  data: InventoryStockDocument[];
  pagination: {
    count: number;
    nextCursor: string | null;
  };
}

interface FetchInventoryParams {
  pageParam?: string; // startAfterDocId
  limit?: number;
  searchTerm?: string;
  category?: string;
  lowStockOnly?: boolean;
  token: string | null;
}

const fetchInventoryItems = async ({
  pageParam,
  limit = 8,
  searchTerm,
  category,
  lowStockOnly,
  token,
}: FetchInventoryParams): Promise<PaginatedInventoryResponse> => {
  if (!token) throw new Error("Authentication token is required.");

  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (pageParam) params.append('startAfter', pageParam);
  if (searchTerm) params.append('search', searchTerm);
  if (category && category !== 'all') params.append('category', category);
  if (lowStockOnly) params.append('lowStockOnly', 'true');
  
  const response = await fetch(`/api/inventory?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch inventory' }));
    throw new Error(errorData.error || 'Failed to fetch inventory');
  }
  return response.json();
};

export function useInventory(filters?: { searchTerm?: string; category?: string; lowStockOnly?: boolean }) {
  const { token } = useAuth();
  
  return useInfiniteQuery<
    PaginatedInventoryResponse,
    Error,
    PaginatedInventoryResponse,
    any,
    string | undefined
  >({
    queryKey: [INVENTORY_QUERY_KEY, { filters }],
    queryFn: ({ pageParam }) => fetchInventoryItems({ ...filters, pageParam, token }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
    enabled: !!token, // Only run query if token exists
  });
}

const createInventoryItem = async (itemData: CreateInventoryItemInput, token: string | null): Promise<InventoryStockDocument> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create item' }));
    throw new Error(errorData.error || 'Failed to create item');
  }
  const result = await response.json();
  return result.data;
};

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<InventoryStockDocument, Error, CreateInventoryItemInput>({
    mutationFn: (newItem) => createInventoryItem(newItem, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      toast({ title: 'Success', description: `Item ${data.name} created successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Creating Item', description: error.message, variant: 'destructive' });
    },
  });
}


const updateInventoryItem = async (itemData: { sku: string; data: UpdateInventoryItemInput }, token: string | null): Promise<InventoryStockDocument> => {
  if (!token) throw new Error("Authentication token is required.");

  const { sku, data } = itemData;
  const response = await fetch(`/api/inventory/${sku}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to update item ${sku}` }));
    throw new Error(errorData.error || `Failed to update item ${sku}`);
  }
  const result = await response.json();
  return result.data;
};

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<InventoryStockDocument, Error, { sku: string; data: UpdateInventoryItemInput }>({
    mutationFn: (updateData) => updateInventoryItem(updateData, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY, data.id] });
      toast({ title: 'Success', description: `Item ${data.name || data.id} updated successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Updating Item', description: error.message, variant: 'destructive' });
    },
  });
}


const uploadInventoryFile = async (formData: FormData, token: string | null): Promise<any> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch('/api/inventory/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
    throw new Error(errorData.error || 'Failed to upload file');
  }
  return response.json();
};

export function useUploadInventoryFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<any, Error, FormData>({
    mutationFn: (formData) => uploadInventoryFile(formData, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      toast({ title: 'Upload Successful', description: data.message || 'Inventory uploaded and analyzed.' });
    },
    onError: (error) => {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    },
  });
}
