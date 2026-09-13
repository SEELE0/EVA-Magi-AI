/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createHoneycomb, REVEAL_CELL_MS, REVEAL_TOTAL_MS } from './honeycomb-reveal';
import './honeycomb-reveal.css';

const HEX = '100,0 50,86.6025 -50,86.6025 -100,0 -50,-86.6025 50,-86.6025';

export function HoneycombReveal({ onComplete }: { onComplete: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion?.matches) {
      onComplete();
      return;
    }
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      onComplete();
      return;
    }
    setSize({ width: bounds.width, height: bounds.height });
    const timer = window.setTimeout(onComplete, REVEAL_TOTAL_MS + 50);
    const handleMotion = () => { if (motion?.matches) onComplete(); };
    motion?.addEventListener('change', handleMotion);
    // Finish on a viewport/layout change rather than restarting or stretching the wave.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - bounds.width) > 1 || Math.abs(entry.contentRect.height - bounds.height) > 1) onComplete();
    });
    observer?.observe(element);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      motion?.removeEventListener('change', handleMotion);
    };
  }, [onComplete]);

  const grid = size ? createHoneycomb(size.width, size.height) : null;
  return (
    <div ref={container} className="magi-honeycomb" data-ready={Boolean(size)} aria-hidden="true">
      {grid ? grid.cells.map((cell) => (
            <div key={cell.id} className="magi-honeycomb__cell" style={{
              left: cell.x - grid.radius,
              top: cell.y - grid.radius * Math.sqrt(3) / 2,
              width: grid.radius * 2,
              height: grid.radius * Math.sqrt(3),
              '--cell-delay': `${cell.delay}ms`,
              '--cell-duration': `${REVEAL_CELL_MS}ms`
            } as CSSProperties}>
              <svg viewBox="-100 -86.6025 200 173.205" preserveAspectRatio="xMidYMid meet" focusable="false">
                {/* Opaque contiguous backing also covers the black seams. */}
                <polygon points={HEX} fill="#050504" stroke="#050504" strokeWidth="1.5" />
                <polygon points={HEX} transform="scale(.95)" fill="#df242f" />
                <polygon points={HEX} transform="scale(.87)" fill="none" stroke="#050504" strokeWidth="1.5" />
                <path d="M0,-71 L-11,-53 L11,-53 Z M0,71 L-11,53 L11,53 Z" fill="#050504" />
                <text textAnchor="middle" dominantBaseline="central" textLength="133" lengthAdjust="spacingAndGlyphs">EMERGENCY</text>
              </svg>
            </div>
          )) : null}
    </div>
  );
}
