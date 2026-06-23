import { useState, useEffect } from "react";
import { fastLaunch } from "../lib/popup-api";
import type { FastLaunchDraft } from "../lib/messaging";
import { getLaunchSettings, saveLaunchSettings, getSelectedLaunchContext } from "../lib/storage";
import type { LaunchSettings } from "../lib/storage";

export function FastLaunch({ initialDraft }: { initialDraft?: Partial<FastLaunchDraft> } = {}) {
  const [draft, setDraft] = useState<FastLaunchDraft>({
    name: initialDraft?.name || "",
    symbol: initialDraft?.symbol || "",
    description: initialDraft?.description || "",
    image: initialDraft?.image || ""
  });
  
  const [settings, setSettings] = useState<LaunchSettings>({
    ipfsProvider: "pumpfun",
    pinataJwt: "",
    devBuySol: 0,
    slippage: 5,
    priorityFee: 0.0005
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successLink, setSuccessLink] = useState("");

  useEffect(() => {
    getLaunchSettings().then(setSettings);
    if (!initialDraft) {
      getSelectedLaunchContext().then(ctx => {
        if (ctx) {
          setDraft(d => ({ ...d, name: ctx.authorName + " Token", description: ctx.text, twitter: ctx.url }));
        }
      });
    }
  }, [initialDraft]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDraft(d => ({ ...d, image: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleLaunch = async () => {
    setLoading(true);
    setError("");
    setSuccessLink("");
    
    // Save settings
    await saveLaunchSettings(settings);

    if (!draft.name || !draft.symbol || !draft.description || !draft.image) {
      setError("Please fill all required fields and upload an image.");
      setLoading(false);
      return;
    }

    const res = await fastLaunch(draft);
    if (res.success && res.mint) {
      setSuccessLink(`https://pump.fun/${res.mint}`);
      // If token was created but dev buy failed, show as warning
      if (res.error) {
        setError(`⚠️ ${res.error}`);
      }
    } else {
      console.error("[FastLaunch Frontend] Launch failed:", res.error);
      setError(res.error || "Failed to launch");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 mt-4 text-axiom-text">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-axiom-muted">Name</label>
        <input className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-axiom-muted">Ticker</label>
        <input className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none" value={draft.symbol} onChange={e => setDraft(d => ({ ...d, symbol: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-axiom-muted">Description</label>
        <textarea className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none min-h-[60px]" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-axiom-muted">Image</label>
        <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
        {draft.image && <img src={draft.image} className="w-16 h-16 object-cover rounded mt-1" alt="Preview" />}
      </div>
      
      <details className="mt-2 text-sm border-t border-axiom-border pt-2">
        <summary className="cursor-pointer text-axiom-muted">Social Links (Optional)</summary>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-axiom-muted">Website</label>
            <input className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none" placeholder="https://" value={draft.website || ""} onChange={e => setDraft(d => ({ ...d, website: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-axiom-muted">Twitter/X</label>
            <input className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none" placeholder="https://x.com/..." value={draft.twitter || ""} onChange={e => setDraft(d => ({ ...d, twitter: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-axiom-muted">Telegram</label>
            <input className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-sm text-axiom-text focus:outline-none" placeholder="https://t.me/..." value={draft.telegram || ""} onChange={e => setDraft(d => ({ ...d, telegram: e.target.value }))} />
          </div>
        </div>
      </details>
      
      <details className="mt-2 text-sm border-t border-axiom-border pt-2">
        <summary className="cursor-pointer text-axiom-muted">Advanced Settings</summary>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-axiom-muted">IPFS Provider</label>
            <input disabled className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-xs text-axiom-text focus:outline-none opacity-50 cursor-not-allowed" value="Pump.fun (Default)" />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-axiom-muted">Dev Buy (SOL)</label>
              <input type="text" inputMode="decimal" className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-xs text-axiom-text focus:outline-none" value={settings.devBuySol} onChange={e => setSettings(s => ({ ...s, devBuySol: e.target.value.replace(/[^0-9.,]/g, '') }))} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-axiom-muted">Slippage (%)</label>
              <input type="text" inputMode="decimal" className="px-2 py-1 bg-axiom-bg border border-axiom-border rounded text-xs text-axiom-text focus:outline-none" value={settings.slippage} onChange={e => setSettings(s => ({ ...s, slippage: e.target.value.replace(/[^0-9.,]/g, '') }))} />
            </div>
          </div>
        </div>
      </details>

      {error && <div className="text-xs text-axiom-bad mt-2 p-2 rounded bg-axiom-bad/10 border border-axiom-bad/20">{error}</div>}
      
      {successLink ? (
        <div className="mt-3 flex flex-col gap-2 p-3 rounded bg-axiom-good/10 border border-axiom-good/20">
          <div className="text-sm font-medium text-axiom-good">Launched successfully!</div>
          <a href={successLink} target="_blank" rel="noreferrer" className="text-xs underline text-axiom-text">View on pump.fun</a>
        </div>
      ) : (
        <button
          onClick={handleLaunch}
          disabled={loading}
          className="mt-3 w-full py-2 rounded bg-[#00E599] text-black font-medium hover:opacity-90 transition-opacity"
        >
          {loading ? "Launching..." : "Launch on pump.fun"}
        </button>
      )}
    </div>
  );
}
