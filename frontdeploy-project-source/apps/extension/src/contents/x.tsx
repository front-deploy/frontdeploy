import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"

import {
  buildChatGptLogoUrl,
  buildPumpFunCreateUrl,
  createLaunchDraft,
  extractXReplyContext,
  findXReplyArticles,
  type LaunchDraft,
  type XReplyContext
} from "../lib/xLaunchContext"
import { saveSelectedLaunchContext } from "../lib/storage"
import { checkTokenGate } from "../lib/tokenGate"
import { hasAccess } from "../lib/holderTier"
import { getWalletStatus } from "../lib/popup-api"
import { WalletButton } from "../components/XWalletButton"
import { FastLaunch } from "../components/XFastLaunch"
// AccountHistoryOverlay is rendered as vanilla DOM (not React) to avoid CSP/scheduler issues on x.com

export const config: PlasmoCSConfig = {
  matches: [
    "https://x.com/*",
    "https://*.x.com/*",
    "https://twitter.com/*",
    "https://*.twitter.com/*"
  ],
  run_at: "document_idle"
}



const PROCESSED_ATTR = "data-axiom-launch-processed"
const RADAR_ROOT_ATTR = "data-axiom-launch-dock"

function mountXLaunchScanner() {
  injectLaunchRadarStyles()
  // mountFloatingDock()
  wireActiveTweetTracking()
  scanTimelineNames()
  scanSmartFollowers()

  const observer = new MutationObserver(() => {
    window.requestIdleCallback?.(() => {
      scanTimelineNames()
      scanSmartFollowers()
    }) ?? window.setTimeout(() => {
      scanTimelineNames()
      scanSmartFollowers()
    }, 120)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function scanTimelineNames() {
  if (!window.__AXIOM_WATCHLIST_HANDLES__) return;
  const usernameElements = document.querySelectorAll('[data-testid="User-Name"]:not([data-axiom-tracked])');
  for (const el of Array.from(usernameElements)) {
    el.setAttribute("data-axiom-tracked", "true");
    
    const textContent = el.textContent || "";
    const match = textContent.match(/@([a-zA-Z0-9_]+)/);
    if (match && match[1]) {
      const handle = match[1].toLowerCase();
      if (window.__AXIOM_WATCHLIST_HANDLES__.has(handle)) {
        const badge = document.createElement("span");
        badge.className = "axiom-tracked-badge";
        badge.textContent = "Tracked";
        badge.style.marginLeft = "6px";
        badge.style.padding = "2px 4px";
        badge.style.fontSize = "10px";
        badge.style.backgroundColor = "#111111";
        badge.style.color = "#ffffff";
        badge.style.borderRadius = "2px";
        badge.style.textTransform = "uppercase";
        badge.style.verticalAlign = "middle";
        badge.style.display = "inline-block";
        badge.style.lineHeight = "1";
        badge.style.fontWeight = "bold";
        
        const links = el.querySelectorAll('a[href^="/"]');
        let appended = false;
        for (const link of Array.from(links)) {
          if (link.textContent?.toLowerCase().includes('@' + handle)) {
            const wrapper = link.parentElement;
            if (wrapper) {
              wrapper.style.display = "flex";
              wrapper.style.alignItems = "center";
              wrapper.appendChild(badge);
              appended = true;
              break;
            }
          }
        }
        
        if (!appended) {
          el.appendChild(badge);
        }
      }
    }
  }
}

let currentProfileUrl = "";
let isFetchingSmartFollowers = false;

async function scanSmartFollowers() {
  const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)$/);
  const ignoreList = ["home", "explore", "notifications", "messages", "bookmarks", "settings", "search"];
  if (!match || !match[1] || ignoreList.includes(match[1].toLowerCase())) return;
  const handle = match[1];

  if (window.location.href === currentProfileUrl && (
    document.querySelector('.axiom-smart-followers-overlay') ||
    document.querySelector('.axiom-account-history-overlay')
  )) {
    return;
  }
  
  if (isFetchingSmartFollowers) return;
  
  const header = document.querySelector('[data-testid="UserProfileHeader_Items"]');
  if (!header) return;

  currentProfileUrl = window.location.href;
  isFetchingSmartFollowers = true;

  try {
    document.querySelector('.axiom-smart-followers-overlay')?.remove();
    document.querySelector('.axiom-account-history-overlay')?.remove();

    // Inject Account History as pure DOM (no React) to avoid CSP/scheduler blocking on x.com
    await injectAccountHistoryDOM(header, handle);

    // Fetch Smart Followers
    const apiUrl = process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "http://localhost:8080";
    const res = await fetch(`${apiUrl}/smart-followers?handle=${handle}`);
    if (res.ok) {
      const followers = await res.json();
      if (followers && followers.length > 0) {
        if (window.location.href !== currentProfileUrl) return;
        
        // Final check before injecting to avoid race conditions
        if (document.querySelector('.axiom-smart-followers-overlay')) return;

        const container = document.createElement("div");
        container.className = "axiom-smart-followers-overlay";
        container.style.marginTop = "8px";
        container.style.padding = "12px";
        container.style.backgroundColor = "#151515";
        container.style.border = "1px solid #2d2d2d";
        container.style.borderRadius = "8px";
        container.style.color = "#fff";
        container.style.fontFamily = "system-ui, -apple-system, sans-serif";

        let expanded = true;

        const render = () => {
          container.innerHTML = "";

          const headerRow = document.createElement("div");
          headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;";
          headerRow.onclick = () => { expanded = !expanded; render(); };

          const left = document.createElement("div");
          left.style.cssText = "display:flex;align-items:center;gap:8px;";

          const label = document.createElement("span");
          label.innerHTML = `<strong style="font-weight:700;font-size:14px;">${followers.length} Smart Followers</strong>`;
          left.appendChild(label);

          const toggle = document.createElement("span");
          toggle.style.cssText = "font-size:11px;color:#9ca3af;margin-left:4px;";
          toggle.textContent = expanded ? "▲" : "▼";
          left.appendChild(toggle);
          
          headerRow.appendChild(left);

          const right = document.createElement("div");
          right.style.cssText = "display:flex;align-items:center;gap:8px;";

          const viewMore = document.createElement("span");
          viewMore.style.cssText = "font-size:12px;color:#9ca3af;background:#2d2d2d;padding:4px 10px;border-radius:12px;";
          viewMore.textContent = "View more >";
          right.appendChild(viewMore);

          headerRow.appendChild(right);
          container.appendChild(headerRow);

          if (!expanded) return;

          const list = document.createElement("div");
          list.style.cssText = "margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;";

          const colors = ['rgba(139, 92, 246, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(16, 185, 129, 0.6)'];

          followers.forEach((f: any, i: number) => {
            const badgeContainer = document.createElement("div");
            badgeContainer.style.cssText = "display:flex;align-items:center;gap:6px;";

            const color = colors[i % colors.length];

            const avatar = document.createElement("img");
            avatar.src = `https://unavatar.io/twitter/${f.handle}`;
            avatar.style.cssText = "width:24px;height:24px;border-radius:50%;object-fit:cover;background:#3f3f46;flex-shrink:0;";
            avatar.onerror = () => {
              avatar.style.display = "none";
              let ph = badgeContainer.querySelector('.ph-avatar') as HTMLElement;
              if (!ph) {
                ph = document.createElement("div");
                ph.className = 'ph-avatar';
                ph.style.cssText = "width:24px;height:24px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:#fff;flex-shrink:0;";
                ph.textContent = f.handle ? f.handle[0].toUpperCase() : "?";
                badgeContainer.insertBefore(ph, badgeContainer.firstChild);
              }
            };
            badgeContainer.appendChild(avatar);

            const textBox = document.createElement("div");
            textBox.style.cssText = `border:1px solid ${color};border-radius:4px;padding:3px 8px;font-size:12px;color:#fff;background:rgba(255,255,255,0.03);display:flex;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px;`;

            const handleSpan = document.createElement("span");
            handleSpan.textContent = f.handle;
            handleSpan.style.fontWeight = "600";
            textBox.appendChild(handleSpan);

            if (f.category) {
              const catSpan = document.createElement("span");
              const catText = f.category.charAt(0).toUpperCase() + f.category.slice(1);
              catSpan.textContent = ` | ${catText}`;
              catSpan.style.color = "#d1d5db";
              catSpan.style.marginLeft = "4px";
              textBox.appendChild(catSpan);
            }

            badgeContainer.appendChild(textBox);
            list.appendChild(badgeContainer);
          });

          container.appendChild(list);
        };

        render();
        header.parentElement?.appendChild(container);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch smart followers", err);
  } finally {
    isFetchingSmartFollowers = false;
  }
}


// ─── Account History DOM (no React, to avoid CSP/scheduler issues) ───────────

const HISTORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

function getCachedHistory(handle: string) {
  try {
    const raw = sessionStorage.getItem(`axiom-history-${handle}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > HISTORY_CACHE_TTL) {
      sessionStorage.removeItem(`axiom-history-${handle}`);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCachedHistory(handle: string, data: unknown) {
  try {
    sessionStorage.setItem(`axiom-history-${handle}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

async function fetchHistoryData(handle: string) {
  const apiUrl = process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "http://localhost:8080";
  const res = await fetch(`${apiUrl}/x-account-history/${handle}`);
  if (!res.ok) return null;
  const data = await res.json();
  setCachedHistory(handle, data);
  return data;
}

async function injectAccountHistoryDOM(header: Element, handle: string) {
  const container = document.createElement("div");
  container.className = "axiom-account-history-overlay";
  container.style.cssText = `
    margin-top:8px; padding:8px 12px; background:#1a1a1a;
    border:1px solid #2d2d2d; border-radius:8px; font-size:13px;
    color:#f3f4f6; font-family:system-ui,-apple-system,sans-serif;
  `;
  container.textContent = "⏳ Loading history...";
  header.parentElement?.appendChild(container);

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const statusColor = (s: string) => s.includes("rugged") || s.includes("dead") ? "#ef4444" : s.includes("alive") ? "#22c55e" : "#eab308";

  let activeTab: "identity" | "ca" = "identity";
  let expanded = true;

  const renderData = (data: {
    identityHistory: Array<{ ts: string; handle: string; displayName: string; bio: string; avatarUrl: string }>;
    caHistory: Array<{ mint: string; ticker: string | null; firstPostedAt: string; tweetUrl: string; status: string; logoUrl?: string }>;
    changeCount: number;
    isSerialSwapper: boolean;
    trackedSince: string;
  }) => {
    // Filter out duplicate snapshots (same handle + displayName + bio)
    const seen = new Set<string>();
    const uniqueIdentityHistory = data.identityHistory.filter(snap => {
      const key = `${snap.handle}|${snap.displayName}|${snap.bio}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const cur = uniqueIdentityHistory[0];
    container.style.border = data.isSerialSwapper ? "1px solid #ef4444" : "1px solid #2d2d2d";

    const render = () => {
      container.innerHTML = "";

      // ── Header ──
      const headerRow = document.createElement("div");
      headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;";
      headerRow.onclick = () => { expanded = !expanded; render(); };

      const left = document.createElement("div");
      left.style.cssText = "display:flex;align-items:center;gap:10px;";

      if (cur?.avatarUrl) {
        const img = document.createElement("img");
        img.src = cur.avatarUrl;
        img.alt = cur.displayName;
        img.style.cssText = "width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid #444;flex-shrink:0;";
        img.onerror = () => { img.style.display = "none"; };
        left.appendChild(img);
      }

      const label = document.createElement("span");
      label.innerHTML = `<strong style="font-weight:600">History:</strong> changed details ${data.changeCount}x${
        data.isSerialSwapper ? ' <span style="color:#ef4444;font-weight:bold">(Serial Swapper)</span>' : ""
      }`;
      left.appendChild(label);
      headerRow.appendChild(left);

      // Right side: reload + toggle
      const rightDiv = document.createElement("div");
      rightDiv.style.cssText = "display:flex;align-items:center;gap:8px;";

      const reloadBtn = document.createElement("button");
      reloadBtn.title = "Refresh history";
      reloadBtn.textContent = "🔄";
      reloadBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:13px;padding:0;line-height:1;color:#9ca3af;transition:transform 0.1s;";
      reloadBtn.onclick = async (e) => {
        e.stopPropagation();
        if (reloadBtn.dataset.loading === "1") return;
        reloadBtn.dataset.loading = "1";
        reloadBtn.style.pointerEvents = "none";
        // Spin animation via setInterval (CSP-safe, no external CSS)
        let angle = 0;
        const spinInterval = setInterval(() => {
          angle = (angle + 20) % 360;
          reloadBtn.style.transform = `rotate(${angle}deg)`;
        }, 30);
        sessionStorage.removeItem(`axiom-history-${handle}`);
        try {
          const fresh = await fetchHistoryData(handle);
          if (fresh && (fresh.identityHistory.length > 0 || fresh.caHistory.length > 0)) {
            renderData(fresh);
          }
        } finally {
          clearInterval(spinInterval);
          reloadBtn.style.transform = "rotate(0deg)";
          reloadBtn.style.pointerEvents = "auto";
          reloadBtn.dataset.loading = "0";
        }
      };
      rightDiv.appendChild(reloadBtn);

      const toggle = document.createElement("span");
      toggle.style.cssText = "font-size:11px;color:#9ca3af;";
      toggle.textContent = expanded ? "Collapse ▲" : "Expand ▼";
      rightDiv.appendChild(toggle);
      headerRow.appendChild(rightDiv);
      container.appendChild(headerRow);

      if (!expanded) return;

      // ── Divider ──
      const divider = document.createElement("div");
      divider.style.cssText = "margin-top:12px;border-top:1px solid #2d2d2d;padding-top:8px;";

      // ── Tabs ──
      const tabBar = document.createElement("div");
      tabBar.style.cssText = "display:flex;gap:16px;margin-bottom:12px;";
      (["identity", "ca"] as const).forEach(tab => {
        const btn = document.createElement("button");
        btn.style.cssText = `background:none;border:none;cursor:pointer;padding:0;font-size:12px;
          color:${activeTab === tab ? "#60a5fa" : "#9ca3af"};
          font-weight:${activeTab === tab ? 600 : 400};`;
        btn.textContent = tab === "identity"
          ? `Identity History (${uniqueIdentityHistory.length})`
          : `CA History (${data.caHistory.length})`;
        btn.onclick = (e) => { e.stopPropagation(); activeTab = tab; render(); };
        tabBar.appendChild(btn);
      });
      divider.appendChild(tabBar);

      // ── List ──
      const list = document.createElement("div");
      list.style.cssText = "max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;";

      if (activeTab === "identity") {
        uniqueIdentityHistory.forEach((snap, i) => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;gap:10px;align-items:flex-start;background:#252525;padding:8px;border-radius:6px;";

          if (snap.avatarUrl) {
            const img = document.createElement("img");
            img.src = snap.avatarUrl;
            img.alt = snap.displayName;
            img.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #444;flex-shrink:0;";
            img.onerror = () => { img.style.display = "none"; };
            row.appendChild(img);
          }

          const info = document.createElement("div");
          info.style.cssText = "display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;";
          info.innerHTML = `
            <div style="display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;">
              <strong style="font-size:13px;">${snap.displayName}</strong>
              <span style="color:#9ca3af;font-size:12px;">@${snap.handle}</span>
              <span style="font-size:11px;color:#6b7280;margin-left:auto;white-space:nowrap;">
                ${i === uniqueIdentityHistory.length - 1 ? `Tracked since ${fmt(snap.ts)}` : fmt(snap.ts)}
              </span>
            </div>
            ${snap.bio ? `<div style="font-size:11px;color:#d1d5db;margin-top:2px;font-style:italic;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${snap.bio}</div>` : ""}
          `;
          row.appendChild(info);
          list.appendChild(row);
        });
      } else {
        if (data.caHistory.length === 0) {
          list.innerHTML = `<div style="color:#9ca3af;font-size:12px;">No CAs posted by this account.</div>`;
        }
        data.caHistory.forEach(ca => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;background:#252525;padding:6px 10px;border-radius:6px;";

          const left2 = document.createElement("div");
          left2.style.cssText = "display:flex;align-items:center;gap:8px;";

          if (ca.logoUrl) {
            const logo = document.createElement("img");
            logo.src = ca.logoUrl;
            logo.alt = ca.ticker || "Token";
            logo.style.cssText = "width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;";
            logo.onerror = () => { logo.style.display = "none"; };
            left2.appendChild(logo);
          } else {
            const ph = document.createElement("div");
            ph.style.cssText = "width:22px;height:22px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:#fff;flex-shrink:0;";
            ph.textContent = ca.ticker ? (ca.ticker[0] ?? "$").toUpperCase() : "$";
            left2.appendChild(ph);
          }

          const caInfo = document.createElement("div");
          caInfo.innerHTML = `
            <div style="font-weight:600;font-size:13px;">${ca.ticker || "Unknown"}</div>
            <a href="${ca.tweetUrl}" target="_blank" rel="noreferrer" style="font-size:11px;color:#60a5fa;text-decoration:none;">
              ${ca.mint.substring(0, 6)}...${ca.mint.substring(ca.mint.length - 4)}
            </a>
          `;
          left2.appendChild(caInfo);
          row.appendChild(left2);

          const right = document.createElement("div");
          right.style.cssText = "text-align:right;";
          right.innerHTML = `
            <div style="color:${statusColor(ca.status)};font-weight:bold;text-transform:capitalize;font-size:12px;">${ca.status}</div>
            <div style="font-size:10px;color:#6b7280;">${fmt(ca.firstPostedAt)}</div>
          `;
          row.appendChild(right);
          list.appendChild(row);
        });
      }

      divider.appendChild(list);
      container.appendChild(divider);
    };

    render();
  };

  try {
    // Try cache first — no loading flash if cached
    const cached = getCachedHistory(handle);
    if (cached) {
      renderData(cached);
      return;
    }

    // No cache — fetch from API
    const data = await fetchHistoryData(handle);
    if (!data || (data.identityHistory.length === 0 && data.caHistory.length === 0)) {
      container.remove();
      return;
    }
    renderData(data);
  } catch (err) {
    console.error("[Frontdeploy] Account history error:", err);
    container.remove();
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function injectLaunchRadarStyles() {

  if (!document.head) return
  if (document.querySelector("[data-axiom-launch-style]")) return

  const style = document.createElement("style")
  style.setAttribute("data-axiom-launch-style", "true")
  style.textContent = LAUNCH_RADAR_CSS
  document.head.append(style)
}

function mountFloatingDock() {
  if (document.querySelector(`[${RADAR_ROOT_ATTR}]`)) return
  if (!document.body) return

  const mount = document.createElement("div")
  mount.setAttribute(RADAR_ROOT_ATTR, "true")
  mount.style.position = "fixed"
  mount.style.right = "16px"
  mount.style.bottom = "16px"
  mount.style.zIndex = "2147483647"
  mount.style.width = "360px"
  mount.style.maxWidth = "calc(100vw - 32px)"
  mount.style.pointerEvents = "auto"
  mount.innerHTML = `
    <div style="background:#fff;border:1px solid #111;color:#111;font-family:Arial,sans-serif;padding:12px;border-radius:2px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b6b66">Frontdeploy</div>
      <div style="margin-top:4px;font-size:14px;font-weight:700">Scanning X...</div>
    </div>
  `
  document.body.append(mount)
  // XLaunchDock disabled to prevent React #130 error from CSP scheduler blocking
  // createRoot(mount).render(<XLaunchDock />)
}

function wireActiveTweetTracking() {
  const handlePointerEvent = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const article = target.closest("article")
    if (!(article instanceof HTMLElement)) return

    const context = extractXReplyContext(article)
    if (!context) return

    emitLaunchContext(context)
  }

  for (const eventName of ["mouseover", "pointerover", "focusin", "click"]) {
    document.addEventListener(eventName, handlePointerEvent, { passive: true })
  }
}

function emitLaunchContext(context: XReplyContext) {
  void saveSelectedLaunchContext(context)
  window.dispatchEvent(
    new CustomEvent<XReplyContext>("axiom-launch-context", {
      detail: context
    })
  )
}

function scanTweets() {
  const articles = findXReplyArticles()

  for (const article of articles) {
    const context = extractXReplyContext(article)
    if (!context) continue

    if (!window.__AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__) {
      window.__AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__ = context
      emitLaunchContext(context)
    }

    article.setAttribute(PROCESSED_ATTR, "true")
    // XLaunchPanel disabled to prevent React #130 error from CSP scheduler blocking
    // const mount = document.createElement("div")
    // mount.className = "axiom-x-launch-mount"
    // article.append(mount)
    // createRoot(mount).render(<XLaunchPanel context={context} />)
  }
}

declare global {
  interface Window {
    __AXIOM_LAUNCH_RADAR_BOOTED__?: boolean
    __AXIOM_LAUNCH_RADAR_ACTIVE_CONTEXT__?: XReplyContext
    __AXIOM_WATCHLIST_HANDLES__?: Set<string>
  }
}

async function fetchWatchlist() {
  try {
    const apiUrl = process.env.PLASMO_PUBLIC_FRONTDEPLOY_API_URL || "http://localhost:8080";
    const res = await fetch(`${apiUrl}/watchlist`);
    if (res.ok) {
      const list = await res.json();
      const handles = new Set<string>();
      list.forEach((item: any) => {
        // Strip @ if present
        handles.add(item.handle.replace(/^@/, '').toLowerCase());
      });
      window.__AXIOM_WATCHLIST_HANDLES__ = handles;
    }
  } catch (err) {
    console.warn("[Frontdeploy] Failed to fetch watchlist:", err);
  }
}

function startWhenReady() {
  if (window.__AXIOM_LAUNCH_RADAR_BOOTED__) return
  window.__AXIOM_LAUNCH_RADAR_BOOTED__ = true

  const start = async () => {
    if (!document.body) {
      window.setTimeout(start, 100)
      return
    }

    try {
      // Launch Radar (X signal detection) is a FREE feature. Mount unconditionally.
      mountXLaunchScanner()

      // KOL Live features (like the in-feed tracked badge) are PRO features.
      const session = await getWalletStatus()
      const gate = await checkTokenGate(session?.publicKey)
      if (hasAccess(gate.tier, "kolAlerts")) {
        await fetchWatchlist()
      } else {
        console.info("[Frontdeploy] Token gate not passed for KOL alerts. KOL tracking badges disabled on X.")
      }
    } catch (err) {
      console.warn("[Frontdeploy] Error during X initialization:", err)
    }
  }

  start()
}

function XLaunchPanel({ context }: { context: XReplyContext }) {
  const draft = useMemo(() => createLaunchDraft(context), [context])
  const [expanded, setExpanded] = useState(context.influence === "major")
  const [copied, setCopied] = useState("")

  async function copyText(label: string, value: string) {
    await copyToClipboard(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1500)
  }

  return (
    <aside className="mx-4 mb-3 mt-2 rounded-sm border border-axiom-border bg-axiom-panel p-3 text-axiom-text shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
          <h2 className="mt-1 text-sm font-bold flex items-center gap-2">
            @{context.handle} {context.influence === "major" ? "major account" : "reply signal"}
            {window.__AXIOM_WATCHLIST_HANDLES__?.has(context.handle.toLowerCase()) && (
              <span className="px-1.5 py-0.5 text-[10px] bg-axiom-accent text-white rounded uppercase">Tracked</span>
            )}
          </h2>
        </div>
        <button
          type="button"
          className="rounded-sm border border-axiom-border px-2 py-1 text-xs font-bold text-axiom-text"
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide" : "Draft"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <LaunchMetric label="Name" value={draft.tokenName} />
            <LaunchMetric label="Ticker" value={`$${draft.ticker}`} />
            <LaunchMetric label="Confidence" value={draft.confidence} />
            <LaunchMetric label="Source" value="X reply" />
          </div>

          <p className="rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
            {context.text}
          </p>

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void copyText("metadata", formatMetadata(draft))}>
              Copy metadata
            </ActionButton>
            <ActionButton onClick={() => void copyText("logo prompt", draft.logoPrompt)}>
              Copy logo prompt
            </ActionButton>
            <ActionButton onClick={() => openLaunchPage(draft)}>
              Open pump.fun
            </ActionButton>
          </div>

          {copied ? <p className="text-xs font-semibold text-axiom-good">Copied {copied}</p> : null}

          <div className="mt-3 border-t border-axiom-border pt-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase text-axiom-muted mb-1">Direct Launch</h3>
            <WalletButton />
            <FastLaunch initialDraft={{ name: draft.tokenName, symbol: draft.ticker, description: draft.description, twitter: draft.sourceUrl }} />
          </div>

          <ul className="space-y-1 border-t border-axiom-border pt-2">
            {draft.warnings.map((warning) => (
              <li key={warning} className="text-[11px] leading-4 text-axiom-muted">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}

function XLaunchDock() {
  const [context, setContext] = useState<XReplyContext | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [copied, setCopied] = useState("")
  const draft = useMemo(() => (context ? createLaunchDraft(context) : null), [context])

  useEffect(() => {
    const handleContext = (event: Event) => {
      const nextContext = (event as CustomEvent<XReplyContext>).detail
      setContext(nextContext)
      if (nextContext.influence === "major") {
        setMinimized(false)
      }
    }

    window.addEventListener("axiom-launch-context", handleContext)
    return () => window.removeEventListener("axiom-launch-context", handleContext)
  }, [])

  async function copyText(label: string, value: string) {
    await copyToClipboard(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1500)
  }

  async function openLogoGenerator() {
    if (!draft) return

    window.open(buildChatGptLogoUrl(draft), "_blank", "noopener,noreferrer")
    await copyText("logo prompt", draft.logoPrompt)
  }

  if (!context || !draft) {
    return (
      <div className="fixed bottom-4 right-4 z-[2147483647] w-80 rounded-sm border border-axiom-border bg-axiom-panel p-3 text-axiom-text shadow-none">
        <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
        <p className="mt-1 text-sm font-semibold">Hover an X reply to draft a pump.fun launch.</p>
      </div>
    )
  }

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-[2147483647] rounded-sm bg-axiom-accent px-3 py-2 text-sm font-bold text-white shadow-none"
        onClick={() => setMinimized(false)}>
        Launch radar
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[2147483647] w-[360px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-sm border border-axiom-border bg-axiom-panel p-3 text-axiom-text shadow-none flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-axiom-muted">Frontdeploy</p>
          <h2 className="mt-1 text-base font-bold leading-tight flex items-center gap-2">
            {draft.tokenName} <span className="text-axiom-accent">${draft.ticker}</span>
            {window.__AXIOM_WATCHLIST_HANDLES__?.has(context.handle.toLowerCase()) && (
              <span className="px-1.5 py-0.5 text-[10px] bg-axiom-accent text-white rounded uppercase shrink-0">Tracked</span>
            )}
          </h2>
          <p className="mt-1 text-xs text-axiom-muted">
            @{context.handle} - {context.influence === "major" ? "major account" : "reply signal"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-sm border border-axiom-border px-2 py-1 text-xs font-bold text-axiom-text"
          onClick={() => setMinimized(true)}>
          Min
        </button>
      </div>

      <p className="mt-3 max-h-20 overflow-hidden rounded-sm border border-axiom-border bg-axiom-bg p-2 text-xs leading-5 text-axiom-muted">
        {context.text}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <LaunchMetric label="Name" value={draft.tokenName} />
        <LaunchMetric label="Ticker" value={`$${draft.ticker}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton onClick={() => void copyText("name", draft.tokenName)}>
          Copy name
        </ActionButton>
        <ActionButton onClick={() => void copyText("ticker", draft.ticker)}>
          Copy ticker
        </ActionButton>
        <ActionButton onClick={() => void copyText("X link", draft.sourceUrl)}>
          Copy X link
        </ActionButton>
        <ActionButton onClick={() => void copyText("metadata", formatMetadata(draft))}>
          Copy all
        </ActionButton>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ActionButton onClick={() => void openLogoGenerator()}>
          Logo via GPT
        </ActionButton>
        <ActionButton onClick={() => openLaunchPage(draft)}>
          Deploy page
        </ActionButton>
      </div>

      {copied ? <p className="mt-2 text-xs font-semibold text-axiom-good">Copied {copied}</p> : null}

      <div className="mt-3 border-t border-axiom-border pt-3 flex flex-col gap-2 shrink-0">
        <h3 className="text-xs font-bold uppercase text-axiom-muted mb-1">Direct Launch</h3>
        <WalletButton />
        <FastLaunch initialDraft={{ name: draft.tokenName, symbol: draft.ticker, description: draft.description, twitter: draft.sourceUrl }} />
      </div>

      <p className="mt-2 border-t border-axiom-border pt-2 text-[11px] leading-4 text-axiom-muted shrink-0">
        Manual launch only. Frontdeploy never connects wallet, requests SOL, or sends transactions.
      </p>

      <button
        type="button"
        className="mt-3 w-full shrink-0 rounded-sm border border-axiom-border px-2 py-2 text-xs font-bold text-axiom-text hover:bg-axiom-bg transition"
        onClick={() => setMinimized(true)}>
        Hide / Minimize
      </button>
    </div>
  )
}

function LaunchMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-axiom-border bg-axiom-bg p-2">
      <p className="font-bold uppercase text-axiom-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-axiom-text">{value}</p>
    </div>
  )
}

function ActionButton({
  children,
  onClick
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="rounded-sm bg-axiom-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-axiom-muted"
      onClick={onClick}>
      {children}
    </button>
  )
}

function formatMetadata(draft: LaunchDraft): string {
  return [
    `Name: ${draft.tokenName}`,
    `Ticker: ${draft.ticker}`,
    `Description: ${draft.description}`,
    `Source X reply: ${draft.sourceUrl}`,
    `Logo prompt: ${draft.logoPrompt}`
  ].join("\n")
}

function openLaunchPage(draft: LaunchDraft) {
  window.open(buildPumpFunCreateUrl(draft), "_blank", "noopener,noreferrer")
}

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "0"
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand("copy")
    textarea.remove()
  }
}

const LAUNCH_RADAR_CSS = `
[data-axiom-launch-dock],
.axiom-x-launch-mount {
  font-family: "Helvetica Neue", Arial, Inter, ui-sans-serif, system-ui, sans-serif;
  color: #111111;
}

[data-axiom-launch-dock] *,
.axiom-x-launch-mount * {
  box-sizing: border-box;
}

[data-axiom-launch-dock] .fixed { position: fixed; }
[data-axiom-launch-dock] .bottom-4 { bottom: 16px; }
[data-axiom-launch-dock] .right-4 { right: 16px; }
[data-axiom-launch-dock] .z-\\[2147483647\\] { z-index: 2147483647; }
[data-axiom-launch-dock] .w-80 { width: 320px; }
[data-axiom-launch-dock] .w-\\[360px\\] { width: 360px; }
[data-axiom-launch-dock] .max-w-\\[calc\\(100vw-2rem\\)\\] { max-width: calc(100vw - 32px); }
[data-axiom-launch-dock] .rounded-sm,
.axiom-x-launch-mount .rounded-sm { border-radius: 2px; }
[data-axiom-launch-dock] .border,
.axiom-x-launch-mount .border { border-width: 1px; border-style: solid; }
[data-axiom-launch-dock] .border-axiom-border,
.axiom-x-launch-mount .border-axiom-border { border-color: #27272a; }
[data-axiom-launch-dock] .bg-axiom-panel,
.axiom-x-launch-mount .bg-axiom-panel { background: #121214; }
[data-axiom-launch-dock] .bg-axiom-bg,
.axiom-x-launch-mount .bg-axiom-bg { background: #0a0a0b; }
[data-axiom-launch-dock] .bg-axiom-accent,
.axiom-x-launch-mount .bg-axiom-accent { background: #3b82f6; }
[data-axiom-launch-dock] .text-white,
.axiom-x-launch-mount .text-white { color: #ffffff; }
[data-axiom-launch-dock] .text-axiom-text,
.axiom-x-launch-mount .text-axiom-text { color: #fafafa; }
[data-axiom-launch-dock] .text-axiom-muted,
.axiom-x-launch-mount .text-axiom-muted { color: #a1a1aa; }
[data-axiom-launch-dock] .text-axiom-accent,
.axiom-x-launch-mount .text-axiom-accent { color: #3b82f6; }
[data-axiom-launch-dock] .text-axiom-good,
.axiom-x-launch-mount .text-axiom-good { color: #008f5a; }
[data-axiom-launch-dock] .p-2,
.axiom-x-launch-mount .p-2 { padding: 8px; }
[data-axiom-launch-dock] .p-3,
.axiom-x-launch-mount .p-3 { padding: 12px; }
[data-axiom-launch-dock] .px-2,
.axiom-x-launch-mount .px-2 { padding-left: 8px; padding-right: 8px; }
[data-axiom-launch-dock] .px-3,
.axiom-x-launch-mount .px-3 { padding-left: 12px; padding-right: 12px; }
[data-axiom-launch-dock] .py-1,
.axiom-x-launch-mount .py-1 { padding-top: 4px; padding-bottom: 4px; }
[data-axiom-launch-dock] .py-2,
.axiom-x-launch-mount .py-2 { padding-top: 8px; padding-bottom: 8px; }
[data-axiom-launch-dock] .m-0,
.axiom-x-launch-mount .m-0 { margin: 0; }
[data-axiom-launch-dock] .mx-4,
.axiom-x-launch-mount .mx-4 { margin-left: 16px; margin-right: 16px; }
[data-axiom-launch-dock] .mb-3,
.axiom-x-launch-mount .mb-3 { margin-bottom: 12px; }
[data-axiom-launch-dock] .mt-1,
.axiom-x-launch-mount .mt-1 { margin-top: 4px; }
[data-axiom-launch-dock] .mt-2,
.axiom-x-launch-mount .mt-2 { margin-top: 8px; }
[data-axiom-launch-dock] .mt-3,
.axiom-x-launch-mount .mt-3 { margin-top: 12px; }
[data-axiom-launch-dock] .flex,
.axiom-x-launch-mount .flex { display: flex; }
[data-axiom-launch-dock] .grid,
.axiom-x-launch-mount .grid { display: grid; }
[data-axiom-launch-dock] .grid-cols-2,
.axiom-x-launch-mount .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
[data-axiom-launch-dock] .items-start,
.axiom-x-launch-mount .items-start { align-items: flex-start; }
[data-axiom-launch-dock] .items-center,
.axiom-x-launch-mount .items-center { align-items: center; }
[data-axiom-launch-dock] .justify-between,
.axiom-x-launch-mount .justify-between { justify-content: space-between; }
[data-axiom-launch-dock] .flex-wrap,
.axiom-x-launch-mount .flex-wrap { flex-wrap: wrap; }
[data-axiom-launch-dock] .gap-2,
.axiom-x-launch-mount .gap-2 { gap: 8px; }
[data-axiom-launch-dock] .gap-3,
.axiom-x-launch-mount .gap-3 { gap: 12px; }
[data-axiom-launch-dock] .space-y-1 > * + *,
.axiom-x-launch-mount .space-y-1 > * + * { margin-top: 4px; }
[data-axiom-launch-dock] .space-y-3 > * + *,
.axiom-x-launch-mount .space-y-3 > * + * { margin-top: 12px; }
[data-axiom-launch-dock] .border-t,
.axiom-x-launch-mount .border-t { border-top-width: 1px; border-top-style: solid; }
[data-axiom-launch-dock] .pt-2,
.axiom-x-launch-mount .pt-2 { padding-top: 8px; }
[data-axiom-launch-dock] .text-\\[11px\\],
.axiom-x-launch-mount .text-\\[11px\\] { font-size: 11px; }
[data-axiom-launch-dock] .text-xs,
.axiom-x-launch-mount .text-xs { font-size: 12px; }
[data-axiom-launch-dock] .text-sm,
.axiom-x-launch-mount .text-sm { font-size: 14px; }
[data-axiom-launch-dock] .text-base,
.axiom-x-launch-mount .text-base { font-size: 16px; }
[data-axiom-launch-dock] .font-semibold,
.axiom-x-launch-mount .font-semibold { font-weight: 600; }
[data-axiom-launch-dock] .font-bold,
.axiom-x-launch-mount .font-bold { font-weight: 700; }
[data-axiom-launch-dock] .uppercase,
.axiom-x-launch-mount .uppercase { text-transform: uppercase; }
[data-axiom-launch-dock] .leading-4,
.axiom-x-launch-mount .leading-4 { line-height: 16px; }
[data-axiom-launch-dock] .leading-5,
.axiom-x-launch-mount .leading-5 { line-height: 20px; }
[data-axiom-launch-dock] .leading-tight,
.axiom-x-launch-mount .leading-tight { line-height: 1.25; }
[data-axiom-launch-dock] .truncate,
.axiom-x-launch-mount .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-axiom-launch-dock] .overflow-hidden,
.axiom-x-launch-mount .overflow-hidden { overflow: hidden; }
[data-axiom-launch-dock] .max-h-20 { max-height: 80px; }
[data-axiom-launch-dock] .shadow-none,
.axiom-x-launch-mount .shadow-none { box-shadow: none; }
[data-axiom-launch-dock] button,
.axiom-x-launch-mount button {
  border: 1px solid #111111;
  cursor: pointer;
  font: inherit;
}
[data-axiom-launch-dock] button:hover,
.axiom-x-launch-mount button:hover {
  background: #6b6b66;
}
[data-axiom-launch-dock] .flex-col, .axiom-x-launch-mount .flex-col { flex-direction: column; }
[data-axiom-launch-dock] .gap-1, .axiom-x-launch-mount .gap-1 { gap: 4px; }
[data-axiom-launch-dock] .w-full, .axiom-x-launch-mount .w-full { width: 100%; }
[data-axiom-launch-dock] .w-16, .axiom-x-launch-mount .w-16 { width: 64px; }
[data-axiom-launch-dock] .h-16, .axiom-x-launch-mount .h-16 { height: 64px; }
[data-axiom-launch-dock] .w-2, .axiom-x-launch-mount .w-2 { width: 8px; }
[data-axiom-launch-dock] .h-2, .axiom-x-launch-mount .h-2 { height: 8px; }
[data-axiom-launch-dock] .flex-1, .axiom-x-launch-mount .flex-1 { flex: 1 1 0%; }
[data-axiom-launch-dock] .min-h-\\[60px\\], .axiom-x-launch-mount .min-h-\\[60px\\] { min-height: 60px; }
[data-axiom-launch-dock] .object-cover, .axiom-x-launch-mount .object-cover { object-fit: cover; }
[data-axiom-launch-dock] .cursor-pointer, .axiom-x-launch-mount .cursor-pointer { cursor: pointer; }
[data-axiom-launch-dock] .rounded, .axiom-x-launch-mount .rounded { border-radius: 4px; }
[data-axiom-launch-dock] .rounded-full, .axiom-x-launch-mount .rounded-full { border-radius: 9999px; }
[data-axiom-launch-dock] .bg-axiom-bad\\/10, .axiom-x-launch-mount .bg-axiom-bad\\/10 { background-color: rgba(225, 29, 72, 0.1); }
[data-axiom-launch-dock] .bg-axiom-good\\/10, .axiom-x-launch-mount .bg-axiom-good\\/10 { background-color: rgba(0, 143, 90, 0.1); }
[data-axiom-launch-dock] .border-axiom-bad\\/20, .axiom-x-launch-mount .border-axiom-bad\\/20 { border-color: rgba(225, 29, 72, 0.2); }
[data-axiom-launch-dock] .border-axiom-good\\/20, .axiom-x-launch-mount .border-axiom-good\\/20 { border-color: rgba(0, 143, 90, 0.2); }
[data-axiom-launch-dock] .text-axiom-bad, .axiom-x-launch-mount .text-axiom-bad { color: #e11d48; }
[data-axiom-launch-dock] .text-axiom-warn, .axiom-x-launch-mount .text-axiom-warn { color: #d97706; }
[data-axiom-launch-dock] .underline, .axiom-x-launch-mount .underline { text-decoration-line: underline; }
[data-axiom-launch-dock] .transition-colors, .axiom-x-launch-mount .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
[data-axiom-launch-dock] .transition-opacity, .axiom-x-launch-mount .transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
[data-axiom-launch-dock] .hover\\:opacity-90:hover, .axiom-x-launch-mount .hover\\:opacity-90:hover { opacity: 0.9; }
[data-axiom-launch-dock] .hover\\:bg-axiom-muted:hover, .axiom-x-launch-mount .hover\\:bg-axiom-muted:hover { background-color: #6b6b66; }
[data-axiom-launch-dock] .focus\\:outline-none:focus, .axiom-x-launch-mount .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
[data-axiom-launch-dock] .py-1\\.5, .axiom-x-launch-mount .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
[data-axiom-launch-dock] .font-medium, .axiom-x-launch-mount .font-medium { font-weight: 500; }
[data-axiom-launch-dock] .animate-pulse, .axiom-x-launch-mount .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes axiom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
[data-axiom-launch-dock] .overflow-y-auto, .axiom-x-launch-mount .overflow-y-auto { overflow-y: auto; }
[data-axiom-launch-dock] .max-h-\\[300px\\], .axiom-x-launch-mount .max-h-\\[300px\\] { max-height: 300px; }
`

startWhenReady()
