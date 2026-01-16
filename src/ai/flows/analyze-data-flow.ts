'use server';
/**
 * @fileOverview An AI flow for analyzing business performance data.
 *
 * - analyzeBusinessData - A function that analyzes sales and inventory data to provide insights.
 * - AnalysisInput - The input type for the analysis function.
 * - AnalysisOutput - The return type for the analysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MonthlySaleSchema = z.object({
  name: z.string().describe('The month name (e.g., "Jan", "Fev").'),
  vendas: z.number().describe('The total sales value for that month.'),
});

const ProductStatSchema = z.object({
  name: z.string().describe('The name of the product.'),
  quantity: z.number().optional().describe('The quantity sold for the top selling product.'),
  stock: z.number().optional().describe('The stock quantity for the product with the highest inventory.'),
});

export const AnalysisInputSchema = z.object({
  monthlySales: z.array(MonthlySaleSchema).describe('An array of sales data for the last 6 months.'),
  topSellingProduct: ProductStatSchema.describe('The product that sold the most units this month.'),
  highestInventoryProduct: ProductStatSchema.describe('The product with the highest current stock level.'),
  totalProducts: z.number().describe('Total number of distinct products in stock.'),
  totalStockItems: z.number().describe('Total number of all items in stock across all products.'),
  lowStockCount: z.number().describe('The number of products currently in low stock.'),
});
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

export const AnalysisOutputSchema = z.object({
  headline: z.string().describe('A single, impactful headline summarizing the most important finding.'),
  positiveObservation: z.string().describe('A key positive observation from the data. Be encouraging.'),
  criticalObservation: z.string().describe('A key area for improvement or a potential risk. Be direct but constructive.'),
  suggestion: z.string().describe('A concrete, actionable suggestion based on the critical observation.'),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;


export async function analyzeBusinessData(input: AnalysisInput): Promise<AnalysisOutput> {
  return analyzeBusinessDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'businessAnalysisPrompt',
  input: {schema: AnalysisInputSchema},
  output: {schema: AnalysisOutputSchema},
  prompt: `You are a business intelligence analyst for a construction materials company in Mozambique. Your name is Major, the AI assistant for MajorStockX. Your tone is professional, insightful, and slightly informal. Your goal is to provide a quick, actionable analysis of the provided data.

Analyze the following business data:
- Monthly Sales (last 6 months): {{jsonStringify monthlySales}}
- Top Selling Product this month: {{topSellingProduct.name}} ({{topSellingProduct.quantity}} units)
- Product with Highest Inventory: {{highestInventoryProduct.name}} ({{highestInventoryProduct.stock}} units)
- Total distinct products: {{totalProducts}}
- Total items in stock: {{totalStockItems}}
- Products in low stock: {{lowStockCount}}

Based on this data, provide a concise analysis. Follow these rules:
1.  **Headline:** Create a single, powerful headline (max 12 words) that captures the most important insight.
2.  **Positive Point:** Identify one clear strength or positive trend. Start with "Ponto Forte:".
3.  **Critical Point:** Identify the single most critical risk or area for improvement. Start with "Ponto de Atenção:". Be direct.
4.  **Suggestion:** Provide one actionable suggestion directly related to the critical point. Start with "Sugestão:".

Example Output:
{
  "headline": "Vendas do Produto X disparam, mas stock de segurança está em risco.",
  "positiveObservation": "Ponto Forte: As vendas de 'Pavê Zig-zag' mais do que duplicaram em relação ao mês passado, mostrando uma forte procura de mercado.",
  "criticalObservation": "Ponto de Atenção: O produto 'Lancis Dentados', com o maior inventário, teve vendas quase nulas. É capital parado.",
  "suggestion": "Sugestão: Considere uma campanha promocional para o 'Lancis Dentados' ou avalie a possibilidade de reduzir a sua produção temporariamente."
}

Generate the analysis for the provided data.
`,
});

const analyzeBusinessDataFlow = ai.defineFlow(
  {
    name: 'analyzeBusinessDataFlow',
    inputSchema: AnalysisInputSchema,
    outputSchema: AnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
