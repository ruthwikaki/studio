
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Bot, User, Send, Loader2, FileJson, CornerDownLeft, ClipboardCopy, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { UiChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOCK_INVENTORY_JSON_STRING, AI_CHAT_ATTACHMENT_ICON as AttachmentIcon } from '@/lib/constants';

const suggestedQueriesList = [
  "What items need reordering?",
  "Show me dead stock",
  "Analyze my inventory turnover",
  "Which products have the highest value?",
];

const SESSION_STORAGE_KEY = 'aiChatHistory';
const SESSION_DATA_KEY = 'aiChatInventoryData';
const SESSION_FILENAME_KEY = 'aiChatInventoryFileName';
const SESSION_ID_KEY = 'aiChatSessionId';


export default function AIChatInterface() {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryDataForChat, setInventoryDataForChat] = useState(MOCK_INVENTORY_JSON_STRING);
  const [inventoryFileName, setInventoryFileName] = useState<string | null>("Sample Data");
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const storedMessages = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const storedData = sessionStorage.getItem(SESSION_DATA_KEY);
      const storedFileName = sessionStorage.getItem(SESSION_FILENAME_KEY);
      const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);

      if (storedMessages) {
        setMessages(JSON.parse(storedMessages).map((msg: UiChatMessage) => ({...msg, timestamp: new Date(msg.timestamp)})));
      } else {
         setMessages([
            {
              id: 'initial-greeting',
              role: 'assistant',
              content: "Hello! I'm your AI Inventory Assistant. How can I help you with your inventory today? The sample inventory data is pre-loaded. You can also paste your inventory data in JSON format below, or upload a JSON file to analyze.",
              timestamp: new Date(),
            }
          ]);
      }
      if (storedData) setInventoryDataForChat(storedData);
      if (storedFileName) setInventoryFileName(storedFileName);
      if (storedSessionId) setCurrentSessionId(storedSessionId);

    } catch (error) {
      console.error("Error loading chat from session storage:", error);
      // Initialize with default if error
      setMessages([
        {
          id: 'initial-greeting',
          role: 'assistant',
          content: "Hello! I'm your AI Inventory Assistant. How can I help you with your inventory today? The sample inventory data is pre-loaded. You can also paste your inventory data in JSON format below, or upload a JSON file to analyze.",
          timestamp: new Date(),
        }
      ]);
    }
  }, []);

  // Save to sessionStorage on messages change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
      sessionStorage.setItem(SESSION_DATA_KEY, inventoryDataForChat);
      if (inventoryFileName) sessionStorage.setItem(SESSION_FILENAME_KEY, inventoryFileName);
      if (currentSessionId) sessionStorage.setItem(SESSION_ID_KEY, currentSessionId);
    } catch (error) {
      console.error("Error saving chat to session storage:", error);
    }
  }, [messages, inventoryDataForChat, inventoryFileName, currentSessionId]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            JSON.parse(content); // Validate JSON
            setInventoryDataForChat(content);
            setInventoryFileName(file.name);
            setCurrentSessionId(undefined); // Reset session ID for new data
            toast({ title: "File Loaded for Chat", description: `${file.name} loaded. Chat context updated.` });
             setMessages(prev => [...prev, {
              id: Date.now().toString() + '-context',
              role: 'system',
              content: `Context updated: Now using data from ${file.name}.`,
              timestamp: new Date(),
            }]);
          } catch (error) {
            toast({ title: "Invalid JSON File", description: "The uploaded file is not valid JSON.", variant: "destructive" });
            // Do not change inventoryFileName or data if file is invalid
          }
        };
        reader.readAsText(file);
      } else {
        toast({ title: "Invalid File Type", description: "Please upload a JSON file.", variant: "destructive" });
      }
    }
  };

  const handleSubmit = async (e?: FormEvent<HTMLFormElement> | string) => {
    if (typeof e !== 'string' && e?.preventDefault) e.preventDefault();
    
    const currentInputVal = typeof e === 'string' ? e : input;
    if (!currentInputVal.trim() || isLoading) return;

    const userMessage: UiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInputVal,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    if (typeof e !== 'string') setInput('');
    setIsLoading(true);

    try {
      let parsedInventoryForAPI;
      try {
        parsedInventoryForAPI = JSON.parse(inventoryDataForChat);
      } catch (error) {
         toast({
          title: "Invalid Inventory Data",
          description: "The inventory data context (from textarea or file) is not valid JSON. Please correct it or upload a valid file.",
          variant: "destructive",
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: "I couldn't process your request because the inventory data in the context is not valid JSON. Please correct it or upload a valid JSON file.",
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }

      const apiRequestBody: { message: string; sessionId?: string; inventoryDataOverride?: string } = {
        message: userMessage.content,
        sessionId: currentSessionId,
        // Only send override if it's not the initial mock data or explicitly loaded
        inventoryDataOverride: (inventoryFileName !== "Sample Data" && inventoryDataForChat !== MOCK_INVENTORY_JSON_STRING) ? inventoryDataForChat : undefined,
      };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiRequestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      const assistantMessage: UiChatMessage = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: result.data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (result.data.sessionId) {
        setCurrentSessionId(result.data.sessionId);
      }

    } catch (error: any) {
      console.error("Error calling AI chat API:", error);
      const errorMessageContent = error instanceof Error ? error.message : "Sorry, I encountered an error trying to process your request. Please try again.";
      const errorMessage: UiChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: errorMessageContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "AI Chat Error",
        description: "There was an issue communicating with the AI assistant: " + errorMessageContent,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: "Copied to clipboard!" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:flex-row gap-6 max-w-7xl mx-auto w-full">
      <Card className="w-full md:w-1/3 shadow-xl flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <FileJson className="h-6 w-6 text-primary" />
            Inventory Data Context (JSON)
          </CardTitle>
          <CardDescription>
            Chatting with: <span className="font-semibold text-primary">{inventoryFileName || "Pasted Data"}</span>. 
            Paste JSON or upload a file. This data will be sent with your chat message.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Textarea
            value={inventoryDataForChat}
            onChange={(e) => {
              setInventoryDataForChat(e.target.value);
              setInventoryFileName(e.target.value === MOCK_INVENTORY_JSON_STRING ? "Sample Data" : "Pasted Data");
              setCurrentSessionId(undefined); 
              setMessages(prev => [...prev, {
                id: Date.now().toString() + '-context',
                role: 'system',
                content: `Context updated: Now using pasted data.`,
                timestamp: new Date(),
              }]);
            }}
            placeholder='[{"id": "SKU001", "name": "Product A", "quantity": 100}, ...]'
            className="w-full flex-grow min-h-[200px] font-mono text-xs"
            aria-label="Inventory Data Input for Chat"
          />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                    setInventoryDataForChat(MOCK_INVENTORY_JSON_STRING);
                    setInventoryFileName("Sample Data");
                    setCurrentSessionId(undefined);
                     setMessages(prev => [...prev, {
                        id: Date.now().toString() + '-context',
                        role: 'system',
                        content: `Context reset to Sample Data.`,
                        timestamp: new Date(),
                    }]);
                }}>Load Sample Data</Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <AttachmentIcon className="mr-2 h-4 w-4" /> Upload JSON
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            </div>
            <p className="text-xs text-muted-foreground">
              Uploading or pasting new data overrides the current chat context and may start a new session.
            </p>
        </CardFooter>
      </Card>

      <Card className="w-full md:w-2/3 shadow-xl flex flex-col h-full">
        <CardHeader>
          <CardTitle className="font-headline">AI Inventory Assistant</CardTitle>
          <CardDescription>Ask questions about the loaded inventory. Session: {currentSessionId || "New"}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden flex flex-col">
          <ScrollArea className="h-full pr-4 flex-grow" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 border border-primary">
                      <AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback>
                    </Avatar>
                  )}
                   {message.role === 'system' && (
                     <Avatar className="w-8 h-8 border border-muted-foreground">
                        <AvatarFallback><FileJson className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md relative group",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'assistant'
                          ? 'bg-card text-foreground border'
                          : 'bg-muted text-muted-foreground italic text-xs', // System message style
                      message.content.startsWith("Sorry, I encountered an error") && "bg-destructive/20 text-destructive-foreground",
                      message.content.startsWith("I couldn't process your request") && "bg-destructive/20 text-destructive-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                     <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    {message.role === 'assistant' && (
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(message.content)}
                          aria-label="Copy message"
                      >
                          <ClipboardCopy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 border">
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                   <Avatar className="w-8 h-8 border border-primary">
                        <AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback>
                    </Avatar>
                    <div className="max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-md bg-muted text-foreground flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Typing...
                    </div>
                </div>
               )}
            </div>
          </ScrollArea>
          <div className="mt-4 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Suggested queries:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueriesList.map(sq => (
                <Button key={sq} variant="outline" size="sm" onClick={() => handleSubmit(sq)} disabled={isLoading}>
                  {sq}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your inventory..."
              className="flex-1"
              disabled={isLoading}
              aria-label="Chat input"
            />
             <Button type="button" variant="ghost" size="icon" onClick={() => toast({ title: "Attachment Clicked", description: "File attachment for general chat context is not yet implemented. Use the 'Inventory Data Context' panel for data loading."})} disabled={isLoading} aria-label="Attach file for general chat (not implemented)">
                <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
