import { useState, useEffect, useCallback } from "react";
import { getActivityLog, clearActivityLog, type ActivityEntry } from "../lib/storage";

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const date = new Date(ts);

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function shortAddr(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function EntryIcon({ type }: { type: ActivityEntry["type"] }) {
  if (type === "token_deployed") return <span>🚀</span>;
  if (type === "dev_buy") return <span>💰</span>;
  if (type === "wallet_connected") return <span>🔗</span>;
  if (type === "wallet_disconnected") return <span>🔌</span>;
  return <span>•</span>;
}

function EntryLabel({ entry }: { entry: ActivityEntry }) {
  if (entry.type === "token_deployed") {
    return (
      <span className="text-xs font-semibold text-axiom-text">
        Token Deployed{" "}
        {entry.ticker && (
          <span className="px-1.5 py-0.5 rounded bg-axiom-warn/20 text-axiom-warn text-[10px] font-bold">
            ${entry.ticker}
          </span>
        )}
        {entry.name && (
          <span className="text-axiom-muted font-normal ml-1">{entry.name}</span>
        )}
      </span>
    );
  }
  if (entry.type === "dev_buy") {
    return (
      <span className="text-xs font-semibold text-axiom-text">
        Dev Buy{" "}
        {entry.devBuySol && (
          <span className="text-axiom-muted font-normal">{entry.devBuySol} SOL</span>
        )}
      </span>
    );
  }
  if (entry.type === "wallet_connected") {
    return (
      <span className="text-xs font-semibold text-axiom-text">
        Wallet Connected{" "}
        {entry.provider && (
          <span className="text-axiom-muted font-normal capitalize">{entry.provider}</span>
        )}
      </span>
    );
  }
  if (entry.type === "wallet_disconnected") {
    return <span className="text-xs font-semibold text-axiom-text">Wallet Disconnected</span>;
  }
  return null;
}

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const log = await getActivityLog();
    setEntries(log);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = async () => {
    await clearActivityLog();
    setEntries([]);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between pb-2 border-b border-axiom-border/10">
        <h2 className="text-sm font-semibold text-axiom-text">Activity Log</h2>
        {entries.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[10px] text-axiom-muted hover:text-axiom-danger transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pb-10 mt-2">
        {loading ? (
          <div className="text-center py-10 text-axiom-muted text-xs">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-axiom-muted text-xs">
            No activity yet. Actions you take (launch, connect wallet) will appear here.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg border bg-axiom-bg border-axiom-border/20"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <EntryIcon type={entry.type} />
                  <EntryLabel entry={entry} />
                </div>
                <span className="text-[10px] text-axiom-muted whitespace-nowrap ml-2">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>

              {/* Wallet address for connect events */}
              {entry.publicKey && entry.type === "wallet_connected" && (
                <p className="text-[10px] text-axiom-muted font-mono mt-1">
                  {shortAddr(entry.publicKey)}
                </p>
              )}

              {/* Mint + tx links for deploy/buy events */}
              {(entry.mintAddress || entry.txSignature) && (
                <div className="flex items-center gap-3 mt-1.5">
                  {entry.mintAddress && (
                    <a
                      href={`https://pump.fun/coin/${entry.mintAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-axiom-muted font-mono hover:text-axiom-text transition-colors"
                    >
                      Mint: {shortAddr(entry.mintAddress)} ↗
                    </a>
                  )}
                  {entry.txSignature && (
                    <a
                      href={`https://solscan.io/tx/${entry.txSignature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-axiom-muted font-mono hover:text-axiom-text transition-colors"
                    >
                      Tx: {shortAddr(entry.txSignature)} ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-axiom-muted/50 text-center mt-auto">
        Stored locally only · Never sent to any server
      </p>
    </div>
  );
}
