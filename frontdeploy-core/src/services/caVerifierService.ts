import { URL } from 'url';

export type CaVerifyState = "CA POSTED" | "UNVERIFIED" | "NOT POSTED" | "NO WEBSITE" | "CA MISMATCH";

export interface CaVerificationResult {
  state: CaVerifyState;
  mint: string;
  websiteUrl: string;
  checkedAt: Date;
  location?: string;
}

export class CaVerifierService {
  /**
   * Verifies if the given mint (Contract Address) exists on the provided website URL.
   */
  public async verifyWebsite(mint: string, websiteUrl: string): Promise<CaVerificationResult> {
    const result: CaVerificationResult = {
      state: "NO WEBSITE",
      mint,
      websiteUrl,
      checkedAt: new Date()
    };

    if (!websiteUrl || websiteUrl.trim() === "") {
      return result;
    }

    // Basic domain sanity check
    let parsedUrl: URL;
    try {
      let urlToParse = websiteUrl.trim();
      if (!/^https?:\/\//i.test(urlToParse)) {
        urlToParse = 'https://' + urlToParse;
      }
      parsedUrl = new URL(urlToParse);
      result.websiteUrl = parsedUrl.toString();
    } catch (e) {
      // Invalid URL format
      result.state = "UNVERIFIED";
      return result;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If site is down or returns error, we can't verify
        result.state = "UNVERIFIED";
        return result;
      }

      const html = await response.text();
      
      // Simple exact match for the mint string in the HTML source
      // This covers text, hrefs (e.g. pump.fun/mint, solscan), etc.
      if (html.includes(mint)) {
        result.state = "CA POSTED";
        result.location = "Found in HTML";
      } else {
        // Check if there's another token CA posted instead
        const otherCaRegex = /(?:pump\.fun\/(?:coin\/)?|solscan\.io\/token\/|dexscreener\.com\/solana\/)([1-9A-HJ-NP-Za-km-z]{32,44})/g;
        let match;
        let foundOtherCa = false;
        while ((match = otherCaRegex.exec(html)) !== null) {
          if (match[1] !== mint) {
            foundOtherCa = true;
            break;
          }
        }

        if (foundOtherCa) {
          result.state = "CA MISMATCH";
        } else {
          result.state = "NOT POSTED";
        }
      }

    } catch (err: any) {
      // Timeout or network error
      console.error(`[CaVerifierService] Error fetching ${websiteUrl}:`, err.message);
      result.state = "UNVERIFIED";
    }

    return result;
  }
}
