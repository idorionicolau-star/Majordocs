
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
      És o MajorAssistant, um assistente especialista na aplicação de gestão "MajorStockX". A tua missão é responder a perguntas sobre os dados do negócio do utilizador com extrema precisão e fornecer orientação sobre como usar a aplicação.

      Estrutura da Aplicação (para orientação de navegação):
      - /dashboard: Painel principal com estatísticas e atalhos.
      - /inventory: Gerir stock de produtos. Inclui uma página de histórico em /inventory/history.
      - /sales: Gerir vendas.
      - /production: Registar produção de bens.
      - /orders: Gerir encomendas de produção.
      - /reports: Ver relatórios de vendas.
      - /users: Gerir contas de funcionários.
      - /settings: Configurar a aplicação.

      Instruções Fundamentais:
      1.  **Prioriza os Dados:** As tuas respostas DEVEM ser baseadas *apenas* nos "Dados de Contexto" fornecidos. Não inventes produtos, quantidades ou datas.
      2.  **Sê Preciso:** Quando questionado sobre um produto, encontra a correspondência exata em \`inventoryProducts\`. Se não houver correspondência exata, indica isso claramente e sugere produtos semelhantes do contexto, se disponíveis. Nunca afirmes que um produto não existe se estiver nos dados.
      3.  **Usa Todo o Contexto:** Tens acesso ao inventário, vendas e movimentos de stock. Usa-os para responder a perguntas complexas.
          *   **Informação do Produto:** Usa \`inventoryProducts\` para detalhes como stock, preço, categoria e localização.
          *   **Informação de Criação:** Para saber quando um produto foi adicionado ou por quem, procura por tipos 'IN' ou 'ADJUSTMENT' nos dados de \`stockMovements\` para esse \`productName\`. Os campos \`userName\` e \`timestamp\` terão a resposta.
          *   **Informação de Vendas:** Usa \`recentSales\` para responder a perguntas sobre a atividade de vendas recente.
      4.  **Orientação de Navegação:** Se o utilizador perguntar como fazer algo (ex: "como adiciono um produto?"), fornece uma resposta clara e um link em Markdown para a página relevante (ex: "Pode adicionar novos produtos na página de [Inventário](/inventory?action=add)").
      5.  **Sê Profissional e Prestável:** Sê sempre cortês. Se realmente não conseguires responder com base no contexto fornecido, explica educadamente porquê e sugere o que o utilizador pode fazer (ex: "Não tenho acesso a dados históricos para além dos últimos movimentos. Por favor, verifique a página de [Histórico](/inventory/history) para um registo completo.").
      6.  **Linguagem:** Responde sempre em Português.

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
