
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Bot, User, Send, Loader2, FileJson, CornerDownLeft, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Removed AvatarImage
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryInsightsChat, InventoryInsightsChatInput } from '@/ai/flows/inventory-insights-chat';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOCK_INVENTORY_JSON_STRING, AI_CHAT_ATTACHMENT_ICON as AttachmentIcon } from '@/lib/constants';

const suggestedQueries = [
  "What items need reordering?",
  "Show me dead stock",
  "Analyze my inventory turnover",
  "Which products have the highest value?",
];

export default function AIChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState(MOCK_INVENTORY_JSON_STRING);
  const [inventoryFileName, setInventoryFileName] = useState<string | null>("Sample Data");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    setMessages([
      {
        id: 'initial-greeting',
        role: 'assistant',
        content: "Hello! I'm your AI Inventory Assistant. How can I help you with your inventory today? You can paste your inventory data in JSON format below, or upload a JSON file.",
        timestamp: new Date(),
      }
    ]);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            JSON.parse(content); // Validate JSON
            setInventoryData(content);
            setInventoryFileName(file.name);
            toast({ title: "File Loaded", description: `${file.name} loaded successfully.` });
          } catch (error) {
            toast({ title: "Invalid JSON File", description: "The uploaded file is not valid JSON.", variant: "destructive" });
            setInventoryFileName(null);
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
    
    const currentInput = typeof e === 'string' ? e : input;
    if (!currentInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    if (typeof e !== 'string') setInput('');
    setIsLoading(true);

    try {
      let parsedInventoryData;
      try {
        parsedInventoryData = JSON.parse(inventoryData);
      } catch (error) {
        toast({
          title: "Invalid Inventory Data",
          description: "The inventory data is not valid JSON. Please correct it or upload a valid file.",
          variant: "destructive",
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: "I couldn't process your request because the inventory data you provided is not valid JSON. Please correct it or upload a valid file.",
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }
      
      const conversationHistory = messages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      const chatInput: InventoryInsightsChatInput = {
        query: userMessage.content,
        inventoryData: JSON.stringify(parsedInventoryData),
        conversationHistory: conversationHistory,
      };
      
      const result = await inventoryInsightsChat(chatInput);
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling AI chat:", error);
      const errorMessageContent = error instanceof Error ? error.message : "Sorry, I encountered an error trying to process your request. Please try again.";
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: errorMessageContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "AI Chat Error",
        description: "There was an issue communicating with the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:flex-row gap-6 max-w-7xl mx-auto w-full">
      <Card className="w-full md:w-1/3 shadow-xl flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <FileJson className="h-6 w-6 text-primary" />
            Inventory Data (JSON)
          </CardTitle>
          <CardDescription>
            Using: <span className="font-semibold text-primary">{inventoryFileName || "Pasted Data"}</span>. 
            Paste JSON or upload a file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Textarea
            value={inventoryData}
            onChange={(e) => {
              setInventoryData(e.target.value);
              setInventoryFileName("Pasted Data");
            }}
            placeholder='[{"id": "SKU001", "name": "Product A", "quantity": 100}, ...]'
            className="w-full flex-grow min-h-[200px] font-mono text-xs"
            aria-label="Inventory Data Input"
          />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                    setInventoryData(MOCK_INVENTORY_JSON_STRING);
                    setInventoryFileName("Sample Data");
                }}>Load Sample Data</Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <AttachmentIcon className="mr-2 h-4 w-4" /> Upload JSON
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            </div>
            <p className="text-xs text-muted-foreground">
              Changes to the text area will be used. Uploading a file will replace the content.
            </p>
        </CardFooter>
      </Card>

      <Card className="w-full md:w-2/3 shadow-xl flex flex-col h-full">
        <CardHeader>
          <CardTitle className="font-headline">AI Inventory Assistant</CardTitle>
          <CardDescription>Ask questions about the loaded inventory data.</CardDescription>
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
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md relative group",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground border',
                      message.content.startsWith("Sorry, I encountered an error") && "bg-destructive/20 text-destructive-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                     <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                    </p>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                            navigator.clipboard.writeText(message.content);
                            toast({ title: "Copied to clipboard!"});
                        }}
                        aria-label="Copy message"
                    >
                        <CornerDownLeft className="h-3 w-3" />
                    </Button>
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
              {suggestedQueries.map(sq => (
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
             <Button type="button" variant="ghost" size="icon" onClick={() => toast({ title: "Attachment Clicked", description: "File attachment for chat context coming soon."})} disabled={isLoading} aria-label="Attach file">
                <AttachmentIcon className="h-4 w-4" />
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

