
import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from 'date-fns';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // 1. IA GEMINI 3 FLASH 🧠
    let aiSummaryText = "Análise automática não disponível.";
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });
        
        const prompt = `Analise estes dados de vendas da empresa ${data.company?.name || 'nossa empresa'}: ${JSON.stringify(data.sales).substring(0, 2000)}. Escreva um resumo executivo de 2 frases em Português.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        aiSummaryText = response.text(); 
        
      } catch (aiError: any) {
        console.error("❌ Erro na IA do PDF:", aiError.message);
      }
    }

    // 2. GERAÇÃO DO PDF 📄
    const pdfBuffer = await pdf(
      <ReportPDF 
        sales={data.sales} 
        summary={data.summary || ""} 
        aiSummary={aiSummaryText}
        company={data.company || null} 
        date={data.date ? new Date(data.date) : new Date()} 
        period={data.period || 'monthly'}
      />
    ).toBuffer();

    // 3. NOME DO ARQUIVO (Limpeza de espaços e caracteres)
    const companyClean = (data.company?.name || 'Relatorio')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "_");
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `Relatorio_${companyClean}_${timestamp}.pdf`;

    // FIX: Using NextResponse with the buffer directly, casting to 'any' to bypass
    // potential type conflicts in Vercel's build environment.
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO NA API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
