import { useState, useEffect } from "react";
import { getWalletStatus, connectWallet, disconnectWallet } from "../lib/popup-api";

export function WalletButton() {
  const [connected, setConnected] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkStatus = () => {
      getWalletStatus().then((res) => {
        if (res.connected && res.publicKey) {
          setConnected(true);
          setPubkey(res.publicKey);
        } else {
          setConnected(false);
          setPubkey("");
        }
      });
    };

    checkStatus();

    window.addEventListener("focus", checkStatus);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkStatus();
    });

    return () => {
      window.removeEventListener("focus", checkStatus);
      document.removeEventListener("visibilitychange", checkStatus); // cleanup is safe enough
    };
  }, []);

  const handleConnect = async (provider: "phantom" | "solflare" | "backpack") => {
    setLoading(true);
    setError("");
    const res = await connectWallet(provider);
    if (res.success && res.publicKey) {
      setConnected(true);
      setPubkey(res.publicKey);
    } else {
      setError(res.error || "Failed to connect");
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectWallet("phantom");
    setConnected(false);
    setPubkey("");
    setLoading(false);
  };

  if (connected) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-axiom-good text-axiom-bg text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-axiom-bg animate-pulse" />
            {pubkey.slice(0, 4)}...{pubkey.slice(-4)}
          </div>
          <button 
            onClick={handleDisconnect}
            disabled={loading}
            className="text-xs opacity-80 hover:opacity-100 uppercase"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleConnect("phantom")}
          disabled={loading}
          className="flex-1 px-3 py-1.5 rounded bg-axiom-border text-white hover:bg-axiom-muted transition-colors text-sm"
        >
          {loading ? "Connecting..." : "Phantom"}
        </button>
        <button
          onClick={() => handleConnect("solflare")}
          disabled={loading}
          className="flex-1 px-3 py-1.5 rounded bg-axiom-border text-white hover:bg-axiom-muted transition-colors text-sm"
        >
          Solflare
        </button>
      </div>
      {error && <div className="text-xs text-axiom-warn">{error}</div>}
    </div>
  );
}
