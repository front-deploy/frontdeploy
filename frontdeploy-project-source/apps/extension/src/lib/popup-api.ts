import type { 
  FrontendToBackgroundMessage, 
  FrontendWalletStatusResponse, 
  FrontendWalletConnectResponse,
  FrontendWalletDisconnectResponse,
  FrontendFastLaunchResponse, 
  FastLaunchDraft 
} from "./messaging";

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
    return { success: false, error: err.message || "Failed to connect" };
  }
}

export async function disconnectWallet(provider: "phantom" | "solflare" | "backpack"): Promise<FrontendWalletDisconnectResponse> {
  const msg: FrontendToBackgroundMessage = { type: "FRONTEND_WALLET_DISCONNECT", provider };
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to disconnect" };
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
