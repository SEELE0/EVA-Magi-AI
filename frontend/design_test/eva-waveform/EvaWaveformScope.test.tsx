/* @vitest-environment jsdom */
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EvaWaveformScope, shouldAnimateWaveform } from './EvaWaveformScope';

class ResizeObserverStub {
  disconnect() {}
  observe() {}
}

class IntersectionObserverStub {
  disconnect() {}
  observe() {}
}

describe('EvaWaveformScope', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    });
    Object.assign(window, {
      ResizeObserver: ResizeObserverStub,
      IntersectionObserver: IntersectionObserverStub
    });
    Object.assign(globalThis, {
      ResizeObserver: ResizeObserverStub,
      IntersectionObserver: IntersectionObserverStub
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the instrument semantics and calibrated overlay', () => {
    const markup = renderToStaticMarkup(<EvaWaveformScope paused />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('EVA NERV 红蓝相位信号示波器');
    expect(markup).toContain('data-paused="true"');
    expect(markup).toContain('>+5<');
    expect(markup).toContain('10:38:50909');
    expect(markup).not.toContain('MAGI BIO-FIELD / PHASE ANALYSIS');
    expect(markup).not.toContain('CH-A');
  });

  it('shows a readable offline state when WebGL cannot initialize', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await act(async () => {
      root.render(<EvaWaveformScope />);
    });

    expect(container.querySelector('[data-renderer="offline"]')).not.toBeNull();
    expect(container.textContent).toContain('SIGNAL RENDERER OFFLINE');
    expect(container.textContent).toContain('WEBGL CONTEXT NOT AVAILABLE');
  });

  it('keeps reduced-motion and explicitly paused scopes on a stable frame', () => {
    const baseState = {
      disposed: false,
      intersecting: true,
      paused: false,
      reducedMotion: false,
      visible: true
    };

    expect(shouldAnimateWaveform(baseState)).toBe(true);
    expect(shouldAnimateWaveform({ ...baseState, paused: true })).toBe(false);
    expect(shouldAnimateWaveform({ ...baseState, reducedMotion: true })).toBe(false);
    expect(shouldAnimateWaveform({ ...baseState, visible: false })).toBe(false);
    expect(shouldAnimateWaveform({ ...baseState, intersecting: false })).toBe(false);
  });
});
