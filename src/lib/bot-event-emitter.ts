import { EventEmitter } from 'events';

// This is a simple in-memory event emitter. In a real-world scenario, 
// you would use a more robust pub/sub system like Redis or a dedicated message broker.
class BotEventEmitter extends EventEmitter {}
export const botEventEmitter = new BotEventEmitter();
