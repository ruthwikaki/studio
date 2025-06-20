
"use client";

import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { Bot, User, Send, Loader2, FileJson, CornerDownLeft, ClipboardCopy, Paperclip, MessageSquarePlus, History } from 'lucide-react';
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

const SESSION_STORAGE_KEY_PREFIX = 'aiChatHistory_'; // Make session-specific
const SESSION_DATA_KEY_PREFIX = 'aiChatInventoryData_';
const SESSION_FILENAME_KEY_PREFIX = 'aiChatInventoryFileName_';
const LAST_ACTIVE_SESSION_ID_KEY = 'aiChatLastActiveSessionId';


export default function AIChatInterface() {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [inventoryDataForChat, setInventoryDataForChat] = useState(MOCK_INVENTORY_JSON_STRING);
  const [inventoryFileName, setInventoryFileName] = useState<string | null>("Sample Data");
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [chatTitle, setChatTitle] = useState<string>("New Chat");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getSessionStorageKey = (type: 'messages' | 'data' | 'filename', sessionId?: string) => {
    const id = sessionId || 'default_new_session';
    if (type === 'messages') return `${SESSION_STORAGE_KEY_PREFIX}${id}`;
    if (type === 'data') return `${SESSION_DATA_KEY_PREFIX}${id}`;
    return `${SESSION_FILENAME_KEY_PREFIX}${id}`;
  };


  // Load last active session ID and its data on mount
  useEffect(() => {
    const lastSessionId = sessionStorage.getItem(LAST_ACTIVE_SESSION_ID_KEY);
    if (lastSessionId) {
      loadSession(lastSessionId);
    } else {
      initializeNewChat();
    }
  }, []);

  const initializeNewChat = (clearContext = false) => {
    setCurrentSessionId(undefined);
    setChatTitle("New Chat");
    setMessages([
      {
        id: 'initial-greeting',
        role: 'assistant',
        content: `Hello! I'm your AI Inventory Assistant. How can I help you today? ${clearContext ? "Context has been cleared." : "The sample inventory data is pre-loaded. You can also paste your inventory data or upload a JSON file to analyze."}`,
        timestamp: new Date(),
      }
    ]);
    if (clearContext || !sessionStorage.getItem(getSessionStorageKey('data', undefined))) {
      setInventoryDataForChat(MOCK_INVENTORY_JSON_STRING);
      setInventoryFileName("Sample Data");
    }
    sessionStorage.removeItem(LAST_ACTIVE_SESSION_ID_KEY);
  };
  
  const loadSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch chat history.");
      }
      const data = await response.json();
      const fetchedMessages: UiChatMessage[] = data.data.messages.map((msg: any) => ({
        id: msg.id || `${msg.role}-${new Date(msg.timestamp).getTime()}`, // Ensure ID
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(fetchedMessages);
      setChatTitle(data.data.title || `Chat Session ${sessionId.substring(0,6)}`);

      // Also try to load context if stored for this session
      const storedData = sessionStorage.getItem(getSessionStorageKey('data', sessionId));
      const storedFileName = sessionStorage.getItem(getSessionStorageKey('filename', sessionId));
      if (storedData) setInventoryDataForChat(storedData);
      if (storedFileName) setInventoryFileName(storedFileName);
      else { // Fallback if session context not in session storage
        setInventoryDataForChat(MOCK_INVENTORY_JSON_STRING);
        setInventoryFileName("Sample Data (Default)");
      }
      sessionStorage.setItem(LAST_ACTIVE_SESSION_ID_KEY, sessionId);

    } catch (error: any) {
      toast({ title: "Error loading session", description: error.message, variant: "destructive" });
      initializeNewChat(); // Fallback to new chat on error
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);


  // Save to sessionStorage on messages change, specific to currentSessionId
  useEffect(() => {
    if (messages.length > 0) { // Only save if there are messages
        sessionStorage.setItem(getSessionStorageKey('messages', currentSessionId), JSON.stringify(messages));
    }
    sessionStorage.setItem(getSessionStorageKey('data', currentSessionId), inventoryDataForChat);
    if (inventoryFileName) sessionStorage.setItem(getSessionStorageKey('filename', currentSessionId), inventoryFileName);
    if (currentSessionId) sessionStorage.setItem(LAST_ACTIVE_SESSION_ID_KEY, currentSessionId);

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
            JSON.parse(content); 
            setInventoryDataForChat(content);
            setInventoryFileName(file.name);
            // Do not reset session ID here, context change applies to current session
            toast({ title: "File Loaded for Chat", description: `${file.name} loaded. Chat context updated for current session.` });
             setMessages(prev => [...prev, {
              id: Date.now().toString() + '-context',
              role: 'system',
              content: `Context updated: Now using data from ${file.name}.`,
              timestamp: new Date(),
            }]);
          } catch (error) {
            toast({ title: "Invalid JSON File", description: "The uploaded file is not valid JSON.", variant: "destructive" });
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
      const apiRequestBody: { message: string; sessionId?: string; inventoryDataOverride?: string } = {
        message: userMessage.content,
        sessionId: currentSessionId,
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
      const aiResultData = result.data; // API returns { data: { answer, data, suggestedActions, confidence, sessionId } }
      
      const assistantMessage: UiChatMessage = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: aiResultData.answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (aiResultData.sessionId && !currentSessionId) {
        setCurrentSessionId(aiResultData.sessionId);
        setChatTitle(`Chat Session ${aiResultData.sessionId.substring(0,6)}...`);
        sessionStorage.setItem(LAST_ACTIVE_SESSION_ID_KEY, aiResultData.sessionId);
      } else if (aiResultData.sessionId && currentSessionId !== aiResultData.sessionId) {
        // This case (session ID changing mid-session) should be handled carefully.
        // For now, update to the new session ID.
        console.warn("Session ID changed mid-conversation. Old:", currentSessionId, "New:", aiResultData.sessionId);
        setCurrentSessionId(aiResultData.sessionId);
        sessionStorage.setItem(LAST_ACTIVE_SESSION_ID_KEY, aiResultData.sessionId);
        // Potentially fetch history for new session or merge messages based on strategy.
      }


    } catch (error: any) {
      console.error("Error calling AI chat API:", error);
      const errorMessageContent = error.message || "Sorry, I encountered an error.";
      const errorMessage: UiChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: errorMessageContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "AI Chat Error",
        description: errorMessageContent,
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
  
  const handleNewChat = () => {
    initializeNewChat(true); // true to clear context
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:flex-row gap-6 max-w-7xl mx-auto w-full">
      <Card className="w-full md:w-1/3 shadow-xl flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <FileJson className="h-6 w-6 text-primary" />
            Inventory Data Context
          </CardTitle>
          <CardDescription>
            Context: <span className="font-semibold text-primary">{inventoryFileName || "Pasted Data"}</span>. 
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Textarea
            value={inventoryDataForChat}
            onChange={(e) => {
              setInventoryDataForChat(e.target.value);
              setInventoryFileName(e.target.value === MOCK_INVENTORY_JSON_STRING ? "Sample Data" : "Pasted Data");
              // Context change applies to current session. System message below.
               setMessages(prev => [...prev, {
                id: Date.now().toString() + '-context',
                role: 'system',
                content: `Context updated to: ${e.target.value === MOCK_INVENTORY_JSON_STRING ? "Sample Data" : "Pasted Data"}.`,
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
                     setMessages(prev => [...prev, {
                        id: Date.now().toString() + '-context',
                        role: 'system',
                        content: `Context reset to Sample Data.`,
                        timestamp: new Date(),
                    }]);
                }}>Load Sample</Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <AttachmentIcon className="mr-2 h-4 w-4" /> Upload JSON
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            </div>
        </CardFooter>
      </Card>

      <Card className="w-full md:w-2/3 shadow-xl flex flex-col h-full">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-headline">{chatTitle}</CardTitle>
            <CardDescription>Session ID: {currentSessionId || "New"}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleNewChat} title="Start New Chat">
                <MessageSquarePlus className="h-4 w-4"/>
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast({title: "History (Soon)", description: "Loading chat history list..."})} title="View Chat History">
                <History className="h-4 w-4"/>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden flex flex-col">
          <ScrollArea className="h-full pr-4 flex-grow" ref={scrollAreaRef}>
            {isLoadingHistory ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
            ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn( "flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start' )}
                >
                  {message.role === 'assistant' && ( <Avatar className="w-8 h-8 border border-primary"><AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback></Avatar> )}
                  {message.role === 'system' && ( <Avatar className="w-8 h-8 border border-muted-foreground"><AvatarFallback><FileJson className="w-4 h-4 text-muted-foreground" /></AvatarFallback></Avatar> )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md relative group",
                      message.role === 'user' ? 'bg-primary text-primary-foreground'
                        : message.role === 'assistant' ? 'bg-card text-foreground border'
                        : 'bg-muted text-muted-foreground italic text-xs',
                      message.content.startsWith("Sorry, I encountered an error") && "bg-destructive/20 text-destructive-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                     <p className="text-xs opacity-70 mt-1"> {new Date(message.timestamp).toLocaleTimeString()} </p>
                    {message.role === 'assistant' && (
                      <Button  variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(message.content)} aria-label="Copy message" >
                          <ClipboardCopy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && ( <Avatar className="w-8 h-8 border"><AvatarFallback><User className="w-5 h-5" /></AvatarFallback></Avatar> )}
                </div>
              ))}
               {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                   <Avatar className="w-8 h-8 border border-primary"> <AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback> </Avatar>
                    <div className="max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-md bg-muted text-foreground flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Typing...
                    </div>
                </div>
               )}
            </div>
            )}
          </ScrollArea>
          <div className="mt-4 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Suggested queries:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueriesList.map(sq => (
                <Button key={sq} variant="outline" size="sm" onClick={() => handleSubmit(sq)} disabled={isLoading || isLoadingHistory}> {sq} </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your inventory..." className="flex-1" disabled={isLoading || isLoadingHistory} aria-label="Chat input" />
            <Button type="submit" size="icon" disabled={isLoading || isLoadingHistory || !input.trim()} aria-label="Send message" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

    