
"use client";

import { useState, useCallback, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Used for hidden file input
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, UploadCloud, Camera, FileText, XCircle, CheckCircle, Loader2, AlertTriangle, RotateCcw, Check, Eye, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useUploadDocumentFile, useDocumentsList, useProcessDocument, useDeleteDocument } from '@/hooks/useDocuments';
import type { DocumentMetadata, DocumentStatus } from '@/lib/types/firestore';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface UploadedFileStateClient {
  id: string; // Use file properties to create a unique ID client-side
  file: File;
  status: 'uploading' | 'success' | 'error' | 'pending_upload'; // Added pending_upload
  progress?: number; // For 'uploading'
  previewUrl?: string; // For image previews
  errorMessage?: string;
  serverDocumentId?: string; // Store the ID from Firestore after successful upload
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const SUPPORTED_EXTENSIONS_DISPLAY = 'PDF, PNG, JPG, JPEG';


const DocumentStatusBadge = ({ status }: { status: DocumentStatus }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  switch (status) {
    case 'approved':
    case 'processed':
    case 'extraction_complete':
      variant = 'default'; // primary/success like
      break;
    case 'pending_review':
    case 'processing_extraction':
    case 'ocr_complete':
      variant = 'secondary'; // warning/info like
      break;
    case 'error':
      variant = 'destructive';
      break;
    case 'uploaded':
    case 'pending_ocr':
      variant = 'outline';
      break;
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

  const {
    data: documentsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useDocumentsList({
    status: activeTab === "all" ? undefined : activeTab,
    searchQuery: searchTerm,
    limit: 10, // Or your desired limit
  });
  
  const allFetchedDocuments = documentsData?.pages.flatMap(page => page.data) ?? [];

  useEffect(() => {
    refetchDocuments();
  }, [activeTab, searchTerm, refetchDocuments]);


  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      queueFilesForUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      queueFilesForUpload(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const queueFilesForUpload = (files: FileList | null) => {
    if (!files) return;
    const newFilesToStage: UploadedFileStateClient[] = [];

    Array.from(files).forEach(file => {
      const fileId = `${file.name}-${file.lastModified}-${file.size}`;
      if (stagedFiles.some(f => f.id === fileId)) {
        toast({ title: "Duplicate File", description: `${file.name} is already in the list.`, variant: "default" });
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        newFilesToStage.push({ id: fileId, file, status: 'error', errorMessage: `File exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
        return;
      }
      if (!SUPPORTED_MIME_TYPES.includes(file.type) && !SUPPORTED_MIME_TYPES.some(type => file.name.toLowerCase().endsWith(type.split('/')[1]))) {
        newFilesToStage.push({ id: fileId, file, status: 'error', errorMessage: `Unsupported file type. Please use ${SUPPORTED_EXTENSIONS_DISPLAY}.` });
        return;
      }
      
      let previewUrl;
      if (file.type.startsWith('image/')) previewUrl = URL.createObjectURL(file);

      newFilesToStage.push({ id: fileId, file, status: 'pending_upload', previewUrl });
    });
    
    setStagedFiles(prev => [...prev, ...newFilesToStage].slice(0, 5)); // Limit to 5 staged files for UI simplicity
    if (newFilesToStage.length > 0 && newFilesToStage.every(f => f.status === 'pending_upload')) {
      // Optionally auto-start upload or wait for a button click
      newFilesToStage.filter(f => f.status === 'pending_upload').forEach(handleUploadFile);
    }
  };

  const handleUploadFile = (stagedFile: UploadedFileStateClient) => {
    setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'uploading', progress: 0 } : f));
    
    const formData = new FormData();
    formData.append('file', stagedFile.file);
    // formData.append('documentTypeHint', 'auto_detect'); // Or get from user input

    uploadMutation.mutate(formData, {
      onSuccess: (data) => {
        setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'success', serverDocumentId: data.documentId, progress: 100 } : f));
        // toast is handled by the hook
        refetchDocuments(); // Refetch document list after successful upload
      },
      onError: (error) => {
        setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, status: 'error', errorMessage: error.message } : f));
        // toast is handled by the hook
      }
    });
  };
  
  useEffect(() => {
    return () => { // Cleanup Object URLs
      stagedFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    };
  }, [stagedFiles]);

  const removeStagedFile = (fileId: string) => {
    setStagedFiles(prev => prev.filter(f => {
      if (f.id === fileId && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return f.id !== fileId;
    }));
  };

  const handleProcessDocument = (docId: string) => {
    processMutation.mutate(docId);
  };

  const handleDeleteDocument = (docId: string) => {
     deleteMutation.mutate(docId);
  }

  const renderStagedFileItem = (item: UploadedFileStateClient) => (
    <div key={item.id} className="p-3 border rounded-md bg-card flex items-center gap-3 relative group">
      {item.previewUrl ? (
        <Image src={item.previewUrl} alt={`Preview of ${item.file.name}`} width={40} height={40} className="h-10 w-10 object-cover rounded-md border" data-ai-hint="document image"/>
      ) : (
        <FileText className="h-10 w-10 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-grow overflow-hidden">
        <p className="text-sm font-medium truncate" title={item.file.name}>{item.file.name}</p>
        <p className="text-xs text-muted-foreground">{(item.file.size / 1024).toFixed(1)} KB</p>
        {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5 mt-1" />}
        {item.status === 'error' && <p className="text-xs text-destructive mt-0.5">{item.errorMessage || 'Error.'}</p>}
        {item.status === 'success' && <p className="text-xs text-success mt-0.5">Uploaded (ID: {item.serverDocumentId?.substring(0,6)}...). Ready for processing.</p>}
      </div>
      <div className="flex-shrink-0">
        {item.status === 'uploading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
        {item.status === 'success' && <CheckCircle className="h-5 w-5 text-success" />}
        {item.status === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
        {item.status === 'pending_upload' && <Paperclip className="h-5 w-5 text-muted-foreground" />}
      </div>
      <Button 
        variant="ghost" size="icon" 
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={() => removeStagedFile(item.id)} aria-label="Remove file">
        <XCircle className="h-4 w-4" />
      </Button>
    </div>
  );
  
  const tabs: { value: DocumentStatus | "all"; label: string }[] = [
    { value: "all", label: "All Documents" },
    { value: "pending_ocr", label: "Pending OCR" },
    { value: "pending_review", label: "Pending Review" },
    { value: "extraction_complete", label: "Extracted" },
    { value: "approved", label: "Approved" },
    { value: "error", label: "Errors" },
  ];

  return (
    <div className="flex flex-col h-full gap-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Document Center</h1>
      </div>

      <div className="grid md:grid-cols-12 gap-6 flex-grow min-h-0">
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6 min-h-0">
          <Card 
            className={cn(
              "shadow-lg flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/70"
            )}
            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            <UploadCloud className={cn("w-16 h-16 mb-4", dragging ? "text-primary" : "text-muted-foreground")} />
            <p className="text-lg font-semibold text-center mb-1">Drag & Drop Documents</p>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Supports: {SUPPORTED_EXTENSIONS_DISPLAY} (Max {MAX_FILE_SIZE_MB}MB per file)
            </p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Paperclip className="mr-2 h-4 w-4" /> Browse Files
            </Button>
            <input ref={fileInputRef} id="fileInput" type="file" multiple className="hidden" accept={SUPPORTED_MIME_TYPES.join(',')} onChange={handleFileChange} />
          </Card>

          {stagedFiles.length > 0 && (
            <Card className="shadow-md max-h-[40vh] flex flex-col">
              <CardHeader className="pb-2"><CardTitle className="text-md font-semibold">Upload Queue ({stagedFiles.length})</CardTitle></CardHeader>
              <CardContent className="p-3 flex-grow overflow-hidden">
                 <ScrollArea className="h-full pr-3"><div className="space-y-2">{stagedFiles.map(renderStagedFileItem)}</div></ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-7 lg:col-span-8 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DocumentStatus | "all")} className="flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto">
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto">{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
                <div className="relative ml-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search" 
                        placeholder="Search by filename..." 
                        className="pl-8 w-full sm:w-56 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <Card className="shadow-lg flex-grow">
                <TabsContent value={activeTab} className="p-0 h-full mt-0">
                    <CardHeader>
                        <CardTitle className="capitalize">{activeTab.replace(/_/g, ' ')}</CardTitle>
                        <CardDescription>Browse and manage documents.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[200px]">
                        {isLoadingDocuments && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                        {!isLoadingDocuments && allFetchedDocuments.length === 0 && <p className="text-muted-foreground text-center py-10">No documents found for this filter.</p>}
                        {!isLoadingDocuments && allFetchedDocuments.length > 0 && (
                            <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
                                <div className="space-y-3 pr-4">
                                    {allFetchedDocuments.map(doc => (
                                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-3 flex items-center justify-between gap-3">
                                                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="text-sm font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Type: {doc.documentTypeHint || 'N/A'} | Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate" title={doc.extractedDataSummary}>{doc.extractedDataSummary}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                   {doc.status && <DocumentStatusBadge status={doc.status} />}
                                                    <div className="flex gap-1 mt-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                            <Link href={`/documents/processing/${doc.id}`}><Eye className="h-4 w-4" /></Link>
                                                        </Button>
                                                        {(doc.status === 'uploaded' || doc.status === 'pending_ocr' || doc.status === 'ocr_complete' || doc.status === 'extraction_complete' || doc.status === 'error') && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleProcessDocument(doc.id!)} disabled={processMutation.isPending && processMutation.variables === doc.id}>
                                                                {processMutation.isPending && processMutation.variables === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <RotateCcw className="h-4 w-4 text-blue-600" />}
                                                            </Button>
                                                        )}
                                                        {doc.status === 'extraction_complete' && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" disabled> {/* Placeholder for future approve action */}
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDocument(doc.id!)} disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}>
                                                            {deleteMutation.isPending && deleteMutation.variables === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                        {hasNextPage && (
                            <div className="pt-4 flex justify-center">
                                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                    {isFetchingNextPage ? <Loader2 className="animate-spin mr-2"/> : null} Load More
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

    