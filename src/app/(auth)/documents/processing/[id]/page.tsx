
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ThumbsUp, RotateCcw, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useDocumentDetail, useProcessDocument, useApproveDocument } from '@/hooks/useDocuments';
import type { InvoiceData, PurchaseOrderData, ReceiptData, DocumentMetadata } from '@/lib/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type ExtractedLineItemClient = {
  description?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
};

type SpecificExtractedData = InvoiceData | PurchaseOrderData | ReceiptData | { documentType: 'unknown' | undefined; [key: string]: any };

export default function DocumentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const { data: documentMetadata, isLoading, isError, error } = useDocumentDetail(documentId);
  const processMutation = useProcessDocument();
  const approveMutation = useApproveDocument();
  
  const extractedData = documentMetadata?.extractedData as SpecificExtractedData | undefined;
  const lineItems = extractedData?.lineItems as ExtractedLineItemClient[] || extractedData?.items as ExtractedLineItemClient[] || [];
  
  const getConfidenceColor = (confidence?: number) => {
    if (confidence === undefined) return 'text-muted-foreground';
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-yellow-500';
    return 'text-destructive';
  };

  if (isLoading) {
    return <div className="flex gap-6 h-[calc(100vh-5rem)] p-4"><Card className="md:w-1/2 lg:w-3/5"><Skeleton className="h-full w-full" /></Card><Card className="md:w-1/2 lg:w-2/5"><Skeleton className="h-full w-full" /></Card></div>;
  }

  if (isError || !documentMetadata) {
    return <div className="flex flex-col items-center justify-center h-full text-center p-4"><AlertCircle className="w-16 h-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold mb-2">Error Loading Document</h2><p className="text-muted-foreground mb-4">{error?.message || "Could not load document details."}</p><Button onClick={() => router.push('/documents')}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Documents</Button></div>;
  }
  
  const documentUrl = documentMetadata.fileUrl;
  const overallConfidence = documentMetadata.extractionConfidence;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-5rem)] p-4">
      <Card className="md:w-1/2 lg:w-3/5 shadow-lg flex flex-col">
        <CardHeader className="border-b"><CardTitle className="font-headline">Document Viewer: {documentMetadata.fileName}</CardTitle><CardDescription>Status: <span className="font-semibold">{documentMetadata.status}</span></CardDescription></CardHeader>
        <CardContent className="flex-grow flex items-center justify-center bg-muted/30 p-2 relative">
            {documentMetadata.fileType?.startsWith('image/') ? (<Image src={documentUrl} alt={`Preview`} layout="fill" objectFit="contain" data-ai-hint="invoice document" />)
            : documentMetadata.fileType === 'application/pdf' ? (<iframe src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} title={documentMetadata.fileName} className="w-full h-full border-0"></iframe>)
            : (<div className="text-center text-muted-foreground"><FileText className="h-24 w-24 mx-auto mb-2" /><p>Preview not available.</p><a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2 inline-block">Download Document</a></div>)}
        </CardContent>
      </Card>
      <Card className="md:w-1/2 lg:w-2/5 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline flex items-center justify-between">Extracted Data {overallConfidence !== undefined && (<span className={cn("text-sm font-medium px-2 py-1 rounded-md", getConfidenceColor(overallConfidence))}>Conf: {(overallConfidence * 100).toFixed(0)}%</span>)}</CardTitle>
          <CardDescription>Review and verify the extracted information.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-grow"><CardContent className="p-4 space-y-4">{!extractedData || extractedData.documentType === 'unknown' ? (<div className="text-center py-10"><p className="text-muted-foreground">No data extracted yet or document type is unknown.</p></div>) : (<>
          <div className="space-y-2 p-3 border rounded-md bg-background"><Label htmlFor="vendorName" className="font-semibold">Vendor/Supplier</Label><Input id="vendorName" defaultValue={extractedData?.vendorDetails?.name || extractedData?.supplierDetails?.name || extractedData?.vendorName || 'N/A'} readOnly /></div>
          <div><h4 className="font-semibold mb-2">Line Items ({lineItems.length})</h4>{lineItems.length > 0 ? (<div className="space-y-3 max-h-60 overflow-y-auto pr-2">{lineItems.map((item, index) => (<Card key={index} className="bg-muted/20 p-3"><p className="font-semibold">{item.description}</p><p className="text-xs">SKU: {item.sku || 'N/A'} | Qty: {item.quantity} | Unit Price: ${item.unitPrice?.toFixed(2)}</p><div className="text-right font-semibold">Total: ${(item.total || 0).toFixed(2)}</div></Card>))}</div>) : <p className="text-xs">No line items extracted.</p>}</div>
          <Separator />
          <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><span>Total Amount:</span><span>{extractedData?.currency} {extractedData?.totalAmount?.toFixed(2) || 'N/A'}</span></div>
        </>)}</CardContent></ScrollArea>
        <CardFooter className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => processMutation.mutate(documentId)} disabled={processMutation.isPending}>{processMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>} Re-process</Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => approveMutation.mutate(documentId)} disabled={approveMutation.isPending || !['extraction_complete', 'processed', 'pending_review'].includes(documentMetadata.status)}>{approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4"/>} Approve</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
