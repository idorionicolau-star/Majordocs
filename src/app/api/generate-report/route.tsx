import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from 'date-fns';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log("🚀 Iniciando processo de geração de relatório...");
  
  try {
    const data = await req.json();
    console.log("📦 Dados recebidos para:", data.company?.name || "Sem nome");

    if (!data.sales || !Array.isArray(data.sales)) {
      return NextResponse.json({ error: "Dados de vendas ausentes." }, { status: 400 });
    }

    // 1. IA GEMINI 🧠
    let aiSummaryText = "Análise automática não disponível.";
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // AJUSTE: Usado o nome do modelo correto sem o prefixo 'models/'.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Analise estes dados de vendas da empresa ${data.company?.name || 'nossa empresa'}: ${JSON.stringify(data.sales).substring(0, 2000)}. Escreva um resumo executivo de 2 frases em Português.`;
        
        const result = await model.generateContent(prompt);
        // AJUSTE: Usado .text como propriedade, que é a sintaxe mais recente.
        const response = await result.response;
        aiSummaryText = response.text; 
        
        console.log("✅ IA Gemini para PDF ativada!");
      } catch (aiError: any) {
        console.error("❌ Erro na IA do PDF:", aiError.message);
        // Mantém o texto padrão se a IA falhar
      }
    }

    // 2. GERAÇÃO DO PDF 📄
    console.log("🎨 Renderizando PDF...");
    const pdfBuffer = await pdf(
      <ReportPDF 
        sales={data.sales} 
        summary={data.summary || ""} 
        aiSummary={aiSummaryText}
        company={data.company || null} 
        date={data.date ? new Date(data.date) : new Date()} 
      />
    ).toBuffer();

    // 3. NOME DO ARQUIVO (Limpeza Final)
    const companyName = data.company?.name 
      ? data.company.name.replace(/[^a-zA-Z0-9]/g, "_").trim() 
      : 'Relatorio';
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    // Forçamos o nome sem espaços extras ou underscores soltos no final
    const fileName = `Relatorio_${companyName}_${timestamp}.pdf`;

    console.log(`✅ PDF gerado: ${fileName}`);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
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
