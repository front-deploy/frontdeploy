"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import Image from "next/image";
import { useTokenGate } from "@/hooks/useTokenGate";

import { GLOBE_ASCII } from "./Cta";
import { AsciiBackground } from "./AsciiBackground";

export function Hero() {
  const { addElement } = useIntersectionObserver();
  const { verifyAndDownload, isVerifying, error, downloadUrl } = useTokenGate();

  return (
    <section className="hero">
      <div className="cta-ascii-bg" style={{ zIndex: 0 }}>{GLOBE_ASCII}</div>
      <AsciiBackground />
      <div className="fade-in stagger-1" ref={addElement} style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Frontdeploy Token ($FDP)</p>
        <a 
          href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_FRONTDEPLOY_CA}`}
          target="_blank" 
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'var(--gray-100)', border: '1px solid var(--gray-200)', borderRadius: '8px', color: 'var(--foreground)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: 500, letterSpacing: '0.5px', wordBreak: 'break-all' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--gray-200)'; e.currentTarget.style.borderColor = 'var(--foreground)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--gray-100)'; e.currentTarget.style.borderColor = 'var(--gray-200)'; }}
        >
          CA: {process.env.NEXT_PUBLIC_FRONTDEPLOY_CA}
        </a>
      </div>
      <div className="hero-number fade-in stagger-2" ref={addElement}>
        001 — Launch Intelligence
      </div>
      <div className="hero-brand-row">
        <h1 className="fade-in stagger-1" ref={addElement}>
          She sees the
          <br />
          <em>meta</em> before
          <br />
          you do
        </h1>
        <div className="hero-logo fade-in stagger-2" ref={addElement}>
          <Image
            src="/logo.png"
            alt="Frontdeploy logo"
            width={1254}
            height={1254}
            priority
          />
        </div>
      </div>
      <p className="hero-sub fade-in stagger-2" ref={addElement}>
        AI-powered launch radar that scans X/Twitter in real-time, generates
        pump.fun drafts from trending narratives, and gives you onchain
        intelligence — all inside your browser.
      </p>
      <div className="hero-actions fade-in stagger-3" ref={addElement} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {!downloadUrl ? (
          <button
            onClick={verifyAndDownload}
            disabled={isVerifying}
            className="btn-primary"
            style={{ cursor: isVerifying ? 'wait' : 'pointer', border: 'none' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isVerifying ? "Verifying $FDP Balance..." : "Connect to Download"}
          </button>
        ) : (
          <a
            href={downloadUrl}
            download
            className="btn-primary"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Extension .zip
          </a>
        )}
        {error && <div style={{ color: 'red', fontSize: '12px', position: 'absolute', marginTop: '60px' }}>{error}</div>}
        {/* <a
          href="https://github.com/front-deploy/frontdeploy"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem', borderRadius: '4px', border: '1px solid var(--gray-200)', color: 'var(--foreground)', transition: 'background-color 0.2s ease', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a> */}
        <div style={{ width: '100%', marginTop: '24px', fontSize: '13px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
          — <strong>Token Gated:</strong> Requires minimum balance of 10M $FDP to download.<br/>
          — <strong>Phantom Quick-Launch:</strong> Includes 0.03 SOL flat fee per automatic token deployment.
        </div>
      </div>


      <div className="hero-meta fade-in stagger-5" ref={addElement}>
        Chrome Extension
        <br />
        Manifest V3
        <br />
        MIT Licensed
        <br />
        v1.0.0
      </div>
    </section>
  );
}
