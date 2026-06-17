"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import Image from "next/image";

export function Hero() {
  const { addElement } = useIntersectionObserver();

  return (
    <section className="hero">
      <div className="hero-number fade-in" ref={addElement}>
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
            src="/logo.jpeg"
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
        <a
          href="/downloads/sora-pump-os-chrome-mv3-prod.zip"
          download
          className="btn-primary"
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
          Download Extension
        </a>
        <a
          href="https://x.com/sorapumpOs"
          target="_blank"
          rel="noreferrer"
          aria-label="X (Twitter)"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem', borderRadius: '4px', border: '1px solid var(--gray-200)', color: 'var(--foreground)', transition: 'background-color 0.2s ease', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
      <div className="hero-meta fade-in stagger-4" ref={addElement}>
        Chrome Extension
        <br />
        Manifest V3
        <br />
        MIT Licensed
        <br />
        v0.1.0
      </div>
    </section>
  );
}
