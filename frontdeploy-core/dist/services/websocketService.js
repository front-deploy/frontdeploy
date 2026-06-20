export class WebSocketService {
    app;
    connections = new Set();
    constructor(app) {
        this.app = app;
    }
    registerRoutes() {
        this.app.get('/ws/kol-alerts', { websocket: true }, (connection, req) => {
            this.app.log.info('New client connected to KOL alerts stream');
            this.connections.add(connection);
            connection.on('close', () => {
                this.app.log.info('Client disconnected');
                this.connections.delete(connection);
            });
            // Send a welcome message
            connection.send(JSON.stringify({ type: 'connected', message: 'Connected to KOL Alerts Stream' }));
        });
    }
    broadcastEvent(event) {
        const payload = JSON.stringify({ type: 'kol_event', data: event });
        for (const connection of this.connections) {
            if (connection.readyState === 1) { // WebSocket.OPEN
                connection.send(payload);
            }
        }
    }
}
//# sourceMappingURL=websocketService.js.map