"use client";

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

export function MajorAssistant() {
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

            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context: globalContext,
                    userId: context?.firebaseUser?.uid
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

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <div className="fixed bottom-6 right-6 z-[100]">
                <SheetTrigger asChild>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-primary text-white p-4 rounded-2xl shadow-2xl shadow-primary/40 flex items-center gap-2 group border border-primary/20"
                    >
                        <div className="relative">
                            <Bot className="h-6 w-6" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[120px] font-bold text-sm">
                            Major Assistant
                        </span>
                    </motion.button>
                </SheetTrigger>
            </div>

            <SheetContent side="right" className="p-0 flex flex-col h-full w-[400px] sm:w-[500px] border-l border-white/10 dark:bg-slate-950/95 backdrop-blur-xl">
                <SheetHeader className="p-6 border-b border-white/10 bg-gradient-to-br from-primary/10 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/20 rounded-xl">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-headline">Major Assistant</SheetTitle>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">IA Conectada • v3.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                        {messages.length === 0 && (
                            <div className="space-y-6 mt-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                                        "Olá! Eu sou o Major Assistant. Como posso ajudar na gestão da MajorStockX hoje?"
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase px-1">Atalhos Estratégicos</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-start gap-2 bg-white/5 border-white/5 hover:bg-white/10"
                                        onClick={() => handleSend("Faça um resumo rápido do estado atual do stock.")}
                                    >
                                        <Package className="h-4 w-4 text-amber-500" />
                                        Resumo de Estoque
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-start gap-2 bg-white/5 border-white/5 hover:bg-white/10"
                                        onClick={() => handleSend("Quais são os alertas críticos hoje?")}
                                    >
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        Ver Alertas Críticos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-start gap-2 bg-white/5 border-white/5 hover:bg-white/10"
                                        onClick={() => handleSend("Como posso gerar relatórios em PDF?")}
                                    >
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        Ajuda com PDF
                                    </Button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                <div className={cn(
                                    "h-9 w-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        : "bg-primary text-white border-primary/20"
                                )}>
                                    {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-5 w-5" />}
                                </div>
                                <div className={cn(
                                    "rounded-2xl px-5 py-3.5 text-sm max-w-[85%] shadow-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white/10 border border-white/5 text-slate-700 dark:text-slate-200"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="h-9 w-9 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center animate-pulse">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="rounded-2xl px-5 py-3.5 bg-white/5 border border-white/10 flex items-center gap-1.5">
                                    <motion.span
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="h-1.5 w-1.5 bg-primary rounded-full"
                                    />
                                    <motion.span
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                        className="h-1.5 w-1.5 bg-primary rounded-full"
                                    />
                                    <motion.span
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                                        className="h-1.5 w-1.5 bg-primary rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-slate-900/50">
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    >
                        <Input
                            placeholder="Escreva a sua mensagem..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 focus-visible:ring-primary h-12 rounded-xl"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="h-12 w-12 shrink-0 rounded-xl shadow-xl shadow-primary/20"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                    <p className="text-[9px] text-center text-slate-500 mt-4 uppercase tracking-widest font-bold opacity-60">
                        Major StockX Intelligence • Powered by Gemini 2.0
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
