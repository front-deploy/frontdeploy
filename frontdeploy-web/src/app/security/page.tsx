import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import "./security.css";

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
    </>
  );
}
