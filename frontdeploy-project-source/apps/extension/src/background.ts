import type { FrontendToBackgroundMessage, BackgroundToRelayMessage, RelayToBackgroundMessage, FastLaunchDraft, FrontendWalletStatusResponse, FrontendWalletConnectResponse, FrontendFastLaunchResponse } from "./lib/messaging";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { uploadMetadata, buildPartialSignedCreateTx, buildDevBuyTx } from "./lib/pumpfun";
import { saveWalletSession, getWalletSession, getLaunchSettings } from "./lib/storage";
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
    return true;
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

async function ensureActiveTab(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let validTab = tabs.find(t => t.id && t.url && t.url.startsWith("http"));
  if (validTab?.id) return validTab.id;
  
  // Fallback to any active tab if currentWindow is false (e.g., sidepanel context)
  const allTabs = await chrome.tabs.query({ active: true });
  validTab = allTabs.find(t => t.id && t.url && t.url.startsWith("http"));
  if (validTab?.id) return validTab.id;
  
  // Fallback to ANY http tab
  const anyHttpTabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  if (anyHttpTabs.length > 0 && anyHttpTabs[0]?.id) return anyHttpTabs[0].id;

  throw new Error("Please open a regular web page (e.g. pump.fun or axiom.trade) first. Extensions cannot connect to wallets on browser settings pages.");
}

async function handleWalletStatus(sendResponse: (res: FrontendWalletStatusResponse) => void) {
  sendResponse({ connected: false });
}

async function handleWalletConnect(provider: "phantom" | "solflare" | "backpack", sendResponse: (res: FrontendWalletConnectResponse) => void) {
  try {
    const tabId = await ensureActiveTab();
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
    chrome.tabs.sendMessage(tabId, request).catch(err => {
      console.warn("Tabs sendMessage failed:", err);
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ success: false, error: "Please refresh the page. The extension cannot connect to the wallet on this tab." });
    });
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      sendResponse({ success: false, error: "Connect timeout" });
    }, 30000);
    
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleWalletDisconnect(provider: "phantom" | "solflare" | "backpack", sendResponse: (res: any) => void) {
  try {
    await saveWalletSession(null);
    sendResponse({ success: true });
  } catch (err: any) {
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Request the active tab's wallet to sign a list of transactions.
 * Returns signed transactions as base64 strings.
 */
function requestWalletSignature(
  tabId: number,
  provider: string,
  txsBase64: string[],
  rpcUrls: string[],
  timeoutMs = 180000
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(2, 15);

    const listener = (relayMsg: any) => {
      if (relayMsg.type === "RELAY_SIGN_SEND_RESPONSE" && relayMsg.id === id) {
        chrome.runtime.onMessage.removeListener(listener);
        clearTimeout(timer);
        if (relayMsg.success && relayMsg.signatures) {
          resolve(relayMsg.signatures as string[]);
        } else {
          reject(new Error(relayMsg.error || "User rejected signature"));
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    const request: BackgroundToRelayMessage = {
      type: "BACKGROUND_SIGN_SEND_REQUEST",
      id,
      provider: provider as "phantom" | "solflare" | "backpack",
      txsBase64,
      rpcUrls
    };
    chrome.tabs.sendMessage(tabId, request).catch(err => {
      console.warn("Tabs sendMessage sign failed:", err);
      chrome.runtime.onMessage.removeListener(listener);
      clearTimeout(timer);
      reject(new Error("Please refresh the page. The extension cannot connect to the wallet on this tab."));
    });

    const timer = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error("Sign timeout"));
    }, timeoutMs);
  });
}

/**
 * Broadcast signed transactions (base64) to the Solana network using RPC fallback.
 */
async function broadcastTransactions(signedTxsBase64: string[], rpcUrls: string[]): Promise<string[]> {
  const finalSignatures: string[] = [];

  for (const b64Tx of signedTxsBase64) {
    const txBytes = Uint8Array.from(atob(b64Tx), c => c.charCodeAt(0));
    let sig: string | null = null;
    let lastError: any = null;

    for (const url of rpcUrls) {
      try {
        const connection = new Connection(url, "confirmed");
        sig = await connection.sendRawTransaction(txBytes, {
          skipPreflight: false,
          maxRetries: 3
        });
        break;
      } catch (err) {
        lastError = err;
        console.warn(`RPC broadcast failed for ${url}, falling back...`, err);
      }
    }

    if (!sig) {
      throw lastError || new Error("All RPC fallbacks failed");
    }
    finalSignatures.push(sig);
  }

  return finalSignatures;
}

/**
 * Wait for a transaction to be confirmed on-chain before proceeding.
 */
