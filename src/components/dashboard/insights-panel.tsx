
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function InsightsPanel() {
    return (
        <Card className="glass-panel border-slate-200/50 dark:border-slate-800/50 shadow-none h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl text-foreground font-medium tracking-wide">Insights da IA</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-5 w-5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer" />
                    <MoreHorizontal className="h-5 w-5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer" />
                </div>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 overflow-auto pr-2 scrollbar-thin">
                {/* Insight Item */}
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-colors group shadow-sm dark:shadow-none">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 group-hover:bg-blue-500/20 transition-colors mt-0.5">
                            <Lightbulb className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mb-1">Insights de Venda</span>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                Um recorde mensal: atingimos um crescimento de <span className="text-foreground font-semibold">12%</span> em relação ao mês anterior.
                                O ticket médio subiu para <span className="text-foreground font-semibold">3.814 MTn</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alert Item */}
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-colors group shadow-sm dark:shadow-none">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 group-hover:bg-amber-500/20 transition-colors mt-0.5">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 block mb-1">Alerta de Estoque</span>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                Estoque de <span className="text-foreground font-semibold">Cimento 42.5N</span> está abaixo do nível de segurança.
                                Recomendada reposição de <span className="text-foreground font-semibold">500 Unidades</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
