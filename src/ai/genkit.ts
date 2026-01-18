'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';

dotenv.config();

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'info',
  enableTracingAndMetrics: true,
});
