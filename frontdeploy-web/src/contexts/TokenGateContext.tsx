"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import bs58 from "bs58";

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
}

interface TokenGateContextType {
  verifyAndDownload: () => Promise<string | null>;
  isVerifying: boolean;
  error: string | null;
  downloadUrl: string | null;
}

const TokenGateContext = createContext<TokenGateContextType | undefined>(undefined);

export function TokenGateProvider({ children }: { children: ReactNode }) {
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

      if (!apiResp.ok) {
        let errorMsg = "Verification failed";
        try {
          const errorData = await apiResp.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // If we can't parse JSON, keep the default error message
        }
        throw new Error(errorMsg);
      }

      // Check if we received the file
      const contentType = apiResp.headers.get("Content-Type");
      if (contentType && contentType.includes("application/zip")) {
        const blob = await apiResp.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        return url;
      } else {
        throw new Error("Invalid response format from server.");
      }

    } catch (err: unknown) {
      console.error("[TokenGate Debug] Verification process failed:", err);
      
      let msg = "An unexpected error occurred. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("User rejected")) {
          msg = "Signature request was cancelled.";
        } else if (err.message.includes("You need at least") || err.message.includes("balance") || err.message.includes("FDP")) {
          msg = "Insufficient balance. You need at least 10,000,000 $FDP to download.";
        } else if (err.message.includes("Phantom wallet not found")) {
          msg = "Please install Phantom wallet to continue.";
        } else {
          msg = "Verification failed. Please try again.";
        }
      }
      
      setError(msg);
      if (typeof window !== "undefined") {
        window.alert(msg);
      }
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <TokenGateContext.Provider value={{ verifyAndDownload, isVerifying, error, downloadUrl }}>
      {children}
    </TokenGateContext.Provider>
  );
}

export function useTokenGate() {
  const context = useContext(TokenGateContext);
  if (context === undefined) {
    throw new Error("useTokenGate must be used within a TokenGateProvider");
  }
  return context;
}
