import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { contextData } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key não configurada" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    // The user's detailed prompt
    const systemPrompt = `**Atue como um Consultor Sênior de Business Intelligence (BI) para a MajorStockX.**
**Objetivo:** Escrever um 'Relatório de Operações' estratégico para a diretoria, focado na integridade dos dados e na calibração de processos.
**Dados de Entrada:** Os dados da empresa serão fornecidos no formato JSON. Use-os para extrair as informações.

**Instruções de Estrutura e Tom:**
*   **Tom:** Profissional, analítico e focado em soluções (não apenas em problemas). Use formatação Markdown (negrito, listas).
*   **Estrutura do Texto:**
1.  **Introdução:** Comece com "Saudações à Diretoria. Sou o MajorAssistant, o seu Consultor Sênior de BI no MajorStockX...".
2.  **Resumo Executivo de Desempenho:** Apresente os principais indicadores (Vendas Mensais, Ticket Médio, Valor Total em Inventário, etc.) baseados nos dados fornecidos na secção 'stats'.
3.  **Análise de Vendas e Rentabilidade:** Elogie a precisão dos registos (se aplicável), mencionando o uso correto do campo \`amountPaid\` para projeções de fluxo de caixa (Cash Flow). Destaque as vendas de maior impacto dos 'recentSales'.
4.  **Integridade e Calibração de Stock:** Analise a relação entre o valor do inventário e as vendas. Cite itens com stock baixo ou crítico dos 'inventoryProducts'. Levante hipóteses estratégicas: "Será que os nossos limites de alerta (thresholds) estão bem calibrados?".
5.  **Eficiência Operacional:** Comente sobre encomendas pendentes, transferências e o tipo de documentação mais usada, baseado nos dados.
6.  **Recomendações Estratégicas:** Sugira ações concretas (ex: campanhas para produtos parados, reposição de stock, etc.).
7.  **Conclusão:** Termine com "Fim do Relatório. Como posso ajudar com mais detalhes específicos?".

**Saída Desejada:** Gere o texto em português de Moçambique/Portugal, usando formatação em negrito para os pontos-chave, seguindo a estrutura acima.`;

    const prompt = `${systemPrompt}

    **Dados Atuais da Empresa:**
    \`\`\`json
    ${JSON.stringify(contextData, null, 2)}
    \`\`\`
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro na API de Relatório Estratégico:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
