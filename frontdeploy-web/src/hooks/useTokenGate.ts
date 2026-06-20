import { useState } from "react";
import bs58 from "bs58";

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
}

export function useTokenGate() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const verifyAndDownload = async () => {
    setIsVerifying(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const provider = (window as unknown as { phantom?: { solana?: PhantomProvider } }).phantom?.solana;
      
      if (!provider?.isPhantom) {
        throw new Error("Phantom wallet not found. Please install Phantom.");
      }

      // Connect to Phantom
      const resp = await provider.connect();
      const publicKey = resp.publicKey.toString();

      // Sign message to prove ownership
      const message = `Verifying Frontdeploy Token Gate (${Date.now()})`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, "utf8");
      
      const signature = bs58.encode(signedMessage.signature);

      // Verify on backend
      const apiResp = await fetch("/api/verify-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          signature,
          message
        })
      });

      const data = await apiResp.json();

      if (!apiResp.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setDownloadUrl(data.downloadUrl);
      return data.downloadUrl;

    } catch (err: unknown) {
      // 1. Developer Log (Detailed)
      console.error("[TokenGate Debug] Verification process failed:", err);
      
      // 2. User UI Error (Friendly)
      if (err instanceof Error) {
        // Known errors that we throw manually (e.g. "Phantom wallet not found")
        if (err.message.includes("Phantom wallet not found")) {
          setError(err.message);
        } else if (err.message.includes("Insufficient balance") || err.message.includes("Not enough $FDP")) {
          setError(err.message);
        } else if (err.message.includes("User rejected")) {
          setError("You rejected the signature request.");
        } else {
          // Generic fallback for other thrown errors
          setError("An issue occurred while verifying your wallet. Please try again.");
        }
      } else {
        // Completely unknown error
        setError("An unexpected error occurred. Please refresh the page and try again.");
      }
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyAndDownload,
    isVerifying,
    error,
    downloadUrl
  };
}
