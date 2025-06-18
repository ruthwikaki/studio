"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Bot, User, Send, Loader2, FileJson, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryInsightsChat, InventoryInsightsChatInput } from '@/ai/flows/inventory-insights-chat';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOCK_INVENTORY_JSON_STRING } from '@/lib/constants';

export default function AIChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState(MOCK_INVENTORY_JSON_STRING);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    // Add initial greeting message from assistant
    setMessages([
      {
        id: 'initial-greeting',
        role: 'assistant',
        content: "Hello! I'm your AI Inventory Assistant. How can I help you with your inventory today? You can paste your inventory data in JSON format below.",
        timestamp: new Date(),
      }
    ]);
  }, []);


  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Validate JSON inventory data
      let parsedInventoryData;
      try {
        parsedInventoryData = JSON.parse(inventoryData);
      } catch (error) {
        toast({
          title: "Invalid Inventory Data",
          description: "The inventory data is not valid JSON. Please correct it and try again.",
          variant: "destructive",
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: "I couldn't process your request because the inventory data you provided is not valid JSON. Please correct it.",
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }
      
      const conversationHistory = messages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      const chatInput: InventoryInsightsChatInput = {
        query: userMessage.content,
        inventoryData: JSON.stringify(parsedInventoryData), // Send validated and stringified data
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
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: "Sorry, I encountered an error trying to process your request. Please try again.",
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
    <div className="flex flex-col h-[calc(100vh-10rem)] md:flex-row gap-6 max-w-6xl mx-auto w-full">
      <Card className="w-full md:w-1/3 shadow-xl flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <FileJson className="h-6 w-6 text-primary" />
            Inventory Data (JSON)
          </CardTitle>
          <CardDescription>Paste your inventory data here in JSON format. You can use the sample data to get started.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Textarea
            value={inventoryData}
            onChange={(e) => setInventoryData(e.target.value)}
            placeholder='[{"id": "SKU001", "name": "Product A", "quantity": 100}, ...]'
            className="w-full flex-grow min-h-[200px] font-code text-xs"
            aria-label="Inventory Data Input"
          />
        </CardContent>
        <CardFooter>
            <Button variant="outline" size="sm" onClick={() => setInventoryData(MOCK_INVENTORY_JSON_STRING)}>Load Sample Data</Button>
        </CardFooter>
      </Card>

      <Card className="w-full md:w-2/3 shadow-xl flex flex-col h-full">
        <CardHeader>
          <CardTitle className="font-headline">AI Inventory Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
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
                      "max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-md",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                     <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                    </p>
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
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
