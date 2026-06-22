import { useState, useEffect, useRef, useCallback } from "react"
import { getApiSettings } from "../lib/storage"

interface ChartOverlayProps {
  tokenAddress: string
  tier: "none" | "base" | "plus" | "founding"
}

interface FlowEvent {
  mint: string
  type: "organic" | "suspect" | "looping"
  volumeUsd: number
  wallet: string
  txSignature: string
}

export function ChartOverlay({ tokenAddress, tier }: ChartOverlayProps) {
  const [events, setEvents] = useState<FlowEvent[]>([])
  const [metrics, setMetrics] = useState({ organicVol: 0, loopingVol: 0, suspectVol: 0, roundTrips: 0 })
  const [isLive, setIsLive] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  
  // Connect to WebSocket when tokenAddress changes and user has access
  useEffect(() => {
    if (tier === "none" || tier === "base") return;
    
    let isActive = true;
    
    getApiSettings().then(settings => {
      if (!isActive) return;
      const wsUrl = settings.backendUrl.replace(/^http/, 'ws') + '/ws/kol-alerts';
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsLive(true);
        ws.send(JSON.stringify({ action: "subscribe", mint: tokenAddress }));
      };

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === "flow_event" && payload.data.mint === tokenAddress) {
            const ev = payload.data as FlowEvent;
            
            setEvents(prev => {
              const newEvents = [...prev, ev];
              if (newEvents.length > 150) newEvents.shift();
              return newEvents;
            });

            setMetrics(prev => {
              const newMetrics = { ...prev };
              if (ev.type === "organic") newMetrics.organicVol += ev.volumeUsd;
              else if (ev.type === "looping") {
                newMetrics.loopingVol += ev.volumeUsd;
                newMetrics.roundTrips += 1;
              }
              else if (ev.type === "suspect") newMetrics.suspectVol += ev.volumeUsd;
              return newMetrics;
            });
          }
        } catch (e) {
          console.warn("WS parsing error", e);
        }
      };

      ws.onclose = () => {
        setIsLive(false);
      };
    });

    return () => {
      isActive = false;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "unsubscribe", mint: tokenAddress }));
        }
        wsRef.current.close();
      }
      setEvents([]);
      setMetrics({ organicVol: 0, loopingVol: 0, suspectVol: 0, roundTrips: 0 });
    }
  }, [tokenAddress, tier]);

  const totalVol = metrics.organicVol + metrics.loopingVol + metrics.suspectVol;
  const organicPct = totalVol > 0 ? Math.round((metrics.organicVol / totalVol) * 100) : 100;
  const loopingPct = totalVol > 0 ? Math.round((metrics.loopingVol / totalVol) * 100) : 0;

  if (tier === "none" || tier === "base") {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] rounded-sm bg-axiom-panel/80 backdrop-blur-md border border-axiom-border shadow-lg p-3 flex items-center justify-between w-[600px]">
         <div className="text-xs text-axiom-text font-bold">Axiom Flow Radar</div>
         <div className="text-xs text-axiom-muted">Flow Radar requires Plus Tier</div>
         <a href="https://pump.fun" target="_blank" rel="noreferrer" className="text-xs font-semibold text-axiom-accent hover:underline">
            Hold 0.5% $FDP to unlock
         </a>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] rounded-sm bg-axiom-panel/95 backdrop-blur-sm border border-axiom-border shadow-2xl p-2 flex flex-col w-[800px] overflow-hidden font-sans">
      
      {/* Header / Metrics */}
      <div className="flex items-center justify-between px-2 pb-2 border-b border-axiom-border mb-2">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-axiom-good animate-pulse' : 'bg-axiom-muted'}`} />
           <span className="text-xs font-bold text-axiom-text">Flow Radar</span>
           <span className="text-[10px] font-mono text-axiom-muted ml-2">{tokenAddress.slice(0,6)}..{tokenAddress.slice(-4)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-axiom-muted">
            <span className="text-axiom-good font-bold mr-1">{organicPct}%</span> Organic
          </div>
          <div className="text-axiom-muted">
            <span className="text-axiom-bad font-bold mr-1">{loopingPct}%</span> Looping
          </div>
          <div className="text-axiom-muted">
            <span className="text-axiom-warn font-bold mr-1">{metrics.roundTrips}</span> Round-trips
          </div>
          <div className="text-axiom-muted">
            <span className="font-bold mr-1">{events.length}</span> Txs
          </div>
        </div>
      </div>

      {/* Bar Strip */}
      <div className="flex items-center h-4 gap-[1px] w-full bg-axiom-bg rounded-sm px-1 overflow-hidden">
        {events.map((ev, i) => {
          let bgColor = "bg-axiom-good"; // organic
          if (ev.type === "suspect") bgColor = "bg-axiom-warn";
          if (ev.type === "looping") bgColor = "bg-axiom-bad";
          return (
            <div 
              key={i} 
              title={`${ev.type.toUpperCase()} | ${ev.wallet} | $${ev.volumeUsd.toFixed(2)}`}
              className={`flex-1 h-full opacity-80 hover:opacity-100 cursor-crosshair transition-opacity ${bgColor}`} 
            />
          );
        })}
        {events.length === 0 && (
          <div className="text-[10px] text-axiom-muted w-full text-center tracking-widest uppercase">Waiting for transactions...</div>
        )}
      </div>

    </div>
  )
}
