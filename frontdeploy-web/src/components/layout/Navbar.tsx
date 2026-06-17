"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      style={{
        borderBottomColor: isScrolled ? "var(--gray-200)" : "transparent",
        transition: "border-bottom-color 0.2s ease",
      }}
    >
      <div className="nav-inner">
        <div className="nav-logo">Frontdeploy</div>
        <div className="nav-links">
          <Link href="#features">Features</Link>
          <Link href="#how">How it works</Link>
          <Link href="#install">Install</Link>
          <a href="https://x.com/sorapumpOs" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="/downloads/sora-pump-os-chrome-mv3-prod.zip"
            download
            className="nav-cta"
          >
            Download
          </a>
        </div>
      </div>
    </nav>
  );
}
