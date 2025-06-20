
"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { useToast } from './use-toast';
import { z } from 'zod';

export const INVENTORY_QUERY_KEY = 'inventoryItems';

// --- Schemas for API validation ---
export const CreateInventoryItemSchema = z.object({
  sku: z.string().min(1, "SKU is required").trim(),
  name: z.string().min(1, "Product name is required").trim(),
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative"),
  unitCost: z.coerce.number().min(0, "Unit cost must be non-negative"),
  reorderPoint: z.coerce.number().int().min(0, "Reorder point must be non-negative"),
  category: z.string().optional().nullable().transform(val => val?.trim() || null),
  description: z.string().optional().nullable().transform(val => val?.trim() || null),
  reorderQuantity: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().optional().nullable().transform(val => val?.trim() || null),
  imageUrl: z.string().url({ message: "Invalid URL format" }).optional().nullable().or(z.literal('')),
});
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;


interface PaginatedInventoryResponse {
  data: InventoryStockDocument[]; // Should be Partial<InventoryStockDocument>[] if fieldsParam is used
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
}

const fetchInventoryItems = async ({
  pageParam,
  limit = 8, // Default to 8 per page
  searchTerm,
  category,
  lowStockOnly,
}: FetchInventoryParams): Promise<PaginatedInventoryResponse> => {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (pageParam) params.append('startAfter', pageParam);
  if (searchTerm) params.append('search', searchTerm);
  if (category && category !== 'all') params.append('category', category);
  if (lowStockOnly) params.append('lowStockOnly', 'true');
  
  const response = await fetch(`/api/inventory?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch inventory', details: 'Server returned non-JSON error' }));
    throw new Error(errorData.error || 'Failed to fetch inventory. ' + (errorData.details || ''));
  }
  return response.json();
};

export function useInventory(filters?: { searchTerm?: string; category?: string; lowStockOnly?: boolean }) {
  return useInfiniteQuery<
    PaginatedInventoryResponse,
    Error,
    PaginatedInventoryResponse, // type of data in resolver
    any, // queryKey type
    string | undefined // pageParam type
  >({
    queryKey: [INVENTORY_QUERY_KEY, { filters }],
    queryFn: ({ pageParam }) => fetchInventoryItems({ ...filters, pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
  });
}

const createInventoryItem = async (itemData: CreateInventoryItemInput): Promise<InventoryStockDocument> => {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  return useMutation<InventoryStockDocument, Error, CreateInventoryItemInput>({
    mutationFn: createInventoryItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      toast({ title: 'Success', description: `Item ${data.name} created successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Creating Item', description: error.message, variant: 'destructive' });
    },
  });
}


const updateInventoryItem = async (itemData: { sku: string; data: UpdateInventoryItemInput }): Promise<InventoryStockDocument> => {
  const { sku, data } = itemData;
  const response = await fetch(`/api/inventory/${sku}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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

  return useMutation<InventoryStockDocument, Error, { sku: string; data: UpdateInventoryItemInput }>({
    mutationFn: updateInventoryItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      // Also invalidate specific item query if you have one for detail views
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY, data.id] });
      toast({ title: 'Success', description: `Item ${data.name || data.id} updated successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Updating Item', description: error.message, variant: 'destructive' });
    },
  });
}


const uploadInventoryFile = async (formData: FormData): Promise<any> => {
  const response = await fetch('/api/inventory/upload', {
    method: 'POST',
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

  return useMutation<any, Error, FormData>({
    mutationFn: uploadInventoryFile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      toast({ title: 'Upload Successful', description: data.message || 'Inventory uploaded and analyzed.' });
      // Potentially return AI insights for display: data.aiInsights
    },
    onError: (error) => {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    },
  });
}
