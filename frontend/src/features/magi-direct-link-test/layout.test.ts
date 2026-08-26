/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAGI_NETWORK_METRICS,
  MAGI_NETWORK_LAYOUT,
  createMagiNetworkLayout,
} from './layout';

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
    expect(shifted.agents[1].voteBox.x - MAGI_NETWORK_LAYOUT.agents[1].voteBox.x).toBe(shift);
    expect(shifted.agents[2].namePlacement.anchor[0] - MAGI_NETWORK_LAYOUT.agents[2].namePlacement.anchor[0]).toBe(shift);
    expect(shifted.hub[0][0] - MAGI_NETWORK_LAYOUT.hub[0][0]).toBe(shift);
    expect(shifted.diagonalConnectors[0].points[1][0] - MAGI_NETWORK_LAYOUT.diagonalConnectors[0].points[1][0]).toBe(shift);
    expect(shifted.lowerConnector.start[0] - MAGI_NETWORK_LAYOUT.lowerConnector.start[0]).toBe(shift);
  });
});
