export type CaVerifyState = "CA POSTED" | "UNVERIFIED" | "NOT POSTED" | "NO WEBSITE" | "CA MISMATCH";
export interface CaVerificationResult {
    state: CaVerifyState;
    mint: string;
    websiteUrl: string;
    checkedAt: Date;
    location?: string;
    mismatchedCa?: string;
}
export declare class CaVerifierService {
    /**
     * Verifies if the given mint (Contract Address) exists on the provided website URL.
     */
    verifyWebsite(mint: string, websiteUrl: string): Promise<CaVerificationResult>;
}
//# sourceMappingURL=caVerifierService.d.ts.map