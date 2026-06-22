export type FlowType = 'organic' | 'suspect' | 'looping';

interface WalletAction {
  lastAction: 'BUY' | 'SELL';
  timestamp: number;
}

export class FlowClassifier {
  // Store wallet states: mint -> wallet -> lastAction
  private states = new Map<string, Map<string, WalletAction>>();
  
  // 3 minutes window
  private readonly LOOPING_WINDOW_MS = 3 * 60 * 1000;

  public classify(mint: string, wallet: string, action: 'BUY' | 'SELL', isNewWallet: boolean, volumeUsd: number): FlowType {
    if (!this.states.has(mint)) {
      this.states.set(mint, new Map());
    }

    const mintState = this.states.get(mint)!;
    const now = Date.now();
    const previousState = mintState.get(wallet);

    let classification: FlowType = 'organic';

    if (previousState) {
      // Check for looping (e.g. BUY then SELL, or SELL then BUY within 3 minutes)
      if (previousState.lastAction !== action) {
        const timeDiff = now - previousState.timestamp;
        if (timeDiff < this.LOOPING_WINDOW_MS) {
          classification = 'looping';
        }
      }
    } else {
      // Check for suspect (new wallet + high volume)
      if (isNewWallet && volumeUsd > 1000) {
        classification = 'suspect';
      }
    }

    // Update state
    mintState.set(wallet, { lastAction: action, timestamp: now });

    // Cleanup old states periodically? (Ideally yes, but for now we keep it simple)
    // In a production app with huge volume, we'd need a TTL cache or cleanup loop.
    return classification;
  }
}
