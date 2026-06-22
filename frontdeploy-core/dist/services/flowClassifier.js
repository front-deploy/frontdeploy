export class FlowClassifier {
    // Store wallet states: mint -> wallet -> lastAction
    states = new Map();
    // 3 minutes window
    LOOPING_WINDOW_MS = 3 * 60 * 1000;
    classify(mint, wallet, action, isNewWallet, volumeUsd) {
        if (!this.states.has(mint)) {
            this.states.set(mint, new Map());
        }
        const mintState = this.states.get(mint);
        const now = Date.now();
        const previousState = mintState.get(wallet);
        let classification = 'organic';
        if (previousState) {
            // Check for looping (e.g. BUY then SELL, or SELL then BUY within 3 minutes)
            if (previousState.lastAction !== action) {
                const timeDiff = now - previousState.timestamp;
                if (timeDiff < this.LOOPING_WINDOW_MS) {
                    classification = 'looping';
                }
            }
        }
        else {
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
//# sourceMappingURL=flowClassifier.js.map