async function waitForConfirmation(
  signature: string,
  rpcUrls: string[],
  maxAttempts = 30,
  intervalMs = 2000
): Promise<void> {
  for (const url of rpcUrls) {
    try {
      const connection = new Connection(url, "confirmed");
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const status = await connection.getSignatureStatus(signature);
        const confirmationStatus = status?.value?.confirmationStatus;
        if (confirmationStatus === "confirmed" || confirmationStatus === "finalized") {
          console.log(`[FastLaunch] Create tx confirmed after ${attempt + 1} attempts`);
          return;
        }
        if (status?.value?.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.value.err)}`);
        }
        await new Promise(r => setTimeout(r, intervalMs));
      }
      throw new Error("Confirmation timeout: transaction not confirmed after max attempts");
    } catch (err: any) {
      console.warn(`[FastLaunch] Confirmation check failed via ${url}:`, err.message);
      // Try next RPC
    }
  }
  throw new Error("Could not confirm transaction via any RPC");
}

async function handleFastLaunch(draft: FastLaunchDraft, sendResponse: (res: FrontendFastLaunchResponse) => void) {
  try {
    // 1. Ensure tab exists and check wallet status
    const tabId = await ensureActiveTab();
    
    const statusRes = await getWalletSession();
    if (!statusRes || !statusRes.connected || !statusRes.publicKey) {
      throw new Error("Wallet not connected. Connect first.");
    }
    
    const provider = statusRes.provider || "phantom";

    const settings = await getLaunchSettings();
    const primaryRpcUrl = settings.rpcUrl || process.env.PLASMO_PUBLIC_RPC_URL;
    const heliusFallback = process.env.PLASMO_PUBLIC_HELIUS_RPC_URL;
    const rpcUrls = [primaryRpcUrl, heliusFallback].filter(Boolean) as string[];

    const devBuySol = Number(String(settings.devBuySol || 0).replace(',', '.'));
    const hasDevBuy = devBuySol > 0;

    // 2. Upload metadata
    console.log("[FastLaunch] Starting uploadMetadata");
    const metadataUri = await uploadMetadata(draft);
    console.log("[FastLaunch] uploadMetadata success, uri:", metadataUri);

    // 3. Build create tx (always amount=0)
    console.log("[FastLaunch] Starting buildPartialSignedCreateTx");
    const { txsBase64: createTxsBase64, mintKeypair } = await buildPartialSignedCreateTx(
      statusRes.publicKey,
      metadataUri,
      draft
    );
    const mintPubkey = mintKeypair.publicKey.toBase58();
    console.log("[FastLaunch] buildPartialSignedCreateTx success, mint:", mintPubkey);

    // 4. Ask wallet to sign CREATE tx (+ fee tx)
    console.log("[FastLaunch] Requesting wallet signature for CREATE tx");
    const signedCreateTxs = await requestWalletSignature(tabId, provider, createTxsBase64, rpcUrls);
    console.log("[FastLaunch] Wallet signed CREATE tx, broadcasting...");

    // 5. Broadcast create tx
    const createSignatures = await broadcastTransactions(signedCreateTxs, rpcUrls);
    const createSig = createSignatures[0];
    if (!createSig) throw new Error("No create signature returned from broadcast");
    console.log("[FastLaunch] CREATE tx broadcasted, sig:", createSig);

    // 6. If dev buy requested: wait for confirmation then build + sign + broadcast buy tx
    if (hasDevBuy) {
      console.log(`[FastLaunch] Dev buy requested (${devBuySol} SOL), waiting for CREATE tx to confirm...`);
      
      try {
        await waitForConfirmation(createSig, rpcUrls);
        console.log("[FastLaunch] CREATE tx confirmed. Building dev buy tx...");

        const devBuyTxBase64 = await buildDevBuyTx(statusRes.publicKey, mintPubkey, "");
        console.log("[FastLaunch] Dev buy tx built. Requesting wallet signature...");

        const signedDevBuyTxs = await requestWalletSignature(tabId, provider, [devBuyTxBase64], rpcUrls);
        console.log("[FastLaunch] Wallet signed dev buy tx, broadcasting...");

        const devBuySignatures = await broadcastTransactions(signedDevBuyTxs, rpcUrls);
        console.log("[FastLaunch] DEV BUY tx broadcasted, sig:", devBuySignatures[0]);

        sendResponse({
          success: true,
          mint: mintPubkey,
          signatures: [...createSignatures, ...devBuySignatures]
        });
      } catch (devBuyErr: any) {
        // Create succeeded but dev buy failed — still report success with warning
        console.error("[FastLaunch] Dev buy failed (token was created):", devBuyErr);
        sendResponse({
          success: true,
          mint: mintPubkey,
          signatures: createSignatures,
          error: `Token created but dev buy failed: ${devBuyErr.message}`
        });
      }
    } else {
      // No dev buy, done
      sendResponse({
        success: true,
        mint: mintPubkey,
        signatures: createSignatures
      });
    }

  } catch (err: any) {
    console.error("[FastLaunch] handleFastLaunch encountered an error:", err);
    sendResponse({ success: false, error: err.message });
  }
}

// WebSocket logic removed to save resources; moved to KolLiveFeed.tsx
