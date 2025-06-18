
"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { SupplierDocument } from '@/lib/types/firestore';
import { useToast } from './use-toast';
import { z } from 'zod';

export const SUPPLIERS_QUERY_KEY = 'suppliers';

// --- Schemas for API validation (can be moved to a shared location) ---
export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contactPerson: z.object({
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
  }).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  reliabilityScore: z.number().min(0).max(100).optional(),
  paymentTerms: z.string().optional(),
  moq: z.number().min(0).optional(),
  productsSuppliedSkus: z.array(z.string()).optional().describe("Array of SKUs supplied by this vendor"),
  notes: z.string().optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;


interface PaginatedSuppliersResponse {
  data: SupplierDocument[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// --- API Fetching Functions ---
const fetchSuppliers = async ({ pageParam = 1, queryKey }: any): Promise<PaginatedSuppliersResponse> => {
  const [_key, { filters }] = queryKey;
  const { searchTerm, reliability, leadTime } = filters || {};
  
  const params = new URLSearchParams();
  params.append('page', pageParam.toString());
  params.append('limit', '10');
  if (searchTerm) params.append('search', searchTerm);
  if (reliability) params.append('reliability', reliability);
  if (leadTime) params.append('leadTime', leadTime);

  const response = await fetch(`/api/suppliers?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch suppliers' }));
    throw new Error(errorData.error || 'Failed to fetch suppliers');
  }
  return response.json();
};

const fetchSupplierById = async (id: string): Promise<SupplierDocument> => {
  const response = await fetch(`/api/suppliers/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to fetch supplier ${id}` }));
    throw new Error(errorData.error || `Failed to fetch supplier ${id}`);
  }
  const result = await response.json();
  return result.data;
};

const createSupplier = async (supplierData: CreateSupplierInput): Promise<SupplierDocument> => {
  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplierData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create supplier' }));
    throw new Error(errorData.error || 'Failed to create supplier');
  }
  const result = await response.json();
  return result.data;
};

const updateSupplier = async ({ id, data }: { id: string; data: UpdateSupplierInput }): Promise<SupplierDocument> => {
  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to update supplier ${id}` }));
    throw new Error(errorData.error || `Failed to update supplier ${id}`);
  }
  const result = await response.json();
  return result.data;
};

// --- React Query Hooks ---
export function useSuppliers(filters?: { searchTerm?: string; reliability?: string; leadTime?: string }) {
  return useInfiniteQuery<PaginatedSuppliersResponse, Error>({
    queryKey: [SUPPLIERS_QUERY_KEY, { filters }],
    queryFn: fetchSuppliers,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useSupplier(id: string | null) {
  return useQuery<SupplierDocument, Error>({
    queryKey: [SUPPLIERS_QUERY_KEY, id],
    queryFn: () => fetchSupplierById(id!),
    enabled: !!id, // Only run query if id is not null
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<SupplierDocument, Error, CreateSupplierInput>({
    mutationFn: createSupplier,
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

  return useMutation<SupplierDocument, Error, { id: string; data: UpdateSupplierInput }>({
    mutationFn: updateSupplier,
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

// Placeholder for delete supplier mutation
// export function useDeleteSupplier() { ... }

// Placeholder for compare suppliers hook
// export function useCompareSuppliers(supplierIds: string[]) { ... }
