/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAGI_NETWORK_METRICS,
  ANIME_ORIGINAL_LAYOUT_PRESETS,
  MAGI_NETWORK_LAYOUT,
  TERMINAL_MODULE_LAYOUT,
  createMagiNetworkLayout,
  resolveMagiNetworkPosition,
  toMagiNetworkTransform,
  type MagiNetworkPosition,
  type MagiNetworkState,
} from './layout';

const transformBounds = (
  points: readonly (readonly [number, number])[],
  position: MagiNetworkPosition,
  state: MagiNetworkState,
) => {
  const resolved = resolveMagiNetworkPosition(position, state);
  const xs = points.map(([x]) => x * resolved.scale + resolved.x);
  const ys = points.map(([, y]) => y * resolved.scale + resolved.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
};

const intersects = (
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number },
) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;

const mapMeetBoundsToViewport = (
  bounds: { left: number; top: number; right: number; bottom: number },
  viewport: { width: number; height: number },
  viewBox: { width: number; height: number },
  preserveAspectRatio: string,
) => {
  const scale = Math.min(viewport.width / viewBox.width, viewport.height / viewBox.height);
  const spareWidth = viewport.width - viewBox.width * scale;
  const spareHeight = viewport.height - viewBox.height * scale;
  const offsetX = preserveAspectRatio.startsWith('xMax')
    ? spareWidth
    : preserveAspectRatio.startsWith('xMid')
      ? spareWidth / 2
      : 0;
  const offsetY = preserveAspectRatio.includes('YMid') ? spareHeight / 2 : 0;

  return {
    left: bounds.left * scale + offsetX,
    top: bounds.top * scale + offsetY,
    right: bounds.right * scale + offsetX,
    bottom: bounds.bottom * scale + offsetY,
  };
};

