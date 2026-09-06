/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */

export type DecisionNodePosition = 'top' | 'left' | 'right';
export type SvgPoint = readonly [x: number, y: number];

export interface DecisionNodeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DecisionNodeFrame {
  readonly position: DecisionNodePosition;
  readonly box: DecisionNodeBox;
  readonly points: readonly SvgPoint[];
  readonly clipPath: string;
}

export interface DecisionNetworkConnector {
  readonly id: 'top-left' | 'top-right' | 'lower';
  readonly start: SvgPoint;
  readonly end: SvgPoint;
}

export interface DecisionNetworkMetrics {
  readonly viewBox: {
    readonly width: number;
    readonly height: number;
  };
  readonly topNode: {
    readonly box: DecisionNodeBox;
    readonly shoulderY: number;
    readonly lowerLeftX: number;
    readonly lowerRightX: number;
  };
  readonly lowerNodes: {
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly innerShoulderY: number;
    readonly topInnerX: number;
  };
  readonly lowerConnectorPosition: number;
  readonly corePosition: SvgPoint;
}

export interface DecisionNetworkLayout {
  readonly viewBox: DecisionNetworkMetrics['viewBox'];
  readonly frames: Readonly<Record<DecisionNodePosition, DecisionNodeFrame>>;
  readonly connectors: readonly DecisionNetworkConnector[];
  readonly core: SvgPoint;
}

export const DEFAULT_DECISION_NETWORK_METRICS: DecisionNetworkMetrics = {
  viewBox: { width: 600, height: 420 },
  topNode: {
    box: { x: 0.3, y: -0.04, width: 0.4, height: 0.46 },
    shoulderY: 0.72,
    lowerLeftX: 0.33,
    lowerRightX: 0.67,
  },
  lowerNodes: {
    top: 0.4952,
    width: 0.46,
    height: 0.4048,
    innerShoulderY: 0.48,
    topInnerX: 0.7,
  },
  lowerConnectorPosition: 0.5,
  corePosition: [0.5, 0.55],
};

const roundCoordinate = (value: number) => Number(value.toFixed(2));

const point = (x: number, y: number): SvgPoint => [
  roundCoordinate(x),
  roundCoordinate(y),
];

const scaleBox = (
  box: DecisionNodeBox,
  viewBox: DecisionNetworkMetrics['viewBox'],
): DecisionNodeBox => ({
  x: roundCoordinate(box.x * viewBox.width),
  y: roundCoordinate(box.y * viewBox.height),
  width: roundCoordinate(box.width * viewBox.width),
  height: roundCoordinate(box.height * viewBox.height),
});

const pointInBox = (
  box: DecisionNodeBox,
  xRatio: number,
  yRatio: number,
): SvgPoint => point(
  box.x + box.width * xRatio,
  box.y + box.height * yRatio,
);

const toClipPath = (points: readonly SvgPoint[]) => (
  `polygon(${points.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')})`
);

const createFrame = (
  position: DecisionNodePosition,
  box: DecisionNodeBox,
  normalizedPoints: readonly SvgPoint[],
): DecisionNodeFrame => ({
  position,
  box,
  points: normalizedPoints.map(([x, y]) => pointInBox(box, x, y)),
  clipPath: toClipPath(normalizedPoints),
});

export function createDecisionNetworkLayout(
  metrics: DecisionNetworkMetrics = DEFAULT_DECISION_NETWORK_METRICS,
): DecisionNetworkLayout {
  const { viewBox, topNode, lowerNodes } = metrics;
  const topBox = scaleBox(topNode.box, viewBox);
  const lowerTop = roundCoordinate(lowerNodes.top * viewBox.height);
  const lowerWidth = roundCoordinate(lowerNodes.width * viewBox.width);
  const lowerHeight = roundCoordinate(lowerNodes.height * viewBox.height);

  const top = createFrame('top', topBox, [
    [0, 0],
    [1, 0],
    [1, topNode.shoulderY],
    [topNode.lowerRightX, 1],
    [topNode.lowerLeftX, 1],
    [0, topNode.shoulderY],
  ]);
  const left = createFrame('left', {
    x: 0,
    y: lowerTop,
    width: lowerWidth,
    height: lowerHeight,
  }, [
    [0, 0],
    [lowerNodes.topInnerX, 0],
    [1, lowerNodes.innerShoulderY],
    [1, lowerNodes.innerShoulderY + (1 - lowerNodes.innerShoulderY) * metrics.lowerConnectorPosition],
    [1, 1],
    [0, 1],
  ]);
  const right = createFrame('right', {
    x: roundCoordinate(viewBox.width - lowerWidth),
    y: lowerTop,
    width: lowerWidth,
    height: lowerHeight,
  }, [
    [1 - lowerNodes.topInnerX, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, lowerNodes.innerShoulderY + (1 - lowerNodes.innerShoulderY) * metrics.lowerConnectorPosition],
    [0, lowerNodes.innerShoulderY],
  ]);

  return {
    viewBox,
    frames: { top, left, right },
    connectors: [
      { id: 'top-left', start: top.points[4], end: left.points[1] },
      { id: 'top-right', start: top.points[3], end: right.points[0] },
      {
        id: 'lower',
        start: left.points[3],
        end: right.points[4],
      },
    ],
    core: point(
      metrics.corePosition[0] * viewBox.width,
      metrics.corePosition[1] * viewBox.height,
    ),
  };
}

export const DECISION_NETWORK_LAYOUT = createDecisionNetworkLayout();

export function toSvgPoints(points: readonly SvgPoint[]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

const toOpenSvgPath = (points: readonly SvgPoint[]) => (
  points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join('')
);

export function toDecisionNetworkTopologyPath(layout: DecisionNetworkLayout) {
  const framePaths = Object.values(layout.frames)
    .map((frame) => `${toOpenSvgPath(frame.points)}Z`);
  const connectorPaths = layout.connectors
    .map(({ start, end }) => toOpenSvgPath([start, end]));

  return [...framePaths, ...connectorPaths].join('');
}

const toPercent = (value: number, total: number) => `${roundCoordinate((value / total) * 100)}%`;

export function toDecisionNetworkCssVariables(layout: DecisionNetworkLayout) {
  const variables: Record<string, string> = {};

  for (const frame of Object.values(layout.frames)) {
    const prefix = `--decision-node-${frame.position}`;
    variables[`${prefix}-x`] = toPercent(frame.box.x, layout.viewBox.width);
    variables[`${prefix}-y`] = toPercent(frame.box.y, layout.viewBox.height);
    variables[`${prefix}-width`] = toPercent(frame.box.width, layout.viewBox.width);
    variables[`${prefix}-height`] = toPercent(frame.box.height, layout.viewBox.height);
    variables[`${prefix}-clip`] = frame.clipPath;
  }

  variables['--decision-core-x'] = toPercent(layout.core[0], layout.viewBox.width);
  variables['--decision-core-y'] = toPercent(layout.core[1], layout.viewBox.height);

  return variables;
}
