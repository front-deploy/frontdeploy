import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — Frontdeploy",
  description:
    "How Frontdeploy protects users: non-custodial design, read-only intelligence, and transparent data practices.",
};

export default function SecurityPage() {
  return (
    <>
      <Navbar />
      <main className="security-page">
        {/* Hero */}
        <section className="security-hero">
          <div className="security-container">
            <p className="security-eyebrow">Trust & Safety</p>
            <h1 className="security-title">Security Overview</h1>
            <p className="security-subtitle">
              Frontdeploy is a{" "}
              <strong>non-custodial Chrome extension</strong>. We never hold your
              private keys, never move your funds, and never sign transactions
              without your explicit approval.
            </p>

          </div>
        </section>

        {/* Pillars */}
        <section className="security-container security-section">
          <div className="security-grid">
            <div className="security-card security-card--highlight">
              <div className="security-card-icon">🔐</div>
              <h2 className="security-card-title">Non-Custodial</h2>
              <p className="security-card-body">
                Your private key <strong>never leaves your wallet</strong>.
                Frontdeploy builds unsigned transactions and sends them to
                Phantom, Solflare, or Backpack — you approve each one manually
                in the wallet popup.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">👁️</div>
              <h2 className="security-card-title">Read-Only Intelligence</h2>
              <p className="security-card-body">
                All intel features (rug scan, flow radar, KOL alerts, CA check)
                only <strong>read public on-chain data</strong> via Solana RPC
                and the X/Twitter public API. No write access to your funds.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">✅</div>
              <h2 className="security-card-title">User Approval Required</h2>
              <p className="security-card-body">
                Every on-chain action — token creation, dev buy — requires your
                explicit approval in a wallet popup. There is no auto-sign, no
                silent signing, no background transactions.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">🗂️</div>
              <h2 className="security-card-title">Local Activity Log</h2>
              <p className="security-card-body">
                The &ldquo;Activity&rdquo; tab in the extension logs every action
                you take — locally in <code>chrome.storage.local</code>. This
                data is <strong>never sent to our servers</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Diagram */}
        <section className="security-container security-section">
          <h2 className="security-section-title">Signing Flow</h2>
          <p className="security-section-sub">
            How a token launch works — your private key never leaves your wallet.
          </p>
          <div className="security-diagram">
            <div className="security-diagram-row">
              <div className="security-diagram-box security-diagram-box--primary">
                <span>You</span>
                <small>click Fast Launch</small>
              </div>
              <div className="security-diagram-arrow">→</div>
              <div className="security-diagram-box">
                <span>Frontdeploy</span>
                <small>builds UNSIGNED tx</small>
              </div>
              <div className="security-diagram-arrow">→</div>
              <div className="security-diagram-box security-diagram-box--wallet">
                <span>Your Wallet</span>
                <small>shows approval popup</small>
              </div>
            </div>
            <div className="security-diagram-row security-diagram-row--second">
              <div className="security-diagram-box security-diagram-box--chain">
                <span>Solana Network</span>
                <small>receives signed tx</small>
              </div>
              <div className="security-diagram-arrow security-diagram-arrow--left">←</div>
              <div className="security-diagram-box security-diagram-box--wallet">
                <span>Your Wallet</span>
                <small>signs with private key</small>
              </div>
              <div className="security-diagram-note">
                🔒 Private key never leaves wallet
              </div>
            </div>
            <div className="security-diagram-readonly">
              <div className="security-diagram-box security-diagram-box--info">
                <span>Intelligence Modules</span>
                <small>Rug scan · KOL feed · CA check · Flow Radar</small>
              </div>
              <div className="security-diagram-arrow">→</div>
              <div className="security-diagram-box">
                <span>Public Data Only</span>
                <small>Solana RPC · X API — read-only, no signing</small>
              </div>
            </div>
          </div>
        </section>

        {/* What we send */}
        <section className="security-container security-section">
          <h2 className="security-section-title">Data We Send</h2>
          <p className="security-section-sub">
            Transparent list of every data point that leaves your device.
          </p>
          <div className="security-table-wrapper">
            <table className="security-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Destination</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Wallet address (public key)</td>
                  <td>Our backend</td>
                  <td>Verify $FDP holder tier</td>
                </tr>
                <tr>
                  <td>Token metadata (name, symbol, description, image)</td>
                  <td>Pinata or Pump.fun IPFS</td>
                  <td>Upload token metadata for launch</td>
                </tr>
                <tr>
                  <td>Public key + token parameters</td>
                  <td>PumpPortal API</td>
                  <td>Build unsigned create/buy transaction</td>
                </tr>
                <tr>
                  <td>User-configured Pinata JWT</td>
                  <td>Pinata API</td>
                  <td>Authenticate your personal IPFS uploads (your own key)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="security-notshared">
            <h3 className="security-notshared-title">What We Never Send</h3>
            <ul className="security-notshared-list">
              <li>❌ Private key or seed phrase</li>
              <li>❌ Wallet balance or token holdings</li>
              <li>❌ Activity log (stored locally only)</li>
              <li>❌ Any data without your action triggering it</li>
            </ul>
          </div>
        </section>

        {/* Chrome Permissions */}
        <section className="security-container security-section">
          <h2 className="security-section-title">Chrome Permissions</h2>
          <p className="security-section-sub">
            Every permission we request and why.
          </p>
          <div className="security-permissions">
            {[
              {
                name: "storage",
                why: "Save your settings, wallet session, and activity log locally.",
              },
              {
                name: "sidePanel",
                why: "Show the Frontdeploy side panel when you click the extension icon.",
              },
              {
                name: "scripting",
                why: "Inject the wallet relay content script into pump.fun to forward signing requests to your wallet.",
              },
              {
                name: "tabs",
                why: "Open pump.fun/create and communicate with the relay tab during a launch.",
              },
              {
                name: "notifications",
                why: "Alert you when a KOL event is detected (optional).",
              },
              {
                name: "alarms",
                why: "Schedule periodic background checks (e.g. for new KOL events).",
              },
            ].map((p) => (
              <div key={p.name} className="security-permission-row">
                <code className="security-permission-name">{p.name}</code>
                <p className="security-permission-why">{p.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cannot do */}
        <section className="security-container security-section">
          <h2 className="security-section-title">What Frontdeploy CANNOT Do</h2>
          <div className="security-cannotdo">
            <div className="security-cannotdo-item">
              <span className="security-cannotdo-no">✗</span>
              <div>
                <strong>Move your funds</strong>
                <p>We cannot initiate any transfer without your approval in your wallet.</p>
              </div>
            </div>
            <div className="security-cannotdo-item">
              <span className="security-cannotdo-no">✗</span>
              <div>
                <strong>Access your private key or seed phrase</strong>
                <p>We never request these. Signing happens inside your wallet software.</p>
              </div>
            </div>
            <div className="security-cannotdo-item">
              <span className="security-cannotdo-no">✗</span>
              <div>
                <strong>Sign transactions silently</strong>
                <p>Every transaction shows a confirmation prompt in your wallet.</p>
              </div>
            </div>
            <div className="security-cannotdo-item">
              <span className="security-cannotdo-no">✗</span>
              <div>
                <strong>Operate without your wallet connected</strong>
                <p>All launch features require you to connect your wallet first.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Audit */}
        <section className="security-container security-section">
          <h2 className="security-section-title">Dependency Audits</h2>
          <p className="security-section-sub">
            We run <code>npm audit</code> across all packages regularly.
          </p>
          <div className="security-audit-grid">
            <div className="security-audit-card">
              <p className="security-audit-label">Extension</p>
              <p className="security-audit-status security-audit-status--warn">
                75 advisories (67 high, 0 critical)
              </p>
              <p className="security-audit-note">
                Majority are dev-only build tooling vulnerabilities (Plasmo / webpack internals). No runtime high-severity issues affecting user data.
              </p>
            </div>
            <div className="security-audit-card">
              <p className="security-audit-label">Backend (Core)</p>
              <p className="security-audit-status security-audit-status--warn">
                8 advisories (3 high, 0 critical)
              </p>
              <p className="security-audit-note">
                Under active review. No critical vulnerabilities found.
              </p>
            </div>
            <div className="security-audit-card">
              <p className="security-audit-label">Website (Web)</p>
              <p className="security-audit-status security-audit-status--ok">
                7 advisories (0 high, 0 critical)
              </p>
              <p className="security-audit-note">
                All moderate or low. No action required at this time.
              </p>
            </div>
          </div>
          <p className="security-audit-footer">
            Dependency updates automated via{" "}
            <a
              href="https://docs.github.com/en/code-security/dependabot"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Dependabot
            </a>
            .
          </p>
        </section>

        {/* Contact */}
        <section className="security-container security-section security-contact">
          <h2 className="security-section-title">Report a Vulnerability</h2>
          <p className="security-section-sub">
            Found a security issue? Please report it responsibly via X DM to{" "}
            <a
              href="https://x.com/frontdeployx"
              target="_blank"
              rel="noreferrer"
            >
              @frontdeployx
            </a>{" "}
            before public disclosure. We will respond promptly.
          </p>
        </section>
      </main>
      <Footer />

      <style jsx>{`
        .security-page {
          padding-top: 80px;
          color: var(--text);
        }

        .security-hero {
          padding: 80px 0 60px;
          background: radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
          border-bottom: 1px solid var(--gray-200);
          text-align: center;
        }

        .security-container {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .security-section {
          padding: 64px 0;
          border-bottom: 1px solid var(--gray-200);
        }

        .security-eyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
        }

        .security-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 20px;
        }

        .security-subtitle {
          font-size: 1.1rem;
          color: var(--muted);
          max-width: 560px;
          margin: 0 auto 28px;
          line-height: 1.7;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .security-badge:hover {
          border-color: var(--accent);
          background: rgba(99, 102, 241, 0.06);
        }

        /* Grid */
        .security-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .security-card {
          padding: 24px;
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          background: var(--surface);
        }

        .security-card--highlight {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(99, 102, 241, 0.04);
        }

        .security-card-icon {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .security-card-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .security-card-body {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.6;
          margin: 0;
        }

        /* Section headers */
        .security-section-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .security-section-sub {
          color: var(--muted);
          font-size: 15px;
          margin: 0 0 32px;
          line-height: 1.6;
        }

        /* Diagram */
        .security-diagram {
          background: var(--surface);
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .security-diagram-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .security-diagram-row--second {
          padding-left: 0;
        }

        .security-diagram-readonly {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px dashed var(--gray-200);
          flex-wrap: wrap;
        }

        .security-diagram-box {
          padding: 10px 16px;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          background: var(--background);
          text-align: center;
        }

        .security-diagram-box span {
          display: block;
          font-size: 13px;
          font-weight: 700;
        }

        .security-diagram-box small {
          display: block;
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }

        .security-diagram-box--primary {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.06);
        }

        .security-diagram-box--wallet {
          border-color: rgba(34, 197, 94, 0.4);
          background: rgba(34, 197, 94, 0.04);
        }

        .security-diagram-box--chain {
          border-color: rgba(234, 179, 8, 0.4);
          background: rgba(234, 179, 8, 0.04);
        }

        .security-diagram-box--info {
          border-color: rgba(99, 102, 241, 0.3);
        }

        .security-diagram-arrow {
          font-size: 20px;
          color: var(--muted);
          font-weight: 300;
        }

        .security-diagram-arrow--left {
          transform: scaleX(-1);
        }

        .security-diagram-note {
          font-size: 11px;
          color: rgba(34, 197, 94, 0.9);
          font-weight: 600;
          padding: 4px 10px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          background: rgba(34, 197, 94, 0.04);
        }

        /* Table */
        .security-table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--gray-200);
          margin-bottom: 24px;
        }

        .security-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .security-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          background: var(--surface);
          border-bottom: 1px solid var(--gray-200);
        }

        .security-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--gray-200);
          vertical-align: top;
          line-height: 1.5;
        }

        .security-table tr:last-child td {
          border-bottom: none;
        }

        .security-notshared {
          background: rgba(239, 68, 68, 0.04);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 20px 24px;
        }

        .security-notshared-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px;
          color: rgba(239, 68, 68, 0.9);
        }

        .security-notshared-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .security-notshared-list li {
          font-size: 14px;
          color: var(--text);
        }

        /* Permissions */
        .security-permissions {
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          overflow: hidden;
        }

        .security-permission-row {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 16px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--gray-200);
          align-items: start;
        }

        .security-permission-row:last-child {
          border-bottom: none;
        }

        .security-permission-name {
          font-family: monospace;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          background: rgba(99, 102, 241, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .security-permission-why {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
          line-height: 1.5;
        }

        /* Cannot do */
        .security-cannotdo {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .security-cannotdo-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px 20px;
          border: 1px solid var(--gray-200);
          border-radius: 10px;
          background: var(--surface);
        }

        .security-cannotdo-no {
          font-size: 18px;
          color: rgba(239, 68, 68, 0.8);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .security-cannotdo-item strong {
          display: block;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .security-cannotdo-item p {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
        }

        /* Audit */
        .security-audit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .security-audit-card {
          padding: 20px;
          border: 1px solid var(--gray-200);
          border-radius: 10px;
          background: var(--surface);
        }

        .security-audit-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          margin: 0 0 6px;
        }

        .security-audit-status {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .security-audit-status--ok {
          color: rgba(34, 197, 94, 0.9);
        }

        .security-audit-status--warn {
          color: rgba(234, 179, 8, 0.9);
        }

        .security-audit-note {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
          line-height: 1.5;
        }

        .security-audit-footer {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
        }

        .security-audit-footer a {
          color: var(--accent);
          text-decoration: underline;
        }

        /* Contact */
        .security-contact {
          border-bottom: none;
          text-align: center;
          padding-bottom: 80px;
        }

        .security-contact a {
          color: var(--accent);
          text-decoration: underline;
        }

        code {
          font-family: monospace;
          font-size: 13px;
          background: var(--surface);
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid var(--gray-200);
        }
      `}</style>
    </>
  );
}
