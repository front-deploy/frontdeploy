export type FlowType = 'organic' | 'suspect' | 'looping';
export declare class FlowClassifier {
    private states;
    private readonly LOOPING_WINDOW_MS;
    classify(mint: string, wallet: string, action: 'BUY' | 'SELL', isNewWallet: boolean, volumeUsd: number): FlowType;
}
//# sourceMappingURL=flowClassifier.d.ts.map