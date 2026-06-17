"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function Install() {
  const { addElement } = useIntersectionObserver();

  return (
    <section className="section" id="install">
      <div className="section-label fade-in" ref={addElement}>
        004 — Installation
      </div>
      <div className="install-grid">
        <div className="install-box fade-in" ref={addElement}>
          <h3>Manual install</h3>
          <p className="sub">Chrome Developer Mode — takes 60 seconds</p>
          <ol className="install-steps">
            <li>
              <span>1</span> Download the extension .zip file from the button
              above
            </li>
            <li>
              <span>2</span> Unzip the file to a folder on your computer
            </li>
            <li>
              <span>3</span> Open Chrome → chrome://extensions
            </li>
            <li>
              <span>4</span> Enable &quot;Developer mode&quot; toggle (top-right)
            </li>
            <li>
              <span>5</span> Click &quot;Load unpacked&quot; and select the
              unzipped folder
            </li>
            <li>
              <span>6</span> Navigate to x.com or axiom.trade — Frontdeploy is now
              active
            </li>
          </ol>
        </div>
        <div className="install-info fade-in stagger-2" ref={addElement}>
          <h3>What you get</h3>
          <p>
            A Chrome Manifest V3 extension with content scripts active on
            X/Twitter and Axiom Trade. Floating launch radar on X, wallet
            intelligence badges on Axiom, side panel for deep analysis, and a
            clean popup for settings.
          </p>
          <p>
            Works standalone with local mock intelligence. Optionally connect to
            the backend API for live Jupiter, Helius, and Birdeye data
            enrichment.
          </p>
          <div className="tag-row">
            <span className="tag">Plasmo</span>
            <span className="tag">React</span>
            <span className="tag">TypeScript</span>
            <span className="tag">Tailwind CSS</span>
            <span className="tag">Manifest V3</span>
            <span className="tag">Jupiter API</span>
            <span className="tag">Helius</span>
            <span className="tag">Birdeye</span>
          </div>
        </div>
      </div>
    </section>
  );
}
