
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { query, contextData, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const isHealthCheck = query.toLowerCase().includes('diagnóstico') || query.toLowerCase().includes('relatório de saúde');

    const jsonStructure = `
      \`\`\`json
      {
        "geral": "Um resumo executivo de uma frase sobre a saúde geral do negócio.",
        "oportunidade": {
          "titulo": "Título da Oportunidade (ex: Produto em Alta)",
          "descricao": "Descrição concisa e quantitativa da oportunidade. (ex: 'O produto X vendeu 50 unidades esta semana, 30% acima da média, mas o stock está em apenas 10.')",
          "sugestao": "Uma sugestão acionável. (ex: 'Focar na reposição imediata para não perder vendas.')"
        },
        "risco": {
          "titulo": "Título do Risco (ex: Stock Parado)",
          "descricao": "Descrição concisa e quantitativa do risco. (ex: 'O item Y não vende há 45 dias e representa 15% do valor total do inventário.')",
          "sugestao": "Uma sugestão acionável. (ex: 'Considere uma promoção para libertar capital.')"
        }
      }
      \`\`\`
    `;

    const prompt = `
      És o MajorAssistant, um analista de negócios e especialista na aplicação de gestão "MajorStockX". A tua missão é atuar como um consultor de negócios de topo.

      ${isHealthCheck ? `
      **Instruções para o Diagnóstico Inteligente:**
      1.  **Formato de Resposta OBRIGATÓRIO:** A tua resposta DEVE ser um objeto JSON válido, sem nenhum texto fora do JSON. A estrutura deve ser: ${jsonStructure}
      2.  **Análise Proativa:** Não te limites a listar dados. Interpreta-os como um consultor faria. Identifica a oportunidade mais impactante e o risco mais urgente.
      3.  **Sê Quantitativo:** Usa números para suportar as tuas afirmações. (ex: "vendeu 30% mais rápido", "acaba em 2 dias", "não vende há 45 dias").
      4.  **Tom de Voz:** Sê profissional, direto e prestável.
      ` : `
      **Instruções para Perguntas Gerais:**
      1.  **Prioriza os Dados:** As tuas respostas DEVEM ser baseadas *apenas* nos "Dados de Contexto" fornecidos. Não inventes produtos, quantidades ou datas. Responde em texto simples (Markdown).
      2.  **Sê Preciso:** Se questionado sobre um produto, encontra a correspondência exata. Se não houver, indica isso.
      3.  **Orientação de Navegação:** Se o utilizador perguntar como fazer algo, fornece uma resposta clara e um link em Markdown para a página relevante (ex: "Pode adicionar novos produtos na página de [Inventário](/inventory?action=add)").
      `}

      Estrutura da Aplicação (para orientação):
      - /dashboard: Painel principal.
      - /inventory: Gerir stock.
      - /sales: Gerir vendas.
      - /production: Registar produção.
      - /orders: Gerir encomendas.
      - /reports: Ver relatórios.
      - /users: Gerir funcionários.
      - /settings: Configurar a aplicação.

      Pergunta do Utilizador: "${query}"

      Dados de Contexto (estado atual da aplicação):
      ${JSON.stringify(contextData, null, 2).substring(0, 8000)}
    `;

    const formattedHistory: Content[] = (history || []).map((msg: { role: 'user' | 'model', text: string }) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let text = response.text();

    if (isHealthCheck) {
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        const jsonObj = JSON.parse(jsonString);
        return NextResponse.json(jsonObj);
      } catch (e) {
        console.error("AI JSON parsing error:", e);
        return NextResponse.json({ 
          text: `A IA retornou uma resposta, mas o formato JSON era inválido. Resposta: ${text}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API de pesquisa AI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
