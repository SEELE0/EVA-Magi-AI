// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { BOOT_INTRO_SESSION_KEY, BOOT_SCHEDULE_MS, BootIntro } from './BootIntro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface IntroHandle {
  container: HTMLElement;
  root: Root;
}

function renderIntro(props: ComponentProps<typeof BootIntro> = {}): IntroHandle {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<BootIntro {...props} />));
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

function press(key: string) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  act(() => window.dispatchEvent(event));
  return event;
}

function advanceToModeSelect() {
  advance(BOOT_SCHEDULE_MS.modeSelect);
}

function finishConfirmedIntro() {
  press('Enter');
  advance(BOOT_SCHEDULE_MS.confirmedHidden);
}

describe('BootIntro', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN');
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

  it('plays the boot sequence, waits for a mode choice, then performs the handoff', () => {
    const handle = renderIntro();

    expect(currentPhase(handle)).toBe('power-on');
    advance(BOOT_SCHEDULE_MS.postHeader);
    expect(currentPhase(handle)).toBe('post-header');
    advance(BOOT_SCHEDULE_MS.magi - BOOT_SCHEDULE_MS.postHeader);
    expect(currentPhase(handle)).toBe('magi');
    advance(BOOT_SCHEDULE_MS.postStream - BOOT_SCHEDULE_MS.magi);
    expect(currentPhase(handle)).toBe('post-stream');
    advance(BOOT_SCHEDULE_MS.modeSelect - BOOT_SCHEDULE_MS.postStream);
    expect(currentPhase(handle)).toBe('mode-select');

    advance(5000);
    expect(currentPhase(handle)).toBe('mode-select');

    press('Enter');
    expect(currentPhase(handle)).toBe('exit');
    advance(BOOT_SCHEDULE_MS.handoffDuration);
    expect(currentPhase(handle)).toBe('resync');
    advance(BOOT_SCHEDULE_MS.resyncBlank);
    expect(currentPhase(handle)).toBe('reveal');
    advance(BOOT_SCHEDULE_MS.revealSettle);
    expect(currentPhase(handle)).toBeNull();
  });

  it('opens the selector promptly after the command and keeps confirmed handoff legible', () => {
    expect(BOOT_SCHEDULE_MS.readyHold).toBe(500);
    expect(BOOT_SCHEDULE_MS.modeSelect - BOOT_SCHEDULE_MS.postStream).toBe(500);
    // The second row finishes at 0.86s (200ms start + 1 x 520ms stagger + 140ms print).
    expect(BOOT_SCHEDULE_MS.handoffDuration - 860).toBeGreaterThanOrEqual(400);
    expect(BOOT_SCHEDULE_MS.confirmedHidden).toBeLessThanOrEqual(1900);
  });

  it('switches the highlighted mode with either arrow and confirms only on Enter', () => {
    const onModeSelected = vi.fn();
    const handle = renderIntro({ initialMode: 'modern', onModeSelected });

    advanceToModeSelect();
    const options = [...handle.container.querySelectorAll<HTMLElement>('[role="radio"]')];
    expect(options).toHaveLength(2);
    expect(options[1]?.getAttribute('aria-checked')).toBe('true');

    expect(press('ArrowUp').defaultPrevented).toBe(true);
    expect(options[0]?.getAttribute('aria-checked')).toBe('true');
    expect(onModeSelected).not.toHaveBeenCalled();

    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(options[1]?.getAttribute('aria-checked')).toBe('true');
    press('ArrowUp');
    press('Enter');

    expect(onModeSelected).toHaveBeenCalledWith('original');
    expect(currentPhase(handle)).toBe('exit');
  });

  it('lets touch and mouse users select a row and confirm it explicitly', () => {
    const onModeSelected = vi.fn();
    const handle = renderIntro({ initialMode: 'modern', onModeSelected });

    press('Escape');
    const originalOption = handle.container.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0];
    const confirmButton = handle.container.querySelector<HTMLButtonElement>('.boot-mode-confirm');

    act(() => originalOption?.click());
    expect(originalOption?.getAttribute('aria-checked')).toBe('true');
    expect(confirmButton?.textContent).toContain('进入 MAGI DIRECT-LINK INTERFACE');
    expect(onModeSelected).not.toHaveBeenCalled();

    act(() => confirmButton?.click());
    expect(onModeSelected).toHaveBeenCalledWith('original');
    expect(currentPhase(handle)).toBe('exit');
  });

  it('does not write the boot session flag while waiting for a choice', () => {
    const handle = renderIntro();

    advanceToModeSelect();
    expect(currentPhase(handle)).toBe('mode-select');
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBeNull();

    finishConfirmedIntro();
    expect(currentPhase(handle)).toBeNull();
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBe('1');
  });

  it('stays hidden for the rest of the tab session after playing once', () => {
    window.sessionStorage.setItem(BOOT_INTRO_SESSION_KEY, '1');
    const onFinished = vi.fn();
    const handle = renderIntro({ onFinished });

    expect(handle.container.querySelector('.boot-intro')).toBeNull();
    advance(0);
    expect(currentPhase(handle)).toBeNull();
    expect(onFinished).toHaveBeenCalled();
  });

  it('replays despite the session flag when boot=replay is present', () => {
    window.sessionStorage.setItem(BOOT_INTRO_SESSION_KEY, '1');
    window.history.replaceState(null, '', '?boot=replay');

    const handle = renderIntro();

    expect(currentPhase(handle)).toBe('power-on');
  });

  it('fast-forwards to mode selection on Escape without entering the homepage', () => {
    const onFinished = vi.fn();
    const handle = renderIntro({ onFinished });

    advance(BOOT_SCHEDULE_MS.magi + 100);
    expect(currentPhase(handle)).toBe('magi');

    press('Escape');
    expect(currentPhase(handle)).toBe('mode-select');
    expect(handle.container.querySelector('.magi-boot--complete')).not.toBeNull();
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBeNull();
    expect(onFinished).not.toHaveBeenCalled();

    advance(BOOT_SCHEDULE_MS.modeSelect + 5000);
    expect(currentPhase(handle)).toBe('mode-select');
    expect(handle.container.querySelector('.magi-boot--complete')).not.toBeNull();

    press('Escape');
    expect(currentPhase(handle)).toBe('mode-select');
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('fast-forwards to mode selection from the explicit skip control', () => {
    const handle = renderIntro();

    advance(500);
    act(() => {
      handle.container.querySelector<HTMLButtonElement>('.boot-skip')?.click();
    });
    expect(currentPhase(handle)).toBe('mode-select');
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBeNull();

    advance(BOOT_SCHEDULE_MS.modeSelect + 5000);
    expect(currentPhase(handle)).toBe('mode-select');
  });

  it('does not hijack the space key away from focused controls', () => {
    renderIntro();
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it('bypasses animation but preserves mode selection for reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const onFinished = vi.fn();
    const handle = renderIntro({ onFinished });

    expect(currentPhase(handle)).toBe('mode-select');
    expect(window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY)).toBeNull();
    expect(onFinished).not.toHaveBeenCalled();

    finishConfirmedIntro();
    expect(currentPhase(handle)).toBeNull();
    expect(onFinished).toHaveBeenCalled();
  });

  it('calls onFinished when the intro completes naturally', () => {
    const onFinished = vi.fn();
    renderIntro({ onFinished });

    advanceToModeSelect();
    finishConfirmedIntro();

    expect(onFinished).toHaveBeenCalled();
  });

  it('stops scheduling after unmount', () => {
    const { root } = renderIntro();
    advance(1000);

    act(() => root.unmount());

    advance(BOOT_SCHEDULE_MS.modeSelect + BOOT_SCHEDULE_MS.confirmedHidden);
  });

  it('locks page scroll only while the intro is visible', () => {
    document.body.style.overflow = 'auto';
    const handle = renderIntro();

    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      handle.container.querySelector<HTMLButtonElement>('.boot-skip')?.click();
    });
    expect(currentPhase(handle)).toBe('mode-select');
    expect(document.body.style.overflow).toBe('hidden');

    finishConfirmedIntro();

    expect(document.body.style.overflow).toBe('auto');
  });
});
