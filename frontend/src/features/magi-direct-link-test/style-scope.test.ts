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

  it('defines landscape reflow, collapsing input, and transform-only network motion', () => {
    expect(css).toContain('@media (orientation: landscape)');
    expect(css).toMatch(/\.motion-composer\.is-collapsed\s*\{[^}]*max-height:\s*0;/);
    expect(css).toMatch(/\.direct-link-page \.magi-geometry\s*\{[^}]*transition:\s*transform 520ms/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/\.motion-composer\s*\{[^}]*width:\s*min\(100%, 720px\)/);
    expect(css).toMatch(/@media \(orientation: landscape\)[\s\S]*?\.motion-composer\s*\{[^}]*max-height:\s*104px/);
  });

  it('layers terminal information independently from centered MAGI geometry', () => {
    expect(css).toContain('.direct-link-page .terminal-information-layer');
    expect(css).toContain('.direct-link-page .terminal-network-layer');
    expect(css).toMatch(/\.direct-link-workspace\s*\{[^}]*width:\s*100vw/);
  });

  it('keeps rejection red inside the vote badge', () => {
    expect(css).not.toMatch(/\.agent-module\.vote-reject\s*\{[^}]*color:\s*var\(--direct-red\)/);
    expect(css).toMatch(/\.vote-box--reject\s*\{[^}]*stroke:\s*var\(--direct-red\)/);
    expect(css).toMatch(/\.vote-text--reject\s*\{[^}]*fill:\s*var\(--direct-red\)/);
  });

  it('restores terminal information brightness in the final phase', () => {
    expect(css).not.toMatch(/\.phase-final \.terminal-chrome\s*\{[^}]*opacity:\s*0\.18/);
    expect(css).toMatch(/\.phase-deliberation \.terminal-chrome\s*\{[^}]*opacity:\s*0\.18/);
  });
});
