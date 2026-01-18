import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // CORREÇÃO 1: Adicionado o prefixo 'models/' (Essencial para evitar Erro 404)
    const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

    const prompt = `
      Analise estes dados de vendas e forneça insights acionáveis em Português:
      ${JSON.stringify(data.sales).substring(0, 5000)}
      Escreva de forma direta e profissional em até 3 parágrafos.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // CORREÇÃO 2: .text() é um método/função, precisa dos parênteses
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API de Insights:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}