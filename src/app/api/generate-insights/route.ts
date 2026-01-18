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
    // AJUSTE: Usado o nome do modelo correto sem o prefixo 'models/'.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analise estes dados de vendas e forneça insights acionáveis em Português:
      ${JSON.stringify(data.sales).substring(0, 5000)}
      Escreva de forma direta e profissional em até 3 parágrafos.
    `;

    const result = await model.generateContent(prompt);
    // AJUSTE: Usado .text como propriedade, que é a sintaxe mais recente.
    const response = await result.response;
    const text = response.text;

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API de Insights:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
