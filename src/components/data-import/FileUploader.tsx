"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  previewData?: string[][]; // For CSV/Excel preview
}

export default function FileUploader() {
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // You can add custom drag over effects here if needed
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Basic validation for CSV/Excel (client-side, can be more robust)
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a CSV or Excel file.",
        variant: "destructive",
      });
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'error',
        progress: 0,
      });
      return;
    }

    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    });

    // Simulate upload progress and parsing
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress <= 100) {
        setUploadedFile(prev => prev ? { ...prev, progress } : null);
      } else {
        clearInterval(interval);
        // Simulate parsing for preview (first few rows)
        // For actual parsing, you'd use a library like PapaParse (CSV) or SheetJS (Excel)
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            let previewData: string[][] = [];
            if (file.type === 'text/csv' && text) {
                previewData = text.split('\n').slice(0, 5).map(row => row.split(',').slice(0, 5));
            } else { // For Excel, parsing is more complex, show placeholder
                previewData = [["Excel Preview Unavailable","Please verify columns after upload"]];
            }
            setUploadedFile(prev => prev ? { ...prev, status: 'success', previewData } : null);
            toast({
                title: "File Uploaded Successfully",
                description: `${file.name} is ready for processing.`,
            });
        };
        reader.onerror = () => {
            setUploadedFile(prev => prev ? { ...prev, status: 'error' } : null);
            toast({
                title: "File Read Error",
                description: `Could not read ${file.name}.`,
                variant: "destructive",
            });
        };
        reader.readAsText(file); // Simple text read for CSV, Excel needs more
      }
    }, 200);
  };
  
  const removeFile = () => {
    setUploadedFile(null);
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Upload Inventory Data</CardTitle>
        <CardDescription>Drag and drop your CSV or Excel file, or click to select.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70",
            uploadedFile && "border-muted"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
          role="button"
          tabIndex={0}
          aria-label="File upload zone"
        >
          <UploadCloud className={cn("w-12 h-12 mb-4", dragging ? "text-primary" : "text-muted-foreground")} />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">CSV or Excel files (MAX. 10MB)</p>
          <input
            id="fileInput"
            type="file"
            className="hidden"
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
          />
        </div>

        {uploadedFile && (
          <Card className="mt-4 bg-secondary/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {uploadedFile.status === 'success' && <CheckCircle className="w-6 h-6 text-success" />}
                  {uploadedFile.status === 'error' && <AlertCircle className="w-6 h-6 text-destructive" />}
                  {uploadedFile.status === 'uploading' && <FileText className="w-6 h-6 text-primary" />}
                  <div>
                    <p className="text-sm font-semibold">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB - {uploadedFile.type}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeFile}>Remove</Button>
              </div>
              {uploadedFile.status === 'uploading' && (
                <Progress value={uploadedFile.progress} className="w-full mt-2 h-2" />
              )}
              {uploadedFile.status === 'success' && uploadedFile.previewData && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Data Preview (first 5 rows/columns):</h4>
                  <div className="overflow-x-auto rounded-md border text-xs">
                    <table className="w-full">
                      <tbody>
                        {uploadedFile.previewData.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 ? "bg-muted/50 font-medium" : ""}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 border-b border-r whitespace-nowrap">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">This is a simplified preview. Full data validation will occur upon processing.</p>
                </div>
              )}
               {uploadedFile.status === 'error' && (
                <p className="text-sm text-destructive mt-2">There was an error with this file. Please try a different file or check the format.</p>
              )}
            </CardContent>
          </Card>
        )}
         <div className="flex justify-end mt-6">
            <Button 
              disabled={!uploadedFile || uploadedFile.status !== 'success'} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => toast({ title: "Processing Initiated", description: "Your data is being processed."})}
            >
              Process Imported Data
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}
