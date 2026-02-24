"use client";

import { useInventory } from "@/context/inventory-context";
import { useRouter } from "next/navigation";
import { FastEntryGrid } from "@/components/inventory/fast-entry-grid";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FastEntryPage() {
    const { canEdit } = useInventory();
    const router = useRouter();
    const canEditInventory = canEdit('inventory');

    if (!canEditInventory) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">Não tem permissão para aceder a esta página.</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-[1400px] mx-auto"
        >
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/inventory">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventário</h1>
                    <p className="text-sm text-muted-foreground">Voltar para a lista de produtos</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-2 sm:p-6 shadow-sm">
                <FastEntryGrid onSuccess={() => router.push('/inventory')} />
            </div>
        </motion.div>
    );
}
