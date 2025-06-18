
"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryItemDocument } from '@/lib/types/firestore';
import { useToast } from './use-toast';

const INVENTORY_QUERY_KEY = 'inventoryItems';

interface PaginatedInventoryResponse {
  data: InventoryItemDocument[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

const fetchInventoryItems = async ({ pageParam = 1, queryKey }: any): Promise<PaginatedInventoryResponse> => {
  const [_key, { filters }] = queryKey;
  const { searchTerm, category, lowStockOnly } = filters;
  
  const params = new URLSearchParams();
  params.append('page', pageParam.toString());
  params.append('limit', '10'); // Or your desired page size
  if (searchTerm) params.append('search', searchTerm);
  if (category && category !== 'all') params.append('category', category);
  if (lowStockOnly) params.append('lowStockOnly', 'true');

  const response = await fetch(`/api/inventory?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch inventory' }));
    throw new Error(errorData.error || 'Failed to fetch inventory');
  }
  return response.json();
};

export function useInventory(filters: { searchTerm: string; category: string; lowStockOnly: boolean }) {
  return useInfiniteQuery<PaginatedInventoryResponse, Error>({
    queryKey: [INVENTORY_QUERY_KEY, { filters }],
    queryFn: fetchInventoryItems,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

const updateInventoryItem = async (itemData: { sku: string; data: Partial<InventoryItemDocument> }): Promise<InventoryItemDocument> => {
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
  return response.json();
};

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<InventoryItemDocument, Error, { sku: string; data: Partial<InventoryItemDocument> }>({
    mutationFn: updateInventoryItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
      toast({ title: 'Success', description: `Item ${data.sku || data.id} updated successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

// Placeholder for bulk actions, delete actions - you would add similar useMutation hooks
// export function useBulkUpdateInventory() { ... }
// export function useDeleteInventoryItems() { ... }
