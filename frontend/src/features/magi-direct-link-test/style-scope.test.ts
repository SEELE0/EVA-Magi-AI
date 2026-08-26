/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error The test runs in Node; the app intentionally does not ship Node typings.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./magi-direct-link-test.css', import.meta.url), 'utf8');

describe('direct-link stylesheet isolation', () => {
  it('does not leak shared MAGI or terminal class names into the boot screen', () => {
    const sharedSelectors = [
      'terminal-orange',
      'magi-geometry',
      'magi-outline',
      'magi-label',
      'agent-name'
    ];

    sharedSelectors.forEach((selector) => {
      expect(css).not.toMatch(new RegExp(`^\\.${selector}\\b`, 'm'));
      expect(css).toContain(`.direct-link-page .${selector}`);
    });
  });

  it('keeps the reduced-motion reset inside the direct-link page', () => {
    expect(css).not.toMatch(/^\s*\*\s*,/m);
    expect(css).toContain('.direct-link-page *::before');
  });
});
