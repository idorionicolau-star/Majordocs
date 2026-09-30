"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useState, useEffect, useRef, useContext } from "react";
import { useTypingEffect } from "@/hooks/use-typing-effect";
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
import { answerOffline, ASSISTANT_SUGGESTIONS } from "@/lib/offline-assistant";
import { CRMContext } from "@/context/crm-context";

type Message = {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
    isNew?: boolean;
};


type ChatInterfaceProps = {
    messages: Message[];
    input: string;
    setInput: (value: string) => void;
    handleSend: (customMessage?: string) => void;
    isLoading: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
};

function TypingMessage({ msg, onComplete }: { msg: Message, onComplete?: () => void }) {
    const [isTyping, setIsTyping] = useState(!!msg.isNew);

    const displayedContent = useTypingEffect(msg.content, 15, isTyping, () => {
        setIsTyping(false);
        if (onComplete) onComplete();
    });

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ul]:list-disc [&>ul]:pl-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayedContent}
            </ReactMarkdown>
        </div>
    );
}

const ChatInterface = ({ messages, input, setInput, handleSend, isLoading, scrollRef, setMessages }: ChatInterfaceProps) => (
    <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-base leading-none">Major Assistant</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Funciona sem internet</span>
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
                                "Olá! Sou o Major Assistant. Respondo na hora, mesmo sem internet, com os dados do seu negócio."
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Pergunte, por exemplo</p>
                            <div className="flex flex-wrap gap-2">
                                {ASSISTANT_SUGGESTIONS.map((sug) => (
                                    <Button key={sug} variant="outline" size="sm" className="h-auto py-1.5 text-xs rounded-full" onClick={() => handleSend(sug)}>
                                        {sug}
                                    </Button>
                                ))}
                            </div>
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
                                <TypingMessage
                                    msg={msg}
                                    onComplete={() => {
                                        if (msg.isNew) {
                                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isNew: false } : m));
                                        }
                                    }}
                                />
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
    const crm = useContext(CRMContext);

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
            // 100% offline: responde com os dados que já estão no aparelho (cache local do Firestore).
            // Sem internet, sem chave de API, sem custo — e instantâneo.
            await new Promise((r) => setTimeout(r, 250)); // pequena pausa para a resposta não "saltar"
            const text = answerOffline(textToSend, {
                products: context?.products || [],
                sales: context?.sales || [],
                orders: context?.orders || [],
                productions: context?.productions || [],
                customers: crm?.customers || [],
                stockMovements: context?.stockMovements || [],
                locations: context?.locations || [],
                companyName: context?.companyData?.name,
                userName: context?.user?.username,
            });
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: text,
                timestamp: new Date(),
                isNew: true
            }]);
        } catch (error: any) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: "Não consegui responder a isso. Tente: **\"O que devo fazer hoje?\"** ou **\"Stock de bloco 15\"**.",
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
                    setMessages={setMessages}
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
                    setMessages={setMessages}
                />
            </SheetContent>
        </Sheet>
    );
}
