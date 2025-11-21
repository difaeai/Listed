
import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

const googleApiKey = process.env.GOOGLE_API_KEY;

/**
 * Whether the AI provider is configured and ready to serve requests.
 *
 * If this is false, the chatbot flow will gracefully fall back to a
 * predefined response instead of throwing an error for missing config.
 */
export const aiProviderReady = Boolean(googleApiKey);

export const ai = genkit({
  plugins: googleApiKey ? [googleAI({ apiKey: googleApiKey })] : [],
  model: googleApiKey ? 'googleai/gemini-1.5-flash-latest' : undefined,
});
