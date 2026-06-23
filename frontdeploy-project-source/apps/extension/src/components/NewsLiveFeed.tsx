import { useState, useEffect } from "react";

export function NewsLiveFeed() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let keepAliveIntervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;
    
    const WS_URL = process.env.PLASMO_PUBLIC_FRONTDEPLOY_WS_URL || "ws://localhost:8080/ws/kol-alerts";

    function connect() {
      if (!isMounted) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("KOL Alerts WS connected from UI");
        if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "kol_event") {
            const evtData = data.data;
            if (evtData.category !== "news") return;
            setEvents(prev => {
              if (prev.some(e => e.tweetId === evtData.tweetId)) return prev;
              const newEvents = [evtData, ...prev];
              if (newEvents.length > 100) newEvents.length = 100;
              return newEvents;
            });
          }
        } catch (err) {
          console.error("Error parsing WS message", err);
        }
      };

      ws.onclose = () => {
        console.log("KOL Alerts WS closed");
        ws = null;
        if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
        if (isMounted) {
          setTimeout(connect, 5000);
        }
      };

      ws.onerror = (err) => {
        console.error("KOL Alerts WS error", err);
        ws?.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
      if (ws) {
        // Disconnect immediately when the tab is closed!
        ws.close();
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between pb-2 border-b border-axiom-border/10">
        <h2 className="text-sm font-semibold text-axiom-text">Live News Feed</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-axiom-good animate-pulse shadow-[0_0_8px_rgba(11,122,59,0.6)]" />
          <span className="text-xs text-axiom-muted">Listening...</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pb-10 mt-2">
        {events && events.length > 0 ? (
          events.map((evt: any, i: number) => (
            <div 
              key={evt.tweetId || i} 
              className={`p-3 rounded-lg border ${
                evt.isSignal 
                  ? 'bg-axiom-warn/10 border-axiom-warn/30' 
                  : 'bg-axiom-bg border-axiom-border/20'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <a 
                  href={evt.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-semibold text-axiom-text hover:underline"
                >
                  @{evt.authorHandle}
                </a>
                <span className="text-[10px] text-axiom-muted">
                  {new Date(evt.postedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-axiom-text whitespace-pre-wrap mb-2">
                {evt.text}
              </p>
              
              {/* Narrative Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {(() => {
                  const txt = evt.text.toLowerCase();
                  const tags = [];
                  if (txt.includes('iran') || txt.includes('war') || txt.includes('geopolitics') || txt.includes('russia') || txt.includes('israel')) tags.push('Geopolitics');
                  if (txt.includes('ai') || txt.includes('gpt') || txt.includes('claude') || txt.includes('openai') || txt.includes('anthropic')) tags.push('AI');
                  if (txt.includes('etf') || txt.includes('sec') || txt.includes('regulation') || txt.includes('gensler')) tags.push('Regulation');
                  if (txt.includes('pump.fun') || txt.includes('pumpdotfun')) tags.push('Pump.fun');
                  
                  return tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-axiom-accent/20 text-axiom-accent text-[9px] font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  ));
                })()}
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-axiom-border/10">
                {evt.ticker && (
                  <span className="px-1.5 py-0.5 rounded bg-axiom-warn/20 text-axiom-warn text-[10px] font-bold">
                    {evt.ticker}
                  </span>
                )}
                {evt.contractAddress && (
                  <span className="text-[10px] text-axiom-muted font-mono truncate max-w-[120px]">
                    {evt.contractAddress}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (typeof chrome !== "undefined" && chrome.storage) {
                      chrome.storage.local.set({
                        "axiomIntelligence.launchContext": {
                          id: evt.tweetId,
                          text: evt.text,
                          url: evt.url,
                          handle: evt.authorHandle,
                          influence: "major",
                          ticker: evt.ticker || evt.contractAddress || ""
                        },
                        kolDeployTrigger: Date.now()
                      });
                    }
                  }}
                  className="ml-auto px-3 py-1 bg-black text-white border border-axiom-border text-xs font-semibold rounded hover:bg-black/80 transition-colors"
                >
                  Deploy
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-axiom-muted text-xs">
            No news detected yet. Waiting for breaking news...
          </div>
        )}
      </div>
    </div>
  );
}
