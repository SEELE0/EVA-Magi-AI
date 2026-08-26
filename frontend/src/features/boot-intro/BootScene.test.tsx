/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BOOT_STAGE_PRESETS, BootScene, getBootStageLayout } from './BootIntro';

describe('BootScene', () => {
  it('renders the POST transcript and sizes the embedded MAGI in the IPL phase', () => {
    const markup = renderToStaticMarkup(<BootScene phase="magi" />);

    expect(markup).toContain('class="boot-intro boot-post"');
    expect(markup).toContain('data-boot-layout="landscape"');
    expect(markup).toContain('data-boot-phase="magi"');
    expect(markup).toContain('--boot-stage-width:1309.4737px');
    expect(markup).toContain('--boot-stage-height:720px');
    expect(markup).toContain('MAGI BASIC Decision-making SYSTEM');
    expect(markup).toContain('COPYRIGHT (C) NERV');
    expect(markup).toContain('SYSTEM MEMORY');
    expect(markup).toContain('&gt; IPL 00C0,MAGI_EXEC');
    expect(markup).toContain('--magi-boot-size:min(100%, 430px)');
    expect(markup).toContain('--magi-boot-background:transparent');
    expect(markup).toContain('--magi-ring-duration:878ms');
    expect(markup.match(/boot-node-row is-waiting/g)).toHaveLength(3);
    expect(markup.match(/aria-label="WAITING"/g)).toHaveLength(3);
    expect(markup.match(/boot-wait-dots/g)).toHaveLength(3);
    expect(markup).not.toContain('>PASS</b>');
    expect(markup).not.toContain('THREE INDEPENDENT SYSTEMS ONLINE');
    expect(markup).not.toContain('START DECISION_CONSOLE');
  });

  it('renders a terminal ready prompt only after the MAGI sequence completes', () => {
    const markup = renderToStaticMarkup(<BootScene phase="post-stream" />);

    expect(markup).toContain('data-boot-phase="post-stream"');
    expect(markup).toContain('MELCHIOR-1');
    expect(markup).toContain('boot-node-row is-online');
    expect(markup).not.toContain('boot-node-row is-waiting');
    expect(markup).not.toContain('boot-wait-dots');
    expect(markup).toContain('boot-coprocessor-state is-online');
    expect(markup).toContain('ONLINE');
    expect(markup).toContain('THREE INDEPENDENT SYSTEMS ONLINE');
    expect(markup).toContain('MAGI SYSTEM READY');
    expect(markup).toContain('START DECISION_CONSOLE');
    expect(markup).toContain('boot-block-cursor');
    expect(markup).not.toContain('LOADING DISPLAY DRIVER');
  });

  it('prints a display-driver handoff after the command is entered', () => {
    const markup = renderToStaticMarkup(<BootScene phase="exit" />);

    expect(markup).toContain('data-boot-phase="exit"');
    expect(markup).toContain('[ENTER]');
    expect(markup).toContain('LOADING DISPLAY DRIVER');
    expect(markup).toContain('MOUNTING MAGI PERSONALITY NODES');
    expect(markup).not.toContain('boot-block-cursor');
  });

  it('drives the signal-loss phase through data-boot-phase and the shared blank duration', () => {
    const markup = renderToStaticMarkup(<BootScene phase="resync" />);

    expect(markup).toContain('data-boot-phase="resync"');
    expect(markup).toContain('--boot-resync-blank-ms:240ms');
    expect(markup).toContain('boot-exit-curtain');
  });

  it('expands the spare canvas axis while filling landscape and portrait viewports', () => {
    const landscape = getBootStageLayout(1280, 720);
    const portrait = getBootStageLayout(390, 844);
    const reportedPhone = getBootStageLayout(440, 956);
    const enlarged = getBootStageLayout(1920, 1080);

    expect(landscape.mode).toBe('landscape');
    expect(landscape.width).toBeGreaterThan(BOOT_STAGE_PRESETS.landscape.width);
    expect(landscape.height).toBe(BOOT_STAGE_PRESETS.landscape.height);
    expect(landscape.scale).toBe(0.95);

    expect(portrait.mode).toBe('portrait');
    expect(portrait.width).toBeCloseTo(BOOT_STAGE_PRESETS.portrait.width, 0);
    expect(portrait.height).toBeGreaterThan(BOOT_STAGE_PRESETS.portrait.height);
    expect(portrait.scale).toBe(0.5789);

    expect(reportedPhone.width * reportedPhone.scale).toBeCloseTo(418, 1);
    expect(reportedPhone.height * reportedPhone.scale).toBeCloseTo(934, 1);
    expect(enlarged.scale).toBe(1.25);
    expect(enlarged.width * enlarged.scale).toBeCloseTo(1872, 1);
    expect(enlarged.height * enlarged.scale).toBeCloseTo(1032, 1);
  });
});
