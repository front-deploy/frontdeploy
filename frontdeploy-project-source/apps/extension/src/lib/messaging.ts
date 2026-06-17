export const WALLET_CHANNEL = "AXIOM_PUMP_WALLET_CHANNEL";

export function requestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ---------------------------------------------------------
// Page <-> Bridge Messages (MAIN world window.postMessage)
// ---------------------------------------------------------

export type PageToBridgeMessage =
  | { type: "wallet-status-request"; id: string }
  | { type: "wallet-connect-request"; id: string; provider: "phantom" | "solflare" | "backpack" }
  | { type: "wallet-disconnect-request"; id: string; provider: "phantom" | "solflare" | "backpack" }
  | { type: "wallet-sign-send-request"; id: string; provider: "phantom" | "solflare" | "backpack"; txBase64: string };

export type BridgeToPageMessage =
  | { type: "wallet-status-response"; id: string; connected: boolean; publicKey?: string; provider?: string }
  | { type: "wallet-connect-response"; id: string; success: boolean; publicKey?: string; error?: string }
  | { type: "wallet-disconnect-response"; id: string; success: boolean; error?: string }
  | { type: "wallet-sign-send-response"; id: string; success: boolean; signature?: string; error?: string };

// ---------------------------------------------------------
// Relay <-> Background Messages (chrome.runtime)
// ---------------------------------------------------------

export type RelayToBackgroundMessage =
  | { type: "RELAY_STATUS_RESPONSE"; id: string; connected: boolean; publicKey?: string; provider?: string }
  | { type: "RELAY_CONNECT_RESPONSE"; id: string; success: boolean; publicKey?: string; error?: string }
  | { type: "RELAY_DISCONNECT_RESPONSE"; id: string; success: boolean; error?: string }
  | { type: "RELAY_SIGN_SEND_RESPONSE"; id: string; success: boolean; signature?: string; error?: string };

export type BackgroundToRelayMessage =
  | { type: "BACKGROUND_STATUS_REQUEST"; id: string }
  | { type: "BACKGROUND_CONNECT_REQUEST"; id: string; provider: "phantom" | "solflare" | "backpack" }
  | { type: "BACKGROUND_DISCONNECT_REQUEST"; id: string; provider: "phantom" | "solflare" | "backpack" }
  | { type: "BACKGROUND_SIGN_SEND_REQUEST"; id: string; provider: "phantom" | "solflare" | "backpack"; txBase64: string };

// ---------------------------------------------------------
// Popup/Sidepanel <-> Background Messages (chrome.runtime)
// ---------------------------------------------------------

export type FastLaunchDraft = {
  name: string;
  symbol: string;
  description: string;
  image: string; // Data URL
  twitter?: string;
  telegram?: string;
  website?: string;
};

export type FrontendToBackgroundMessage =
  | { type: "FRONTEND_WALLET_STATUS" }
  | { type: "FRONTEND_WALLET_CONNECT"; provider: "phantom" | "solflare" | "backpack" }
  | { type: "FRONTEND_WALLET_DISCONNECT"; provider: "phantom" | "solflare" | "backpack" }
  | { type: "FRONTEND_FAST_LAUNCH"; draft: FastLaunchDraft };

export type FrontendWalletStatusResponse = {
  connected: boolean;
  publicKey?: string;
  provider?: string;
};

export type FrontendWalletConnectResponse = {
  success: boolean;
  publicKey?: string;
  error?: string;
};

export type FrontendWalletDisconnectResponse = {
  success: boolean;
  error?: string;
};

export type FrontendFastLaunchResponse = {
  success: boolean;
  mint?: string;
  signature?: string;
  error?: string;
};
