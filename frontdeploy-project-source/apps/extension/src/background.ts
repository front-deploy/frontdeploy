import type { FrontendToBackgroundMessage, BackgroundToRelayMessage, RelayToBackgroundMessage, FastLaunchDraft, FrontendWalletStatusResponse, FrontendWalletConnectResponse, FrontendFastLaunchResponse } from "./lib/messaging";
import { uploadMetadata, buildPartialSignedCreateTx } from "./lib/pumpfun";
import { saveWalletSession, getLaunchSettings } from "./lib/storage";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "AXIOM_INTEL_OPEN_SIDE_PANEL") {
    const tabId = sender.tab?.id
    if (typeof tabId === "number") {
      void chrome.sidePanel.open({ tabId })
    }
    return
  }
  
  const msg = message as FrontendToBackgroundMessage;

  if (msg.type === "FRONTEND_WALLET_STATUS") {
    handleWalletStatus(sendResponse);
    return true; // Keep channel open for async response
  }

  if (msg.type === "FRONTEND_WALLET_CONNECT") {
    handleWalletConnect(msg.provider, sendResponse);
    return true;
  }

  if (msg.type === "FRONTEND_FAST_LAUNCH") {
    handleFastLaunch(msg.draft, sendResponse);
    return true;
  }

  if (msg.type === "FRONTEND_WALLET_DISCONNECT") {
    handleWalletDisconnect(msg.provider, sendResponse);
    return true;
  }
});

// Helper to find or create pump.fun create tab
async function ensurePumpFunTab(draft?: FastLaunchDraft): Promise<number> {
  const tabs = await chrome.tabs.query({ url: "*://pump.fun/create*" });
  if (tabs.length > 0 && tabs[0]?.id) {
    return tabs[0].id;
  }
  
  // Create tab
  const url = new URL("https://pump.fun/create");
  if (draft) {
    url.searchParams.set("name", draft.name);
    url.searchParams.set("ticker", draft.symbol);
    url.searchParams.set("symbol", draft.symbol);
    url.searchParams.set("description", draft.description);
    if (draft.twitter) url.searchParams.set("twitter", draft.twitter);
    if (draft.website) url.searchParams.set("website", draft.website);
    if (draft.telegram) url.searchParams.set("telegram", draft.telegram);
  }
  
  const newTab = await chrome.tabs.create({ url: url.toString() });
  
  // Wait for tab to load so relay script is injected
  await new Promise<void>(resolve => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      chrome.tabs.sendMessage(newTab.id!, { type: "PING" }, (res) => {
        if (!chrome.runtime.lastError && res?.pong) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= 30) {
          // Timeout after 15 seconds
          clearInterval(interval);
          resolve();
        }
      });
    }, 500);
  });
  
  if (!newTab.id) throw new Error("Could not create pump.fun tab");
  return newTab.id;
}

async function handleWalletStatus(sendResponse: (res: FrontendWalletStatusResponse) => void) {
  try {
    const tabId = await ensurePumpFunTab();
    const id = Math.random().toString(36).substring(2, 15);
    
    // Setup listener before sending
    const listener = (relayMsg: any) => {
      if (relayMsg.type === "RELAY_STATUS_RESPONSE" && relayMsg.id === id) {
        chrome.runtime.onMessage.removeListener(listener);
        sendResponse({
          connected: relayMsg.connected,
          publicKey: relayMsg.publicKey,
          provider: relayMsg.provider
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    
    const request: BackgroundToRelayMessage = { type: "BACKGROUND_STATUS_REQUEST", id };
    chrome.tabs.sendMessage(tabId, request);
    
    // Timeout
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ connected: false });
    }, 5000);
    
  } catch (err) {
    sendResponse({ connected: false });
  }
}

