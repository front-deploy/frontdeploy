import { useState, useEffect, useRef, useMemo } from "react"
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
  const [isOpen, setIsOpen] = useState(true)
  
  // Dragging & Resizing state
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const [width, setWidth] = useState(800)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 })
  const resizeStartRef = useRef({ x: 0, initialWidth: 0 })
  
  const wsRef = useRef<WebSocket | null>(null)

  // Set initial position to bottom-left on mount
  useEffect(() => {
    setPosition({ x: 24, y: window.innerHeight - 164 })
  }, [])

  // Handle global drag & resize events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.x
        setWidth(Math.max(400, Math.min(window.innerWidth - 48, resizeStartRef.current.initialWidth + dx)))
        return
      }
      
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      setPosition({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy
      })
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if left click
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: position.x,
      initialY: position.y
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (e.button !== 0) return
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      initialWidth: width
    }
  }
  
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
              if (newEvents.length > 200) newEvents.shift();
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
  
  const isSmall = width < 600;

  if (!isOpen) return null;

  if (tier === "none" || tier === "base") {
    return (
      <div className="fixed bottom-4 left-4 z-[9999] rounded-xl bg-[#18181A] text-white border border-[#27272A] shadow-2xl p-4 flex items-center justify-between w-[400px]">
         <div className="text-sm font-bold">Frontdeploy Flow Radar</div>
         <a href="https://pump.fun" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#00E599] hover:underline bg-[#00E599]/10 px-2 py-1 rounded">
            Hold 0.5% $FDP to unlock
         </a>
      </div>
    );
  }

  return (
    <div 
      className={`fixed z-[9999] rounded-xl bg-[#111111] text-white border border-[#27272A] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] p-4 flex ${isSmall ? 'flex-col' : 'flex-row'} font-sans min-h-[140px] h-auto box-border ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${isResizing ? "select-none" : ""}`}
      style={{ left: position.x, top: position.y, width: width }}
      onMouseDown={handleMouseDown}
    >
      
      {/* Left Column: Organic Volume */}
      <div className={`${isSmall ? 'w-full flex-row border-b pb-3 mb-2 justify-between' : 'w-[140px] flex-col justify-center border-r pr-4'} flex items-center border-[#27272A] shrink-0 relative gap-2`}>
        <div className={`${isSmall ? 'relative' : 'absolute top-0 left-0'} text-[#52525B] shrink-0`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"/></svg>
        </div>
        <div className={`font-black text-[#FACC15] tracking-tighter shrink-0 ${isSmall ? 'text-2xl' : 'text-4xl mt-2 mb-1'}`}>
          {organicPct}%
        </div>
        <div className={`text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest ${isSmall ? 'text-left flex-1' : 'text-center'}`}>
          Organic Volume
        </div>
      </div>

      {/* Right Column: Chart & Header */}
      <div className={`flex flex-col min-w-0 ${isSmall ? 'flex-1' : 'flex-1 pl-4'}`}>
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#EF4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
              <span className="font-extrabold text-sm tracking-wide">Frontdeploy</span>
              <span className="text-[10px] font-bold text-[#52525B] uppercase tracking-widest">Wash Radar</span>
            </div>
            
            <div className="flex items-center gap-3 ml-2 text-[11px] font-medium text-[#A1A1AA]">
              <span>wash <strong className="text-white">{loopingPct}%</strong></span>
              <span>round-trippers <strong className="text-white">{metrics.roundTrips}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#A1A1AA] shrink-0">
            <div className="flex items-center gap-1.5 bg-[#18181B] px-2 py-0.5 rounded-full border border-[#27272A] shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00E599] shadow-[0_0_8px_#00E599]' : 'bg-[#52525B]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">live</span>
            </div>
            <button className="hover:text-white transition-colors bg-[#27272A]/50 p-1.5 rounded hover:bg-[#27272A] shrink-0" onClick={() => setIsOpen(false)} title="Close Overlay" onMouseDown={(e) => e.stopPropagation()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Waveform Strip */}
        <div className="flex-1 flex items-center justify-start gap-[2px] w-full relative mb-3 min-h-[32px]">
          {/* Center line */}
          <div className="absolute w-full h-[1px] bg-[#27272A] top-1/2 -translate-y-1/2 z-0" />
          
          {events.length === 0 ? (
            <div className="text-[10px] text-[#52525B] w-full text-center tracking-widest uppercase z-10">Waiting for flow data...</div>
          ) : (
            <div className="flex items-center gap-[2px] w-full h-full z-10 overflow-hidden justify-start">
              {events.map((ev, i) => {
                let bgColor = "bg-[#00E599]"; // green
                if (ev.type === "suspect") bgColor = "bg-[#FACC15]"; // yellow
                if (ev.type === "looping") bgColor = "bg-[#EF4444]"; // red
                
                // pseudo-random height based on volume
                const hPct = Math.max(20, Math.min(100, 20 + (ev.volumeUsd % 80)));
                
                return (
                  <div 
                    key={i} 
                    title={`${ev.type.toUpperCase()} | ${ev.wallet} | $${ev.volumeUsd.toFixed(2)}`}
                    className={`flex-1 shrink-0 ${bgColor} rounded-full transition-all duration-300 opacity-90 hover:opacity-100 hover:brightness-125 cursor-crosshair`}
                    style={{ height: `${hPct}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Legend & Toggles */}
        <div className="flex items-center justify-between shrink-0 flex-wrap gap-2 mt-auto">
          <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-[#A1A1AA] flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded bg-[#00E599]" /> organic
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-[#FACC15]" /> suspected
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-[#EF4444]" /> wash
            </div>
          </div>
        </div>

      </div>

      {/* Right Edge Resizer */}
      <div 
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-[#27272A]/50 z-10"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  )
}
