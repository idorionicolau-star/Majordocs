'use server';
/**
 * @fileOverview A flow to list available AI models from the provider.
 *
 * - listModels - A function that fetches and returns a list of available models.
 * - ModelInfo - The type for a single model's information.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModelInfoSchema = z.object({
  name: z.string().describe('The unique identifier for the model, e.g., "models/gemini-1.5-flash-latest".'),
  displayName: z.string().describe('The human-readable name for the model, e.g., "Gemini 1.5 Flash".'),
  description: z.string().describe('A description of the model.'),
  version: z.string().describe('The version of the model.'),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

const ListModelsOutputSchema = z.array(ModelInfoSchema);
export type ListModelsOutput = z.infer<typeof ListModelsOutputSchema>;

export async function listModels(): Promise<ListModelsOutput> {
  return listModelsFlow();
}

const listModelsFlow = ai.defineFlow(
  {
    name: 'listModelsFlow',
    inputSchema: z.void(),
    outputSchema: ListModelsOutputSchema,
  },
  async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models`;

    try {
      // The API key is now configured in the googleAI() plugin, so it's sent automatically.
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao obter modelos: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      const data = await response.json();
      
      const models = data.models.map((model: any) => ({
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          version: model.version,
      }));
      
      // Filter for generative models only, as the API returns others like embedding models
      return models.filter((m: ModelInfo) => m.name.includes('gemini'));

    } catch (error: any) {
      console.error('Error fetching models from Google AI:', error);
      throw new Error(`Ocorreu um erro ao tentar listar os modelos: ${error.message}`);
    }
  }
);
