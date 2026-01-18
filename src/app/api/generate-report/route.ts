// src/app/api/generate-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { generateHTML } from '@/lib/pdf-helper';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- BLOCO DA IA (GEMINI) ---
    let aiSummary: string | undefined = undefined;
    
    // Só tenta usar a IA se a chave existir
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui') {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // Cria um prompt focado nos dados
            const prompt = `Analise estes dados de vendas e forneça um resumo executivo curto e direto em português (máx 3 parágrafos): ${JSON.stringify(body.sales).substring(0, 5000)}`;
            
            const result = await model.generateContent(prompt);
            aiSummary = result.response.text();
        } catch (aiError) {
            console.error("Erro na IA:", aiError);
            aiSummary = "Não foi possível gerar a análise da IA no momento.";
        }
    }
    
    // Adiciona o resumo da IA aos dados antes de gerar o HTML
    const dataForPDF = { ...body, aiSummary: aiSummary };

    // --- GERAÇÃO DO HTML ---
    // Usamos o helper isolado para não quebrar o Next.js
    const html = await generateHTML(dataForPDF);

    // --- GERAÇÃO DO PDF (PUPPETEER) ---
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Necessário para ambientes Linux/Container
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    
    const fileName = `relatorio-${format(new Date(body.date), 'MM-yyyy')}.pdf`;

    // 4. Devolver o ficheiro
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Erro Fatal:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório' }, 
      { status: 500 }
    );
  }
}
