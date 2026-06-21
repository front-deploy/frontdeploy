import { WebSocketService } from '../services/websocketService.js';
export default function webhookRoutes(app, wsService) {
    app.post('/v1/webhooks/helius', async (request, reply) => {
        try {
            const event = request.body;
            // Helius requires a 200 OK fast response to prevent retries
            reply.code(200).send({ status: 'ok' });
            // Process the event asynchronously
            // For standard Helius webhooks, event is an array of enriched transactions
            wsService.handleHeliusWebhook(event);
        }
        catch (error) {
            app.log.error(error);
        }
    });
}
//# sourceMappingURL=webhookRoutes.js.map