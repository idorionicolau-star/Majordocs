"use client";

import { CatalogManager } from "@/components/settings/catalog-manager";

export default function CatalogPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter mb-6 relative z-10">Catálogo de Produtos</h1>
            <CatalogManager />
        </div>
    );
}
