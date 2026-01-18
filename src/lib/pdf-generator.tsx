import { renderToStaticMarkup } from 'react-dom/server';
import { ReportPDF } from '@/components/reports/ReportPDF';
import React from 'react';
import type { Sale, Company } from '@/lib/types';

type ReportSummary = {
  totalSales: number;
  totalValue: number;
  averageTicket: number;
  bestSellingProduct: { name: string; quantity: number };
}

interface PdfGeneratorData {
  sales: Sale[];
  summary: ReportSummary;
  company: Company | null;
  date: Date;
}

export async function getHTMLFromComponent(data: PdfGeneratorData) {
  // Aqui o renderToStaticMarkup funciona sem bloquear o build do App Router
  return renderToStaticMarkup(
    <ReportPDF 
      sales={data.sales} 
      summary={data.summary} 
      company={data.company} 
      date={data.date} 
    />
  );
}
