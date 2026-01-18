
'use server';
/**
 * @fileOverview A flow to generate a sales report summary from text using AI.
 *
 * - generateSalesReport - A function that takes a text prompt and returns an AI-generated sales report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSalesReportInputSchema = z.string();
export type GenerateSalesReportInput = z.infer<typeof GenerateSalesReportInputSchema>;

const GenerateSalesReportOutputSchema = z.string();
export type GenerateSalesReportOutput = z.infer<typeof GenerateSalesReportOutputSchema>;

export async function generateSalesReport(input: GenerateSalesReportInput): Promise<GenerateSalesReportOutput> {
  return generateSalesReportFlow(input);
}

const salesReportPrompt = ai.definePrompt({
  name: 'salesReportPrompt',
  input: { schema: GenerateSalesReportInputSchema },
  output: { format: 'text' },
  prompt: `És um analista de vendas especialista. Com base nos seguintes dados ou pedido, gera um resumo conciso e perspicaz do relatório de vendas. A resposta deve ser em português e formatada em Markdown.

Pedido/dados do utilizador:
{{{input}}}`,
});

const generateSalesReportFlow = ai.defineFlow(
  {
    name: 'generateSalesReportFlow',
    inputSchema: GenerateSalesReportInputSchema,
    outputSchema: GenerateSalesReportOutputSchema,
  },
  async (input) => {
    const { text } = await salesReportPrompt(input);
    return text;
  }
);

    