import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';

const DashboardInsightsInputSchema = z.object({
  totalSales: z.number().describe('Total sales value for the period.'),
  topSellingProducts: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
  })).describe('List of top selling products.'),
  unsoldProducts: z.array(z.object({
    name: z.string(),
    totalStock: z.number(),
  })).describe('List of products with stock but no sales.'),
});
type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

function buildPrompt(input: DashboardInsightsInput): string {
    const topSellingText = input.topSellingProducts.length > 0
        ? input.topSellingProducts.map(p => `  - ${p.name}: ${p.quantity} unidades`).join('\n')
        : "  - N/A";
    const unsoldText = input.unsoldProducts.length > 0
        ? input.unsoldProducts.map(p => `  - ${p.name}: ${p.totalStock} em stock`).join('\n')
        : "  - N/A";

    return `És um analista de negócios especialista em gestão de inventário e vendas. Com base nos seguintes dados, gera um resumo conciso (3 a 4 frases) com insights acionáveis para o dono do negócio. A resposta deve ser em português e usar Markdown para formatação (negrito para destaque, listas para pontos).

Dados para análise:
- Valor Total de Vendas: ${input.totalSales.toFixed(2)} MZN
- Produtos Mais Vendidos: 
${topSellingText}
- Produtos Sem Vendas (com stock):
${unsoldText}

Foca-te em:
1. Uma observação geral sobre as vendas.
2. Uma sugestão sobre os produtos mais vendidos.
3. Uma ação recomendada para os produtos parados em stock.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "A chave de API do Gemini não está configurada." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const validatedBody = DashboardInsightsInputSchema.safeParse(body);

    if (!validatedBody.success) {
        return NextResponse.json({ error: "Dados de entrada inválidos.", details: validatedBody.error.flatten() }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = buildPrompt(validatedBody.data);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Error generating dashboard insights:", error);
    return NextResponse.json({ error: "Falha ao gerar análise de IA.", details: error.message }, { status: 500 });
  }
}
