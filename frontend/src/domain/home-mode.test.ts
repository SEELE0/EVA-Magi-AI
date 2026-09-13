// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_MODE,
  HOME_MODE_SESSION_KEY,
  readHomeMode,
  saveHomeMode
} from './home-mode';

describe('home mode session preference', () => {
  afterEach(() => window.sessionStorage.clear());

  it('defaults to option one, the original home', () => {
    expect(DEFAULT_HOME_MODE).toBe('original');
    expect(readHomeMode()).toBe(DEFAULT_HOME_MODE);
  });

  it('persists either supported interface for same-tab refreshes', () => {
    saveHomeMode('original');
    expect(window.sessionStorage.getItem(HOME_MODE_SESSION_KEY)).toBe('original');
    expect(readHomeMode()).toBe('original');

    saveHomeMode('modern');
    expect(readHomeMode()).toBe('modern');
  });

  it('ignores unknown stored values', () => {
    window.sessionStorage.setItem(HOME_MODE_SESSION_KEY, 'unsupported');
    expect(readHomeMode()).toBe(DEFAULT_HOME_MODE);
  });
});
