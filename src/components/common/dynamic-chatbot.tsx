
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { marked } from 'marked';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function DynamicChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: "Hi! I'm the LISTED AI assistant. How can I help you with your startup, funding, or sales questions today?",
        },
      ]);
    }
  }, [isOpen, messages.length]);
  

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = updatedMessages.map((msg) => ({
        role: msg.role,
        content: [{ text: msg.content }],
      }));

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistory, message: input }),
      });

      if (!response.ok) {
        throw new Error(`Chatbot API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.response) {
        setMessages((prev) => [...prev, { role: 'model', content: result.response }]);
      }
    } catch (error) {
      console.error('Error calling chatbot flow:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-[88px] right-5 z-50"
          >
            <Card className="w-[350px] h-[500px] shadow-2xl rounded-2xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary animate-eye-blink" />
                  <CardTitle className="text-lg">LISTED AI Assistant</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="p-4 space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.role === 'model' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Bot className="h-5 w-5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted rounded-bl-none'
                          }`}
                        >
                          <div
                            className="prose prose-sm text-sm"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                          />
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-muted rounded-bl-none flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Ask a question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="pr-12 rounded-full"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-5 right-5 z-50"
        whileHover={{ scale: 1.1 }}
      >
        <Button
          size="icon"
          className={cn(
            "h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90",
            !isOpen && "animate-bot-bob" 
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle AI Chatbot"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isOpen ? 'close' : 'bot'}
              initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </motion.div>
    </>
  );
}
