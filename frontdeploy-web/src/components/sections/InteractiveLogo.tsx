"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";
import { GLOBE_ASCII } from "./Cta";

export function InteractiveLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      ref={containerRef}
      className="hero-logo"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'crosshair'
      }}
    >
      {/* The ASCII Background behind the logo */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 'clamp(4px, 0.75vw, 8px)',
          lineHeight: 0.9,
          color: 'rgba(255, 255, 255, 0.6)',
          whiteSpace: 'pre',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      >
        {GLOBE_ASCII}
      </div>

      {/* The Image with a mask */}
      <Image
        src="/logo.png"
        alt="Frontdeploy logo"
        width={1254}
        height={1254}
        priority
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '500px',
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.05))',
          WebkitMaskImage: isHovered 
            ? `radial-gradient(circle 120px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 40px, rgba(0,0,0,1) 120px)`
            : 'none',
          maskImage: isHovered 
            ? `radial-gradient(circle 120px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 40px, rgba(0,0,0,1) 120px)`
            : 'none',
        }}
      />
    </div>
  );
}
