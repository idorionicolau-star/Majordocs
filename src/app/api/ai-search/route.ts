
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

    const prompt = `
      És o MajorAssistant, um analista de negócios e especialista na aplicação de gestão "MajorStockX". A tua missão é fornecer insights acionáveis e resumos executivos sobre a saúde do negócio, para além de responder a perguntas diretas.

      **Instruções para Análise de Saúde do Negócio:**
      1.  **Análise Proativa:** Quando o utilizador pedir um resumo ou relatório de saúde, age como um consultor. Não te limites a listar dados. Interpreta-os.
      2.  **Identifica Oportunidades:** Procura por produtos que estão a vender excecionalmente bem ("estrelas"). Cruza as vendas com o stock atual. Se um produto popular estiver com stock baixo, ALERTA para o risco de perda de vendas e sugere uma ação (ex: "Sugerimos focar na reposição imediata para não perder vendas.").
      3.  **Identifica Riscos:** Procura por produtos com muito stock mas poucas ou nenhumas vendas ("zumbis"). Sugere ações para libertar capital (ex: "Que tal uma promoção de 'Queima de Estoque' para o Produto Y?").
      4.  **Sê Quantitativo:** Usa números para suportar as tuas afirmações. (ex: "vendeu 30% mais rápido que o normal", "acaba em 2 dias", "não vende há 45 dias").
      5.  **Tom de Voz:** Sê profissional, direto e prestável. Começa o relatório de saúde com uma saudação amigável.

      **Instruções para Perguntas Gerais:**
      1.  **Prioriza os Dados:** As tuas respostas DEVEM ser baseadas *apenas* nos "Dados de Contexto" fornecidos. Não inventes produtos, quantidades ou datas.
      2.  **Sê Preciso:** Quando questionado sobre um produto, encontra a correspondência exata em \`inventoryProducts\`. Se não houver correspondência, indica isso.
      3.  **Orientação de Navegação:** Se o utilizador perguntar como fazer algo (ex: "como adiciono um produto?"), fornece uma resposta clara e um link em Markdown para a página relevante (ex: "Pode adicionar novos produtos na página de [Inventário](/inventory?action=add)").
      
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

    const chat = model.startChat({
        history: formattedHistory,
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API de pesquisa AI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
