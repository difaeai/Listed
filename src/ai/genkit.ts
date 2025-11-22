
import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Try multiple environment variable names so the chatbot works whether the
// key is provided as a server-only or public variable in hosting platforms.
const googleApiKey =
  process.env.GOOGLE_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ??
  process.env.GENKIT_GOOGLE_API_KEY ??
  process.env.NEXT_PUBLIC_GENKIT_GOOGLE_API_KEY;

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
