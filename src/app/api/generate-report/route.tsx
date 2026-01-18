import { NextRequest, NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { ReportPDF } from '@/components/reports/ReportPDF';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 1. IA GEMINI: Gerar Análise de Dados 🧠
    let aiSummary = "Análise automática não disponível.";
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Analise estes dados de vendas e forneça um resumo executivo profissional de 3 linhas com insights: ${JSON.stringify(data.sales).substring(0, 2000)}`;
        
        const result = await model.generateContent(prompt);
        aiSummary = result.response.text();
      } catch (e) {
        console.error("Erro na chamada ao Gemini:", e);
      }
    }

    // 2. GERAÇÃO DO PDF 📄
    const pdfBuffer = await pdf(
      <ReportPDF 
        sales={data.sales} 
        summary={aiSummary} 
        company={data.company} 
        date={new Date()} 
      />
    ).toBuffer();

    // 3. RESPOSTA (DOWNLOAD DO PDF)
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Relatorio_Inteligente.pdf"',
      },
    });

  } catch (error: any) {
    console.error("Erro no processamento:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}