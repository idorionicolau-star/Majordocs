// src/lib/pdf-helper.tsx
import 'server-only';
import React from 'react';
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

// This function isolates the React "chemistry" away from the API Route
export async function generateHTML(data: PdfHelperData) {
  // The dynamic import tricks the Next.js compiler during build time.
  const { renderToStaticMarkup } = await import('react-dom/server');
  
  // Here we assemble the component with the data
  const component = (
    <ReportPDF 
      sales={data.sales}
      summary={data.summary}
      company={data.company}
      date={data.date}
      aiSummary={data.aiSummary}
    />
  );
  
  // We transform it into a pure HTML string, which already includes the <html> structure
  return renderToStaticMarkup(component);
}
