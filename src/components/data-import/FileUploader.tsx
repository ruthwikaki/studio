
"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUploadInventoryFile } from '@/hooks/useInventory'; // Import the hook

interface UploadedFileState {
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error' | 'pending_selection';
  progress?: number; // Only relevant for 'uploading'
  errorMessage?: string;
  aiInsights?: any; // To store AI insights after successful processing
}

export default function FileUploader() {
  const [dragging, setDragging] = useState(false);
  const [uploadedFileState, setUploadedFileState] = useState<UploadedFileState | null>(null);
  const { toast } = useToast();
  const uploadInventoryMutation = useUploadInventoryFile();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processAndInitiateUpload(file);
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
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processAndInitiateUpload(file);
    }
  };

  const processAndInitiateUpload = (file: File) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a CSV or Excel file.",
        variant: "destructive",
      });
      setUploadedFileState({
        name: file.name, size: file.size, type: file.type,
        status: 'error', errorMessage: "Unsupported file type."
      });
      return;
    }

    if (file.size > maxFileSize) {
       toast({
        title: "File Too Large",
        description: `File size should not exceed ${maxFileSize / (1024*1024)}MB.`,
        variant: "destructive",
      });
       setUploadedFileState({
        name: file.name, size: file.size, type: file.type,
        status: 'error', errorMessage: "File too large."
      });
      return;
    }

    setUploadedFileState({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending_selection', // Indicates file is selected, ready for "Process" button
    });
  };
  
  const handleProcessFile = () => {
    if (!uploadedFileState || uploadedFileState.status !== 'pending_selection') return;

    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
        toast({ title: "No File", description: "Could not find the file to process.", variant: "destructive" });
        return;
    }

    setUploadedFileState(prev => prev ? { ...prev, status: 'uploading', progress: 0, errorMessage: undefined, aiInsights: undefined } : null);

    const formData = new FormData();
    formData.append('file', file);

    uploadInventoryMutation.mutate(formData, {
      onSuccess: (data) => {
        setUploadedFileState(prev => prev ? { ...prev, status: 'success', progress: 100, aiInsights: data.aiInsights } : null);
        // Toast is handled by the hook
      },
      onError: (error) => {
        setUploadedFileState(prev => prev ? { ...prev, status: 'error', errorMessage: error.message } : null);
        // Toast is handled by the hook
      }
    });
  };
  
  const removeFile = () => {
    setUploadedFileState(null);
    const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
    if (fileInput) fileInput.value = ""; // Reset file input
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Upload Inventory Data</CardTitle>
        <CardDescription>Drag and drop your CSV or Excel file, or click to select. After selecting, click "Process Imported Data".</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70",
            uploadedFileState && uploadedFileState.status !== 'error' && "border-muted"
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

        {uploadedFileState && (
          <Card className={cn("mt-4", 
            uploadedFileState.status === 'error' ? 'bg-destructive/10 border-destructive' : 'bg-secondary/50'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {uploadedFileState.status === 'success' && <CheckCircle className="w-6 h-6 text-success" />}
                  {uploadedFileState.status === 'error' && <AlertCircle className="w-6 h-6 text-destructive-foreground" />}
                  {(uploadedFileState.status === 'uploading' || uploadedFileState.status === 'pending_selection') && <FileText className="w-6 h-6 text-primary" />}
                  <div>
                    <p className="text-sm font-semibold">{uploadedFileState.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFileState.size / (1024 * 1024)).toFixed(2)} MB - {uploadedFileState.type}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeFile}>Remove</Button>
              </div>
              {uploadedFileState.status === 'uploading' && (
                <div className="mt-2">
                    <Progress value={uploadInventoryMutation.isPending ? uploadedFileState.progress ?? 50 : 100} className="w-full h-2" />
                    <p className="text-xs text-primary mt-1 text-center">Processing file with AI...</p>
                </div>
              )}
               {uploadedFileState.status === 'error' && (
                <p className="text-sm text-destructive-foreground mt-2">{uploadedFileState.errorMessage || "An unknown error occurred."}</p>
              )}
              {uploadedFileState.status === 'success' && uploadedFileState.aiInsights && (
                <div className="mt-4 p-3 border rounded-md bg-background">
                  <h4 className="text-sm font-semibold mb-2">AI Analysis Insights:</h4>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-60">
                    {JSON.stringify(uploadedFileState.aiInsights, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
         <div className="flex justify-end mt-6">
            <Button 
              onClick={handleProcessFile}
              disabled={!uploadedFileState || uploadedFileState.status !== 'pending_selection' || uploadInventoryMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {uploadInventoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Imported Data
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}

    