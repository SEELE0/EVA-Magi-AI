/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DECISION_NETWORK_METRICS,
  createDecisionNetworkLayout,
  toDecisionNetworkCssVariables,
  toDecisionNetworkTopologyPath,
  toDecisionNetworkFramePath,
  toDecisionNetworkConnectorPath,
} from './decision-network-layout';

describe('decision network geometry', () => {
  it('derives diagonal connector endpoints from the exact node vertices', () => {
    const layout = createDecisionNetworkLayout();
    const [topLeft, topRight] = layout.connectors;

    expect(topLeft.start).toBe(layout.frames.top.points[4]);
    expect(topLeft.end).toBe(layout.frames.left.points[1]);
    expect(topRight.start).toBe(layout.frames.top.points[3]);
    expect(topRight.end).toBe(layout.frames.right.points[0]);
  });

  it('derives the lower connector from matching positions on both inner edges', () => {
    const layout = createDecisionNetworkLayout();
    const lower = layout.connectors.find(({ id }) => id === 'lower');

    expect(lower?.start).toBe(layout.frames.left.points[3]);
    expect(lower?.end).toBe(layout.frames.right.points[4]);
    expect(lower?.start[1]).toBe(lower?.end[1]);
    expect(lower?.start[1]).toBeGreaterThan(layout.frames.left.points[2][1]);
    expect(lower?.start[1]).toBeLessThan(layout.frames.left.points[4][1]);
  });

  it('moves the node frame and its connector endpoint together when metrics change', () => {
    const layout = createDecisionNetworkLayout({
      ...DEFAULT_DECISION_NETWORK_METRICS,
      topNode: {
        ...DEFAULT_DECISION_NETWORK_METRICS.topNode,
        box: {
          ...DEFAULT_DECISION_NETWORK_METRICS.topNode.box,
          y: -0.03,
          height: 0.48,
        },
      },
    });

    expect(layout.connectors[0].start).toBe(layout.frames.top.points[4]);
    expect(layout.connectors[1].start).toBe(layout.frames.top.points[3]);
    expect(layout.frames.top.box.y).toBe(-12.6);
    expect(layout.frames.top.box.height).toBe(201.6);
  });

  it('scales every frame and connector proportionally with the viewBox', () => {
    const base = createDecisionNetworkLayout();
    const scaled = createDecisionNetworkLayout({
      ...DEFAULT_DECISION_NETWORK_METRICS,
      viewBox: { width: 1200, height: 840 },
    });

    for (const position of ['top', 'left', 'right'] as const) {
      scaled.frames[position].points.forEach(([scaledX, scaledY], index) => {
        const [baseX, baseY] = base.frames[position].points[index];
        expect(scaledX).toBeCloseTo(baseX * 2, 1);
        expect(scaledY).toBeCloseTo(baseY * 2, 1);
      });
    }
    scaled.connectors.forEach((connector, index) => {
      const baseConnector = base.connectors[index];
      expect(connector.id).toBe(baseConnector.id);
      expect(connector.start[0]).toBeCloseTo(baseConnector.start[0] * 2, 1);
      expect(connector.start[1]).toBeCloseTo(baseConnector.start[1] * 2, 1);
      expect(connector.end[0]).toBeCloseTo(baseConnector.end[0] * 2, 1);
      expect(connector.end[1]).toBeCloseTo(baseConnector.end[1] * 2, 1);
    });
  });

  it('exposes the same frames as CSS percentages for HTML content and hit targets', () => {
    const variables = toDecisionNetworkCssVariables(createDecisionNetworkLayout());

    expect(variables).toMatchObject({
      '--decision-node-top-x': '30%',
      '--decision-node-top-y': '-4%',
      '--decision-node-top-width': '40%',
      '--decision-node-top-height': '46%',
      '--decision-node-left-x': '2.5%',
      '--decision-node-left-y': '49.52%',
      '--decision-node-right-x': '54.5%',
      '--decision-core-x': '50%',
      '--decision-core-y': '55%',
    });
  });

  it('builds one topology path from all frames and derived connectors', () => {
    const layout = createDecisionNetworkLayout();
    const path = toDecisionNetworkTopologyPath(layout);

    expect(path.match(/Z/g)).toHaveLength(3);
    expect(path).toContain('M259.2 176.4L195.6 207.98');
    expect(path).toContain('M273 333.79L327 333.79');
    const framePath = toDecisionNetworkFramePath(layout);
    const connectorPath = toDecisionNetworkConnectorPath(layout);
    expect(framePath.match(/Z/g)).toHaveLength(3);
    expect(connectorPath.match(/M/g)).toHaveLength(3);
    expect(connectorPath).not.toContain('Z');
    expect(path).toBe(framePath + connectorPath);
  });
});
