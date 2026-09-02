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
      'magi-network',
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
    expect(css).toMatch(/\.direct-link-page \.magi-network\s*\{[^}]*transition:\s*transform 520ms/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/\.motion-composer\s*\{[^}]*width:\s*min\(100%, 720px\)/);
    expect(css).toMatch(/@media \(orientation: landscape\)[\s\S]*?\.motion-composer\s*\{[^}]*max-height:\s*104px/);
    expect(css).toMatch(/@media \(min-width: 720px\) and \(orientation: portrait\)[\s\S]*?\.motion-composer__controls\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(190px, 220px\)/);
  });

  it('layers terminal information independently from centered MAGI geometry', () => {
    expect(css).toContain('.direct-link-page .terminal-calibration-layer');
    expect(css).toContain('.direct-link-page .terminal-information-layer');
    expect(css).toContain('.direct-link-page .terminal-connection-layer');
    expect(css).toContain('.direct-link-page .terminal-network-layer');
    expect(css).toMatch(/\.terminal-connection-layer \.terminal-orange\s*\{[^}]*filter:\s*url\(#orange-glow-connection\)/);
    expect(css).toMatch(/\.direct-link-workspace\s*\{[^}]*width:\s*100vw/);
  });

  it('thickens every agent outline segment, including its shared core boundary', () => {
    expect(css).toMatch(/\.agent-module:hover \.magi-outline,[\s\S]*?\.agent-module:focus-visible \.magi-outline\s*\{[^}]*stroke-width:\s*5px/);
    expect(css).toMatch(/\.agent-module:hover \.magi-outline--shared,[\s\S]*?\.agent-module:focus-visible \.magi-outline--shared\s*\{[^}]*stroke-width:\s*7px/);
    expect(css).toMatch(/\.agent-module:focus-visible \.magi-outline\s*\{[^}]*stroke-dasharray:\s*16 7/);
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

  it('renders command buttons as animated EVA stripe controls with inverted hover colors', () => {
    expect(css).toMatch(/\.motion-composer button,\s*\.direct-link-new-motion\s*\{[^}]*color:\s*#050504;[^}]*background:\s*var\(--direct-orange\)/);
    expect(css).toMatch(/\.motion-composer button::before,[\s\S]*?background-image:[\s\S]*?repeating-linear-gradient\(\s*135deg,\s*var\(--direct-button-stripe\) 0 7px,\s*transparent 7px 15px[\s\S]*?background-size:\s*100% 5px, 100% 5px/);
    expect(css).not.toContain('.motion-composer button::after');
    expect(css).toMatch(/\.motion-composer button:not\(:disabled\):hover,[\s\S]*?--direct-button-stripe:\s*var\(--direct-orange\);[^}]*color:\s*var\(--direct-orange\);[^}]*background:\s*#050504/);
    expect(css).toMatch(/animation:\s*direct-link-command-stripes 850ms linear infinite/);
    expect(css).toMatch(/@keyframes direct-link-command-stripes\s*\{[\s\S]*?translate3d\(-21\.213px, 0, 0\)[\s\S]*?translate3d\(0, 0, 0\)/);
    expect(css).not.toMatch(/direct-link-command-stripes (?:420|600)ms/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration:\s*0\.01ms !important/);
  });
});
