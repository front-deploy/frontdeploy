"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const features = [
  {
    num: "01",
    title: "X Launch Radar",
    desc: "Scans X/Twitter replies in real-time while you scroll. Detects trending narratives from major accounts and surfaces launch opportunities before they go viral.",
  },
  {
    num: "02",
    title: "Pump.fun Draft Engine",
    desc: "Auto-generates launch metadata — token name, ticker, description, source link, and AI logo prompt. Copy everything to pump.fun/create in one click.",
  },
  {
    num: "03",
    title: "Wallet Intelligence",
    desc: "Detects Solana addresses on Axiom Trade and injects intelligence badges with risk scores, wallet labels, and token security signals in real-time.",
  },
  {
    num: "04",
    title: "Developer Audit",
    desc: "Reputation scoring with website CA proof, GitHub README proof, repo metadata analysis, market cap thresholds, and social narrative evidence checks.",
  },
  {
    num: "05",
    title: "AI Logo Handoff",
    desc: "Generates optimized prompts for token logo creation and opens ChatGPT directly for AI image generation. From narrative to visual in seconds.",
  },
  {
    num: "06",
    title: "Privacy-First",
    desc: "Read-only architecture. No wallet connections, no private keys, no SOL custody, no auto-trading. Your data stays in chrome.storage.local, nowhere else.",
  },
];

export function Features() {
  const { addElement } = useIntersectionObserver();

  return (
    <section className="section" id="features">
      <div className="section-label fade-in" ref={addElement}>
        002 — Capabilities
      </div>
      <div className="features-grid">
        {features.map((feature, i) => (
          <div
            key={feature.num}
            className={`feature-card fade-in stagger-${i + 1}`}
            ref={addElement}
          >
            <div className="feature-number">{feature.num}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
