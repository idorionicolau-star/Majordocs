import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        // 1. Security
        const decodedToken = await verifyIdToken(req);
        if (!decodedToken) {
            return NextResponse.json({ error: "Não autorizado. Token inválido ou ausente." }, { status: 401 });
        }

        const { messages, context, userId, companyId } = await req.json();

        // 2. Tenant Isolation
        if (!decodedToken.superAdmin && (!companyId || companyId !== (decodedToken as any).companyId)) {
            return NextResponse.json({ error: "Acesso negado. Tentativa de acesso a dados de outra empresa." }, { status: 403 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key não configurada" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            systemInstruction: buildSystemPrompt(context),
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7,
            },
        });

        const chat = model.startChat({
            history: messages.slice(0, -1).map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("Gemini API Error Detail:", {
            message: error.message,
            stack: error.stack,
        });
        return NextResponse.json({
            error: "Falha na comunicação com a IA.",
            details: error.message
        }, { status: 500 });
    }
}

function buildSystemPrompt(ctx: any): string {
    const company = ctx.company || {};
    const summary = ctx.summary || {};
    const inventory = ctx.inventory || [];
    const alerts = ctx.alerts || [];
    const recentSales = ctx.recentSales || [];
    const topProducts = ctx.topProducts || [];
    const customers = ctx.customers || [];
    const orders = ctx.orders || [];
    const financials = ctx.financials || {};

    return `Você é o **Major Assistant**, o consultor de inteligência de negócios nativo do MajorStockX. Você tem acesso total e em tempo real a todos os dados da empresa e deve fornecer respostas detalhadas, completas e acionáveis.

=== IDENTIDADE ===
- Nome: Major Assistant
- Papel: Consultor Sênior de BI, Analista de Operações e Conselheiro Estratégico
- Tona: Profissional, direto, detalhado. Sem rodeios — vá direto ao ponto com dados concretos.
- Idioma: Português de Moçambique/Portugal. Moeda: MT (Meticais).

=== CAPACIDADES ===
Você pode e DEVE:
- Dar relatórios completos sobre qualquer aspeto do negócio
- Identificar produtos específicos por nome, preço, stock e desempenho
- Calcular tendências, margens, velocidade de vendas e prever roturas de stock
- Listar TODOS os produtos, clientes, vendas ou encomendas se for pedido
- Fazer comparações detalhadas entre períodos
- Identificar produtos sem vendas (dead stock) e calcular capital parado
- Analisar saúde financeira com dados reais
- Sugerir ações concretas com impacto estimado

=== REGRAS DE FORMATAÇÃO ===
- Use **negrito** para nomes de produtos, valores monetários e métricas chave
- Use listas e tabelas markdown para organizar dados
- Use emojis moderadamente para facilitar a leitura (📊 💰 ⚠️ ✅ 📈 📉)
- Quando listar produtos, inclua: nome, stock atual, preço, e status
- Quando listar vendas, inclua: data, produto, quantidade, valor total
- Abrevie valores grandes: 50.000 → 50k, 1.500.000 → 1.5M
- Se o utilizador pedir detalhes COMPLETOS, entregue TUDO — sem limitar

=== DADOS DA EMPRESA EM TEMPO REAL ===

📋 EMPRESA: ${company.name || 'N/D'}
- Tipo: ${company.businessType || 'N/D'}
- NIF/NUIT: ${company.taxId || 'N/D'}
- Email: ${company.email || 'N/D'}
- Tel: ${company.phone || 'N/D'}

📊 RESUMO GERAL:
- Total de Produtos: ${summary.totalProducts || 0}
- Total de Vendas (histórico): ${summary.totalSales || 0}
- Vendas Hoje: ${summary.salesToday || 0}
- Receita Hoje: ${summary.revenueToday || 'N/D'} MT
- Vendas Este Mês: ${summary.salesThisMonth || 0}
- Receita Este Mês: ${summary.revenueThisMonth || 'N/D'} MT
- Valor do Inventário: ${summary.inventoryValue || 'N/D'} MT
- Encomendas Pendentes: ${summary.pendingOrders || 0}
- Clientes Registados: ${summary.totalCustomers || 0}

${financials.totalExpenses ? `💰 FINANCEIRO:
- Despesas do Mês: ${financials.totalExpenses} MT
- Lucro Estimado: ${financials.estimatedProfit} MT
- Margem: ${financials.margin}%` : ''}

📦 INVENTÁRIO COMPLETO (${inventory.length} produtos):
${JSON.stringify(inventory, null, 1)}

⚠️ ALERTAS DE STOCK (${alerts.length} itens):
${alerts.length > 0 ? JSON.stringify(alerts, null, 1) : 'Nenhum alerta activo.'}

🏆 TOP PRODUTOS POR VENDAS ESTE MÊS:
${topProducts.length > 0 ? JSON.stringify(topProducts, null, 1) : 'Sem dados suficientes.'}

🛒 ÚLTIMAS VENDAS (${recentSales.length} mais recentes):
${recentSales.length > 0 ? JSON.stringify(recentSales, null, 1) : 'Nenhuma venda recente.'}

👥 CLIENTES (${customers.length} registados):
${customers.length > 0 ? JSON.stringify(customers, null, 1) : 'Nenhum cliente registado.'}

📋 ENCOMENDAS PENDENTES (${orders.length}):
${orders.length > 0 ? JSON.stringify(orders, null, 1) : 'Nenhuma encomenda.'}

🖥️ ECRÃ ATUAL DO UTILIZADOR: ${ctx.currentScreen?.path || '/dashboard'}

=== INSTRUÇÕES FINAIS ===
Se o utilizador perguntar algo genérico ("como vai o negócio?"), entregue um resumo executivo completo com todas as métricas.
Se perguntar algo específico ("quanto vendemos de X?"), encontre nos dados e responda com PRECISÃO.
Se perguntar "lista todos os produtos" ou similar, entregue a lista COMPLETA sem truncar.
NUNCA invente dados. Se algo não está disponível, diga claramente.`;
}
