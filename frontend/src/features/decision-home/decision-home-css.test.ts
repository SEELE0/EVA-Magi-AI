/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
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

  it('allows mobile content to expose layout errors instead of clipping them', () => {
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.magi-home\s*\{[^}]*overflow:\s*visible;/);
  });

  it('allows history titles, metadata and response paragraphs to wrap', () => {
    expect(css).toMatch(/\.magi-home__detail-heading h2\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/\.magi-home__agent-output dd\s*\{[^}]*overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/\.magi-home__response-copy p\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  });
});
