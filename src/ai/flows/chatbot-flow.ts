'use server';
/**
 * @fileOverview A conversational AI agent for the LISTED platform.
 *
 * - chatbotFlow - A function that handles user queries about the platform.
 */

import { ai, aiProviderReady } from '@/ai/genkit';
import { z } from 'genkit';

const ChatbotInputSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.array(z.object({ text: z.string() })),
      })
    )
    .optional()
    .describe('The chat history between the user and the model.'),
  message: z.string().describe('The latest user message.'),
});

const ChatbotOutputSchema = z.object({
  response: z.string().describe("The AI model's response to the user message."),
});

// Define the prompt object separately. This follows the Genkit v1.x pattern
// and uses the `messages` builder instead of the deprecated `history` field.
const chatbotPrompt = ai.definePrompt({
  name: 'chatbotPrompt',
  input: { schema: ChatbotInputSchema },
  output: { schema: ChatbotOutputSchema },
  messages: ({ history, message }) => [
    {
      role: 'system',
      content: [
        {
          text: `You are a friendly and helpful AI assistant for a platform called LISTED.
LISTED connects startup founders in Pakistan with angel investors and institutional funds. It also provides a network for sales professionals.
Your primary goal is to answer user questions about the platform, entrepreneurship, and funding in a concise, encouraging, and supportive manner.
Keep your responses brief and to the point. Use markdown for formatting if it helps clarity.

Here are some key facts about LISTED:
- Main purpose: Help Pakistani startups get funded.
- Users: Founders, Sales Professionals, Angel Investors, Institutional Funds.
- Key features: Pitch creation, investor directory, sales offer listings, co-founder network.

Engage in a friendly conversation.`,
        },
      ],
    },
    ...(history ?? []),
    {
      role: 'user',
      content: [{ text: message }],
    },
  ],
});

function generateOfflineResponse(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.match(/^(hi|hello|hey)\b/)) {
    return 'Hi there! I\'m the LISTED assistant. Tell me about your startup, fundraising plans, or sales goals and I\'ll share quick guidance.';
  }

  if (normalized.includes('fund') || normalized.includes('invest')) {
    return 'LISTED helps Pakistani founders prepare investor-ready pitches and connect with angels and funds. Share your stage and traction so I can suggest next steps.';
  }

  if (normalized.includes('sales') || normalized.includes('seller') || normalized.includes('deal')) {
    return 'You can list sales offers, connect with sales talent, and showcase deals on LISTED. Let me know your sector and target customers to tailor suggestions.';
  }

  if (normalized.includes('co-founder') || normalized.includes('cofounder') || normalized.includes('founder')) {
    return 'Looking for a co-founder? LISTED hosts a network of founders and operators. Describe the skills you need and I can outline how to set up a compelling profile.';
  }

  if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('plan')) {
    return 'You can start by creating a free profile and explore investor and sales directories. For premium visibility and outreach tools, the team can share current pricing when you message support.';
  }

  if (normalized.includes('contact') || normalized.includes('help') || normalized.includes('support')) {
    return 'You can reach the LISTED team directly from the help section or via support@listed.ai. In the meantime, tell me what you need and I\'ll point you to the right feature.';
  }

  return 'Happy to help! Ask me about funding, investors, sales outreach, or using LISTED and I\'ll share quick, actionable guidance.';
}

export const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    const { history, message } = input;

    if (!aiProviderReady) {
      return { response: generateOfflineResponse(message) };
    }

    try {
      // Call the pre-defined prompt object with the input; the prompt
      // handles the generate call internally.
      const { output } = await chatbotPrompt({
        message,
        history,
      });

      return output ?? { response: "I'm sorry, I'm having trouble thinking right now. Please try again." };
    } catch (error) {
      console.error('[Chatbot Flow Error]', error);
      return { response: "I'm sorry, but I'm unable to connect to the AI service right now. Please try again in a few moments." };
    }
  }
);
