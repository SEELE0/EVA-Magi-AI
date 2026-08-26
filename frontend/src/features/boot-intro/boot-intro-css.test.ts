/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
// Vitest runs in Node, while the production tsconfig intentionally omits Node globals.
// @ts-expect-error Node's built-in module is available to the test runtime.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./boot-intro.css', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../../app/app.css', import.meta.url), 'utf8');

describe('BootIntro layout CSS', () => {
  it('scales one centered minimum canvas instead of independently resizing its children', () => {
    expect(css).toMatch(/\.boot-stage-canvas\s*\{[^}]*top:\s*50%;[^}]*left:\s*50%;[^}]*width:\s*var\(--boot-stage-width, 1280px\);[^}]*height:\s*var\(--boot-stage-height, 720px\);[^}]*transform:\s*translate\(-50%, -50%\) scale\(var\(--boot-stage-scale, 1\)\);/);
    expect(css).toMatch(/\.boot-post-console\s*\{[^}]*inset:\s*32px;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
    expect(css).toMatch(/\.boot-terminal-body\s*\{[^}]*grid-template-columns:\s*700px minmax\(0, 1fr\);[^}]*gap:\s*32px;/);
  });

  it('powers on through a phosphor beam, vertical bloom, and settling rebound', () => {
    expect(css).toMatch(/\[data-boot-phase='power-on'\]\s+\.boot-power-screen\s*\{[^}]*animation:\s*boot-power-on 920ms linear forwards;/);
    expect(css).toMatch(/\[data-boot-phase='power-on'\]\s+\.boot-power-screen::before\s*\{[^}]*animation:\s*boot-power-beam 920ms linear forwards;/);
    expect(css).toMatch(/\[data-boot-phase='power-on'\]\s+\.boot-power-screen::after\s*\{[^}]*animation:\s*boot-phosphor-bloom 920ms steps\(12, end\) forwards;/);
    expect(css).toMatch(/@keyframes boot-power-on[\s\S]*?68%[^}]*scaleX\(1\.004\) scaleY\(1\.035\);[\s\S]*?76%[^}]*brightness\(0\.76\);/);
  });

  it('uses fixed-width POST rows, dot leaders, and a hard terminal cursor', () => {
    expect(css).toMatch(/\.boot-terminal-line\s*\{[^}]*grid-template-columns:\s*4\.5ch minmax\(130px, 1fr\) auto minmax\(9ch, auto\);/);
    expect(css).toMatch(/\.boot-check-name::after\s*\{[^}]*content:\s*"\.\./);
    expect(css).toMatch(/\.boot-block-cursor\s*\{[^}]*background:\s*var\(--boot-phosphor-hot\);/);
  });

  it('prints the firmware title, copyright, and POST checks strictly in sequence', () => {
    expect(css).toMatch(/\.boot-firmware-title,[\s\S]*?\.boot-copyright\s*\{[^}]*animation:\s*boot-type-copy 420ms steps\(36, end\) 100ms forwards;/);
    expect(css).toMatch(/\.boot-copyright\s*\{[^}]*animation-duration:\s*320ms;[^}]*animation-delay:\s*600ms;/);
    expect(css).toMatch(/\.boot-firmware-checks\s+\.boot-terminal-line\s*\{[^}]*animation-duration:\s*180ms;[^}]*animation-delay:\s*calc\(1000ms \+ var\(--boot-line-index\) \* 300ms\);/);
    expect(css).toMatch(/\.boot-firmware-title,[\s\S]*?\.boot-copyright\s*\{[^}]*animation-play-state:\s*paused;/);
    expect(css).toMatch(/\.boot-firmware-checks\s+\.boot-terminal-line\s*\{[^}]*animation-play-state:\s*paused;/);
    expect(css).toMatch(/\.boot-post\s+:is\(\.boot-firmware-title, \.boot-copyright, \.boot-firmware-checks \.boot-terminal-line\)\s*\{[^}]*animation-play-state:\s*running;/);
  });

  it('keeps the terminal and MAGI gradient orange with green reserved for ONLINE', () => {
    expect(css).toContain('--boot-phosphor: #f08a31');
    expect(css).toContain('--boot-phosphor-hot: #ffc06a');
    expect(css).toContain('--boot-online: #8ce89f');
    expect(css).toContain('.boot-magi-module stop:nth-child(5) { stop-color: #ffd28a; }');
    expect(css).toMatch(/\.boot-node-row\.is-online b\s*\{[^}]*color:\s*var\(--boot-online\);/);
    expect(css).not.toMatch(/#8fcca0|#c5f4c8|#8df2aa|rgba\(111, 229, 143/);
  });

  it('keeps all three personality channels in one synchronized waiting state', () => {
    expect(css).toMatch(/\.boot-node-row\.is-waiting b\s*\{[^}]*animation:\s*boot-wait-breathe 1200ms ease-in-out infinite;/);
    expect(css).toMatch(/\.boot-wait-dots::after\s*\{[^}]*animation:\s*boot-wait-dots 800ms steps\(1, end\) infinite;/);
    expect(css).not.toContain('boot-node-poll');
    expect(css).not.toMatch(/\.boot-node-row\.is-waiting b\s*\{[^}]*animation-delay:/);
    expect(css).not.toMatch(/\.boot-wait-dots::after\s*\{[^}]*animation-delay:/);
    expect(css).toMatch(/@keyframes boot-wait-dots[\s\S]*?content:\s*"\.\.\.";/);
    expect(css).toMatch(/@keyframes boot-wait-breathe[\s\S]*?50%\s*\{[^}]*color:\s*var\(--boot-phosphor-hot\);[^}]*opacity:\s*1;/);
  });

  it('keeps viewport units and overlapping size breakpoints out of the logical canvas', () => {
    expect(css).not.toMatch(/\b(?:vw|vh|cqi|cqb)\b/);
    expect(css).not.toMatch(/@media \((?:max|min)-(?:width|height):/);
  });

  it('uses one portrait composition whose free row absorbs extra height', () => {
    expect(css).toMatch(/\[data-boot-layout='portrait'\]\s+\.boot-terminal-body\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*grid-template-rows:\s*570px minmax\(0, 1fr\);/);
    expect(css).toMatch(/\[data-boot-layout='portrait'\]\s+\.boot-magi-slot\s*\{[^}]*border-top:\s*1px dashed/);
  });

  it('keeps the MAGI artwork fixed inside the shared canvas coordinate system', () => {
    expect(css).toMatch(/\.boot-magi-module\s*\{[^}]*width:\s*430px !important;/);
    expect(css).not.toContain('container-type: size');
  });

  it('defines exactly two stage compositions and lets the outer canvas handle fitting', () => {
    expect(css).toContain(".boot-intro[data-boot-layout='portrait'] .boot-post-console");
    expect(css).not.toContain('@media (max-width: 760px)');
    expect(css).not.toContain('@media (max-height: 520px)');
  });

  it('uses a hard signal loss followed by one stepped vertical resync', () => {
    expect(css).toMatch(/\[data-boot-phase='resync'\]\s+\.boot-exit-curtain\s*\{[^}]*opacity:\s*1;[^}]*transition:\s*opacity 28ms steps\(1, end\);/);
    expect(css).toMatch(/\[data-boot-phase='reveal'\]\s+\.boot-exit-curtain\s*\{[^}]*opacity:\s*0;[^}]*transition:\s*opacity var\(--boot-resync-blank-ms, 240ms\) steps\(3, end\);/);
    expect(css).toMatch(/\[data-boot-phase='reveal'\]\s+\.boot-exit-curtain::before\s*\{[^}]*animation:\s*boot-vertical-sync/);
    expect(css).toMatch(/@keyframes boot-vertical-sync/);
    expect(css).toMatch(/\[data-boot-phase='reveal'\]\s+\.boot-power-stage\s*\{\s*visibility:\s*hidden;/);
  });

  it('commits each handoff row to the fully revealed step', () => {
    expect(css).toMatch(/\.boot-handoff-line\s*\{[^}]*animation:\s*boot-type-line 140ms steps\(18, start\) forwards;/);
  });

  it('keeps every boot rule out of the global stylesheet', () => {
    expect(appCss).not.toContain('.boot-intro');
    expect(appCss).not.toContain('boot-power-on');
    expect(appCss).toContain('@keyframes static-shift');
  });
});
