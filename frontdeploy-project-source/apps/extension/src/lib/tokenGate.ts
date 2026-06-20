import { Connection, PublicKey } from "@solana/web3.js";
import { getLaunchSettings } from "./storage";

const FDP_MINT = process.env.PLASMO_PUBLIC_FRONTDEPLOY_CA || "2vCwDJesf1CyHiexyT8nkd72gD1JuKDPGdmeoCX7pump";
const MIN_BALANCE = 10_000_000;

export async function checkTokenGate(publicKeyBase58: string | undefined): Promise<{ isAllowed: boolean; balance: number; error?: string }> {
  if (!publicKeyBase58) {
    return { isAllowed: false, balance: 0, error: "Please connect your wallet first." };
  }

  try {
    const settings = await getLaunchSettings();
    const primaryRpcUrl = settings.rpcUrl || process.env.PLASMO_PUBLIC_RPC_URL;
    const heliusFallback = process.env.PLASMO_PUBLIC_HELIUS_RPC_URL;
    
    const rpcUrls = [primaryRpcUrl, heliusFallback].filter(Boolean) as string[];

    if (rpcUrls.length === 0) {
      return { isAllowed: false, balance: 0, error: "RPC URL not configured" };
    }

    let tokenAccounts = null;
    let lastError = null;

    for (const rpcUrl of rpcUrls) {
      try {
        const connection = new Connection(rpcUrl, "confirmed");
        const pubKey = new PublicKey(publicKeyBase58);
        const mintKey = new PublicKey(FDP_MINT);

        tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
          mint: mintKey,
        });
        break; // Success
      } catch (err) {
        lastError = err;
        console.warn(`Token gate RPC check failed for ${rpcUrl}, falling back...`);
      }
    }

    if (!tokenAccounts) {
      console.error("[TokenGate Debug] All RPC fallbacks failed to verify balance. Last RPC error:", lastError);
      throw new Error("Could not connect to the Solana network to verify your balance.");
    }

    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;
      totalBalance += uiAmount;
    }

    if (totalBalance < MIN_BALANCE) {
      console.info(`[TokenGate Debug] Access denied: User ${publicKeyBase58} has ${totalBalance} $FDP.`);
      return {
        isAllowed: false,
        balance: totalBalance,
        error: `You need at least ${MIN_BALANCE.toLocaleString()} $FDP to unlock. Your balance is ${totalBalance.toLocaleString()} $FDP.`
      };
    } else {
      console.info(`[TokenGate Debug] Access granted: User ${publicKeyBase58} has ${totalBalance} $FDP.`);
      return {
        isAllowed: true,
        balance: totalBalance
      };
    }
  } catch (error: unknown) {
    console.error("[TokenGate Debug] Verification process failed:", error);
    return { 
      isAllowed: false, 
      balance: 0, 
      error: error instanceof Error ? error.message : "An unexpected error occurred while verifying your wallet." 
    };
  }
}
