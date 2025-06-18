
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDocument, OrderItem } from '@/lib/types/firestore';
import type { OptimizeReordersOutput } from '@/ai/flows/reorderOptimization';
import { useToast } from './use-toast';

const REORDER_SUGGESTIONS_QUERY_KEY = 'reorderSuggestions';
const ORDERS_QUERY_KEY = 'orders';


const fetchReorderSuggestions = async (): Promise<OptimizeReordersOutput> => {
  const response = await fetch('/api/orders/reorder-suggestions');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch reorder suggestions' }));
    throw new Error(errorData.error || 'Failed to fetch reorder suggestions');
  }
  const result = await response.json();
  return result.data; // Assuming API wraps Genkit output in { data: ... }
};

export function useReorderSuggestions() {
  return useQuery<OptimizeReordersOutput, Error>({
    queryKey: [REORDER_SUGGESTIONS_QUERY_KEY],
    queryFn: fetchReorderSuggestions,
  });
}

interface CreatePOPayload {
  items: { sku: string; name: string; productId: string; quantity: number; unitCost: number }[];
  supplierId?: string;
  notes?: string;
}

const createPurchaseOrder = async (payload: CreatePOPayload): Promise<OrderDocument> => {
  const response = await fetch('/api/orders/create-po', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create purchase order' }));
    throw new Error(errorData.error || 'Failed to create purchase order');
  }
  const result = await response.json();
  return result.data; // Assuming API wraps response in { data: ... }
};

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<OrderDocument, Error, CreatePOPayload>({
    mutationFn: createPurchaseOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] }); // Invalidate inventory as PO might affect stock
      toast({ title: 'Success', description: `Purchase Order ${data.orderNumber} created.` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Placeholder for fetching order history
// export function useOrderHistory() { ... }
