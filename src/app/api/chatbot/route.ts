import { NextRequest, NextResponse } from 'next/server';

import { chatbotFlow } from '@/ai/flows/chatbot-flow';
import { aiProviderReady } from '@/ai/genkit';

export async function POST(req: NextRequest) {
  try {
    const { history, message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message payload.' }, { status: 400 });
    }

    const result = await chatbotFlow({ history, message });

    return NextResponse.json({ response: result.response, aiProviderReady });
  } catch (error) {
    console.error('[Chatbot API Error]', error);
    return NextResponse.json(
      { error: 'Unable to process your request right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ aiProviderReady });
}
