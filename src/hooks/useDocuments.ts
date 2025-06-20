
"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentMetadata, DocumentStatus, ExtractedDocumentData } from '@/lib/types/firestore';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export const DOCUMENTS_QUERY_KEY = 'documentsList';
export const DOCUMENT_DETAIL_QUERY_KEY = 'documentDetail';

// API Fetching Functions
interface FetchDocumentsParams {
  pageParam?: string;
  limit?: number;
  type?: DocumentMetadata['documentTypeHint'];
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  token: string | null;
}

const fetchDocuments = async ({ pageParam, limit = 10, type, status, dateFrom, dateTo, searchQuery, token }: FetchDocumentsParams) => {
  if (!token) throw new Error("Authentication token is required.");
  
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (pageParam) params.append('startAfter', pageParam);
  if (type && type !== 'auto_detect' && type !== 'unknown') params.append('type', type);
  if (status) params.append('status', status);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (searchQuery) params.append('search', searchQuery);

  const response = await fetch(`/api/documents?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
    throw new Error(errorData.error || 'Failed to fetch documents');
  }
  return response.json();
};

const fetchDocumentById = async (id: string, token: string | null): Promise<DocumentMetadata> => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch(`/api/documents/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to fetch document ${id}` }));
    throw new Error(errorData.error || `Failed to fetch document ${id}`);
  }
  const result = await response.json();
  return result.data;
};

const uploadDocumentFile = async (formData: FormData, token: string | null) => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to upload document file' }));
    throw new Error(errorData.error || 'Failed to upload document file');
  }
  return response.json();
};

const processDocument = async (documentId: string, token: string | null) => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch(`/api/documents/process/${documentId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to process document ${documentId}` }));
    throw new Error(errorData.error || `Failed to process document ${documentId}`);
  }
  return response.json();
};

const approveDocument = async (documentId: string, token: string | null) => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch(`/api/documents/${documentId}/approve`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to approve document ${documentId}` }));
    throw new Error(errorData.error || `Failed to approve document ${documentId}`);
  }
  return response.json();
};

const deleteDocument = async (documentId: string, token: string | null) => {
    if (!token) throw new Error("Authentication token is required.");
    
    const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to delete document ${documentId}`}));
        throw new Error(errorData.error || `Failed to delete document ${documentId}`);
    }
    return response.json();
};


// React Query Hooks
export function useDocumentsList(filters?: Omit<FetchDocumentsParams, 'pageParam' | 'token'>) {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, { filters }],
    queryFn: ({ pageParam }) => fetchDocuments({ ...filters, pageParam, token }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
    enabled: !!token,
  });
}

export function useDocumentDetail(id: string | null) {
  const { token } = useAuth();
  return useQuery<DocumentMetadata, Error>({
    queryKey: [DOCUMENT_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchDocumentById(id!, token),
    enabled: !!id && !!token,
  });
}

export function useUploadDocumentFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (formData: FormData) => uploadDocumentFile(formData, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
      toast({ title: 'Upload Successful', description: data.message });
    },
    onError: (error) => {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useProcessDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (documentId: string) => processDocument(documentId, token),
    onSuccess: (data, documentId) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId] });
      toast({ title: 'Processing Complete', description: `Document processed. Status: ${data.newStatus}` });
    },
    onError: (error, documentId) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId] });
      toast({ title: 'Processing Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (documentId: string) => approveDocument(documentId, token),
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
    const { token } = useAuth();

    return useMutation({
        mutationFn: (documentId: string) => deleteDocument(documentId, token),
        onSuccess: (data, documentId) => {
            queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
            queryClient.removeQueries({ queryKey: [DOCUMENT_DETAIL_QUERY_KEY, documentId]});
            toast({ title: "Document Deleted", description: data.message });
        },
        onError: (error) => {
            toast({ title: "Delete Error", description: error.message, variant: "destructive"});
        }
    });
}
