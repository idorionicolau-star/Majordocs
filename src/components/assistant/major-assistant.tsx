"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useState, useEffect, useRef, useContext } from "react";
import {
    Sparkles,
    Send,
    Bot,
    User as UserIcon,
    X,
    Maximize2,
    Minus,
    LayoutDashboard,
    AlertCircle,
    FileText,
    Package
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { InventoryContext } from "@/context/inventory-context";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreInstance } from "@/firebase/provider";

type Message = {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
};


type ChatInterfaceProps = {
    messages: Message[];
    input: string;
    setInput: (value: string) => void;
    handleSend: (customMessage?: string) => void;
    isLoading: boolean;
    scrollRef: React.RefObject<HTMLDivElement>;
};

const ChatInterface = ({ messages, input, setInput, handleSend, isLoading, scrollRef }: ChatInterfaceProps) => (
    <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-base leading-none">Major Assistant</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Online</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.length === 0 && (
                    <div className="space-y-4 mt-2">
                        <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
                            <p className="text-sm text-muted-foreground italic">
                                "Olá. Sou o Major Assistant. Como posso ser útil hoje?"
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Sugestões</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2 h-auto py-2 text-xs"
                                onClick={() => handleSend("Resumo do stock atual")}
                            >
                                <Package className="h-3 w-3 text-amber-500" />
                                Resumo de Stock
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2 h-auto py-2 text-xs"
                                onClick={() => handleSend("Alertas críticos?")}
                            >
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                Alertas Críticos
                            </Button>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn(
                            "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center border shadow-sm",
                            msg.role === 'user'
                                ? "bg-muted border-border"
                                : "bg-primary text-primary-foreground border-primary/20"
                        )}>
                            {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={cn(
                            "rounded-xl px-4 py-2 text-sm max-w-[85%] shadow-sm leading-relaxed",
                            msg.role === 'user'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 border border-border"
                        )}>
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ul]:list-disc [&>ul]:pl-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary text-white flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-xl px-4 py-2 bg-muted/50 border border-border flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 border-t border-border bg-background shrink-0">
            <form
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
                <Input
                    placeholder="Mensagem..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/30 border-border focus-visible:ring-primary h-10 rounded-lg text-sm"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10 shrink-0 rounded-lg shadow-sm"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    </div>
);

export function MajorAssistant({ variant = 'sheet', className }: { variant?: 'sheet' | 'card', className?: string }) {
    const context = useContext(InventoryContext);
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const db = getFirestoreInstance();

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (customMessage?: string) => {
        const textToSend = customMessage || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // "Read Context" logic
            const globalContext = {
                // Global knowledge base (always available)
                inventory: context?.products?.map(p => ({
                    name: p.name,
                    qty: p.stock,
                    price: p.price,
                    min: p.lowStockThreshold || 0 // Ensure consistent property name usage
                })) || [],

                // Computed Alerts for Context
                alerts: context?.products?.filter(p => p.stock <= (p.lowStockThreshold || 0)).map(p => ({
                    product: p.name,
                    status: p.stock === 0 ? 'CRÍTICO (0)' : 'BAIXO',
                    current: p.stock,
                    min: p.lowStockThreshold
                })) || [],

                // Screen-specific context
                currentScreen: {
                    path: pathname,
                    viewData: pathname.includes('inventory') ? context?.products?.slice(0, 10) :
                        pathname.includes('sales') ? context?.sales?.slice(0, 10) :
                            pathname.includes('production') ? context?.productions?.slice(0, 10) :
                                null
                },

                summary: {
                    totalProducts: context?.products?.length || 0,
                    totalSales: context?.sales?.length || 0,
                    pendingOrders: context?.orders?.filter(o => o.status !== 'Concluída').length || 0
                }
            };

            const fbToken = await context?.firebaseUser?.getIdToken();
            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${fbToken}`
                },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context: globalContext,
                    userId: context?.firebaseUser?.uid,
                    companyId: context?.companyId
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.text,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Persist to Firestore
            if (context?.firebaseUser?.uid) {
                await addDoc(collection(db, "assistant_logs"), {
                    userId: context.firebaseUser.uid,
                    userName: context.firebaseUser.displayName || "Usuário",
                    userEmail: context.firebaseUser.email,
                    userMessage: textToSend,
                    aiResponse: data.text,
                    screenContext: pathname,
                    timestamp: serverTimestamp()
                });
            }

        } catch (error: any) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: error.message === "API_ERROR"
                    ? "Tive um problema ao contactar o meu cérebro (Gemini). Verifique se a sua API Key é válida."
                    : "Peço desculpa, tive um pequeno curto-circuito. Detalhe: " + (error.message || "Erro desconhecido"),
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'card') {
        return (
            <div className={cn(
                "rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col h-full",
                className
            )}>
                <ChatInterface
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    isLoading={isLoading}
                    scrollRef={scrollRef}
                />
            </div>
        );
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <div className={cn("fixed bottom-6 right-6 z-[100]", className)}>
                <SheetTrigger asChild>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-primary text-white p-4 rounded-2xl shadow-2xl shadow-primary/40 flex items-center gap-2 group border border-primary/20"
                    >
                        <div className="relative">
                            <Bot className="h-6 w-6" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[120px] font-bold text-sm">
                            Major Assistant
                        </span>
                    </motion.button>
                </SheetTrigger>
            </div>

            <SheetContent side="right" className="p-0 flex flex-col h-full w-[400px] sm:w-[500px] border-l border-border bg-background">
                <ChatInterface
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    isLoading={isLoading}
                    scrollRef={scrollRef}
                />
            </SheetContent>
        </Sheet>
    );
}
