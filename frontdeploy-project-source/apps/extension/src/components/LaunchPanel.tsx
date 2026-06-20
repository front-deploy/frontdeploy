import { useEffect, useState } from "react";
import { WalletButton } from "./WalletButton";
import { FastLaunch } from "./FastLaunch";
import { getWalletSession } from "../lib/storage";
import { checkTokenGate } from "../lib/tokenGate";

export function LaunchPanel() {
  const [gateStatus, setGateStatus] = useState<{ isAllowed: boolean; balance: number; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const verifyGate = async () => {
      setLoading(true);
      const session = await getWalletSession();
      if (session?.connected && session.publicKey) {
        const result = await checkTokenGate(session.publicKey);
        if (mounted) setGateStatus(result);
      } else {
        if (mounted) setGateStatus({ isAllowed: false, balance: 0, error: "Please connect your wallet to use the extension." });
      }
      if (mounted) setLoading(false);
    };

    verifyGate();

    // Re-verify when storage changes (like wallet connect/disconnect)
    const listener = () => verifyGate();
    chrome.storage.local.onChanged.addListener(listener);
    return () => {
      mounted = false;
      chrome.storage.local.onChanged.removeListener(listener);
    };
  }, []);

  return (
    <div className="p-4 flex flex-col gap-2">
      <h2 className="text-lg font-medium text-axiom-text mb-2">Wallet & Fast Launch</h2>
      <WalletButton />
      
      {loading ? (
        <div className="text-axiom-muted text-sm mt-4 text-center">Checking $FDP balance...</div>
      ) : gateStatus?.isAllowed ? (
        <FastLaunch />
      ) : (
        <div className="mt-4 p-4 border border-red-900 bg-red-950/30 rounded-md text-center flex flex-col gap-2">
          <svg className="w-8 h-8 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-red-500 font-bold">Extension Locked</h3>
          <p className="text-xs text-axiom-muted">{gateStatus?.error || "You need at least 10,000,000 $FDP to unlock."}</p>
          <p className="text-xs text-axiom-muted">Current balance: {gateStatus?.balance.toLocaleString()} $FDP</p>
        </div>
      )}
    </div>
  );
}
