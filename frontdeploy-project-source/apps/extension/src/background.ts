import type { FrontendToBackgroundMessage, BackgroundToRelayMessage, RelayToBackgroundMessage, FastLaunchDraft, FrontendWalletStatusResponse, FrontendWalletConnectResponse, FrontendFastLaunchResponse } from "./lib/messaging";
import { uploadMetadata, buildPartialSignedCreateTx } from "./lib/pumpfun";
import { saveWalletSession, getLaunchSettings } from "./lib/storage";
import iconUrl from "url:~assets/icon.png";

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
async function ensurePumpFunTab(draft?: FastLaunchDraft, focusTab: boolean = false): Promise<number> {
  const tabs = await chrome.tabs.query({ url: "*://pump.fun/create*" });
  if (tabs.length > 0 && tabs[0]?.id) {
    if (focusTab) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId) {
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    }
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
  
  const newTab = await chrome.tabs.create({ url: url.toString(), active: focusTab });
  
  // Wait for tab to be fully loaded so both relay and MAIN scripts are injected
  await new Promise<void>((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === newTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
  
  // Brief pause to ensure MAIN script has attached message listeners
  await new Promise(r => setTimeout(r, 1000));
  
  if (!newTab.id) throw new Error("Could not create pump.fun tab");
  return newTab.id;
}

async function handleWalletStatus(sendResponse: (res: FrontendWalletStatusResponse) => void) {
  // Frontend already checks local session. If it falls back to background, we assume disconnected.
  // We do NOT want to spawn a pump.fun tab just to check status.
  sendResponse({ connected: false });
}

async function handleWalletConnect(provider: "phantom" | "solflare" | "backpack", sendResponse: (res: FrontendWalletConnectResponse) => void) {
  try {
    const tabId = await ensurePumpFunTab(undefined, true);
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
    // Simply clear our local session to disconnect the extension.
    // No need to spawn a pump.fun tab and force disconnect there.
    await saveWalletSession(null);
    sendResponse({ success: true });
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleFastLaunch(draft: FastLaunchDraft, sendResponse: (res: FrontendFastLaunchResponse) => void) {
  try {
    // 1. Ensure tab exists and check wallet status
    const tabId = await ensurePumpFunTab(draft, true);
    
    const statusRes = await new Promise<FrontendWalletStatusResponse>(resolve => {
      handleWalletStatus(resolve);
    });
    
    if (!statusRes.connected || !statusRes.publicKey) {
      throw new Error("Wallet not connected. Connect first.");
    }
    
    const provider = (statusRes.provider as any) || "phantom";

    // 2. Upload metadata
    console.log("[FastLaunch] Starting uploadMetadata");
    const metadataUri = await uploadMetadata(draft);
    console.log("[FastLaunch] uploadMetadata success, uri:", metadataUri);

    // 3. Build & sign with mint keypair via pumpfun trade-local api
    console.log("[FastLaunch] Starting buildPartialSignedCreateTx");
    const { txsBase64, mintKeypair } = await buildPartialSignedCreateTx(statusRes.publicKey, metadataUri, draft);
    console.log("[FastLaunch] buildPartialSignedCreateTx success, mint:", mintKeypair.publicKey.toBase58());
    
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
    console.error("[FastLaunch] handleFastLaunch encountered an error:", err);
    sendResponse({ success: false, error: err.message });
  }
}

// WebSocket logic removed to save resources; moved to KolLiveFeed.tsx
