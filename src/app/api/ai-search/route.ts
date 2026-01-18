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
    const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

    const prompt = `
      És o MajorAssistant, um assistente especialista na aplicação de gestão de negócios "MajorStockX". A tua missão é responder a qualquer pergunta sobre a aplicação ou sobre os dados do negócio do utilizador, fornecendo links para as páginas relevantes sempre que possível.

      Estrutura da Aplicação:
      - /dashboard: Painel principal com estatísticas e atalhos.
      - /inventory: Para gerir o stock dos produtos.
      - /sales: Para gerir vendas.
      - /production: Para registar a produção.
      - /orders: Para gerir encomendas de produção.
      - /reports: Para ver relatórios de vendas.
      - /users: Para gerir contas de funcionários.
      - /settings: Para configurar a aplicação.

      Instruções:
      1.  Analisa a pergunta do utilizador.
      2.  Se a pergunta for sobre uma funcionalidade (ex: "como adiciono um produto?"), responde de forma clara e inclui um link em Markdown para a página relevante (ex: "Pode adicionar produtos na página de [Inventário](/inventory)").
      3.  Se a pergunta for sobre os dados do negócio (ex: "qual foi o meu produto mais vendido?"), usa os "Dados de Contexto" para formular uma resposta precisa.
      4.  Sê sempre prestável e profissional. Não deves ter perguntas sem resposta sobre o programa.
      5.  Se for absolutamente impossível responder, recomenda ao utilizador que contacte o suporte técnico.
      6.  Responde sempre em Português.

      Pergunta do Utilizador: "${query}"

      Dados de Contexto (estado atual da aplicação):
      ${JSON.stringify(contextData, null, 2).substring(0, 5000)}
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
