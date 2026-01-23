
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { differenceInDays } from 'date-fns';

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

    let dataAgeContext = '';
    if (isHealthCheck && contextData?.businessStartDate) {
        const startDate = new Date(contextData.businessStartDate);
        const today = new Date();
        const businessAgeInDays = differenceInDays(today, startDate);

        if (businessAgeInDays < 15) {
             dataAgeContext = `
              **Nota CRÍTICA para a IA:** A empresa está na fase de "Nutrição de Dados", com ${businessAgeInDays + 1} dia(s) de operação.
              - **Foco Principal:** O teu objetivo é **validar e encorajar**, não dar conselhos financeiros profundos. Foque em verificar se os dados estão a ser inseridos corretamente.
              - **Exemplo de Abordagem:** Mencione uma venda ou um produto recentemente adicionado. Ex: "Ótimo trabalho ao inserir as primeiras vendas! O produto X parece estar a ter um bom começo." ou "Reparei que o inventário foi atualizado. Continue a registar todos os produtos para que eu possa fazer uma análise mais precisa em breve."
              - **Tom:** Seja um parceiro que está a "aprender" junto com o utilizador. Evite fazer previsões de longo prazo. Não faças julgamentos.
            `;
        } else if (businessAgeInDays < 30) {
            dataAgeContext = `
              **Nota:** A empresa tem menos de 30 dias de dados. A tua análise deve considerar que as tendências ainda estão a emergir e podem não ser representativas a longo prazo.
            `;
        }
    }

    const jsonStructure = `
      \`\`\`json
      {
        "geral": "Um resumo executivo de uma frase sobre a saúde geral do negócio. [SAÚDE ATUAL]",
        "oportunidade": {
          "titulo": "Título da Oportunidade (ex: Produto em Alta) [PONTO DE FOCO]",
          "descricao": "Descrição concisa e quantitativa da oportunidade. (ex: 'O produto X vendeu 50 unidades esta semana, 30% acima da média, mas o stock está em apenas 10.')",
          "sugestao": "Uma sugestão acionável. (ex: 'Focar na reposição imediata para não perder vendas.')"
        },
        "risco": {
          "titulo": "Título do Risco (ex: Stock Parado) [ALERTA DE MELHORIA]",
          "descricao": "Descrição concisa e quantitativa do risco. (ex: 'O item Y não vende há 45 dias e representa 15% do valor total do inventário.')",
          "sugestao": "Uma sugestão acionável. (ex: 'Considere uma promoção para libertar capital.')"
        }
      }
      \`\`\`
    `;
    
    const systemPrompt = `Você é o **Consultor Estratégico de Elite** integrado no software de gestão "MajorStockX". Seu objetivo é analisar os dados brutos de vendas, estoque e produção e entregar um diagnóstico executivo para o dono da empresa.`;

    const healthCheckInstructions = `
      **Regras de Comportamento:**
      1.  **Seja Direto:** Não use introduções longas como 'Espero que este relatório ajude'. Vá direto aos pontos.
      2.  **Prioridade Financeira:** Fale primeiro sobre dinheiro (faturamento, custos, margens).
      3.  **Foco no Valor Real:** Ao analisar vendas e faturamento, use **sempre** o campo \`amountPaid\`. O campo \`totalValue\` é o valor total da encomenda, mas o \`amountPaid\` é o dinheiro que realmente entrou. Seja explícito sobre isso se for relevante. Exemplo: "A encomenda de X, com valor total de 63.000 MT, contribuiu com 31.500 MT para o faturamento deste período, que foi o valor pago."
      4.  **Ação, não apenas dado:** Não diga apenas 'O estoque está baixo'. Diga 'Reponha o item X imediatamente para evitar perda de faturamento estimada em Y'.
      5.  **Tom de Voz:** Seguro, autoritário, porém encorajador.
      6.  **Formato de Saída OBRIGATÓRIO:** A tua resposta DEVE ser um objeto JSON válido, sem nenhum texto fora do JSON. A estrutura deve ser: ${jsonStructure}.
          - O campo "geral" deve corresponder à [SAÚDE ATUAL].
          - O campo "oportunidade" deve corresponder aos [PONTOS DE FOCO].
          - O campo "risco" deve corresponder aos [ALERTA DE MELHORIA].

      ${dataAgeContext}

      **Contexto dos Dados:** Você receberá um objeto JSON contendo as transações recentes, níveis de estoque e estatísticas gerais.`;
      
    const generalQuestionInstructions = `
      **Instruções para Perguntas Gerais:**
      1.  **Aja como o MajorAssistant:** Mantenha um tom de especialista na aplicação de gestão "MajorStockX".
      2.  **Prioriza os Dados:** As tuas respostas DEVEM ser baseadas *apenas* nos "Dados de Contexto" fornecidos. Não inventes produtos, quantidades ou datas. Responda em texto simples (Markdown).
      3.  **Sê Preciso:** Se questionado sobre um produto, encontra a correspondência exata. Se não houver, indica isso.
      4.  **Orientação de Navegação:** Se o utilizador perguntar como fazer algo, fornece uma resposta clara e um link em Markdown para a página relevante (ex: "Pode adicionar novos produtos na página de [Inventário](/inventory?action=add)").`;

    const prompt = `
      ${systemPrompt}

      ${isHealthCheck ? healthCheckInstructions : generalQuestionInstructions}

      Estrutura da Aplicação (para orientação de navegação, se necessário):
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
