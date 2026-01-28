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

    const systemPrompt = `
      Atue como um Consultor Sênior de Operações e BI para o MajorStockX.
      Analise os dados fornecidos (vendas, produtos e estatísticas) e gere "Insights da IA" baseados nestes 5 pilares:
      
      1. Preditivo: Calcule a velocidade de vendas e preveja quando itens críticos esgotarão.
      2. Financeiro: Identifique produtos sem vendas (stock parado) e o impacto no capital.
      3. Padrões: Detete tendências de vendas recentes ou anomalias.
      4. Acionável: Recomende ações claras (ex: repor, liquidar, ajustar alertas).
      5. Integridade: Alerte sobre dados em falta ou potenciais erros de registo.

      Instruções de Formatação:
      - Use Emojis para dar vida ao texto.
      - Use Negrito para destacar números e nomes de produtos.
      - Use Listas para organizar recomendações.
      - Mantenha o tom profissional mas energético.
      - Escreva em Português de Moçambique/Portugal.
      - Limite a resposta a 3 parágrafos ou secções curtas.
    `;

    const prompt = `
      ${systemPrompt}
      
      DADOS PARA ANÁLISE:
      Vendas Recentes: ${JSON.stringify(data.sales).substring(0, 3000)}
      Inventário: ${JSON.stringify(data.products).substring(0, 3000)}
      KPIs atuais: ${JSON.stringify(data.stats)}
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