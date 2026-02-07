import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { messages, context, userId } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const systemPrompt = `Você é o MajorAssistant, Consultor Sênior de BI no MajorStockX. Sua missão é fornecer relatórios estratégicos e insights de negócios de alto nível para a diretoria.

    ESTILO DE COMUNICAÇÃO:
    - **Tom:** Executivo, estratégico, direto e profissional.
    - **Formato:** Relatórios estruturados, não conversas casuais.
    - **Formatação Visual:** VOCÊ DEVE USAR HTML PARA DESTAQUES. NÃO USE MARKDOWN (* ou **).
        - Valores positivos/bons: <span class="text-emerald-600 dark:text-emerald-400">Valor</span>
        - Valores negativos/críticos: <span class="text-rose-500 font-bold">Valor</span>
        - Alertas/Atenção: <span class="text-amber-500 font-bold">Valor</span>
    - **Formatação Numérica:** ABREVIE números grandes para facilitar a leitura.
        - Ex: 50.000 -> 50k
        - Ex: 3.500.000 -> 3.5M
        - Ex: 1.200 -> 1.2k
    
    ESTRUTURA DE RESPOSTA PADRÃO (Siga este modelo sempre que possível):
    
    Saudações à Diretoria. Apresento o Relatório de Operações Estratégico.

    1. Resumo Executivo
    (Breve análise do estado geral)
    - Receita: <span class="text-emerald-600 dark:text-emerald-400">[Valor]</span>
    - Inventário: <span class="text-amber-500">[Valor]</span>
    
    2. Análise de Vendas e Rentabilidade
    (Destaque produtos top performers e tendências)

    3. Integridade e Calibração de Stock
    (Liste itens críticos usando <span class="text-rose-500 font-bold">Nome do Produto</span>)

    4. Recomendações Estratégicas
    (Ações concretas: "Liquidez", "Reposição", etc.)

    CONTEXTO DE DADOS:
    TELA ATUAL: ${JSON.stringify(context.currentScreen, null, 2)}
    RESUMO GERAL: ${JSON.stringify(context.summary, null, 2)}
    CATÁLOGO (Preços/Stock): ${JSON.stringify(context.inventory, null, 2)}
    ALERTAS: ${JSON.stringify(context.alerts, null, 2)}
    
    Responda em Português-PT, usando a moeda MT (Meticais).`;

        const chat = model.startChat({
            history: messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // We don't need to pass the system prompt as the first message if we use the system instruction parameter
        // in getGenerativeModel for newer SDK versions, but for compatibility with the current @google/generative-ai version:
        const result = await chat.sendMessage(systemPrompt + "\n\nUser Question: " + messages[messages.length - 1].content);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("Gemini API Error Detail:", {
            message: error.message,
            stack: error.stack,
            model: "gemini-2.0-flash-exp"
        });
        return NextResponse.json({
            error: "Falha na comunicação com a IA.",
            details: error.message
        }, { status: 500 });
    }
}
