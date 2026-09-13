/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
export const REVEAL_HOLD_MS = 100;
export const REVEAL_WAVE_MS = 750;
export const REVEAL_CELL_MS = 500;
export const REVEAL_TOTAL_MS = REVEAL_HOLD_MS + REVEAL_WAVE_MS + REVEAL_CELL_MS;

const HONEYCOMB_REVEAL_SESSION_KEY = 'magi.honeycomb-reveal-played';

/** The emergency reveal marks the entry into the console; replay it only once per session. */
export function shouldPlayHoneycombReveal() {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(HONEYCOMB_REVEAL_SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markHoneycombRevealAsPlayed() {
  try {
    window.sessionStorage.setItem(HONEYCOMB_REVEAL_SESSION_KEY, '1');
  } catch {
    // Storage can be unavailable in restricted browser contexts; the reveal still works normally.
  }
}

/** Flat-top axial hexagons, including overscan cells to cover every edge. */
export function createHoneycomb(width: number, height: number) {
  const radius = Math.max(58, Math.min(100, width / 10));
  const rowHeight = Math.sqrt(3) * radius;
  const columns = Math.ceil(width / (3 * radius)) + 1;
  const rows = Math.ceil(height / rowHeight) + columns + 1;
  const cells = [];
  for (let q = -columns; q <= columns; q += 1) {
    for (let r = -rows; r <= rows; r += 1) {
      const x = width / 2 + q * radius * 1.5;
      const y = height * 0.55 + (r + q / 2) * rowHeight;
      if (x + radius < 0 || x - radius > width || y + rowHeight / 2 < 0 || y - rowHeight / 2 > height) continue;
      cells.push({ id: `${q}:${r}`, x, y, distance: Math.hypot(x - width / 2, y - height * 0.55) });
    }
  }
  const maxDistance = Math.max(1, ...cells.map((cell) => cell.distance));
  return {
    radius,
    cells: cells.map((cell) => ({ ...cell, delay: REVEAL_HOLD_MS + cell.distance / maxDistance * REVEAL_WAVE_MS }))
  };
}
