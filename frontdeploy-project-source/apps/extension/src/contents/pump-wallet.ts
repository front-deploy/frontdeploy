import type { PlasmoCSConfig } from "plasmo";
import { VersionedTransaction } from "@solana/web3.js";
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
      const txBytes = Uint8Array.from(atob(msg.txBase64), c => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(txBytes);
      
      const result = await provider.signAndSendTransaction(tx);
      const signature = typeof result === "string" ? result : result.signature;
      
      const response: BridgeToPageMessage = {
        type: "wallet-sign-send-response",
        id: msg.id,
        success: true,
        signature
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
