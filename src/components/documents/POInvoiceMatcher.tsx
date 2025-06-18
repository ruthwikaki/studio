
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, FileSearch, Check, Edit } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LineItemComparison {
  poSku?: string;
  poDescription?: string;
  poQuantity?: number;
  poUnitPrice?: number;
  invSku?: string;
  invDescription?: string;
  invQuantity?: number;
  invUnitPrice?: number;
  status: 'match' | 'price_diff' | 'qty_diff' | 'extra_po' | 'extra_invoice' | 'partial_match';
  notes?: string;
}

const mockMatchingResult = {
  invoiceId: "INV-2024-001",
  poId: "PO-2024-001",
  matchScore: 94,
  matches: [
    { description: "Vendor name (Fuzzy Match: 'ABC Supplies Inc.' vs 'ABC Supplies Incorporated')", confidence: 100 },
    { description: "3 of 4 line items (SKU match)", confidence: 75 },
    { description: "Total amount within 2% tolerance ($1130.00 vs $1105.00)", confidence: 90 },
  ],
  discrepancies: [
    { type: "Extra Item", description: "Invoice includes 'Rush Shipping Fee: $30.00' not on PO." },
    { type: "Price Difference", description: "SKU002: Invoice price $15.00, PO price $14.00 (+$1.00)." },
    { type: "Quantity Difference", description: "SKU003: Invoice quantity 95, PO quantity 100 (-5 units)." },
  ],
  lineItemComparisons: [
    { poSku: "SKU001", poDescription: "Blue T-Shirt", poQuantity: 100, poUnitPrice: 10.00, invSku: "SKU001", invDescription: "Blue T-Shirt (M)", invQuantity: 100, invUnitPrice: 10.00, status: 'match' },
    { poSku: "SKU002", poDescription: "Red Cap", poQuantity: 50, poUnitPrice: 14.00, invSku: "SKU002", invDescription: "Red Baseball Cap", invQuantity: 50, invUnitPrice: 15.00, status: 'price_diff', notes: 'Invoice price +$1.00' },
    { poSku: "SKU003", poDescription: "Green Socks (Pack of 3)", poQuantity: 100, poUnitPrice: 5.00, invSku: "SKU003", invDescription: "Green Crew Socks", invQuantity: 95, invUnitPrice: 5.00, status: 'qty_diff', notes: 'Invoice quantity -5' },
    { poSku: "SKU004", poDescription: "Black Belt", poQuantity: 20, poUnitPrice: 12.50, status: 'extra_po', notes: 'Item on PO, not on invoice' },
    { invSku: "SHIPPING", invDescription: "Rush Shipping Fee", invQuantity: 1, invUnitPrice: 30.00, status: 'extra_invoice', notes: 'Item on invoice, not on PO' },
  ] as LineItemComparison[],
};

const getStatusBadgeVariant = (status: LineItemComparison['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'match': return 'default'; // default is usually primary, can be styled as success
    case 'price_diff':
    case 'qty_diff':
    case 'partial_match':
      return 'secondary'; // secondary can be styled as warning
    case 'extra_po':
    case 'extra_invoice':
      return 'destructive';
    default: return 'outline';
  }
};

const StatusIcon = ({ status }: { status: LineItemComparison['status'] }) => {
  switch (status) {
    case 'match': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'price_diff':
    case 'qty_diff':
    case 'partial_match':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'extra_po':
    case 'extra_invoice':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default: return null;
  }
};

export default function POInvoiceMatcher() {
  const result = mockMatchingResult; // In a real app, this would be props or fetched data

  return (
    <div className="space-y-6 p-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 text-primary animate-spin-slow" />
            Automatic Matching Results
          </CardTitle>
          <CardDescription>
            AI has attempted to match Purchase Order <strong className="text-primary">{result.poId}</strong> with Invoice <strong className="text-primary">{result.invoiceId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Overall Match Score:</span>
            <div className="flex items-center gap-2">
              <Progress value={result.matchScore} className="w-32 h-2.5" />
              <span className="text-lg font-bold text-primary">{result.matchScore}%</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-md mb-1 flex items-center text-success">
              <CheckCircle2 className="mr-2 h-5 w-5" /> Matches Found:
            </h4>
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground">
              {result.matches.map((match, index) => (
                <li key={`match-${index}`}>
                  {match.description}
                  <span className="text-xs ml-1">({match.confidence}% conf.)</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-md mb-1 flex items-center text-warning">
              <AlertTriangle className="mr-2 h-5 w-5" /> Discrepancies Identified:
            </h4>
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground">
              {result.discrepancies.map((disc, index) => (
                <li key={`disc-${index}`}>
                  <strong className="text-foreground">{disc.type}:</strong> {disc.description}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          <Button variant="outline"><FileSearch className="mr-2 h-4 w-4" /> Find Other PO</Button>
          <Button variant="secondary"><Edit className="mr-2 h-4 w-4" /> Review & Edit Details</Button>
          <Button className="bg-primary hover:bg-primary/90"><Check className="mr-2 h-4 w-4" /> Accept Match</Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Detailed Comparison View</CardTitle>
          <CardDescription>Line-by-line comparison between PO and Invoice.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Purchase Order Item</TableHead>
                  <TableHead className="w-[35%]">Invoice Item</TableHead>
                  <TableHead className="w-[30%] text-center">Status & Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lineItemComparisons.map((item, index) => (
                  <TableRow key={`comp-${index}`} className={cn(
                    item.status === 'match' ? 'bg-success/5' : 
                    item.status.includes('diff') || item.status === 'partial_match' ? 'bg-warning/5' : 
                    item.status.includes('extra') ? 'bg-destructive/5' : ''
                  )}>
                    <TableCell className="text-xs">
                      {item.poSku ? (
                        <>
                          <p className="font-semibold">{item.poSku}: {item.poDescription}</p>
                          <p className="text-muted-foreground">{item.poQuantity} x ${item.poUnitPrice?.toFixed(2)} = ${((item.poQuantity || 0) * (item.poUnitPrice || 0)).toFixed(2)}</p>
                        </>
                      ) : <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.invSku ? (
                        <>
                          <p className="font-semibold">{item.invSku}: {item.invDescription}</p>
                          <p className="text-muted-foreground">{item.invQuantity} x ${item.invUnitPrice?.toFixed(2)} = ${((item.invQuantity || 0) * (item.invUnitPrice || 0)).toFixed(2)}</p>
                        </>
                      ) : <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs capitalize">
                          <StatusIcon status={item.status}/>
                          <span className="ml-1">{item.status.replace('_', ' ')}</span>
                        </Badge>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
