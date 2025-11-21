
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure you have GOOGLE_API_KEY set in your environment
// or configure the API key directly if needed.
// Example:
// plugins: [googleAI({apiKey: "YOUR_GOOGLE_API_KEY"})],

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro', // Default model changed to a more stable option
});


