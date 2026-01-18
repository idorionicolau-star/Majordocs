import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { query, contextData } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      És o MajorAssistant, um assistente de IA para uma aplicação de gestão de negócios.
      O utilizador está a fazer uma pergunta a partir de uma barra de pesquisa global.
      Usa os dados de contexto fornecidos para responder à pergunta do utilizador. Se não tiveres a certeza ou se a pergunta não estiver relacionada com os dados, sê honesto e diz que não consegues ajudar com isso.

      Pergunta do utilizador: "${query}"

      Dados de contexto (um excerto do estado atual da aplicação):
      ${JSON.stringify(contextData, null, 2).substring(0, 5000)}

      Responde em Português, de forma concisa e útil.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API de pesquisa AI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
