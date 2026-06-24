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
              <div className="security-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 className="security-card-title">Non-Custodial</h2>
              <p className="security-card-body">
                Your private key <strong>never leaves your wallet</strong>.
                Frontdeploy builds unsigned transactions and sends them to
                Phantom, Solflare, or Backpack — you approve each one manually
                in the wallet popup.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <h2 className="security-card-title">Read-Only Intelligence</h2>
              <p className="security-card-body">
                All intel features (rug scan, flow radar, KOL alerts, CA check)
                only <strong>read public on-chain data</strong> via Solana RPC
                and the X/Twitter public API. No write access to your funds.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <h2 className="security-card-title">User Approval Required</h2>
              <p className="security-card-body">
                Every on-chain action — token creation, dev buy — requires your
                explicit approval in a wallet popup. There is no auto-sign, no
                silent signing, no background transactions.
              </p>
            </div>

            <div className="security-card">
              <div className="security-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
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
          <div className="security-flow">
            <div className="security-flow-step">
              <div className="security-flow-number">1</div>
              <div className="security-flow-content">
                <strong>You Initiate Action</strong>
                <p>You click &ldquo;Fast Launch&rdquo; or &ldquo;Dev Buy&rdquo; in the extension.</p>
              </div>
            </div>
            
            <div className="security-flow-arrow">↓</div>
            
            <div className="security-flow-step">
              <div className="security-flow-number">2</div>
              <div className="security-flow-content">
                <strong>Frontdeploy Builds Transaction</strong>
                <p>We prepare the transaction data (UNSIGNED) via PumpPortal API.</p>
              </div>
            </div>
            
            <div className="security-flow-arrow">↓</div>
            
            <div className="security-flow-step security-flow-step--wallet">
              <div className="security-flow-number">3</div>
              <div className="security-flow-content">
                <strong>Your Wallet Prompts Approval</strong>
                <p>Phantom, Solflare, or Backpack opens and asks you to review and sign.</p>
                <div className="security-flow-highlight">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 
                  Private key never leaves your wallet
                </div>
              </div>
            </div>
            
            <div className="security-flow-arrow">↓</div>
            
            <div className="security-flow-step security-flow-step--chain">
              <div className="security-flow-number">4</div>
              <div className="security-flow-content">
                <strong>Solana Network</strong>
                <p>The signed transaction is broadcasted securely to the blockchain.</p>
              </div>
            </div>

            <div className="security-flow-readonly">
              <div className="security-flow-readonly-title">Read-Only Intelligence Flow</div>
              <div className="security-flow-step security-flow-step--info">
                <div className="security-flow-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div className="security-flow-content">
                  <strong>Public Data Access Only</strong>
                  <p>Modules like Rug Scan, KOL Alerts, and Flow Radar only read from Solana RPC and X API. They never request signatures or write access.</p>
                </div>
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
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#ef4444' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Private key or seed phrase</li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#ef4444' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Wallet balance or token holdings</li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#ef4444' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Activity log (stored locally only)</li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: '#ef4444' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Any data without your action triggering it</li>
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
              <span className="security-cannotdo-no">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
              <div>
                <strong>Sign transactions silently</strong>
                <p>Every transaction shows a confirmation prompt in your wallet.</p>
              </div>
            </div>
            <div className="security-cannotdo-item">
              <span className="security-cannotdo-no">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </span>
              <div>
                <strong>Operate without your wallet connected</strong>
                <p>All launch features require you to connect your wallet first.</p>
              </div>
            </div>
          </div>
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
