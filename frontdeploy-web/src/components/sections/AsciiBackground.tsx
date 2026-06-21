"use client";

import { useEffect, useRef } from "react";

const FDP_ASCII = [
  " ########\\ #######\\  #######\\  ",
  " ##  _____|##  __##\\ ##  __##\\ ",
  " ## |      ## |  ## |## |  ## |",
  " #####\\    ## |  ## |#######  |",
  " ##  __|   ## |  ## |##  ____/ ",
  " ## |      ## |  ## |## |      ",
  " ## |      #######  |## |      ",
  " \\__|      \\_______/ \\__|      "
];

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_+{}[]|;:,.<>?~";

export function AsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    const fontSize = 16;
    let glitchGrid: string[][] = [];

    const mouse = { x: -1000, y: -1000, active: false };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.ceil(width / (fontSize * 0.6)); // approximate monospace aspect ratio
      rows = Math.ceil(height / fontSize);
      
      glitchGrid = Array(rows).fill(null).map(() => 
        Array(cols).fill("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
      );
    };

    window.addEventListener("resize", resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Glitch interval
    const glitchInterval = setInterval(() => {
      if (!glitchGrid.length) return;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.8) { // 20% of chars change each tick
            glitchGrid[r][c] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
      }
    }, 100);

    // Render loop
    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "top";

      const targetWidth = FDP_ASCII[0].length;
      const targetHeight = FDP_ASCII.length;
      const startCol = Math.floor((cols - targetWidth) / 2);
      const startRow = Math.floor((rows - targetHeight) / 2);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * (fontSize * 0.6);
          const y = r * fontSize;
          
          let charToDraw = glitchGrid[r]?.[c] || "";
          let isTarget = false;

          // Check if this cell is within the target FDP_ASCII area
          if (r >= startRow && r < startRow + targetHeight && c >= startCol && c < startCol + targetWidth) {
            const targetChar = FDP_ASCII[r - startRow][c - startCol];
            if (targetChar && targetChar !== " ") {
              // It's part of the target ASCII art
              // Check distance to mouse
              const dist = Math.sqrt(Math.pow(x - mouse.x, 2) + Math.pow(y - mouse.y, 2));
              if (mouse.active && dist < 150) {
                charToDraw = targetChar;
                isTarget = true;
              }
            }
          }

          if (isTarget) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillText(charToDraw, x, y);
          } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
            ctx.fillText(charToDraw, x, y);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(glitchInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="matrix-bg"
      style={{
        display: "block",
        pointerEvents: "none",
        zIndex: 0
      }}
    />
  );
}
