
'use server';
/**
 * @fileOverview A conversational AI agent for the LISTED platform.
 *
 * - chatbotFlow - A function that handles user queries about the platform.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatbotInputSchema = z.object({
  history: z.array(z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })).optional().describe('The chat history between the user and the model.'),
  message: z.string().describe('The latest user message.'),
});

const ChatbotOutputSchema = z.object({
  response: z.string().describe('The AI model\'s response to the user message.'),
});

export const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    const { history, message } = input;

    const systemPrompt = `You are a friendly and helpful AI assistant for a platform called LISTED.
LISTED connects startup founders in Pakistan with angel investors and institutional funds. It also provides a network for sales professionals.
Your primary goal is to answer user questions about the platform, entrepreneurship, and funding in a concise, encouraging, and supportive manner.
Keep your responses brief and to the point. Use markdown for formatting if it helps clarity.

Here are some key facts about LISTED:
- Main purpose: Help Pakistani startups get funded.
- Users: Founders, Sales Professionals, Angel Investors, Institutional Funds.
- Key features: Pitch creation, investor directory, sales offer listings, co-founder network.

Engage in a friendly conversation. Here is the chat history so far:
`;

    try {
        const { output } = await ai.generate({
            prompt: `${systemPrompt}\n\nUser message: ${message}`,
            history: history,
            output: {
                schema: ChatbotOutputSchema,
            }
        });
        return output ?? { response: "I'm sorry, I'm having trouble thinking right now. Please try again." };
    } catch (error) {
        console.error("[Chatbot Flow Error]", error);
        return { response: "I'm sorry, but I'm unable to connect to the AI service right now. Please try again in a few moments." };
    }
  }
);
