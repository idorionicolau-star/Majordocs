'use server';
/**
 * @fileOverview A flow to generate dashboard insights using AI.
 *
 * - generateDashboardInsights - A function that takes dashboard data and returns an AI-generated summary.
 * - DashboardInsightsInput - The input type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const DashboardInsightsInputSchema = z.object({
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
export type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

export type DashboardInsightsOutput = string;

export async function generateDashboardInsights(input: DashboardInsightsInput): Promise<DashboardInsightsOutput> {
  return generateDashboardInsightsFlow(input);
}

const insightsPrompt = ai.definePrompt({
  name: 'dashboardInsightsPrompt',
  input: { schema: DashboardInsightsInputSchema },
  output: { format: 'text' },
  prompt: `És um analista de negócios especialista em gestão de inventário e vendas. Com base nos seguintes dados, gera um resumo conciso (3 a 4 frases) com insights acionáveis para o dono do negócio. A resposta deve ser em português e usar Markdown para formatação (negrito para destaque, listas para pontos).

Dados para análise:
- Valor Total de Vendas: {{{totalSales}}} MZN
- Produtos Mais Vendidos: 
{{#each topSellingProducts}}
  - {{name}}: {{quantity}} unidades
{{/each}}
- Produtos Sem Vendas (com stock):
{{#each unsoldProducts}}
  - {{name}}: {{totalStock}} em stock
{{/each}}

Foca-te em:
1. Uma observação geral sobre as vendas.
2. Uma sugestão sobre os produtos mais vendidos.
3. Uma ação recomendada para os produtos parados em stock.`,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: DashboardInsightsInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await insightsPrompt(input);
    return text;
  }
);
