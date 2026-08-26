// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOT_INTRO_SESSION_KEY, BOOT_SCHEDULE_MS, BootIntro } from './BootIntro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface IntroHandle {
  container: HTMLElement;
  root: Root;
}

function renderIntro(onFinished?: () => void): IntroHandle {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<BootIntro onFinished={onFinished} />));
  return { container, root };
}

function currentPhase({ container }: IntroHandle): string | null {
  return container.querySelector('.boot-intro')?.getAttribute('data-boot-phase') ?? null;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('BootIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
  });

  it('plays every phase on schedule and unmounts after the reveal', () => {
    const handle = renderIntro();

    expect(currentPhase(handle)).toBe('power-on');
    advance(BOOT_SCHEDULE_MS.postHeader);
    expect(currentPhase(handle)).toBe('post-header');
    advance(BOOT_SCHEDULE_MS.magi - BOOT_SCHEDULE_MS.postHeader);
    expect(currentPhase(handle)).toBe('magi');
    advance(BOOT_SCHEDULE_MS.postStream - BOOT_SCHEDULE_MS.magi);
    expect(currentPhase(handle)).toBe('post-stream');
    advance(BOOT_SCHEDULE_MS.exit - BOOT_SCHEDULE_MS.postStream);
    expect(currentPhase(handle)).toBe('exit');
    advance(BOOT_SCHEDULE_MS.handoffDuration);
    expect(currentPhase(handle)).toBe('resync');
    advance(BOOT_SCHEDULE_MS.resyncBlank);
    expect(currentPhase(handle)).toBe('reveal');
    advance(BOOT_SCHEDULE_MS.revealSettle);
    expect(currentPhase(handle)).toBeNull();
  });

  it('continues promptly after the command while keeping the handoff legible', () => {
    expect(BOOT_SCHEDULE_MS.readyHold).toBe(500);
    // The first handoff row begins 200ms into exit, so the visible command gap is about 700ms.
    expect(BOOT_SCHEDULE_MS.readyHold + 200).toBeLessThanOrEqual(700);
    // The second row finishes at 0.86s (200ms start + 1 x 520ms stagger + 140ms print).
    expect(BOOT_SCHEDULE_MS.handoffDuration - 860).toBeGreaterThanOrEqual(400);
    expect(BOOT_SCHEDULE_MS.hidden - BOOT_SCHEDULE_MS.postStream).toBeLessThanOrEqual(2400);
  });

  it('writes the session flag only when the intro is over', () => {
    const handle = renderIntro();

    advance(BOOT_SCHEDULE_MS.postStream);
    expect(currentPhase(handle)).toBe('post-stream');
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBeNull();

    advance(BOOT_SCHEDULE_MS.hidden - BOOT_SCHEDULE_MS.postStream);
    expect(currentPhase(handle)).toBeNull();
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBe('1');
  });

  it('stays hidden for the rest of the tab session after playing once', () => {
    window.sessionStorage.setItem(BOOT_INTRO_SESSION_KEY, '1');
    const onFinished = vi.fn();
    const handle = renderIntro(onFinished);

    expect(handle.container.querySelector('.boot-intro')).toBeNull();
    advance(BOOT_SCHEDULE_MS.hidden);
    expect(currentPhase(handle)).toBeNull();
    expect(onFinished).toHaveBeenCalled();
  });

  it('replays despite the session flag when boot=replay is present', () => {
    window.sessionStorage.setItem(BOOT_INTRO_SESSION_KEY, '1');
    window.history.replaceState(null, '', '?boot=replay');

    const handle = renderIntro();

    expect(currentPhase(handle)).toBe('power-on');
  });

  it('skips to the ending on Escape and still marks the session', () => {
    const handle = renderIntro();

    advance(BOOT_SCHEDULE_MS.magi + 100);
    expect(currentPhase(handle)).toBe('magi');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(currentPhase(handle)).toBe('resync');
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBe('1');

    advance(BOOT_SCHEDULE_MS.skipHidden);
    expect(currentPhase(handle)).toBeNull();
  });

  it('skips from the explicit skip control', () => {
    const handle = renderIntro();

    advance(500);
    act(() => {
      handle.container.querySelector<HTMLButtonElement>('.boot-skip')?.click();
    });
    expect(currentPhase(handle)).toBe('resync');

    advance(BOOT_SCHEDULE_MS.skipHidden);
    expect(currentPhase(handle)).toBeNull();
  });

  it('does not hijack the space key away from focused controls', () => {
    renderIntro();
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it('hides the intro immediately for prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const onFinished = vi.fn();
    const handle = renderIntro(onFinished);

    expect(handle.container.querySelector('.boot-intro')).toBeNull();
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBe('1');
    advance(BOOT_SCHEDULE_MS.hidden);
    expect(onFinished).toHaveBeenCalled();
  });

  it('calls onFinished when the intro completes naturally', () => {
    const onFinished = vi.fn();
    renderIntro(onFinished);

    advance(BOOT_SCHEDULE_MS.hidden);

    expect(onFinished).toHaveBeenCalled();
  });

  it('stops scheduling after unmount', () => {
    const { root } = renderIntro();
    advance(1000);

    act(() => root.unmount());

    advance(BOOT_SCHEDULE_MS.hidden);
  });

  it('locks page scroll only while the intro is visible', () => {
    document.body.style.overflow = 'auto';
    const handle = renderIntro();

    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      handle.container.querySelector<HTMLButtonElement>('.boot-skip')?.click();
    });
    advance(BOOT_SCHEDULE_MS.skipHidden);

    expect(document.body.style.overflow).toBe('auto');
  });
});
