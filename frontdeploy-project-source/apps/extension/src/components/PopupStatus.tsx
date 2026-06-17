import { useEffect, useState } from "react"

import {
  getApiSettings,
  getSettings,
  saveApiSettings,
  saveSettings,
  type ApiSettings,
  type OverlaySettings
} from "../lib/storage"
import { LaunchPanel } from "./LaunchPanel"

export function PopupStatus() {
  const [tab, setTab] = useState<"settings" | "launch">("launch")
  const [settings, setSettings] = useState<OverlaySettings>({
    overlayEnabled: true,
    showRiskBadges: true
  })
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    liveDataEnabled: true,
    backendUrl: "http://127.0.0.1:8787"
  })
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    void getSettings().then(setSettings)
    void getApiSettings().then(setApiSettings)
  }, [])

  async function updateSetting(nextSettings: OverlaySettings) {
    setSettings(nextSettings)
    await saveSettings(nextSettings)
  }

  async function updateApiSettings(nextSettings: ApiSettings) {
    setApiSettings(nextSettings)
    await saveApiSettings(nextSettings)
    setSavedMessage("Backend settings saved locally")
    window.setTimeout(() => setSavedMessage(""), 1800)
  }

  return (
    <main className="w-80 bg-axiom-bg p-4 text-axiom-text">
      <header className="border-b border-axiom-border pb-4">
        <p className="text-xs font-bold uppercase text-axiom-muted">Overlay / 0.1.0</p>
        <h1 className="mt-2 text-2xl font-bold leading-none">Frontdeploy</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-axiom-muted">
          <span className="h-2 w-2 rounded-full bg-axiom-good" />
          <span>Active on X and Axiom</span>
        </div>
      </header>

      <div className="flex border-b border-axiom-border">
        <button
          className={`flex-1 py-2 text-sm font-bold uppercase transition-colors ${tab === "launch" ? "text-axiom-accent border-b-2 border-axiom-accent" : "text-axiom-muted hover:text-axiom-text"}`}
          onClick={() => setTab("launch")}
        >
          Launch
        </button>
        <button
          className={`flex-1 py-2 text-sm font-bold uppercase transition-colors ${tab === "settings" ? "text-axiom-accent border-b-2 border-axiom-accent" : "text-axiom-muted hover:text-axiom-text"}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {tab === "launch" && (
        <div className="-mx-4">
          <LaunchPanel />
        </div>
      )}

      {tab === "settings" && (
        <>
          <section className="mt-4 space-y-3">
        <ToggleRow
          label="Enable overlay"
          enabled={settings.overlayEnabled}
          onChange={(overlayEnabled) =>
            void updateSetting({ ...settings, overlayEnabled })
          }
        />
        <ToggleRow
          label="Show risk badges"
          enabled={settings.showRiskBadges}
          onChange={(showRiskBadges) =>
            void updateSetting({ ...settings, showRiskBadges })
          }
        />
        <ToggleRow
          label="Use backend intelligence"
          enabled={apiSettings.liveDataEnabled}
          onChange={(liveDataEnabled) =>
            void updateApiSettings({ ...apiSettings, liveDataEnabled })
          }
        />
      </section>

      <section className="mt-4 space-y-3 border-t border-axiom-border pt-4">
        <p className="text-xs font-bold uppercase text-axiom-muted">Backend</p>
        <BackendUrlInput
          value={apiSettings.backendUrl}
          onChange={(backendUrl) =>
            void updateApiSettings({ ...apiSettings, backendUrl })
          }
        />
        <p className="text-xs leading-5 text-axiom-muted">
          Provider keys stay on the backend. The extension stores only this read-only API URL.
        </p>
        {savedMessage ? <p className="text-xs font-bold text-axiom-good">{savedMessage}</p> : null}
      </section>
        </>
      )}

      <footer className="mt-4 border-t border-axiom-border pt-3 text-xs font-semibold text-axiom-muted">
        Version 0.1.0
      </footer>
    </main>
  )
}

function BackendUrlInput({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-axiom-muted">API URL</span>
      <input
        type="url"
        className="mt-1 w-full rounded-sm border border-axiom-border bg-white px-3 py-2 text-xs text-axiom-text outline-none focus:border-axiom-accent"
        value={value}
        placeholder="http://127.0.0.1:8787"
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </label>
  )
}

function ToggleRow({
  label,
  enabled,
  onChange
}: {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-sm border border-axiom-border bg-white p-3">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-axiom-accent"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
