
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
    console.log("📄 Gerando PDF para:", data.company?.name || "Empresa Desconhecida");

    // Garantir que sales seja um array
    const safeSales = Array.isArray(data.sales) ? data.sales : [];

    // Garantir que o resumo tenha todos os campos necessários para evitar quebras no react-pdf
    const safeSummary = {
      totalSales: data.summary?.totalSales ?? 0,
      totalValue: data.summary?.totalValue ?? 0,
      averageTicket: data.summary?.averageTicket ?? 0,
      bestSellingProduct: {
        name: data.summary?.bestSellingProduct?.name ?? 'N/A',
        quantity: data.summary?.bestSellingProduct?.quantity ?? 0
      }
    };

    const pdfInstance = pdf(
      <ReportPDF
        sales={safeSales}
        summary={safeSummary}
        aiSummary={aiSummaryText}
        company={data.company || null}
        date={data.date ? new Date(data.date) : new Date()}
        period={data.period || 'monthly'}
      />
    );

    const pdfStream = await pdfInstance.toBuffer();

    // Converter para Buffer real para garantir tamanho e compatibilidade
    // Às vezes o @react-pdf/renderer retorna um Stream no ambiente Next.js
    let finalBuffer: Buffer;
    if (Buffer.isBuffer(pdfStream)) {
      finalBuffer = pdfStream;
    } else {
      // Caso seja uma ReadableStream (Web API), convertemos para ArrayBuffer e depois para Buffer
      const arrayBuffer = await new Response(pdfStream as any).arrayBuffer();
      finalBuffer = Buffer.from(arrayBuffer);
    }

    console.log("✅ PDF gerado. Tamanho final:", finalBuffer.length, "bytes");

    if (finalBuffer.length === 0) {
      throw new Error("O PDF gerado está vazio (0 bytes).");
    }

    // 3. NOME DO ARQUIVO
    const companyClean = (data.company?.name || 'Relatorio')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "_");

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `Relatorio_${companyClean}_${timestamp}.pdf`;

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': finalBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO NA API DE PDF:", error);
    return NextResponse.json({
      error: "Erro ao gerar PDF",
      details: error.message
    }, { status: 500 });
  }
}
