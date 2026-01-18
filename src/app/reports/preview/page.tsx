
'use client';

import { useSearchParams } from 'next/navigation';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { Buffer } from 'buffer';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportPreviewPage() {
    const searchParams = useSearchParams();
    const encodedData = searchParams.get('data');

    if (!encodedData) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-xl font-bold">Página de Pré-visualização de Relatórios</h1>
                    <p className="text-muted-foreground">Esta página é utilizada para gerar PDFs.</p>
                </div>
            </div>
        );
    }
    
    try {
        const decodedDataString = Buffer.from(encodedData, 'base64').toString('utf-8');
        const data = JSON.parse(decodedDataString);
        
        const { sales, summary, company, date } = data;

        // Basic validation
        if (!sales || !summary || !date) {
            throw new Error("Dados do relatório em falta ou malformados.");
        }

        return <ReportPDF sales={sales} summary={summary} company={company} date={date} />;

    } catch (error) {
        console.error("Failed to decode or parse report data:", error);
         return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center p-8 border border-destructive bg-destructive/10 rounded-lg">
                    <h1 className="text-xl font-bold text-destructive">Erro ao Gerar Pré-visualização</h1>
                    <p className="text-destructive/80">Os dados do relatório são inválidos ou estão corrompidos.</p>
                </div>
            </div>
        );
    }
}
