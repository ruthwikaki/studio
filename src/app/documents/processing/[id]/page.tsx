
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
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Mock data types - In a real app, these would come from your Genkit flow output
interface ExtractedLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence?: number;
  verified?: boolean;
}

interface ExtractedData {
  documentId: string;
  documentType: 'Invoice' | 'Purchase Order' | 'Receipt';
  referenceNumber?: string; // Invoice #, PO #
  referenceNumberConfidence?: number;
  vendorName?: string;
  vendorNameConfidence?: number;
  vendorNameVerified?: boolean;
  invoiceDate?: string;
  dueDate?: string;
  orderDate?: string;
  lineItems: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  shipping?: number;
  totalAmount?: number;
  totalAmountConfidence?: number;
  overallConfidence?: number;
  currency?: string;
}

// Mock data for demonstration
const mockExtractedData: ExtractedData = {
  documentId: 'DOC12345',
  documentType: 'Invoice',
  referenceNumber: 'INV-2024-001',
  referenceNumberConfidence: 0.98,
  vendorName: 'ABC Supplies Inc.',
  vendorNameConfidence: 0.95,
  vendorNameVerified: true,
  invoiceDate: '2024-03-15',
  dueDate: '2024-04-15',
  lineItems: [
    { id: 'li1', sku: 'SKU001', description: 'Blue T-Shirts, Size M', quantity: 100, unitPrice: 10.00, total: 1000.00, confidence: 0.88, verified: false },
    { id: 'li2', sku: 'SKU002', description: 'Red Caps, One Size', quantity: 50, unitPrice: 7.50, total: 375.00, confidence: 0.92, verified: true },
  ],
  subtotal: 1375.00,
  tax: 110.00,
  shipping: 50.00,
  totalAmount: 1535.00,
  totalAmountConfidence: 0.99,
  currency: 'USD',
  overallConfidence: 0.92,
};


