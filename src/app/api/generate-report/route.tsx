import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from 'date-fns';
import React from 'react';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- BLOCO DA IA (GEMINI) ---
    let aiSummary: string | undefined = undefined;
    
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui') {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `Analise estes dados de vendas e forneça um resumo executivo curto e direto em português (máx 3 parágrafos): ${JSON.stringify(body.sales).substring(0, 5000)}`;
            
            const result = await model.generateContent(prompt);
            aiSummary = result.response.text();
        } catch (aiError: any) {
            console.error("Erro na IA (ignorado para geração de PDF):", aiError.message);
            aiSummary = "Não foi possível gerar a análise da IA no momento.";
        }
    }
    
    const dataForPDF = { ...body, aiSummary: aiSummary };

    // --- GERAÇÃO DO PDF com @react-pdf/renderer ---
    const pdfStream = await pdf((
        <ReportPDF 
            sales={dataForPDF.sales}
            summary={dataForPDF.summary}
            company={dataForPDF.company}
            date={new Date(dataForPDF.date)}
            aiSummary={dataForPDF.aiSummary}
        />
    )).toBuffer();
    
    const fileName = `relatorio-${format(new Date(body.date), 'MM-yyyy')}.pdf`;

    return new NextResponse(pdfStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error('Erro Fatal ao gerar relatório PDF:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório', details: error.message }, 
      { status: 500 }
    );
  }
}
