"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTokenGate } from "@/hooks/useTokenGate"; // kept for unused variable warnings if any, or remove

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
        <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/logo.png" alt="logo" width={24} height={24} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          Frontdeploy
        </div>
        <div className="nav-links">
          <Link href="/#features">Features</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#install">Install</Link>
          <Link href="/burn-history">Burn History</Link>
          <Link href="/launch-history">Launch History</Link>
          <Link href="/security">Security</Link>
          <a href="https://x.com/frontdeployx" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a
            href="/downloads/frontdeploy-extension.zip"
            download
            className="nav-cta"
          >
            Download .zip
          </a>
        </div>
      </div>
    </nav>
  );
}
