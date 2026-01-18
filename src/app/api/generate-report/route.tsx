import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log("🚀 Iniciando processo de geração de relatório...");
  
  try {
    const data = await req.json();
    console.log("📦 Dados recebidos na API para a empresa:", data.company?.name || "Sem nome de empresa");

    if (!data.sales || !Array.isArray(data.sales) || !data.summary) {
      console.error("❌ Erro: Dados de vendas ou resumo inválidos ou ausentes");
      return NextResponse.json({ error: "Dados de vendas ou resumo ausentes." }, { status: 400 });
    }

    // 1. IA GEMINI 🧠
    let aiSummaryText = "Análise automática não disponível.";
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Analise estes dados de vendas e crie um resumo executivo de 3 linhas: ${JSON.stringify(data.sales).substring(0, 2000)}`;
        
        const result = await model.generateContent(prompt);
        aiSummaryText = result.response.text();
        console.log("🤖 IA: Resumo gerado com sucesso");
      } catch (aiError) {
        console.error("⚠️ Erro na IA Gemini (mas continuarei o PDF):", aiError);
      }
    }

    // 2. GERAÇÃO DO PDF 📄
    console.log("🎨 Renderizando PDF...");
    const pdfBuffer = await pdf(
      <ReportPDF 
        sales={data.sales} 
        summary={data.summary} 
        aiSummary={aiSummaryText}
        company={data.company || null} 
        date={new Date(data.date)} 
      />
    ).toBuffer();

    console.log("✅ PDF gerado com sucesso!");

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="relatorio-inteligente.pdf"',
      },
    });

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO NA API:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor", details: error.message }, 
      { status: 500 }
    );
  }
}