describe('MAGI constraint-driven layout', () => {
  it('derives the approved reference geometry from semantic metrics', () => {
    expect(MAGI_NETWORK_LAYOUT.agents.map(({ id, frame }) => ({ id, frame }))).toEqual([
      {
        id: 'balthasar',
        frame: [[280, 570], [185, 476], [185, 292], [515, 292], [515, 476], [420, 570]],
      },
      {
        id: 'casper',
        frame: [[235, 625], [35, 625], [35, 900], [330, 900], [330, 730]],
      },
      {
        id: 'melchior',
        frame: [[465, 625], [665, 625], [665, 900], [370, 900], [370, 730]],
      },
    ]);
    expect(MAGI_NETWORK_LAYOUT.hub).toEqual([
      [280, 570], [420, 570], [465, 625], [370, 710],
      [370, 730], [330, 730], [330, 710], [235, 625],
    ]);
    expect(MAGI_NETWORK_LAYOUT.agents.map(({ id, sharedCoreBoundary }) => ({ id, sharedCoreBoundary }))).toEqual([
      { id: 'balthasar', sharedCoreBoundary: [[280, 570], [420, 570]] },
      { id: 'casper', sharedCoreBoundary: [[235, 625], [330, 710], [330, 730]] },
      { id: 'melchior', sharedCoreBoundary: [[465, 625], [370, 710], [370, 730]] },
    ]);
  });

  it('builds every diagonal link from the node borders and shared vertices', () => {
    const [left, right] = MAGI_NETWORK_LAYOUT.diagonalConnectors;

    expect(left.points).toHaveLength(6);
    expect(right.points).toHaveLength(6);
    expect(left.points[0]).toEqual(MAGI_NETWORK_LAYOUT.hub[0]);
    expect(left.points[3]).toEqual(MAGI_NETWORK_LAYOUT.hub[7]);
    expect(right.points[0]).toEqual(MAGI_NETWORK_LAYOUT.hub[1]);
    expect(right.points[3]).toEqual(MAGI_NETWORK_LAYOUT.hub[2]);
  });

  it('reflows every node, label, and connector from one center constraint', () => {
    const shift = 24;
    const shifted = createMagiNetworkLayout({
      ...DEFAULT_MAGI_NETWORK_METRICS,
      centerOffset: DEFAULT_MAGI_NETWORK_METRICS.centerOffset + shift,
    });

    expect(shifted.agents[0].frame[0][0] - MAGI_NETWORK_LAYOUT.agents[0].frame[0][0]).toBe(shift);
    expect(shifted.agents[0].sharedCoreBoundary[1][0] - MAGI_NETWORK_LAYOUT.agents[0].sharedCoreBoundary[1][0]).toBe(shift);
    expect(shifted.agents[1].voteBox.x - MAGI_NETWORK_LAYOUT.agents[1].voteBox.x).toBe(shift);
    expect(shifted.agents[2].namePlacement.anchor[0] - MAGI_NETWORK_LAYOUT.agents[2].namePlacement.anchor[0]).toBe(shift);
    expect(shifted.hub[0][0] - MAGI_NETWORK_LAYOUT.hub[0][0]).toBe(shift);
    expect(shifted.diagonalConnectors[0].points[1][0] - MAGI_NETWORK_LAYOUT.diagonalConnectors[0].points[1][0]).toBe(shift);
    expect(shifted.lowerConnector.start[0] - MAGI_NETWORK_LAYOUT.lowerConnector.start[0]).toBe(shift);
  });

  it('keeps one shared vertical position for the complete network in each responsive mode', () => {
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.viewBox).toEqual({ width: 720, height: 960 });
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.viewBox).toEqual({ width: 1440, height: 720 });
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.network).toBe(ANIME_ORIGINAL_LAYOUT_PRESETS['portrait-wide'].network);
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.network).toEqual({ x: 0, y: -25, scale: 1, activeYOffset: -56 });
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.network).toEqual({ x: 370, y: -191, scale: 1, activeYOffset: -51 });
    expect(toMagiNetworkTransform(resolveMagiNetworkPosition(ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.network, 'compose'))).toBe('translate(0px, -25px) scale(1)');
    expect(toMagiNetworkTransform(resolveMagiNetworkPosition(ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.network, 'active'))).toBe('translate(0px, -81px) scale(1)');
    expect(toMagiNetworkTransform(resolveMagiNetworkPosition(ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.network, 'compose'))).toBe('translate(370px, -191px) scale(1)');
    expect(toMagiNetworkTransform(resolveMagiNetworkPosition(ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.network, 'active'))).toBe('translate(370px, -242px) scale(1)');
    expect(MAGI_NETWORK_LAYOUT.agents.map((agent) => agent.agentId)).toEqual([
      'BALTHASAR-2',
      'CASPER-3',
      'MELCHIOR-1',
    ]);
  });

  it('stacks portrait information at the left edge and mirrors landscape headers', () => {
    const portrait = ANIME_ORIGINAL_LAYOUT_PRESETS.portrait.information;
    const landscape = ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.information;

    expect(portrait.preserveAspectRatio).toBe('xMinYMin meet');
    expect(portrait.connectionPreserveAspectRatio).toBe('xMaxYMin meet');
    expect(portrait.leftCalibrationPreserveAspectRatio).toBe('xMinYMin meet');
    expect(portrait.rightCalibrationPreserveAspectRatio).toBe('xMaxYMin meet');
    expect(landscape.preserveAspectRatio).toBe('xMidYMid meet');
    expect(landscape.connectionPreserveAspectRatio).toBe('xMidYMid meet');
    expect(landscape.leftCalibrationPreserveAspectRatio).toBe('xMinYMid meet');
    expect(landscape.rightCalibrationPreserveAspectRatio).toBe('xMaxYMid meet');
    expect(TERMINAL_MODULE_LAYOUT.header.radius).toBe(10);
    expect(TERMINAL_MODULE_LAYOUT.motion.railRadius).toBe(0);

    const headerFrame = TERMINAL_MODULE_LAYOUT.header;
    expect(headerFrame.frameInset).toBe(0);
    expect(headerFrame.firstBaseline).toBeLessThanOrEqual(26);
    expect(headerFrame.height - headerFrame.secondBaseline).toBeLessThanOrEqual(6);
    expect(headerFrame.dividerOffset - headerFrame.firstBaseline).toBeLessThanOrEqual(8);
    expect(headerFrame.secondBaseline - headerFrame.dividerOffset).toBeGreaterThanOrEqual(30);

    expect(portrait.header.origin[0]).toBe(portrait.motion.origin[0]);
    expect(portrait.header.origin[0]).toBe(portrait.systemData.origin[0]);
    expect(portrait.motion.origin[1]).toBeGreaterThanOrEqual(portrait.header.origin[1] + portrait.header.height);
    expect(portrait.systemData.origin[1] - portrait.motion.origin[1] - portrait.motion.height).toBeGreaterThanOrEqual(30);
    expect(portrait.connectionData.origin[1] - portrait.systemData.origin[1]).toBeGreaterThanOrEqual(15);

    const leftMargin = landscape.header.origin[0];
    const rightMargin = ANIME_ORIGINAL_LAYOUT_PRESETS.landscape.viewBox.width
      - landscape.motion.origin[0]
      - landscape.motion.width;
    expect(landscape.header.width).toBe(TERMINAL_MODULE_LAYOUT.header.width);
    expect(portrait.header.width).toBe(TERMINAL_MODULE_LAYOUT.header.width);
    expect(landscape.header.origin[1]).toBe(landscape.motion.origin[1]);
    expect(rightMargin).toBe(leftMargin);
    expect(landscape.systemData.origin[1] - landscape.header.origin[1] - landscape.header.height).toBeGreaterThanOrEqual(30);
    expect(landscape.connectionData.origin[1] - landscape.systemData.origin[1]).toBeGreaterThanOrEqual(20);
    expect(ANIME_ORIGINAL_LAYOUT_PRESETS['portrait-wide'].information.connectionData).toBe(portrait.connectionData);
  });

  it('maps the independently aligned connection panel clear of the network at critical terminal sizes', () => {
    const samples = [
      { mode: 'portrait', width: 320, height: 399 },
      { mode: 'portrait', width: 390, height: 675 },
      { mode: 'portrait', width: 430, height: 763 },
      { mode: 'portrait', width: 540, height: 551 },
      { mode: 'portrait', width: 600, height: 531 },
      { mode: 'portrait', width: 600, height: 631 },
      { mode: 'portrait', width: 719, height: 791 },
      { mode: 'portrait-wide', width: 720, height: 856 },
      { mode: 'portrait-wide', width: 768, height: 920 },
      { mode: 'landscape', width: 1024, height: 664 },
    ] as const;

    samples.forEach(({ mode, width, height }) => {
      const preset = ANIME_ORIGINAL_LAYOUT_PRESETS[mode];
      const connection = preset.information.connectionData;
      const connectionBounds = mapMeetBoundsToViewport({
        left: connection.origin[0],
        top: connection.origin[1],
        right: connection.origin[0] + connection.width,
        bottom: connection.origin[1] + connection.height,
      }, { width, height }, preset.viewBox, preset.information.connectionPreserveAspectRatio);

      expect(connectionBounds.right).toBeLessThanOrEqual(width);

      (['compose', 'active'] as const).forEach((state) => {
        MAGI_NETWORK_LAYOUT.agents.forEach((agent) => {
          const agentBounds = mapMeetBoundsToViewport(
            transformBounds(agent.frame, preset.network, state),
            { width, height },
            preset.viewBox,
            'xMidYMid meet',
          );
          expect(intersects(connectionBounds, agentBounds)).toBe(false);
        });
      });
    });
  });

  it('keeps connection data outside every node in compose and active layouts', () => {
    (Object.keys(ANIME_ORIGINAL_LAYOUT_PRESETS) as Array<keyof typeof ANIME_ORIGINAL_LAYOUT_PRESETS>).forEach((mode) => {
      const preset = ANIME_ORIGINAL_LAYOUT_PRESETS[mode];
      const connection = preset.information.connectionData;
      const connectionBounds = {
        left: connection.origin[0],
        top: connection.origin[1],
        right: connection.origin[0] + connection.width,
        bottom: connection.origin[1] + connection.height,
      };

      (['compose', 'active'] as const).forEach((state) => {
        MAGI_NETWORK_LAYOUT.agents.forEach((agent) => {
          expect(intersects(connectionBounds, transformBounds(agent.frame, preset.network, state))).toBe(false);
        });
      });
    });
  });

  it('keeps every information panel outside the enlarged compose network', () => {
    (Object.keys(ANIME_ORIGINAL_LAYOUT_PRESETS) as Array<keyof typeof ANIME_ORIGINAL_LAYOUT_PRESETS>).forEach((mode) => {
      const preset = ANIME_ORIGINAL_LAYOUT_PRESETS[mode];
      const panels = Object.values(preset.information).filter(
        (placement): placement is { origin: readonly [number, number]; width: number; height: number } => typeof placement !== 'string',
      );

      panels.forEach((panel) => {
        const panelBounds = {
          left: panel.origin[0],
          top: panel.origin[1],
          right: panel.origin[0] + panel.width,
          bottom: panel.origin[1] + panel.height,
        };

        MAGI_NETWORK_LAYOUT.agents.forEach((agent) => {
          expect(intersects(panelBounds, transformBounds(agent.frame, preset.network, 'compose'))).toBe(false);
        });
      });
    });
  });
});
