"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function Cta() {
  const { addElement } = useIntersectionObserver();

  return (
    <section className="cta-section">
      <h2 className="fade-in" ref={addElement}>
        Ready to see
        <br />
        <em>everything?</em>
      </h2>
      <p className="fade-in stagger-1" ref={addElement}>
        Download Frontdeploy and start scanning the meta before the rest of CT
        catches on.
      </p>
      <div className="fade-in stagger-2" ref={addElement}>
        <a
          href="/downloads/frontdeploy-mv3-prod.zip"
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
      </div>
    </section>
  );
}
