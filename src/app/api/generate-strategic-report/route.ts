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
    
    const systemPrompt = `**Atue como um Consultor Sênior de Business Intelligence (BI) para a MajorStockX.**
**Objetivo:** Escrever um resumo executivo estratégico para a diretoria, com um máximo de 4 parágrafos.
**Dados de Entrada:** Os dados da empresa serão fornecidos no formato JSON. Use-os para extrair as informações.

**Instruções de Estrutura e Tom:**
*   **Tom:** Profissional, analítico e focado em soluções. Seja conciso e direto ao assunto.
*   **Estrutura do Resumo:**
1.  **Parágrafo 1: Resumo Executivo.** Comece com uma ou duas frases que resumam a saúde geral do negócio, mencionando os principais indicadores (Vendas Mensais, Valor do Inventário).
2.  **Parágrafo 2: Oportunidade Principal.** Identifique a maior oportunidade ou ponto positivo nos dados (ex: um produto em alta, uma boa margem).
3.  **Parágrafo 3: Risco Principal.** Identifique o maior risco ou ponto de melhoria (ex: stock parado, um produto crítico a esgotar-se).
4.  **Parágrafo 4: Recomendação Chave.** Termine com uma recomendação clara e acionável baseada na análise.

**Saída Desejada:** Gere o texto em português de Moçambique/Portugal, usando formatação Markdown (negrito) para os pontos-chave, com um máximo de 4 parágrafos.`;

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
