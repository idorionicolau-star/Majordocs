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
        
        console.log("✅ IA Gemini 3 ativada com sucesso!");
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
      />
    ).toBuffer();

    // 3. NOME DO ARQUIVO (Limpeza Definitiva)
    const companyClean = (data.company?.name || 'Relatorio')
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-zA-Z0-9]/g, "_")                  // Troca símbolos por _
      .replace(/_+/g, "_")                            // Evita "___"
      .replace(/_$/, "");                             // Remove _ se for o último char

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `Relatorio_${companyClean}_${timestamp}.pdf`;

    console.log(`✅ Enviando arquivo: ${fileName}`);

    // 4. RESPOSTA COM FORMATATAÇÃO RFC PARA ELIMINAR O "_" NO FIM
    const response = new NextResponse(pdfBuffer);
    
    response.headers.set('Content-Type', 'application/pdf');
    // Esta linha é o segredo: usa o formato oficial que navegadores não alteram
    response.headers.set(
      'Content-Disposition', 
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    return response;

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO NA API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}