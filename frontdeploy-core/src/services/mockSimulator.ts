import { WebSocketService } from './websocketService.js';
import type { FastifyBaseLogger } from 'fastify';

export class MockSimulatorService {
  private intervalId?: NodeJS.Timeout;
  private mockTickers = ['BEN', 'TURBO', 'PEPE', 'WOJAK', 'RFD'];
  private mockCAs = [
    '2vCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump',
    '3zCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump',
    '4qCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump'
  ];
  private mockHandles = ['blknoiz06', 'MustStopMurad', 'frankdegods', 'zachxbt'];

  constructor(
    private wsService: WebSocketService,
    private logger: FastifyBaseLogger
  ) {}

  public start(intervalMs: number = 10000) {
    this.logger.info(`Starting Mock Simulator (sending fake tweets every ${intervalMs / 1000}s)`);
    
    this.intervalId = setInterval(() => {
      const isSignal = Math.random() > 0.5; // 50% chance to be a signal
      const ticker = this.mockTickers[Math.floor(Math.random() * this.mockTickers.length)]!;
      const ca = this.mockCAs[Math.floor(Math.random() * this.mockCAs.length)]!;
      const handle = this.mockHandles[Math.floor(Math.random() * this.mockHandles.length)]!;
      
      const text = isSignal 
        ? `Just bought a bag of $${ticker}. Looks promising. CA: ${ca}`
        : `Market is looking crazy today. What are you guys trading?`;

      const mockEvent = {
        tweetId: Math.random().toString(36).substring(2, 15),
        authorHandle: handle,
        text,
        url: `https://x.com/${handle}/status/123456789`,
        isSignal,
        contractAddress: isSignal ? ca : null,
        ticker: isSignal ? ticker : null,
        postedAt: new Date().toISOString()
      };

      this.logger.info(`[MOCK] Emitting event from @${handle}: ${text}`);
      this.wsService.broadcastEvent(mockEvent);

    }, intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.info('Mock Simulator stopped.');
    }
  }
}
