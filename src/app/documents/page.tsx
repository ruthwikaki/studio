
"use client";

import { useState, useCallback, ChangeEvent, DragEvent, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Used for hidden file input
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, UploadCloud, Camera, FileText, XCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

// Interface for uploaded file state
interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error' | 'pending';
  progress: number;
  previewUrl?: string; // For image previews
  errorMessage?: string;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const SUPPORTED_EXTENSIONS_DISPLAY = 'PDF, PNG, JPG, JPEG';

export default function DocumentsPage() {
  const [dragging, setDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // You can add custom drag over effects here if needed
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(event.target.files);
    }
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const newFilesToUpload: UploadedFile[] = [];

    Array.from(files).forEach(file => {
      const fileId = `${file.name}-${file.lastModified}-${file.size}`;
      if (uploadedFiles.some(f => f.id === fileId)) {
        toast({ title: "Duplicate File", description: `${file.name} is already in the list.`, variant: "default" });
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        newFilesToUpload.push({
          id: fileId,
          file,
          status: 'error',
          progress: 0,
          errorMessage: `File exceeds ${MAX_FILE_SIZE_MB}MB limit.`
        });
        return;
      }

      if (!SUPPORTED_MIME_TYPES.includes(file.type) && !SUPPORTED_MIME_TYPES.some(type => file.name.toLowerCase().endsWith(type.split('/')[1]))) {
         newFilesToUpload.push({
          id: fileId,
          file,
          status: 'error',
          progress: 0,
          errorMessage: `Unsupported file type. Please use ${SUPPORTED_EXTENSIONS_DISPLAY}.`
        });
        return;
      }
      
      let previewUrl;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      newFilesToUpload.push({
        id: fileId,
        file,
        status: 'pending',
        progress: 0,
        previewUrl
      });
    });
    
    setUploadedFiles(prev => [...prev, ...newFilesToUpload]);
    newFilesToUpload.filter(f => f.status === 'pending').forEach(simulateUpload);
  };

  const simulateUpload = (uploadedFileEntry: UploadedFile) => {
    setUploadedFiles(prev => prev.map(f => f.id === uploadedFileEntry.id ? { ...f, status: 'uploading', progress: 0 } : f));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadedFiles(prev => prev.map(f => f.id === uploadedFileEntry.id ? { ...f, progress: Math.min(progress, 100) } : f));

      if (progress >= 100) {
        clearInterval(interval);
        // Simulate success/failure
        const success = Math.random() > 0.2; // 80% success rate
        setUploadedFiles(prev => prev.map(f => f.id === uploadedFileEntry.id ? { 
            ...f, 
            status: success ? 'success' : 'error',
            errorMessage: success ? undefined : 'Simulated upload failure.'
        } : f));
        
        if(success) {
            toast({ title: "Upload Complete", description: `${uploadedFileEntry.file.name} processed.` });
        } else {
            toast({ title: "Upload Failed", description: `${uploadedFileEntry.file.name} could not be processed.`, variant: "destructive" });
        }
      }
    }, 300);
  };
  
  useEffect(() => {
    // Cleanup Object URLs
    return () => {
      uploadedFiles.forEach(uploadedFileEntry => {
        if (uploadedFileEntry.previewUrl) {
          URL.revokeObjectURL(uploadedFileEntry.previewUrl);
        }
      });
    };
  }, [uploadedFiles]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => {
        if (f.id === fileId && f.previewUrl) {
            URL.revokeObjectURL(f.previewUrl);
        }
        return f.id !== fileId;
    }));
  };

  const renderFileItem = (item: UploadedFile) => (
    <div key={item.id} className="p-3 border rounded-md bg-card flex items-center gap-3 relative group">
      {item.previewUrl ? (
        <Image src={item.previewUrl} alt={`Preview of ${item.file.name}`} width={40} height={40} className="h-10 w-10 object-cover rounded-md border" data-ai-hint="document image"/>
      ) : (
        <FileText className="h-10 w-10 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-grow overflow-hidden">
        <p className="text-sm font-medium truncate" title={item.file.name}>{item.file.name}</p>
        <p className="text-xs text-muted-foreground">{(item.file.size / 1024).toFixed(1)} KB - {item.file.type || 'Unknown type'}</p>
        {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5 mt-1" />}
        {item.status === 'error' && <p className="text-xs text-destructive mt-0.5">{item.errorMessage || 'Error processing file.'}</p>}
      </div>
      <div className="flex-shrink-0">
        {item.status === 'uploading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
        {item.status === 'success' && <CheckCircle className="h-5 w-5 text-success" />}
        {item.status === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
        {item.status === 'pending' && <Paperclip className="h-5 w-5 text-muted-foreground" />}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={() => removeFile(item.id)}
        aria-label="Remove file"
      >
        <XCircle className="h-4 w-4" />
      </Button>
    </div>
  );

  const handleTakePhoto = () => {
    toast({ title: "Camera Access", description: "Taking a photo requires camera access. This feature is conceptual and not yet implemented." });
  };

  const recentFilesMock = ["invoice_001.pdf", "PO_2024_03.pdf", "receipt_store.jpg"];

  return (
    <div className="flex flex-col h-full gap-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Document Center</h1>
      </div>

      <div className="grid md:grid-cols-12 gap-6 flex-grow min-h-0"> {/* Ensure grid takes remaining height */}
        {/* Left Column: Upload Area and File List */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6 min-h-0">
          <Card 
            className={cn(
              "shadow-lg flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/70"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadCloud className={cn("w-16 h-16 mb-4", dragging ? "text-primary" : "text-muted-foreground")} />
            <p className="text-lg font-semibold text-center mb-1">Drag & Drop Documents Here</p>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Supports: {SUPPORTED_EXTENSIONS_DISPLAY} (Max {MAX_FILE_SIZE_MB}MB per file)
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Paperclip className="mr-2 h-4 w-4" /> Browse Files
              </Button>
              <Button onClick={handleTakePhoto} variant="outline">
                <Camera className="mr-2 h-4 w-4" /> Take Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              multiple
              className="hidden"
              accept={SUPPORTED_MIME_TYPES.join(',')}
              onChange={handleFileChange}
            />
            <div className="w-full border-t border-dashed border-border pt-4 mt-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">Recent Uploads (Mock):</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                    {recentFilesMock.map(name => <li key={name} className="truncate">📄 {name}</li>)}
                </ul>
            </div>
          </Card>

          {uploadedFiles.length > 0 && (
            <Card className="shadow-md max-h-[40vh] flex flex-col"> {/* Constrain height of this card */}
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-semibold">Upload Queue ({uploadedFiles.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-grow overflow-hidden">
                 <ScrollArea className="h-full pr-3">
                    <div className="space-y-2">
                        {uploadedFiles.map(renderFileItem)}
                    </div>
                 </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Tabs for Document Processing */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col min-h-0">
          <Tabs defaultValue="active" className="flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
              <TabsTrigger value="active">Active Documents</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
              <TabsTrigger value="disputes">Disputes</TabsTrigger>
            </TabsList>
            <Card className="shadow-lg flex-grow">
              <TabsContent value="active" className="p-0 h-full">
                <CardHeader>
                  <CardTitle>Active Documents</CardTitle>
                  <CardDescription>Documents currently being processed or requiring attention.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                  <p>No active documents to display.</p>
                </CardContent>
              </TabsContent>
              <TabsContent value="pending" className="p-0 h-full">
                <CardHeader>
                  <CardTitle>Pending Approval</CardTitle>
                  <CardDescription>Documents awaiting your review and approval.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                  <p>No documents pending approval.</p>
                </CardContent>
              </TabsContent>
              <TabsContent value="processed" className="p-0 h-full">
                <CardHeader>
                  <CardTitle>Processed Documents</CardTitle>
                  <CardDescription>Successfully processed and archived documents.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                  <p>No processed documents found.</p>
                </CardContent>
              </TabsContent>
              <TabsContent value="disputes" className="p-0 h-full">
                <CardHeader>
                  <CardTitle>Disputed Documents</CardTitle>
                  <CardDescription>Documents with discrepancies or requiring resolution.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                  <p>No disputed documents.</p>
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
