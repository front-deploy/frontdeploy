import { useState, useEffect } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { Storage } from "@plasmohq/storage";

export function KolLiveFeed() {
  const [events] = useStorage({ key: "kolEvents", instance: new Storage({ area: "local" }) }, []);
  
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between pb-2 border-b border-axiom-border/10">
        <h2 className="text-sm font-semibold text-axiom-text">KOL Live Feed</h2>
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
              <p className="text-xs text-axiom-text whitespace-pre-wrap mb-2 line-clamp-3">
                {evt.text}
              </p>
              
              {evt.isSignal && (
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
                    onClick={() => window.open(`https://pump.fun/create`, '_blank')}
                    className="ml-auto px-3 py-1 bg-axiom-text text-white text-xs font-semibold rounded hover:bg-axiom-text/90 transition-colors"
                  >
                    Deploy
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-axiom-muted text-xs">
            No events detected yet. Waiting for KOLs to post...
          </div>
        )}
      </div>
    </div>
  );
}
