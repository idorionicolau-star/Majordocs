
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, PackageOpen } from "lucide-react";
import Link from "next/link";

export function EmptyStateWelcome() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">

            <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-full mb-6">
                <PackageOpen className="h-16 w-16 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>

            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                Bem-vindo ao MajorStockX! 🚀
            </h2>

            <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed text-lg">
                O registo de materiais é imperativo para ativar a inteligência do sistema e garantir a máxima eficiência operacional.
            </p>

            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <Link href="/settings#catalog">
                    <Button size="lg" className="relative h-14 px-8 text-lg rounded-xl shadow-xl shadow-cyan-500/20 bg-background text-foreground hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <Plus className="mr-2 h-5 w-5 text-cyan-500" />
                        <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent font-bold">
                            Configurar Catálogo Inicial
                        </span>
                    </Button>
                </Link>
            </div>

        </div>
    );
}
