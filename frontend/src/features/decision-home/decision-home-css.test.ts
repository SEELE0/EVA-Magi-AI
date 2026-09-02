/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
// Vitest runs in Node, while the production tsconfig intentionally omits Node globals.
// @ts-expect-error Node's built-in module is available to the test runtime.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./decision-home.css', import.meta.url), 'utf8');

describe('DecisionHome narrow viewport CSS', () => {
  it('keeps the shared screen noise layer inside the MAGI home border', () => {
    expect(css).toMatch(/\.magi-home > \.screen-noise\s*\{[^}]*inset:\s*0 1px 0 0;/);
  });

  it('constrains the reused MAGI network to the decision stage width', () => {
    expect(css).toMatch(/\.magi-home__decision-stage > \.magi-network\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*600px;[^}]*min-width:\s*0;/);
  });

  it('defines the standby-to-deliberation layout and subject transform', () => {
    expect(css).toMatch(/\.magi-home__simulator\[data-phase="deliberation"\][\s\S]*?\.magi-home__deliberation-grid\s*\{[^}]*grid-template-columns:\s*minmax\(150px,\s*0\.22fr\)/);
    expect(css).toMatch(/\.magi-home__simulator\[data-phase="standby"\][\s\S]*?\.magi-network\s*\{[^}]*transform:\s*scale\(0\.88\)/);
    expect(css).toMatch(/\.magi-home__simulator\[data-phase="final"\][\s\S]*?\.magi-network\s*\{[^}]*transform:\s*scale\(1\.04\)/);
  });

  it('defines the screenshot-inspired terminal information layers', () => {
    expect(css).toMatch(/\.magi-home__link-strip\s*\{/);
    expect(css).toMatch(/\.magi-home__motion-banner\s*\{/);
    expect(css).toMatch(/\.magi-home__system-stack\s*,\s*\.magi-home__layer-stack\s*\{/);
    expect(css).toMatch(/\.magi-home__motion-banner\.verdict-rejected[\s\S]*?--home-alert/);
    expect(css).toContain('--home-review: #f1d35c;');
  });

  it('exposes failure, calibration, and live telemetry as instrument states', () => {
    expect(css).toMatch(/\.magi-home__failure-banner\s*\{[^}]*border:\s*2px solid rgba\(255, 88, 77, 0\.82\)/);
    expect(css).toMatch(/\.magi-home__instrument-overlay\s*\{[^}]*pointer-events:\s*none;/);
    expect(css).toMatch(/\.magi-home__threshold-bar::after,\s*\.magi-home__latency-rail::after\s*\{[^}]*width:\s*var\(--magi-level\)/);
    expect(css).toMatch(/\.magi-home__simulator\.phase-final \.magi-home__motion-result\s*\{/);
  });

  it('provides a reduced-motion fallback for the terminal transition', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.magi-home__motion-banner[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*none;/);
  });

  it('adds subtle scanlines and renders the reused nodes as transparent outlines', () => {
    expect(css).toMatch(/\.magi-home__scanlines\s*\{[^}]*opacity:\s*0\.3;[^}]*repeating-linear-gradient/);
    expect(css).toMatch(/\.magi-home__decision-stage \.agent-node\s*\{[^}]*background:\s*transparent;/);
    expect(css).toMatch(/\.magi-home__decision-stage \.vote-state\s*\{[^}]*min-height:\s*34px;[^}]*font-size:\s*clamp\(16px,/);
    expect(css).toMatch(/\.magi-home__decision-stage \.network-connectors line\s*\{[^}]*stroke:\s*#69dca0;/);
    expect(css).toMatch(/\.agent-node\.vote-reject\s*\{\s*--node-outline:\s*#ff6258;/);
  });

  it('renders standby pending votes as inactive neutral states', () => {
    expect(css).toMatch(
      /\.magi-home__simulator\[data-phase="standby"\][^{]*\.agent-node\.vote-pending \.vote-state\s*\{[^}]*border-color:\s*#69716d;[^}]*color:\s*#8a918d;[^}]*text-shadow:\s*none;[^}]*box-shadow:\s*none;/
    );
  });

  it('keeps the head node taller without changing network positions', () => {
    expect(css).toMatch(
      /\.magi-home__decision-stage \.agent-node\.top\s*\{[^}]*top:\s*2\.38%;[^}]*height:\s*42%;/
    );
  });

  it('maps each invisible config hotspot hover and keyboard focus to its visible node', () => {
    for (const position of ['top', 'left', 'right']) {
      expect(css).toContain(
        `.magi-home__node-hotspot.is-${position} button:not(:disabled):is(:hover, :focus-visible)) .agent-node.${position}`
      );
    }
    expect(css).toMatch(/\.agent-node\.right\s*\{[\s\S]*?drop-shadow\(0 0 14px/);
    expect(css).toMatch(/\.agent-node\.right::before\s*\{[\s\S]*?drop-shadow\(1px 0 0 var\(--node-outline\)\)/);
  });

  it('allows mobile content to expose layout errors instead of clipping them', () => {
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.magi-home\s*\{[^}]*overflow:\s*visible;/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?grid-template-areas:[\s\S]*?"subject"[\s\S]*?"execute"[\s\S]*?"error"/);
  });

  it('allows history titles, metadata and response paragraphs to wrap', () => {
    expect(css).toMatch(/\.magi-home__detail-heading h2\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/\.magi-home__agent-output dd\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/\.magi-home__response-copy p\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  });
});
