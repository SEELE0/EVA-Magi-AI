/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { historyDetailHref, parseSimulatorHash } from './hash-route';

describe('simulator hash route', () => {
  it('parses decision, history and encoded history details', () => {
    expect(parseSimulatorHash('')).toEqual({ name: 'decision' });
    expect(parseSimulatorHash('#/')).toEqual({ name: 'decision' });
    expect(parseSimulatorHash('#/history')).toEqual({ name: 'history' });
    expect(parseSimulatorHash('#/history/decision%2001')).toEqual({ name: 'history-detail', id: 'decision 01' });
    expect(historyDetailHref('decision/01')).toBe('#/history/decision%2F01');
  });

  it('falls back safely for unknown or malformed routes', () => {
    expect(parseSimulatorHash('#/unknown')).toEqual({ name: 'decision' });
    expect(parseSimulatorHash('#/history/%E0%A4%A')).toEqual({ name: 'history' });
  });
});
