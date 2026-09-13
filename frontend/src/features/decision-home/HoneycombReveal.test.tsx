// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HoneycombReveal } from './HoneycombReveal';
import { createHoneycomb, markHoneycombRevealAsPlayed, REVEAL_TOTAL_MS, shouldPlayHoneycombReveal } from './honeycomb-reveal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('honeycomb entry reveal', () => {
  it.each([[1366, 470], [374, 320], [740, 380]])('covers the full %i × %i stage including seams', (width, height) => {
    const { cells, radius } = createHoneycomb(width, height);
    for (let x = 0; x <= width; x += 7) {
      for (let y = 0; y <= height; y += 7) {
        expect(cells.some((cell) => {
          const dx = Math.abs(x - cell.x);
          const dy = Math.abs(y - cell.y);
          return dy <= Math.sqrt(3) * radius / 2 + .001 && Math.sqrt(3) * dx + dy <= Math.sqrt(3) * radius + .001;
        })).toBe(true);
      }
    }
    const ordered = [...cells].sort((a, b) => a.distance - b.distance);
    expect(ordered[0].distance).toBe(0);
    expect(ordered.every((cell, i) => i === 0 || cell.delay >= ordered[i - 1].delay)).toBe(true);
  });

  function mount(reduced = false) {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1366, height: 470 } as DOMRect);
    const container = document.createElement('div');
    root = createRoot(container);
    const complete = vi.fn();
    function Harness() {
      const [visible, setVisible] = useState(true);
      return visible ? <HoneycombReveal onComplete={() => { complete(); setVisible(false); }} /> : <button>CORE</button>;
    }
    act(() => root?.render(<Harness />));
    return { container, complete };
  }

  it('removes the entire overlay once the wave finishes', () => {
    const { container, complete } = mount();
    expect(container.querySelectorAll('.magi-honeycomb__cell').length).toBeGreaterThan(10);
    act(() => vi.advanceTimersByTime(REVEAL_TOTAL_MS + 60));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.magi-honeycomb')).toBeNull();
  });

  it('skips the overlay for reduced motion', () => {
    const { container, complete } = mount(true);
    expect(container.querySelector('.magi-honeycomb')).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('cleans up completion timers when leaving the page early', () => {
    const { complete } = mount();
    act(() => root?.unmount());
    root = undefined;
    act(() => vi.runAllTimers());
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('honeycomb reveal session gate', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('plays only until the first completion marks the session', () => {
    window.sessionStorage.clear();
    expect(shouldPlayHoneycombReveal()).toBe(true);
    markHoneycombRevealAsPlayed();
    expect(shouldPlayHoneycombReveal()).toBe(false);
    window.sessionStorage.clear();
    expect(shouldPlayHoneycombReveal()).toBe(true);
  });
});
