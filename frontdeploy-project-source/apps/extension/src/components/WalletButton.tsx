import { useState, useEffect } from "react";
import { getWalletStatus, connectWallet } from "../lib/popup-api";

export function WalletButton() {
  const [connected, setConnected] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getWalletStatus().then((res) => {
      if (res.connected && res.publicKey) {
        setConnected(true);
        setPubkey(res.publicKey);
      }
    });
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

  if (connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-axiom-good text-axiom-bg text-sm font-medium">
        <div className="w-2 h-2 rounded-full bg-axiom-bg animate-pulse" />
        {pubkey.slice(0, 4)}...{pubkey.slice(-4)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleConnect("phantom")}
          disabled={loading}
          className="flex-1 px-3 py-1.5 rounded bg-axiom-border text-axiom-text hover:bg-axiom-muted transition-colors text-sm"
        >
          {loading ? "..." : "Phantom"}
        </button>
        <button
          onClick={() => handleConnect("solflare")}
          disabled={loading}
          className="flex-1 px-3 py-1.5 rounded bg-axiom-border text-axiom-text hover:bg-axiom-muted transition-colors text-sm"
        >
          Solflare
        </button>
      </div>
      {error && <div className="text-xs text-axiom-warn">{error}</div>}
    </div>
  );
}
