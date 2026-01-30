import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { messages, context, userId } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const systemPrompt = `Você é o Major Assistant, o consultor inteligente do Majordocs. Você tem acesso aos dados de inventário, vendas e produção. Seu objetivo é ajudar o usuário a encontrar produtos, sugerir reposições de estoque e explicar erros técnicos. Seja conciso, profissional e use um toque de wit (astúcia).

    CONTEXTO ATUAL DA TELA (Use isto prioritariamente):
    ${JSON.stringify(context.currentScreen, null, 2)}

    RESUMO DO ESTADO (Para visão geral):
    ${JSON.stringify(context.summary, null, 2)}

    CATÁLOGO COMPLETO DE INVENTÁRIO (Para consultas específicas de stock):
    ${JSON.stringify(context.inventory, null, 2)}

    ALERTAS CRÍTICOS IDENTIFICADOS (Para consultas de "Alertas" ou "Problemas"):
    ${JSON.stringify(context.alerts, null, 2)}

    REGRAS CRÍTICAS:
    1. **PRIORIDADE MÁXIMA:** Se o usuário perguntar por "stock", "quantidade" ou "preço" de um produto, VOCÊ DEVE PROCURAR na lista 'CATÁLOGO COMPLETO DE INVENTÁRIO' acima.
    2. Se perguntar por **"Alertas"** ou **"Problemas"**, liste IMEDIATAMENTE os itens em 'ALERTAS CRÍTICOS IDENTIFICADOS'. Indique se está "CRÍTICO (0)" ou "BAIXO".
    3. NÃO diga "não consigo ver" se o produto estiver nessas listas. Procure por correspondência parcial.
    4. Seja direto e prático.
    5. Responda em Português (Portugal/Brasil conforme o usuário).
    6. Use Markdown para tabelas.`;

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
