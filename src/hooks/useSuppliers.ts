
"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupplierDocument } from '@/lib/types/firestore';
import { useToast } from './use-toast';
import { z } from 'zod';
import { useAuth } from './useAuth';

export const SUPPLIERS_QUERY_KEY = 'suppliers';

// Schemas
export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").trim(),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({ street: z.string().optional(), city: z.string().optional(), state: z.string().optional(), zipCode: z.string().optional(), country: z.string().optional(), }).optional(),
  contactPerson: z.object({ name: z.string().optional(), email: z.string().email("Invalid contact email format").optional().or(z.literal('')), phone: z.string().optional(), }).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional().nullable(),
  reliabilityScore: z.coerce.number().min(0).max(100).optional().nullable(),
  paymentTerms: z.string().optional(),
  moq: z.coerce.number().min(0).optional().nullable(),
  productsSuppliedSkus: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

interface PaginatedSuppliersResponse {
  data: SupplierDocument[];
  pagination: { count: number; nextCursor: string | null; };
}

interface FetchSuppliersParams {
  pageParam?: string;
  limit?: number;
  searchTerm?: string;
  reliability?: string;
  leadTime?: string;
  token: string | null;
}

// API Fetching Functions
const fetchSuppliers = async ({ pageParam, limit = 10, searchTerm, reliability, leadTime, token }: FetchSuppliersParams): Promise<PaginatedSuppliersResponse> => {
  if (!token) throw new Error("Authentication token is required.");
  
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (pageParam) params.append('startAfter', pageParam);
  if (searchTerm) params.append('search', searchTerm);
  if (reliability && reliability !== 'all') params.append('reliability', reliability);
  if (leadTime && leadTime !== 'all') params.append('leadTime', leadTime);

  const response = await fetch(`/api/suppliers?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch suppliers' }));
    throw new Error(errorData.error || 'Failed to fetch suppliers');
  }
  return response.json();
};

const fetchSupplierById = async (id: string, token: string | null): Promise<SupplierDocument> => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch(`/api/suppliers/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to fetch supplier ${id}` }));
    throw new Error(errorData.error || `Failed to fetch supplier ${id}`);
  }
  const result = await response.json();
  return result.data;
};

const createSupplier = async (supplierData: CreateSupplierInput, token: string | null): Promise<SupplierDocument> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(supplierData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create supplier' }));
    throw new Error(errorData.error || 'Failed to create supplier');
  }
  const result = await response.json();
  return result.data;
};

const updateSupplier = async ({ id, data }: { id: string; data: UpdateSupplierInput }, token: string | null): Promise<SupplierDocument> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to update supplier ${id}` }));
    throw new Error(errorData.error || `Failed to update supplier ${id}`);
  }
  const result = await response.json();
  return result.data;
};

// React Query Hooks
export function useSuppliers(filters?: { searchTerm?: string; reliability?: string; leadTime?: string }) {
  const { token } = useAuth();
  return useInfiniteQuery<PaginatedSuppliersResponse, Error, PaginatedSuppliersResponse, any, string | undefined>({
    queryKey: [SUPPLIERS_QUERY_KEY, { filters }],
    queryFn: ({ pageParam }) => fetchSuppliers({ ...filters, pageParam, token }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
    enabled: !!token,
  });
}

export function useSupplier(id: string | null) {
  const { token } = useAuth();
  return useQuery<SupplierDocument, Error>({
    queryKey: [SUPPLIERS_QUERY_KEY, id],
    queryFn: () => fetchSupplierById(id!, token),
    enabled: !!id && !!token, 
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<SupplierDocument, Error, CreateSupplierInput>({
    mutationFn: (newSupplier) => createSupplier(newSupplier, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
      toast({ title: 'Success', description: `Supplier "${data.name}" created successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Creating Supplier', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<SupplierDocument, Error, { id: string; data: UpdateSupplierInput }>({
    mutationFn: (updateData) => updateSupplier(updateData, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_QUERY_KEY, data.id]});
      toast({ title: 'Success', description: `Supplier "${data.name}" updated successfully.` });
    },
    onError: (error) => {
      toast({ title: 'Error Updating Supplier', description: error.message, variant: 'destructive' });
    },
  });
}
