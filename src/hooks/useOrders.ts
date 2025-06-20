
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDocument } from '@/lib/types/firestore';
import type { OptimizeReordersOutput } from '@/ai/flows/reorderOptimization';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

const REORDER_SUGGESTIONS_QUERY_KEY = 'reorderSuggestions';
const ORDERS_QUERY_KEY = 'orders';


const fetchReorderSuggestions = async (token: string | null): Promise<OptimizeReordersOutput> => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch('/api/orders/reorder-suggestions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch reorder suggestions' }));
    throw new Error(errorData.error || 'Failed to fetch reorder suggestions');
  }
  const result = await response.json();
  return result.data;
};

export function useReorderSuggestions() {
  const { token } = useAuth();
  return useQuery<OptimizeReordersOutput, Error>({
    queryKey: [REORDER_SUGGESTIONS_QUERY_KEY],
    queryFn: () => fetchReorderSuggestions(token),
    enabled: !!token,
  });
}

interface CreatePOItemPayload {
  sku: string;
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}
interface CreatePOPayload {
  items: CreatePOItemPayload[];
  supplierId?: string;
  notes?: string;
}

const createPurchaseOrder = async (payload: CreatePOPayload, token: string | null): Promise<OrderDocument> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch('/api/orders/create-po', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create purchase order' }));
    throw new Error(errorData.error || 'Failed to create purchase order');
  }
  const result = await response.json();
  return result.data;
};

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<OrderDocument, Error, CreatePOPayload>({
    mutationFn: (poPayload) => createPurchaseOrder(poPayload, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast({ title: 'Success', description: `Purchase Order ${data.orderNumber} created.` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
