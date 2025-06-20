
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  PlusCircle,
  ThumbsUp,
  Flag,
  RotateCcw,
  Search,
  ChevronsUpDown,
  Info,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useDocumentDetail, useProcessDocument, useApproveDocument } from '@/hooks/useDocuments';
import type { InvoiceData, PurchaseOrderData, ReceiptData, DocumentMetadata } from '@/lib/types/firestore'; // Import specific types
import { Skeleton } from '@/components/ui/skeleton';

type ExtractedLineItemClient = { // Adjusted for client-side use, if needed
  id: string; // Can be index or actual ID if available
  description?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  confidence?: number;
  verified?: boolean;
};

type SpecificExtractedData = InvoiceData | PurchaseOrderData | ReceiptData | { documentType: 'unknown' | undefined; [key: string]: any };


export default function DocumentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const documentId = params.id as string;

  const { data: documentMetadata, isLoading, isError, error, refetch } = useDocumentDetail(documentId);
  const processMutation = useProcessDocument();
  const approveMutation = useApproveDocument();
  
  const extractedData = documentMetadata?.extractedData as SpecificExtractedData | undefined;
  const lineItems = extractedData?.lineItems as ExtractedLineItemClient[] || extractedData?.items as ExtractedLineItemClient[] || [];

  const handleAction = (actionName: string, details?: string) => {
    toast({
      title: `${actionName} Clicked`,
      description: details ? `${details}` : `Action for document ${documentId}. Functionality to be implemented.`,
    });
  };

  const handleProcess = () => {
    if (documentId) {
      processMutation.mutate(documentId);
    }
  };

  const handleApprove = () => {
    if (documentId) {
      approveMutation.mutate(documentId);
    }
  };
  
  const getConfidenceColor = (confidence?: number) => {
    if (confidence === undefined) return 'text-muted-foreground';
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-yellow-500';
    return 'text-destructive';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-5rem)] p-4">
        <Card className="md:w-1/2 lg:w-3/5 shadow-lg flex flex-col"><Skeleton className="h-full w-full" /></Card>
        <Card className="md:w-1/2 lg:w-2/5 shadow-lg flex flex-col"><Skeleton className="h-full w-full" /></Card>
      </div>
    );
  }

  if (isError || !documentMetadata) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Document</h2>
        <p className="text-muted-foreground mb-4">{error?.message || "Could not load document details."}</p>
        <Button onClick={() => router.push('/documents')}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Documents</Button>
      </div>
    );
  }
  
  const documentUrl = documentMetadata.fileUrl || "https://placehold.co/600x800.png?text=Document+Preview";
  const overallConfidence = documentMetadata.extractionConfidence;
  const documentTypeDisplay = extractedData?.documentType?.replace('_', ' ') || documentMetadata.documentTypeHint?.replace('_', ' ') || 'Unknown Type';
  const referenceNumberDisplay = extractedData?.invoiceNumber || extractedData?.poNumber || extractedData?.receiptId || extractedData?.transactionId || 'N/A';
  const vendorNameDisplay = extractedData?.vendorDetails?.name || extractedData?.supplierDetails?.name || extractedData?.vendorName || 'N/A';
  const dateDisplay = extractedData?.invoiceDate || extractedData?.orderDate || extractedData?.receiptDate;
  const dueDateDisplay = extractedData?.dueDate;
  const totalAmountDisplay = extractedData?.totalAmount;
  const currencyDisplay = extractedData?.currency || 'USD';


  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-5rem)] p-4">
      <Card className="md:w-1/2 lg:w-3/5 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline flex items-center justify-between">
            Document Viewer: {documentMetadata.fileName}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleAction("Zoom In")}><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handleAction("Zoom Out")}><ZoomOut className="h-4 w-4" /></Button>
            </div>
          </CardTitle>
          <CardDescription>ID: {documentId} | Status: <span className="font-semibold">{documentMetadata.status}</span></CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center bg-muted/30 p-2 relative">
            {documentMetadata.fileType?.startsWith('image/') ? (
                <Image 
                    src={documentUrl} 
                    alt={`Document ${documentId} Preview`} 
                    layout="fill" 
                    objectFit="contain"
                    data-ai-hint="invoice document"
                />
            ) : documentMetadata.fileType === 'application/pdf' ? (
                 <iframe src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} title={documentMetadata.fileName} className="w-full h-full border-0"></iframe>
            ) : (
                <div className="text-center text-muted-foreground">
                    <FileText className="h-24 w-24 mx-auto mb-2" />
                    <p>Preview not available for this file type ({documentMetadata.fileType}).</p>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2 inline-block">Download Document</a>
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="md:w-1/2 lg:w-2/5 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline flex items-center justify-between">
            Extracted Data
            {overallConfidence !== undefined && (
                <span className={cn("text-sm font-medium px-2 py-1 rounded-md", getConfidenceColor(overallConfidence))}>
                Overall Conf: {(overallConfidence * 100).toFixed(0)}%
                </span>
            )}
          </CardTitle>
          <CardDescription>Review and verify. Fields may be editable based on document status.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-grow">
            <CardContent className="p-4 space-y-4">
                {!extractedData || extractedData.documentType === 'unknown' ? (
                    <div className="text-center py-10">
                        <Info className="h-10 w-10 mx-auto mb-3 text-muted-foreground"/>
                        <p className="text-muted-foreground">
                            {documentMetadata.status === 'processing_extraction' ? "AI is extracting data..." :
                             documentMetadata.status === 'error' ? `Error during processing: ${documentMetadata.processingError}` :
                             "No data extracted yet, or document type is unknown."}
                        </p>
                        {(documentMetadata.status !== 'processing_extraction' && documentMetadata.status !== 'approved') && (
                            <Button onClick={handleProcess} disabled={processMutation.isPending} className="mt-4">
                                {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {documentMetadata.status === 'error' ? 'Retry Processing' : 'Start Data Extraction'}
                            </Button>
                        )}
                    </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold capitalize">{documentTypeDisplay}: {referenceNumberDisplay}</h3>
                    </div>
                    
                    <div className="space-y-2 p-3 border rounded-md bg-background">
                        <Label htmlFor="vendorName" className="font-semibold">Vendor/Supplier</Label>
                        <Input id="vendorName" defaultValue={vendorNameDisplay} readOnly className="flex-grow" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="invoiceDate">Date</Label>
                            <Input id="invoiceDate" type="text" value={dateDisplay ? new Date(dateDisplay).toLocaleDateString() : 'N/A'} readOnly />
                        </div>
                        {dueDateDisplay && (
                            <div className="space-y-1">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input id="dueDate" type="text" value={new Date(dueDateDisplay).toLocaleDateString()} readOnly />
                            </div>
                        )}
                    </div>
                    
                    <Separator />

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Line Items ({lineItems.length})</h4>
                            {/* <Button variant="outline" size="sm" onClick={() => handleAction("Add Line Item")} disabled><PlusCircle className="mr-2 h-4 w-4" /> Add</Button> */}
                        </div>
                        {lineItems.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {lineItems.map((item, index) => (
                                    <Card key={item.id || `li-${index}`} className="bg-muted/20 p-3">
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <div className="col-span-3">
                                                <Label>Description</Label>
                                                <Textarea defaultValue={item.description} rows={1} className="text-xs" readOnly/>
                                            </div>
                                            <div>
                                                <Label>SKU</Label>
                                                <Input defaultValue={item.sku} className="text-xs" readOnly/>
                                            </div>
                                             <div>
                                                <Label>Qty</Label>
                                                <Input type="number" defaultValue={item.quantity} className="text-xs" readOnly/>
                                            </div>
                                            <div>
                                                <Label>Unit Price</Label>
                                                <Input type="number" step="0.01" defaultValue={item.unitPrice?.toFixed(2)} className="text-xs" readOnly/>
                                            </div>
                                        </div>
                                        <div className="text-right font-semibold text-sm">
                                            Total: {currencyDisplay} {(item.total || (item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : <p className="text-xs text-muted-foreground">No line items extracted.</p>}
                    </div>
                    
                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                            <span>Total Amount:</span>
                            <div className="flex items-center gap-2">
                                <span>{currencyDisplay} {totalAmountDisplay?.toFixed(2) || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                  </>
                )}
            </CardContent>
        </ScrollArea>
        <CardFooter className="border-t p-4 flex-col sm:flex-row justify-center sm:justify-end gap-2">
            {(documentMetadata.status !== 'processing_extraction' && documentMetadata.status !== 'approved') && (
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleProcess} disabled={processMutation.isPending || documentMetadata.status === 'pending_ocr' || documentMetadata.status === 'uploaded'}>
                    {processMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                    {documentMetadata.status === 'error' || documentMetadata.status === 'pending_review' || documentMetadata.status === 'extraction_complete' ? 'Re-process' : 'Process Document'}
                </Button>
            )}
            <Button 
              variant="default" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={handleApprove} 
              disabled={approveMutation.isPending || documentMetadata.status !== 'extraction_complete' && documentMetadata.status !== 'processed' && documentMetadata.status !== 'pending_review' }
            >
                {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4"/>}
                Approve Document
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    