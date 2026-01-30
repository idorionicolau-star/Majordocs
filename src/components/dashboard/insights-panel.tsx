
"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Bot, Send, User as UserIcon, Loader2, Sparkles, TrendingUp, AlertTriangle, Database } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { formatCurrency, cn } from "@/lib/utils";
import { startOfMonth, subMonths, isSameMonth, parseISO, isValid } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
    id: string;
    role: 'assistant' | 'user';
    content: React.ReactNode;
    timestamp: Date;
};

export function InsightsPanel() {
    const context = useContext(InventoryContext);
    const sales = context?.sales || [];
    const products = context?.products || [];
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            const summary = generateDailySummary(sales, products);
            setMessages([{
                id: 'init',
                role: 'assistant',
                content: summary,
                timestamp: new Date()
            }]);
        }
    }, [sales, products]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate AI thinking time
        setTimeout(() => {
            const responseContent = processQuery(input, sales, products);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 800);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="glass-panel border-slate-200/50 dark:border-slate-800/50 shadow-none h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/50">
                <CardTitle className="text-xl text-foreground font-medium tracking-wide flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
                    Assistente IA
                </CardTitle>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online (Full Base)</span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden relative">
                <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border",
                                msg.role === 'user'
                                    ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            )}>
                                {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={cn(
                                "rounded-2xl px-4 py-3 text-sm max-w-[85%] shadow-sm",
                                msg.role === 'user'
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    : "bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 text-slate-700 dark:text-slate-300"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-3 bg-white/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/50 backdrop-blur-sm">
                <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input
                        placeholder="Pergunte sobre vendas, estoque, produtos..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/50 h-10 rounded-xl"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isTyping}
                        className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}

// Logic Engine
function generateDailySummary(sales: any[], products: any[]) {
    // Basic calcs (safe)
    const now = new Date();
    // Default summary still focuses on "Today/Month" relevance, but acts as entry point
    const currentMonthRevenue = sales
        .filter(s => { try { return s?.date && isSameMonth(parseISO(s.date), now); } catch { return false; } })
        .reduce((acc, s) => acc + (Number(s.totalValue) || 0), 0);

    // Total historical revenue to show scale
    const totalHistoricalRevenue = sales.reduce((acc, s) => acc + (Number(s.totalValue) || 0), 0);

    const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 5)).length;

    return (
        <div className="space-y-3">
            <p className="font-medium">👋 Olá! Estou analisando <b>{sales.length} vendas</b> e <b>{products.length} produtos</b> (Base Completa).</p>
            <div className="flex flex-col gap-2">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Vendas (Mês)</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(currentMonthRevenue)}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Total Geral</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(totalHistoricalRevenue)}</p>
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                Pergunte-me qualquer coisa sobre o histórico completo!
            </p>
        </div>
    );
}

function processQuery(query: string, sales: any[], products: any[]) {
    const q = query.toLowerCase();

    // 1. Sales / Revenue logic
    if (q.includes('venda') || q.includes('faturamento') || q.includes('receita') || q.includes('ganho') || q.includes('financeiro') || q.includes('dinheiro')) {
        const now = new Date();
        const currentMonthSales = sales.filter(s => { try { return s?.date && isSameMonth(parseISO(s.date), now); } catch { return false; } });
        const totalMonth = currentMonthSales.reduce((acc, s) => acc + (Number(s.totalValue) || 0), 0);

        // Full History
        const totalHistory = sales.reduce((acc, s) => acc + (Number(s.totalValue) || 0), 0);
        const countHistory = sales.length;

        return (
            <div className="space-y-2">
                <p>📊 <b>Resumo Financeiro:</b></p>
                <ul className="text-xs space-y-1">
                    <li>• Este Mês: <b className="text-emerald-500">{formatCurrency(totalMonth)}</b></li>
                    <li>• Histórico Total: <b className="text-emerald-600">{formatCurrency(totalHistory)}</b> ({countHistory} vendas)</li>
                </ul>
            </div>
        );
    }

    // 2. Stock / Inventory logic
    if (q.includes('estoque') || q.includes('acaba') || q.includes('baixo') || q.includes('alerta') || q.includes('falta') || q.includes('pouco')) {
        const lowStock = products.filter(p => (p.stock || 0) <= (p.minStock || 5));
        const outOfStock = products.filter(p => (p.stock || 0) === 0);

        if (lowStock.length === 0) {
            return <p className="text-emerald-500 font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Seu estoque está saudável! Nenhum item crítico.</p>;
        }

        return (
            <div className="space-y-2">
                <p>Encontrei <b>{lowStock.length} itens</b> com estoque baixo (sendo <b>{outOfStock.length} esgotados</b>):</p>
                <ul className="space-y-1">
                    {lowStock.slice(0, 5).map((p: any) => (
                        <li key={p.id} className="text-xs p-2 rounded bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                            <span>{p.name}</span>
                            <span className="font-bold text-amber-600">{p.stock} un</span>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-muted-foreground">Recomendo reposição imediata para evitar perda de vendas.</p>
            </div>
        );
    }

    // 3. Best Products (Broader matching & FULL HISTORY)
    // Keywords: produto, artigo, item, melhor, vendid(o/a), sai mais, top, destaque, coisa
    if (q.includes('produto') || q.includes('artigo') || q.includes('item') || q.includes('coisa') ||
        q.includes('melhor') || q.includes('vendid') || q.includes('sai mais') || q.includes('top') || q.includes('destaque')) {

        const productMap: Record<string, number> = {};
        const quantityMap: Record<string, number> = {};

        // ANALYZE FULL HISTORY (Flat Structure Fix)
        sales.forEach((s: any) => {
            // In flat structure, 's' IS the item.
            if (s?.productId) {
                const val = (Number(s.totalValue) || 0);
                const qty = (Number(s.quantity) || 0);

                productMap[s.productId] = (productMap[s.productId] || 0) + val;
                quantityMap[s.productId] = (quantityMap[s.productId] || 0) + qty;
            }
        });

        const topRevenueId = Object.keys(productMap).reduce((a, b) => productMap[a] > productMap[b] ? a : b, '');
        const topQtyId = Object.keys(quantityMap).reduce((a, b) => quantityMap[a] > quantityMap[b] ? a : b, '');

        const topRevenueProduct = products.find(p => p.id === topRevenueId);
        const topQtyProduct = products.find(p => p.id === topQtyId);

        if (!topRevenueProduct && !topQtyProduct) return <p>Ainda não detectei padrões de vendas suficientes.</p>;

        return (
            <div className="space-y-3">
                {topRevenueProduct && (
                    <div className="flex items-start gap-3 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-600 w-fit">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-purple-600 uppercase">Campeão de Faturamento</p>
                            <p className="font-bold text-sm">{topRevenueProduct.name}</p>
                            <p className="text-xs opacity-70">Gerou {formatCurrency(productMap[topRevenueId])}</p>
                        </div>
                    </div>
                )}

                {topQtyId !== topRevenueId && topQtyProduct && (
                    <div className="flex items-start gap-3 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600 w-fit">
                            <Database className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase">Mais Vendido (Volume)</p>
                            <p className="font-bold text-sm">{topQtyProduct.name}</p>
                            <p className="text-xs opacity-70">Saíram {quantityMap[topQtyId]} unidades</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default / Help
    return (
        <div className="space-y-2">
            <p>Desculpe, não entendi bem. Posso ajudar com:</p>
            <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800">💰 Faturamento</span>
                <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800">📦 Estoque Baixo</span>
                <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800">🏆 Melhores Produtos</span>
                <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800">📊 Resumo Geral</span>
            </div>
        </div>
    );
}