export default function DocumentProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const documentId = params.id as string; // In a real app, fetch data based on this ID

  // Placeholder for actual document image/PDF URL
  const documentUrl = "https://placehold.co/600x800.png?text=Document+Preview";

  const handleAction = (actionName: string, details?: string) => {
    toast({
      title: `${actionName} Clicked`,
      description: details ? `${details}` : `Action for document ${documentId}. Functionality to be implemented.`,
    });
  };
  
  const getConfidenceColor = (confidence?: number) => {
    if (confidence === undefined) return 'text-muted-foreground';
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-yellow-500'; // Generic yellow
    return 'text-destructive';
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-5rem)] p-4">
      {/* Left Side: Document Viewer Placeholder */}
      <Card className="md:w-1/2 lg:w-3/5 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline flex items-center justify-between">
            Document Viewer
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleAction("Zoom In")}><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handleAction("Zoom Out")}><ZoomOut className="h-4 w-4" /></Button>
            </div>
          </CardTitle>
          <CardDescription>Document ID: {documentId} (Actual viewer with highlighting/OCR boxes is planned)</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center bg-muted/30 p-2 relative">
            <Image 
                src={documentUrl} 
                alt={`Document ${documentId} Preview`} 
                layout="fill" 
                objectFit="contain"
                data-ai-hint="invoice document"
            />
          {/* Placeholder for PDF/Image viewer controls and annotations */}
        </CardContent>
        <CardFooter className="p-2 border-t text-xs text-muted-foreground justify-center">
            Hover over fields on the right to see them highlighted here (conceptual).
        </CardFooter>
      </Card>

      {/* Right Side: Extracted Data & Actions */}
      <Card className="md:w-1/2 lg:w-2/5 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline flex items-center justify-between">
            Extracted Data
            <span className={cn("text-sm font-medium px-2 py-1 rounded-md", getConfidenceColor(mockExtractedData.overallConfidence))}>
              Overall Confidence: {(mockExtractedData.overallConfidence || 0) * 100}%
            </span>
          </CardTitle>
          <CardDescription>Review and verify the extracted information. Make corrections if necessary.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-grow">
            <CardContent className="p-4 space-y-4">
                {/* Document Type & Reference */}
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{mockExtractedData.documentType}: {mockExtractedData.referenceNumber}</h3>
                    <span className={cn("text-xs", getConfidenceColor(mockExtractedData.referenceNumberConfidence))}>
                        Conf: {(mockExtractedData.referenceNumberConfidence || 0) * 100}%
                    </span>
                </div>
                
                {/* Vendor Details */}
                 <div className="space-y-2 p-3 border rounded-md bg-background">
                    <Label htmlFor="vendorName" className="font-semibold">Vendor</Label>
                    <div className="flex items-center gap-2">
                        <Input id="vendorName" defaultValue={mockExtractedData.vendorName} className="flex-grow" />
                        <Button variant="ghost" size="icon" onClick={() => handleAction("Verify Field", "Vendor Name")}>
                            <CheckCircle2 className={cn("h-5 w-5", mockExtractedData.vendorNameVerified ? "text-success" : "text-muted-foreground")} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleAction("Check Field", "Vendor Name")}>
                            <Search className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                    <p className={cn("text-xs", getConfidenceColor(mockExtractedData.vendorNameConfidence))}>
                        Name Confidence: {(mockExtractedData.vendorNameConfidence || 0) * 100}%
                    </p>
                 </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="invoiceDate">Invoice Date</Label>
                        <Input id="invoiceDate" type="date" defaultValue={mockExtractedData.invoiceDate} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" type="date" defaultValue={mockExtractedData.dueDate} />
                    </div>
                </div>
                
                <Separator />

                {/* Line Items */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Line Items</h4>
                        <Button variant="outline" size="sm" onClick={() => handleAction("Add Line Item")}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {mockExtractedData.lineItems.map(item => (
                            <Card key={item.id} className="bg-muted/20 p-3">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div className="col-span-2">
                                        <Label htmlFor={`desc-${item.id}`}>Description</Label>
                                        <Textarea id={`desc-${item.id}`} defaultValue={item.description} rows={2} className="text-xs"/>
                                    </div>
                                    <div>
                                        <Label htmlFor={`sku-${item.id}`}>SKU</Label>
                                        <Input id={`sku-${item.id}`} defaultValue={item.sku} className="text-xs"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 items-end">
                                    <div>
                                        <Label htmlFor={`qty-${item.id}`}>Qty</Label>
                                        <Input id={`qty-${item.id}`} type="number" defaultValue={item.quantity} className="text-xs"/>
                                    </div>
                                    <div>
                                        <Label htmlFor={`price-${item.id}`}>Unit Price</Label>
                                        <Input id={`price-${item.id}`} type="number" step="0.01" defaultValue={item.unitPrice.toFixed(2)} className="text-xs"/>
                                    </div>
                                    <div>
                                        <Label>Total</Label>
                                        <p className="text-sm font-semibold p-2 border rounded-md bg-background">
                                            {mockExtractedData.currency} {(item.quantity * item.unitPrice).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                     <p className={cn("text-xs", getConfidenceColor(item.confidence))}>
                                        Item Confidence: {(item.confidence || 0) * 100}%
                                    </p>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAction("Verify Line Item", item.description)}>
                                            <CheckCircle2 className={cn("h-4 w-4", item.verified ? "text-success" : "text-muted-foreground")} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAction("Edit Line Item", item.description)}>
                                            <Edit3 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAction("Delete Line Item", item.description)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
                
                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold">{mockExtractedData.currency} {mockExtractedData.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tax:</span>
                        <Input defaultValue={mockExtractedData.tax?.toFixed(2)} className="w-24 h-8 text-right text-sm" />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Shipping:</span>
                         <Input defaultValue={mockExtractedData.shipping?.toFixed(2)} className="w-24 h-8 text-right text-sm" />
                    </div>
                     <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                        <span>Total Amount:</span>
                        <div className="flex items-center gap-2">
                            <span>{mockExtractedData.currency} {mockExtractedData.totalAmount?.toFixed(2)}</span>
                            <Info size={14} className={cn(getConfidenceColor(mockExtractedData.totalAmountConfidence))} title={`Confidence: ${(mockExtractedData.totalAmountConfidence || 0) * 100}%`}/>
                        </div>
                    </div>
                </div>

            </CardContent>
        </ScrollArea>
        <CardFooter className="border-t p-4 flex-col sm:flex-row justify-center sm:justify-end gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleAction("Recalculate Totals")}>
                <RotateCcw className="mr-2 h-4 w-4"/> Recalculate
            </Button>
            <Button variant="destructive_outline" className="w-full sm:w-auto" onClick={() => handleAction("Flag for Review")}>
                <Flag className="mr-2 h-4 w-4"/> Flag for Review
            </Button>
             <Button className="w-full sm:w-auto" onClick={() => handleAction("Approve Document")} >
                <ThumbsUp className="mr-2 h-4 w-4"/> Approve Document
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


    