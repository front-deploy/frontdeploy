import type { PlasmoCSConfig } from "plasmo";
import type { PageToBridgeMessage, BridgeToPageMessage, RelayToBackgroundMessage, BackgroundToRelayMessage } from "../lib/messaging";
import { WALLET_CHANNEL } from "../lib/messaging";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
};

// Listen for messages from background, forward to MAIN world via postMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const bgMsg = message as BackgroundToRelayMessage;
  
  if ((message as any).type === "PING") {
    sendResponse({ pong: true });
    return true;
  }
  
  if (bgMsg.type === "BACKGROUND_STATUS_REQUEST") {
    const pageMsg: PageToBridgeMessage = { type: "wallet-status-request", id: bgMsg.id };
    window.postMessage({ channel: WALLET_CHANNEL, msg: pageMsg }, "*");
    sendResponse({ received: true });
    return true;
  }
  
  if (bgMsg.type === "BACKGROUND_CONNECT_REQUEST") {
    const pageMsg: PageToBridgeMessage = { type: "wallet-connect-request", id: bgMsg.id, provider: bgMsg.provider };
    window.postMessage({ channel: WALLET_CHANNEL, msg: pageMsg }, "*");
    sendResponse({ received: true });
    return true;
  }
  
  if (bgMsg.type === "BACKGROUND_SIGN_SEND_REQUEST") {
    const pageMsg: PageToBridgeMessage = { type: "wallet-sign-send-request", id: bgMsg.id, provider: bgMsg.provider, txsBase64: bgMsg.txsBase64, rpcUrls: bgMsg.rpcUrls };
    window.postMessage({ channel: WALLET_CHANNEL, msg: pageMsg }, "*");
    sendResponse({ received: true });
    return true;
  }
  
  if (bgMsg.type === "BACKGROUND_DISCONNECT_REQUEST") {
    const pageMsg: PageToBridgeMessage = { type: "wallet-disconnect-request", id: bgMsg.id, provider: bgMsg.provider };
    window.postMessage({ channel: WALLET_CHANNEL, msg: pageMsg }, "*");
    sendResponse({ received: true });
    return true;
  }
});

// Listen for messages from MAIN world, forward to background via chrome.runtime.sendMessage
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { channel?: string; msg?: BridgeToPageMessage };
  
  if (data.channel !== WALLET_CHANNEL || !data.msg) return;

  const msg = data.msg;

  if (msg.type === "wallet-status-response") {
    const relayMsg: RelayToBackgroundMessage = {
      type: "RELAY_STATUS_RESPONSE",
      id: msg.id,
      connected: msg.connected,
      ...(msg.publicKey ? { publicKey: msg.publicKey } : {}),
      ...(msg.provider ? { provider: msg.provider } : {})
    };
    chrome.runtime.sendMessage(relayMsg);
  }

  if (msg.type === "wallet-connect-response") {
    const relayMsg: RelayToBackgroundMessage = {
      type: "RELAY_CONNECT_RESPONSE",
      id: msg.id,
      success: msg.success,
      ...(msg.publicKey ? { publicKey: msg.publicKey } : {}),
      ...(msg.error ? { error: msg.error } : {})
    };
    chrome.runtime.sendMessage(relayMsg);
  }

  if (msg.type === "wallet-disconnect-response") {
    const relayMsg: RelayToBackgroundMessage = {
      type: "RELAY_DISCONNECT_RESPONSE",
      id: msg.id,
      success: msg.success,
      ...(msg.error ? { error: msg.error } : {})
    };
    chrome.runtime.sendMessage(relayMsg);
  }

  if (msg.type === "wallet-sign-send-response") {
    const relayMsg: RelayToBackgroundMessage = {
      type: "RELAY_SIGN_SEND_RESPONSE",
      id: msg.id,
      success: msg.success,
      ...(msg.signatures ? { signatures: msg.signatures } : {}),
      ...(msg.error ? { error: msg.error } : {})
    };
    chrome.runtime.sendMessage(relayMsg);
  }
});
