
"use client";

import { useState, useCallback, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, UploadCloud, FileText, XCircle, CheckCircle, Loader2, AlertTriangle, RotateCcw, Eye, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useUploadDocumentFile, useDocumentsList, useProcessDocument, useDeleteDocument, useApproveDocument } from '@/hooks/useDocuments';
import type { DocumentMetadata, DocumentStatus } from '@/lib/types/firestore';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface UploadedFileStateClient {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error' | 'pending_upload';
  progress?: number;
  previewUrl?: string;
  errorMessage?: string;
  serverDocumentId?: string;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const DocumentStatusBadge = ({ status }: { status: DocumentStatus }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  switch (status) {
    case 'approved': case 'extraction_complete': variant = 'default'; break;
    case 'pending_review': case 'processing_extraction': variant = 'secondary'; break;
    case 'error': variant = 'destructive'; break;
    default: variant = 'outline';
  }
  return <Badge variant={variant} className="capitalize text-xs">{status.replace(/_/g, ' ')}</Badge>;
};

export default function DocumentsPage() {
  const [dragging, setDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<UploadedFileStateClient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadMutation = useUploadDocumentFile();
  const processMutation = useProcessDocument();
  const deleteMutation = useDeleteDocument();

  const [activeTab, setActiveTab] = useState<DocumentStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState('');

  const { data: documentsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingDocuments, refetch } = useDocumentsList({
    status: activeTab === "all" ? undefined : activeTab,
    searchQuery: searchTerm,
    limit: 10,
  });
  
  const allFetchedDocuments = documentsData?.pages.flatMap(page => page.data) ?? [];

  useEffect(() => { refetch(); }, [activeTab, searchTerm, refetch]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (e.dataTransfer.files?.length) queueFilesForUpload(e.dataTransfer.files);
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) queueFilesForUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const queueFilesForUpload = (files: FileList) => {
    const newFilesToStage: UploadedFileStateClient[] = Array.from(files).map(file => {
      const fileId = `${file.name}-${file.lastModified}`;
      if (stagedFiles.some(f => f.id === fileId)) {
        toast({ title: "Duplicate File", description: `${file.name} is already queued.` });
        return null;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) return { id: fileId, file, status: 'error', errorMessage: `Exceeds ${MAX_FILE_SIZE_MB}MB limit.` };
      if (!SUPPORTED_MIME_TYPES.includes(file.type)) return { id: fileId, file, status: 'error', errorMessage: 'Unsupported file type.' };
      return { id: fileId, file, status: 'pending_upload', previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined };
    }).filter((f): f is UploadedFileStateClient => f !== null);
    
    setStagedFiles(prev => [...newFilesToStage, ...prev].slice(0, 5));
    newFilesToStage.forEach(handleUploadFile);
  };

  const handleUploadFile = (stagedFile: UploadedFileStateClient) => {
    if(stagedFile.status !== 'pending_upload') return;
    setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'uploading', progress: 0 } : f));
    const formData = new FormData();
    formData.append('file', stagedFile.file);
    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
        setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'success', serverDocumentId: data.documentId, progress: 100 } : f));
        refetch();
      },
      onError: (error) => setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'error', errorMessage: error.message } : f)),
    });
  };
  
  useEffect(() => () => stagedFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); }), [stagedFiles]);
  const removeStagedFile = (fileId: string) => setStagedFiles(prev => prev.filter(f => f.id !== fileId));
  const handleProcessDocument = (docId: string) => processMutation.mutate(docId);
  const handleDeleteDocument = (docId: string) => deleteMutation.mutate(docId);

  return (
    <div className="flex flex-col h-full gap-6 p-4 md:p-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Document Center</h1>
      <div className="grid md:grid-cols-12 gap-6 flex-grow min-h-0">
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6 min-h-0">
          <Card className={cn("shadow-lg flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed", dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/70")} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            <UploadCloud className={cn("w-16 h-16 mb-4", dragging ? "text-primary" : "text-muted-foreground")} />
            <p className="text-lg font-semibold text-center mb-1">Drag & Drop Documents</p>
            <p className="text-xs text-muted-foreground text-center mb-4">PDF, PNG, JPG (Max {MAX_FILE_SIZE_MB}MB)</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline"><Paperclip className="mr-2 h-4 w-4" /> Browse Files</Button>
            <input ref={fileInputRef} id="fileInput" type="file" multiple className="hidden" accept={SUPPORTED_MIME_TYPES.join(',')} onChange={handleFileChange} />
          </Card>
          {stagedFiles.length > 0 && (
            <Card className="shadow-md max-h-[40vh] flex flex-col">
              <CardHeader className="pb-2"><CardTitle className="text-md font-semibold">Upload Queue ({stagedFiles.length})</CardTitle></CardHeader>
              <CardContent className="p-3 flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-3"><div className="space-y-2">{stagedFiles.map(item => <div key={item.id} className="p-3 border rounded-md bg-card flex items-center gap-3 relative group">{item.previewUrl ? <Image src={item.previewUrl} alt={`Preview`} width={40} height={40} className="h-10 w-10 object-cover rounded-md border" data-ai-hint="document image"/> : <FileText className="h-10 w-10 text-muted-foreground" />}{/* ... rest of item render ... */}</div>)}</div></ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="md:col-span-7 lg:col-span-8 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DocumentStatus | "all")} className="flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending_review">Review</TabsTrigger><TabsTrigger value="extraction_complete">Extracted</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="pending_ocr">Pending</TabsTrigger><TabsTrigger value="error">Errors</TabsTrigger></TabsList>
                <div className="relative ml-4"><Search className="absolute left-2.5 top-2.5 h-4 w-4" /><Input type="search" placeholder="Search..." className="pl-8 w-full sm:w-56 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            <Card className="shadow-lg flex-grow">
              <TabsContent value={activeTab} className="p-0 h-full mt-0">
                <CardHeader><CardTitle className="capitalize">{activeTab.replace(/_/g, ' ')}</CardTitle><CardDescription>Browse and manage documents.</CardDescription></CardHeader>
                <CardContent className="min-h-[200px]">
                  {isLoadingDocuments ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> :
                  !allFetchedDocuments.length ? <p className="text-center py-10 text-muted-foreground">No documents found.</p> :
                  <ScrollArea className="h-[calc(100vh-20rem)]"><div className="space-y-3 pr-4">{allFetchedDocuments.map(doc => (
                    <Card key={doc.id} className="hover:shadow-md"><CardContent className="p-3 flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div className="flex-grow overflow-hidden"><p className="font-medium truncate">{doc.fileName}</p><p className="text-xs text-muted-foreground">Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</p></div><div className="flex flex-col items-end gap-1">{doc.status && <DocumentStatusBadge status={doc.status} />}<div className="flex gap-1 mt-1"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link href={`/documents/processing/${doc.id}`}><Eye className="h-4 w-4" /></Link></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleProcessDocument(doc.id!)} disabled={processMutation.isPending && processMutation.variables === doc.id}>{processMutation.isPending && processMutation.variables === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <RotateCcw className="h-4 w-4 text-blue-600" />}</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDocument(doc.id!)} disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}>{deleteMutation.isPending && deleteMutation.variables === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />}</Button></div></div></CardContent></Card>
                  ))}</div></ScrollArea>}
                  {hasNextPage && <div className="pt-4 flex justify-center"><Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage && <Loader2 className="animate-spin mr-2"/>}Load More</Button></div>}
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
