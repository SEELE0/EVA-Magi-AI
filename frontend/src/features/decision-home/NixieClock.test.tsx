// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NixieClock, formatClockTime } from './NixieClock';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('NixieClock', () => {
  it.each([
    [0, 0, 0, '00:00:00'],
    [7, 4, 9, '07:04:09']
  ] as const)('uses a padded 24-hour local time at %s:%s:%s', (hours, minutes, seconds, expected) => {
    expect(formatClockTime(new Date(2026, 9, 2, hours, minutes, seconds))).toBe(expected);
  });

  it('updates the real clock, preserves unchanged digits, rolls over midnight and cleans up its timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 23, 59, 58));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => root.render(<NixieClock label="时间" />));
      const time = container.querySelector('time');
      const slots = Array.from(container.querySelectorAll('.nixie-clock__digit-slot'));
      const digits = Array.from(container.querySelectorAll('.nixie-clock__numeral'));
      expect(time?.getAttribute('datetime')).toBe('23:59:58');
      expect(time?.getAttribute('aria-label')).toBe('23:59:58');
      expect(slots).toHaveLength(6);
      act(() => vi.advanceTimersByTime(1000));
      expect(time?.getAttribute('datetime')).toBe('23:59:59');
      const nextDigits = Array.from(container.querySelectorAll('.nixie-clock__numeral'));
      nextDigits.slice(0, 5).forEach((digit, index) => expect(digit).toBe(digits[index]));
      expect(nextDigits[5]).not.toBe(digits[5]);
      act(() => root.render(<NixieClock label="TIME" />));
      expect(container.querySelector('.readout > span')?.textContent).toBe('TIME');
      expect(container.querySelector('time')).toBe(time);
      act(() => vi.advanceTimersByTime(1000));
      expect(time?.getAttribute('datetime')).toBe('00:00:00');
      Array.from(container.querySelectorAll('.nixie-clock__digit-slot')).forEach((slot, index) => expect(slot).toBe(slots[index]));
    } finally {
      act(() => root.unmount());
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
