
"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { DocumentMetadata, DocumentStatus, ExtractedDocumentData } from '@/lib/types/firestore';
import { useToast } from './use-toast';

export const DOCUMENTS_QUERY_KEY = 'documentsList';
export const DOCUMENT_DETAIL_QUERY_KEY = 'documentDetail';

// --- API Fetching Functions ---

interface FetchDocumentsParams {
  pageParam?: string; // For infinite query, this is the startAfterDocId
  limit?: number;
  type?: DocumentMetadata['documentTypeHint'];
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

const fetchDocuments = async ({
  pageParam, // startAfterDocId
  limit = 10,
  type,
  status,
  dateFrom,
  dateTo,
  searchQuery,
}: FetchDocumentsParams): Promise<{ data: Partial<DocumentMetadata>[]; pagination: { count: number; nextCursor: string | null } }> => {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (pageParam) params.append('startAfter', pageParam);
  if (type && type !== 'auto_detect' && type !== 'unknown') params.append('type', type);
  if (status) params.append('status', status);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (searchQuery) params.append('search', searchQuery);

  const response = await fetch(`/api/documents?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
    throw new Error(errorData.error || 'Failed to fetch documents');
  }
  return response.json();
};

const fetchDocumentById = async (id: string): Promise<DocumentMetadata> => {
  const response = await fetch(`/api/documents/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to fetch document ${id}` }));
    throw new Error(errorData.error || `Failed to fetch document ${id}`);
  }
  const result = await response.json();
  return result.data;
};

const uploadDocumentFile = async (formData: FormData): Promise<{ documentId: string; fileUrl: string; message: string }> => {
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to upload document file' }));
    throw new Error(errorData.error || 'Failed to upload document file');
  }
  return response.json();
};

const processDocument = async (documentId: string): Promise<{ message: string; extractedData: ExtractedDocumentData; newStatus: DocumentStatus, poMatchDetails?: any }> => {
  const response = await fetch(`/api/documents/process/${documentId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to process document ${documentId}` }));
    throw new Error(errorData.error || `Failed to process document ${documentId}`);
  }
  return response.json();
};

const approveDocument = async (documentId: string): Promise<{ message: string; documentId: string }> => {
  const response = await fetch(`/api/documents/${documentId}/approve`, {
    method: 'PUT',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to approve document ${documentId}` }));
    throw new Error(errorData.error || `Failed to approve document ${documentId}`);
  }
  return response.json();
};

const deleteDocument = async (documentId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to delete document ${documentId}`}));
        throw new Error(errorData.error || `Failed to delete document ${documentId}`);
    }
    return response.json();
};


// --- React Query Hooks ---

export function useDocumentsList(filters?: Omit<FetchDocumentsParams, 'pageParam'>) {
  return useInfiniteQuery<
    { data: Partial<DocumentMetadata>[]; pagination: { count: number; nextCursor: string | null } },
    Error,
    { data: Partial<DocumentMetadata>[]; pagination: { count: number; nextCursor: string | null } },
    any, // For queryKey
    string | undefined // For pageParam type
  >({
    queryKey: [DOCUMENTS_QUERY_KEY, filters],
    queryFn: ({ pageParam }) => fetchDocuments({ ...filters, pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
  });
}

export function useDocumentDetail(id: string | null) {
  return useQuery<DocumentMetadata, Error>({
    queryKey: [DOCUMENT_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchDocumentById(id!),
    enabled: !!id,
  });
}

export function useUploadDocumentFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ documentId: string; fileUrl: string; message: string }, Error, FormData>({
    mutationFn: uploadDocumentFile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
      toast({ title: 'Upload Successful', description: data.message });
      // Optionally trigger processing immediately or let user do it.
      // E.g., processDocumentMutation.mutate(data.documentId);
    },
    onError: (error) => {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useProcessDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ message: string; extractedData: ExtractedDocumentData; newStatus: DocumentStatus }, Error, string>({
    mutationFn: processDocument,
    onSuccess: (data, documentId) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId] });
      toast({ title: 'Processing Complete', description: `Document processed. Status: ${data.newStatus}` });
    },
    onError: (error, documentId) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId] }); // To show error state on detail page
      toast({ title: 'Processing Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ message: string; documentId: string }, Error, string>({
    mutationFn: approveDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, data.documentId] });
      toast({ title: 'Document Approved', description: data.message });
    },
    onError: (error) => {
      toast({ title: 'Approval Error', description: error.message, variant: 'destructive' });
    },
  });
}


export function useDeleteDocument() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<{ message: string }, Error, string>({
        mutationFn: deleteDocument,
        onSuccess: (data, documentId) => {
            queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
            // If on a detail page for this doc, you might want to redirect or update UI
            queryClient.removeQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId]});
            toast({ title: "Document Deleted", description: data.message });
        },
        onError: (error) => {
            toast({ title: "Delete Error", description: error.message, variant: "destructive"});
        }
    });
}

    