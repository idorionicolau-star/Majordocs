// src/lib/pdf-helper.tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportPDF } from '@/components/reports/ReportPDF';
import type { Sale, Company } from '@/lib/types';

type ReportSummary = {
  totalSales: number;
  totalValue: number;
  averageTicket: number;
  bestSellingProduct: { name: string; quantity: number };
}

interface PdfHelperData {
  sales: Sale[];
  summary: ReportSummary;
  company: Company | null;
  date: Date;
  aiSummary?: string;
}

// Esta função isola a "química" do React longe da API Route
export async function generateHTML(data: PdfHelperData) {
  // Aqui montamos o componente com os dados
  const component = (
    <ReportPDF 
      sales={data.sales}
      summary={data.summary}
      company={data.company}
      date={data.date}
      aiSummary={data.aiSummary}
    />
  );
  
  // Transformamos em string HTML pura, que já inclui a estrutura <html>
  return renderToStaticMarkup(component);
}
