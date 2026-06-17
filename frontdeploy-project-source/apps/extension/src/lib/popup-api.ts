import type { FrontendToBackgroundMessage, FrontendWalletStatusResponse, FrontendWalletConnectResponse, FrontendFastLaunchResponse, FastLaunchDraft } from "./messaging";

export async function getWalletStatus(): Promise<FrontendWalletStatusResponse> {
  const msg: FrontendToBackgroundMessage = { type: "FRONTEND_WALLET_STATUS" };
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err) {
    return { connected: false };
  }
}

export async function connectWallet(provider: "phantom" | "solflare" | "backpack"): Promise<FrontendWalletConnectResponse> {
  const msg: FrontendToBackgroundMessage = { type: "FRONTEND_WALLET_CONNECT", provider };
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fastLaunch(draft: FastLaunchDraft): Promise<FrontendFastLaunchResponse> {
  const msg: FrontendToBackgroundMessage = { type: "FRONTEND_FAST_LAUNCH", draft };
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
