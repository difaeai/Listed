import { NextRequest } from 'next/server';
import { botEventEmitter } from '@/lib/bot-event-emitter';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (e) {
          console.error("SSE Error sending event:", e);
        }
      };

      const signalHandler = (data: any) => sendEvent('signals', data);
      const tradeHandler = (data: any) => sendEvent('trades', data);
      const statusHandler = (data: any) => sendEvent('status', data);

      botEventEmitter.on('signal', signalHandler);
      botEventEmitter.on('trade', tradeHandler);
      botEventEmitter.on('status', statusHandler);

      const keepAlive = setInterval(() => {
        sendEvent('ping', Date.now());
      }, 25000);

      req.signal.addEventListener('abort', () => {
        console.log("Client disconnected from SSE stream.");
        clearInterval(keepAlive);
        botEventEmitter.removeListener('signal', signalHandler);
        botEventEmitter.removeListener('trade', tradeHandler);
        botEventEmitter.removeListener('status', statusHandler);
        controller.close();
      });
    },
    cancel() {
        console.log("SSE Stream cancelled by client.");
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
