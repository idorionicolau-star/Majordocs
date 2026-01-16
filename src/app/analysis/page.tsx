
"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit } from 'lucide-react';

const AIReport = dynamic(() => import("@/components/dashboard/ai-report").then(mod => mod.AIReport), {
  ssr: false,
  loading: () => <Skeleton className="h-[250px] w-full" />,
});

export default function AnalysisPage() {
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
             <BrainCircuit className="h-8 w-8 text-primary" />
             Análise Inteligente
           </h1>
           <p className="text-sm font-medium text-slate-500 mt-1">
            Receba insights e sugestões sobre a performance do seu negócio, gerados por IA.
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto w-full pt-8">
         <AIReport />
      </div>
    </div>
  );
}
