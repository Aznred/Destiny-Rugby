import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Toute l'inférence vit ici : même pendant une longue génération, React et le
// moteur de match conservent leur fréquence d'affichage normale.
const gestionnaire = new WebWorkerMLCEngineHandler();
self.onmessage = (message: MessageEvent) => gestionnaire.onmessage(message);