async function handleWalletConnect(provider: "phantom" | "solflare" | "backpack", sendResponse: (res: FrontendWalletConnectResponse) => void) {
  try {
    const tabId = await ensurePumpFunTab();
    const id = Math.random().toString(36).substring(2, 15);
    
    const listener = (relayMsg: any) => {
      if (relayMsg.type === "RELAY_CONNECT_RESPONSE" && relayMsg.id === id) {
        chrome.runtime.onMessage.removeListener(listener);
        if (relayMsg.success && relayMsg.publicKey) {
          saveWalletSession({ connected: true, publicKey: relayMsg.publicKey, provider }).catch(console.error);
        }
        sendResponse({
          success: relayMsg.success,
          publicKey: relayMsg.publicKey,
          error: relayMsg.error
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    
    const request: BackgroundToRelayMessage = { type: "BACKGROUND_CONNECT_REQUEST", id, provider };
    chrome.tabs.sendMessage(tabId, request);
    
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ success: false, error: "Connect timeout" });
    }, 30000); // 30s timeout for user approval
    
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleWalletDisconnect(provider: "phantom" | "solflare" | "backpack", sendResponse: (res: any) => void) {
  try {
    const tabId = await ensurePumpFunTab();
    const id = Math.random().toString(36).substring(2, 15);
    
    const listener = (relayMsg: any) => {
      if (relayMsg.type === "RELAY_DISCONNECT_RESPONSE" && relayMsg.id === id) {
        chrome.runtime.onMessage.removeListener(listener);
        if (relayMsg.success) {
          saveWalletSession(null).catch(console.error);
        }
        sendResponse({ success: relayMsg.success, error: relayMsg.error });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    
    const request: BackgroundToRelayMessage = { type: "BACKGROUND_DISCONNECT_REQUEST", id, provider };
    chrome.tabs.sendMessage(tabId, request);
    
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ success: false, error: "Disconnect timeout" });
    }, 10000);
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleFastLaunch(draft: FastLaunchDraft, sendResponse: (res: FrontendFastLaunchResponse) => void) {
  try {
    // 1. Ensure tab exists and check wallet status
    const tabId = await ensurePumpFunTab(draft);
    
    const statusRes = await new Promise<FrontendWalletStatusResponse>(resolve => {
      handleWalletStatus(resolve);
    });
    
    if (!statusRes.connected || !statusRes.publicKey) {
      throw new Error("Wallet not connected. Connect first.");
    }
    
    const provider = (statusRes.provider as any) || "phantom";

    // 2. Upload metadata
    const metadataUri = await uploadMetadata(draft);

    // 3. Build & sign with mint keypair via pumpfun trade-local api
    const { txsBase64, mintKeypair } = await buildPartialSignedCreateTx(statusRes.publicKey, metadataUri, draft);
    
    // 4. Send to bridge for payer signature
    const id = Math.random().toString(36).substring(2, 15);
    
    const listener = (relayMsg: any) => {
      if (relayMsg.type === "RELAY_SIGN_SEND_RESPONSE" && relayMsg.id === id) {
        chrome.runtime.onMessage.removeListener(listener);
        sendResponse({
          success: relayMsg.success,
          mint: mintKeypair.publicKey.toBase58(),
          signatures: relayMsg.signatures,
          error: relayMsg.error
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    
    const settings = await getLaunchSettings();
    // Primary: free mainnet-beta (or user setting), Fallback: Helius
    const primaryRpcUrl = settings.rpcUrl || process.env.PLASMO_PUBLIC_RPC_URL;
    const heliusFallback = process.env.PLASMO_PUBLIC_HELIUS_RPC_URL;
    
    const rpcUrls = [primaryRpcUrl, heliusFallback].filter(Boolean) as string[];
    
    const request: BackgroundToRelayMessage = { type: "BACKGROUND_SIGN_SEND_REQUEST", id, provider, txsBase64, rpcUrls };
    chrome.tabs.sendMessage(tabId, request);
    
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ success: false, error: "Sign timeout" });
    }, 180000); // 180s timeout
    
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------------
// KOL Alerts & MV3 Keepalive (Phase 4)
// ------------------------------------------------------------------

const KEEPALIVE_INTERVAL_SEC = 25;
const WS_URL = process.env.PLASMO_PUBLIC_FRONTDEPLOY_WS_URL || "ws://localhost:8080/ws/kol-alerts";
let ws: WebSocket | null = null;
let keepAliveIntervalId: ReturnType<typeof setInterval> | null = null;

chrome.alarms.create("keepAlive", { periodInMinutes: KEEPALIVE_INTERVAL_SEC / 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    console.log("Keepalive alarm triggered");
    ensureWebSocket();
  }
});

function ensureWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log("Connecting to KOL Alerts WS...");
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("KOL Alerts WS connected");
    if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
    // Send a ping every 20s to keep the WS connection alive
    keepAliveIntervalId = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "kol_event") {
        handleKolEvent(data.data);
      }
    } catch (err) {
      console.error("Error parsing WS message", err);
    }
  };

  ws.onclose = () => {
    console.log("KOL Alerts WS closed");
    ws = null;
    if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
  };

  ws.onerror = (err) => {
    console.error("KOL Alerts WS error", err);
    ws?.close();
  };
}

function handleKolEvent(event: any) {
  // Save to local storage for the KolLiveFeed component to read
  chrome.storage.local.get(["kolEvents"], (result) => {
    const events = result.kolEvents || [];
    events.unshift(event);
    // Keep max 100 events
    if (events.length > 100) events.length = 100;
    chrome.storage.local.set({ kolEvents: events });
  });

  // Only notify if it's a signal
  if (event.isSignal) {
    const notifId = `kol-${event.tweetId}`;
    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png") || "icon.png", // fallback
      title: `🚨 Signal from @${event.authorHandle}`,
      message: `${event.ticker || event.contractAddress} detected!\n${event.text}`,
      buttons: [
        { title: "Deploy (pump.fun)" },
        { title: "View Tweet" }
      ],
      priority: 2,
      requireInteraction: true
    });
  }
}

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId.startsWith("kol-")) {
    const tweetId = notifId.replace("kol-", "");
    if (btnIdx === 0) {
      // Deploy button clicked - open pump.fun
      chrome.tabs.create({ url: "https://pump.fun/create" });
    } else if (btnIdx === 1) {
      // View Tweet
      chrome.storage.local.get(["kolEvents"], (result) => {
        const event = (result.kolEvents || []).find((e: any) => e.tweetId === tweetId);
        if (event && event.url) {
          chrome.tabs.create({ url: event.url });
        }
      });
    }
  }
});

// Initial connection
ensureWebSocket();
