"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function HowItWorks() {
  const { addElement } = useIntersectionObserver();

  return (
    <section className="section" id="how">
      <div className="section-label fade-in" ref={addElement}>
        003 — Workflow
      </div>
      <div className="steps">
        <div className="steps-left fade-in" ref={addElement}>
          <h2>
            From scroll
            <br />
            to <em>launch</em>
            <br />
            in minutes
          </h2>
          <p>
            Frontdeploy bridges the gap between trend discovery on X and manual
            token deployment on pump.fun. She handles the intelligence. You make
            the call.
          </p>
        </div>
        <div className="steps-right">
          <div className="step-item fade-in stagger-1" ref={addElement}>
            <div className="step-num">1</div>
            <div>
              <h4>Scroll X/Twitter</h4>
              <p>
                Browse normally. Frontdeploy&apos;s content script monitors replies from
                watched accounts and detects emerging narratives in real-time.
              </p>
            </div>
          </div>
          <div className="step-item fade-in stagger-2" ref={addElement}>
            <div className="step-num">2</div>
            <div>
              <h4>Review launch card</h4>
              <p>
                A floating assistant appears with a suggested token name, ticker,
                description, and source link extracted from the reply context.
              </p>
            </div>
          </div>
          <div className="step-item fade-in stagger-3" ref={addElement}>
            <div className="step-num">3</div>
            <div>
              <h4>Generate logo prompt</h4>
              <p>
                Copy the AI-optimized logo prompt and open ChatGPT in one click.
                Get a professional token image in seconds.
              </p>
            </div>
          </div>
          <div className="step-item fade-in stagger-4" ref={addElement}>
            <div className="step-num">4</div>
            <div>
              <h4>Deploy on pump.fun</h4>
              <p>
                Open pump.fun/create with your metadata ready to paste. Connect
                your wallet, upload the logo, and launch manually.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
