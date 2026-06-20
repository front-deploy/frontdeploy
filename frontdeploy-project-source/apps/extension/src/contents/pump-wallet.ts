import type { PlasmoCSConfig } from "plasmo";
import { VersionedTransaction, Connection } from "@solana/web3.js";
import type { PageToBridgeMessage, BridgeToPageMessage } from "../lib/messaging";
import { WALLET_CHANNEL } from "../lib/messaging";

export const config: PlasmoCSConfig = {
  matches: ["https://pump.fun/create*", "https://www.pump.fun/create*"],
  world: "MAIN",
  run_at: "document_idle"
};

function getProvider(name: "phantom" | "solflare" | "backpack"): any {
  if (typeof window === "undefined") return null;
  const anyWindow = window as any;
  if (name === "phantom") return anyWindow.solana?.isPhantom ? anyWindow.solana : null;
  if (name === "solflare") return anyWindow.solflare;
  if (name === "backpack") return anyWindow.backpack;
  return null;
}

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  const data = event.data as { channel?: string; msg?: PageToBridgeMessage };
  
  if (data.channel !== WALLET_CHANNEL || !data.msg) return;

  const msg = data.msg;

  if (msg.type === "wallet-status-request") {
    // Check if phantom is already connected
    const provider = getProvider("phantom");
    const isConnected = provider && provider.isConnected;
    const publicKey = isConnected ? provider.publicKey?.toString() : undefined;
    
    const response: BridgeToPageMessage = {
      type: "wallet-status-response",
      id: msg.id,
      connected: !!isConnected,
      publicKey,
      provider: "phantom"
    };
    
    window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    return;
  }

  if (msg.type === "wallet-connect-request") {
    const provider = getProvider(msg.provider);
    if (!provider) {
      const response: BridgeToPageMessage = {
        type: "wallet-connect-response",
        id: msg.id,
        success: false,
        error: `Provider ${msg.provider} not found`
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
      return;
    }

    try {
      await provider.connect();
      const response: BridgeToPageMessage = {
        type: "wallet-connect-response",
        id: msg.id,
        success: true,
        publicKey: provider.publicKey?.toString()
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    } catch (err: any) {
      const response: BridgeToPageMessage = {
        type: "wallet-connect-response",
        id: msg.id,
        success: false,
        error: err.message || "User rejected connect"
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    }
    return;
  }

  if (msg.type === "wallet-disconnect-request") {
    const provider = getProvider(msg.provider);
    if (!provider) {
      const response: BridgeToPageMessage = {
        type: "wallet-disconnect-response",
        id: msg.id,
        success: false,
        error: `Provider ${msg.provider} not found`
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
      return;
    }

    try {
      if (provider.disconnect) {
        await provider.disconnect();
      }
      const response: BridgeToPageMessage = {
        type: "wallet-disconnect-response",
        id: msg.id,
        success: true
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    } catch (err: any) {
      const response: BridgeToPageMessage = {
        type: "wallet-disconnect-response",
        id: msg.id,
        success: false,
        error: err.message || "Failed to disconnect"
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    }
    return;
  }

  if (msg.type === "wallet-sign-send-request") {
    const provider = getProvider(msg.provider);
    if (!provider) {
      const response: BridgeToPageMessage = {
        type: "wallet-sign-send-response",
        id: msg.id,
        success: false,
        error: `Provider ${msg.provider} not found`
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
      return;
    }

    try {
      const txs = msg.txsBase64.map(b64 => {
        const txBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return VersionedTransaction.deserialize(txBytes);
      });
      
      const signedTxs = await provider.signAllTransactions(txs);
      
      const signatures = [];
      
      for (const signedTx of signedTxs) {
        let sig = null;
        let lastError = null;
        
        for (const url of msg.rpcUrls) {
          try {
            const connection = new Connection(url, "confirmed");
            sig = await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              maxRetries: 3
            });
            break; // Success, break out of RPC loop
          } catch (err) {
            lastError = err;
            console.warn(`RPC broadcast failed for ${url}, falling back...`, err);
          }
        }
        
        if (!sig) {
          throw lastError || new Error("All RPC fallbacks failed");
        }
        signatures.push(sig);
      }
      
      const response: BridgeToPageMessage = {
        type: "wallet-sign-send-response",
        id: msg.id,
        success: true,
        signatures
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    } catch (err: any) {
      const response: BridgeToPageMessage = {
        type: "wallet-sign-send-response",
        id: msg.id,
        success: false,
        error: err.message || "Failed to sign/send"
      };
      window.postMessage({ channel: WALLET_CHANNEL, msg: response }, "*");
    }
  }
});
