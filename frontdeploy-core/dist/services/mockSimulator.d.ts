import { WebSocketService } from './websocketService.js';
import type { FastifyBaseLogger } from 'fastify';
export declare class MockSimulatorService {
    private wsService;
    private logger;
    private intervalId?;
    private mockTickers;
    private mockCAs;
    private mockHandles;
    constructor(wsService: WebSocketService, logger: FastifyBaseLogger);
    start(intervalMs?: number): void;
    stop(): void;
}
//# sourceMappingURL=mockSimulator.d.ts.map