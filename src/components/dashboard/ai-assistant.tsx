'use client';

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, User, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';


export function AIAssistant({ initialQuery }: { initialQuery?: string }) {
  const { 
      chatHistory: messages, 
      setChatHistory: setMessages,
      sales, 
      products, 
      dashboardStats 
  } = useContext(InventoryContext) || { 
      chatHistory: [], 
      setChatHistory: () => {}, 
      sales: [], 
      products: [], 
      dashboardStats: {} 
  };
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, 'like' | 'dislike' | null>>({});
  const [showFeedbackInputFor, setShowFeedbackInputFor] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const { toast } = useToast();
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'model') {
        setTimeout(() => {
          lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [messages]);
  

  const handleAskAI = async (currentQuery: string) => {
    if (!currentQuery || !setMessages) return;
    setIsLoading(true);

    const newMessages: { role: 'user' | 'model', text: string }[] = [...messages, { role: 'user', text: currentQuery }];
    setMessages(newMessages);
    setQuery(''); 

    const historyForAPI = newMessages.slice(0, -1).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));


    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          history: historyForAPI,
          contextData: {
            stats: dashboardStats,
            recentSales: sales?.slice(0, 10),
            inventoryProducts: products?.slice(0, 10),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao comunicar com a API de pesquisa.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (e: any) {
      console.error("Erro na pesquisa com IA:", e);
      setMessages(prev => [...prev, { role: 'model', text: `Erro: ${e.message || 'Não foi possível obter uma resposta. Tente novamente.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleAskAI(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && query) {
      e.preventDefault();
      handleAskAI(query);
    }
  };

  const handleFeedback = (index: number, choice: 'like' | 'dislike') => {
    setFeedback(prev => ({ ...prev, [index]: choice }));
    if (choice === 'dislike') {
        setShowFeedbackInputFor(index);
        setFeedbackText('');
    } else {
        setShowFeedbackInputFor(null);
    }
  };

  const handleSendFeedback = (index: number) => {
    console.log(`Feedback for message ${index}:`, feedbackText);
    toast({ title: 'Obrigado!', description: 'O seu feedback ajuda-nos a melhorar.' });
    setShowFeedbackInputFor(null);
    setFeedbackText('');
  };

  return (
     <Card className="glass-card shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          MajorAssistant
        </CardTitle>
        <CardDescription>
          Faça uma pergunta sobre o seu negócio. O assistente tem memória da conversa atual.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <ScrollArea className="flex-grow h-[200px] pr-4 -mr-4">
          <div className="space-y-4">
             {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 border-2 border-dashed rounded-xl h-full">
                  <Bot size={40} className="mb-4" />
                  <p>A resposta do assistente aparecerá aqui.</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div 
                key={index}
                ref={index === messages.length - 1 ? lastMessageRef : null}
                className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}
              >
                {message.role === 'model' && <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>}
                <div className={cn(
                  "p-3 rounded-2xl max-w-lg",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted rounded-bl-none"
                )}>
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => {
                          if (!props.href) return <a {...props} />;
                          return <Link href={props.href} {...props} className="text-primary hover:underline font-bold" />;
                        },
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  {message.role === 'model' && (
                    <>
                      <div className="mt-3 flex items-center gap-1 border-t pt-2">
                          <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-md ${feedback[index] === 'like' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`} onClick={() => handleFeedback(index, 'like')}>
                              <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-md ${feedback[index] === 'dislike' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground'}`} onClick={() => handleFeedback(index, 'dislike')}>
                              <ThumbsDown className="h-4 w-4" />
                          </Button>
                      </div>
                       {showFeedbackInputFor === index && (
                          <div className="mt-2 space-y-2">
                              <Textarea placeholder="O que podemos melhorar?" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                              <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => setShowFeedbackInputFor(null)}>Cancelar</Button>
                                  <Button size="sm" onClick={() => handleSendFeedback(index)}>Enviar</Button>
                              </div>
                          </div>
                      )}
                    </>
                  )}
                </div>
                 {message.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                <div className="p-3 rounded-2xl bg-muted rounded-bl-none">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
         <div className="flex items-center gap-2 w-full">
            <Input 
                placeholder="Qual foi o produto mais vendido este mês?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                onKeyDown={handleKeyDown}
            />
            <Button type="button" onClick={() => handleAskAI(query)} size="icon" disabled={isLoading || !query}>
                <Send className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
