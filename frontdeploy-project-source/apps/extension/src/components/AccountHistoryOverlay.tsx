import React, { useState, useEffect } from "react";

// Inlined here to avoid potential undefined-on-bundle issue with cross-file imports in Plasmo content scripts
function AvatarBadge({ url, name, size = 32 }: { url?: string; name?: string; size?: number }) {
  const [imgSrc, setImgSrc] = React.useState(
    url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`
  );
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`;
  return (
    <img
      src={imgSrc}
      alt={name || "Avatar"}
      onError={() => setImgSrc(fallback)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        border: "1px solid #444",
        backgroundColor: "#333",
        flexShrink: 0,
      }}
    />
  );
}

interface IdentitySnapshot {
  ts: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

interface CaHistoryItem {
  mint: string;
  ticker: string | null;
  firstPostedAt: string;
  tweetUrl: string;
  status: string;
  logoUrl?: string;
}

interface AccountHistoryData {
  identityHistory: IdentitySnapshot[];
  caHistory: CaHistoryItem[];
  changeCount: number;
  isSerialSwapper: boolean;
  trackedSince: string;
}

export function AccountHistoryOverlay({ handle }: { handle: string }) {
  const [data, setData] = useState<AccountHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"identity" | "ca">("identity");

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const apiUrl =
          process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "http://localhost:8080";
        const res = await fetch(`${apiUrl}/x-account-history/${handle}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("[Frontdeploy] Failed to fetch account history", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [handle]);

  if (loading) return null;
  if (!data || (data.identityHistory.length === 0 && data.caHistory.length === 0)) return null;

  const currentIdentity = data.identityHistory[0];

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusColor = (status: string) => {
    if (status.includes("rugged") || status.includes("dead")) return "#ef4444";
    if (status.includes("alive")) return "#22c55e";
    return "#eab308";
  };

  return (
    <div
      style={{
        marginTop: "8px",
        padding: "8px 12px",
        backgroundColor: "#1a1a1a",
        border: `1px solid ${data.isSerialSwapper ? "#ef4444" : "#2d2d2d"}`,
        borderRadius: "8px",
        fontSize: "13px",
        color: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {currentIdentity && (
            <AvatarBadge
              url={currentIdentity.avatarUrl}
              name={currentIdentity.displayName}
              size={24}
            />
          )}
          <span>
            <strong style={{ fontWeight: 600 }}>History:</strong> changed details{" "}
            {data.changeCount}x
            {data.isSerialSwapper && (
              <span
                style={{ color: "#ef4444", marginLeft: "6px", fontWeight: "bold" }}
              >
                (Serial Swapper)
              </span>
            )}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {expanded ? "Collapse ▲" : "Expand ▼"}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: "12px",
            borderTop: "1px solid #2d2d2d",
            paddingTop: "8px",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            <button
              onClick={() => setActiveTab("identity")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "identity" ? "#60a5fa" : "#9ca3af",
                fontWeight: activeTab === "identity" ? 600 : 400,
                padding: 0,
                fontSize: "12px",
              }}
            >
              Identity History ({data.identityHistory.length})
            </button>
            <button
              onClick={() => setActiveTab("ca")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "ca" ? "#60a5fa" : "#9ca3af",
                fontWeight: activeTab === "ca" ? 600 : 400,
                padding: 0,
                fontSize: "12px",
              }}
            >
              CA History ({data.caHistory.length})
            </button>
          </div>

          {/* Identity tab */}
          {activeTab === "identity" && (
            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {data.identityHistory.map((snap, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    backgroundColor: "#252525",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                >
                  <AvatarBadge
                    url={snap.avatarUrl}
                    name={snap.displayName}
                    size={32}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "baseline",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: "13px" }}>{snap.displayName}</strong>
                      <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                        @{snap.handle}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          marginLeft: "auto",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {i === data.identityHistory.length - 1
                          ? `Tracked since ${formatDate(snap.ts)}`
                          : formatDate(snap.ts)}
                      </span>
                    </div>
                    {snap.bio && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#d1d5db",
                          marginTop: "2px",
                          fontStyle: "italic",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        } as React.CSSProperties}
                      >
                        {snap.bio}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CA History tab */}
          {activeTab === "ca" && (
            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {data.caHistory.length === 0 && (
                <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                  No CAs posted by this account.
                </div>
              )}
              {data.caHistory.map((ca, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#252525",
                    padding: "6px 10px",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {ca.logoUrl ? (
                      <img
                        src={ca.logoUrl}
                        alt={ca.ticker || "Token"}
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          backgroundColor: "#3f3f46",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "bold",
                          flexShrink: 0,
                          color: "#fff",
                        }}
                      >
                        {ca.ticker ? ca.ticker.substring(0, 1).toUpperCase() : "$"}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>
                        {ca.ticker || "Unknown"}
                      </div>
                      <a
                        href={ca.tweetUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "11px",
                          color: "#60a5fa",
                          textDecoration: "none",
                        }}
                      >
                        {ca.mint.substring(0, 6)}...{ca.mint.substring(ca.mint.length - 4)}
                      </a>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: getStatusColor(ca.status),
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        fontSize: "12px",
                      }}
                    >
                      {ca.status}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      {formatDate(ca.firstPostedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
