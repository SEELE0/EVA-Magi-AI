/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */

export type SvgPoint = readonly [x: number, y: number];

export interface SvgBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextPlacement {
  readonly anchor: SvgPoint;
  readonly length: number;
}

export interface AgentModuleLayout {
  readonly id: 'balthasar' | 'casper' | 'melchior';
  readonly name: string;
  readonly vote: '承認' | '否定';
  readonly decision: 'approved' | 'denied';
  readonly frame: readonly SvgPoint[];
  readonly namePlacement: TextPlacement;
  readonly voteBox: SvgBox;
  readonly votePlacement: TextPlacement;
}

export interface MagiNetworkMetrics {
  readonly canvasWidth: number;
  readonly centerOffset: number;
  readonly top: number;
  readonly upperWidth: number;
  readonly upperSideHeight: number;
  readonly upperChamferWidth: number;
  readonly upperChamferHeight: number;
  readonly hubShoulderWidth: number;
  readonly hubTopToShoulder: number;
  readonly hubShoulderToNeck: number;
  readonly hubNeckWidth: number;
  readonly hubNeckHeight: number;
  readonly lowerPairWidth: number;
  readonly lowerHeight: number;
  readonly diagonalConnectorWidth: number;
  readonly lowerConnectorWidth: number;
}

export interface MagiNetworkLayout {
  readonly agents: readonly AgentModuleLayout[];
  readonly hub: readonly SvgPoint[];
  readonly diagonalConnectors: readonly {
    readonly id: 'left' | 'right';
    readonly points: readonly SvgPoint[];
  }[];
  readonly lowerConnector: {
    readonly start: SvgPoint;
    readonly end: SvgPoint;
    readonly width: number;
  };
  readonly label: TextPlacement;
}

export const TERMINAL_VIEWBOX = {
  width: 720,
  height: 960,
} as const;

export const TERMINAL_MODULE_LAYOUT = {
  header: {
    origin: [38, 30] as SvgPoint,
    width: 328,
    height: 101,
    radius: 7,
    contentInset: 13,
    frameInset: 5,
    accessValueOffset: 159,
    dividerOffset: 49,
    firstBaseline: 37,
    secondBaseline: 86,
  },
  motion: {
    origin: [39, 141] as SvgPoint,
    railWidth: 7,
    railHeight: 83,
    railRadius: 3.5,
    railGap: 4,
    contentInset: 28,
    contentWidth: 329,
    firstBaseline: 37,
    secondBaseline: 77,
    width: 387,
  },
  systemData: {
    origin: [36, 271] as SvgPoint,
    lineHeight: 26,
  },
  connectionData: {
    origin: [529, 374] as SvgPoint,
  },
} as const;

export const SYSTEM_DATA_LINES = [
  'CODE : 258',
  'FILE :',
  'MAGI.SYS',
  'EXTENTION :',
  '4096',
  'EX_MODE :',
  'OFF',
  'PRIORITY :',
  'AAA',
] as const;

export const CONNECTION_DATA_LINES = [
  { text: 'Layer 3:', baseline: 0 },
  { text: 'Connection Control:', baseline: 26, small: true },
  { text: '0.031', baseline: 52 },
  { text: 'Layer 2:', baseline: 89 },
  { text: 'Data Link:', baseline: 115 },
  { text: '0.021 - UAPO', baseline: 141 },
  { text: 'Layer 1:', baseline: 178 },
  { text: 'Physical Connection:', baseline: 204, small: true },
  { text: 'L401 - Basic Interface', baseline: 230, small: true },
] as const;

export const DEFAULT_MAGI_NETWORK_METRICS: MagiNetworkMetrics = {
  canvasWidth: TERMINAL_VIEWBOX.width,
  centerOffset: -10,
  top: 292,
  upperWidth: 330,
  upperSideHeight: 184,
  upperChamferWidth: 95,
  upperChamferHeight: 94,
  hubShoulderWidth: 230,
  hubTopToShoulder: 55,
  hubShoulderToNeck: 85,
  hubNeckWidth: 40,
  hubNeckHeight: 20,
  lowerPairWidth: 630,
  lowerHeight: 275,
  diagonalConnectorWidth: 14,
  lowerConnectorWidth: 17,
};

const roundCoordinate = (value: number) => Number(value.toFixed(2));

const point = (x: number, y: number): SvgPoint => [
  roundCoordinate(x),
  roundCoordinate(y),
];

const intersectLines = (
  [lineAX, lineAY]: SvgPoint,
  [lineBX, lineBY]: SvgPoint,
  [edgeAX, edgeAY]: SvgPoint,
  [edgeBX, edgeBY]: SvgPoint,
): SvgPoint => {
  const lineDeltaX = lineBX - lineAX;
  const lineDeltaY = lineBY - lineAY;
  const edgeDeltaX = edgeBX - edgeAX;
  const edgeDeltaY = edgeBY - edgeAY;
  const cross = lineDeltaX * edgeDeltaY - lineDeltaY * edgeDeltaX;

  if (Math.abs(cross) < Number.EPSILON) {
    throw new Error('Connector edge cannot be parallel to its terminal border.');
  }

  const edgeOffsetX = edgeAX - lineAX;
  const edgeOffsetY = edgeAY - lineAY;
  const lineRatio = (edgeOffsetX * edgeDeltaY - edgeOffsetY * edgeDeltaX) / cross;

  return point(
    lineAX + lineRatio * lineDeltaX,
    lineAY + lineRatio * lineDeltaY,
  );
};

const createBorderFusedConnector = (
  [startX, startY]: SvgPoint,
  [endX, endY]: SvgPoint,
  width: number,
  edges: {
    readonly startPositive: SvgPoint;
    readonly startNegative: SvgPoint;
    readonly endPositive: SvgPoint;
    readonly endNegative: SvgPoint;
  },
): readonly SvgPoint[] => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const offsetX = (-deltaY / length) * (width / 2);
  const offsetY = (deltaX / length) * (width / 2);
  const positiveStart = point(startX + offsetX, startY + offsetY);
  const positiveEnd = point(endX + offsetX, endY + offsetY);
  const negativeStart = point(startX - offsetX, startY - offsetY);
  const negativeEnd = point(endX - offsetX, endY - offsetY);

  return [
    point(startX, startY),
    intersectLines(positiveStart, positiveEnd, point(startX, startY), edges.startPositive),
    intersectLines(positiveStart, positiveEnd, point(endX, endY), edges.endPositive),
    point(endX, endY),
    intersectLines(negativeStart, negativeEnd, point(endX, endY), edges.endNegative),
    intersectLines(negativeStart, negativeEnd, point(startX, startY), edges.startNegative),
  ];
};

export const createMagiNetworkLayout = (
  metrics: MagiNetworkMetrics = DEFAULT_MAGI_NETWORK_METRICS,
): MagiNetworkLayout => {
  const centerX = metrics.canvasWidth / 2 + metrics.centerOffset;
  const upperOuterHalf = metrics.upperWidth / 2;
  const hubTopHalf = upperOuterHalf - metrics.upperChamferWidth;
  const hubShoulderHalf = metrics.hubShoulderWidth / 2;
  const hubNeckHalf = metrics.hubNeckWidth / 2;
  const lowerPairHalf = metrics.lowerPairWidth / 2;

  const upperSideBottom = metrics.top + metrics.upperSideHeight;
  const hubTopY = upperSideBottom + metrics.upperChamferHeight;
  const hubShoulderY = hubTopY + metrics.hubTopToShoulder;
  const hubNeckTopY = hubShoulderY + metrics.hubShoulderToNeck;
  const hubNeckBottomY = hubNeckTopY + metrics.hubNeckHeight;
  const lowerBottomY = hubShoulderY + metrics.lowerHeight;

  const upperOuterLeft = point(centerX - upperOuterHalf, metrics.top);
  const upperOuterRight = point(centerX + upperOuterHalf, metrics.top);
  const upperChamferLeft = point(centerX - upperOuterHalf, upperSideBottom);
  const upperChamferRight = point(centerX + upperOuterHalf, upperSideBottom);
  const hubTopLeft = point(centerX - hubTopHalf, hubTopY);
  const hubTopRight = point(centerX + hubTopHalf, hubTopY);
  const hubShoulderLeft = point(centerX - hubShoulderHalf, hubShoulderY);
  const hubShoulderRight = point(centerX + hubShoulderHalf, hubShoulderY);
  const hubNeckTopLeft = point(centerX - hubNeckHalf, hubNeckTopY);
  const hubNeckTopRight = point(centerX + hubNeckHalf, hubNeckTopY);
  const hubNeckBottomLeft = point(centerX - hubNeckHalf, hubNeckBottomY);
  const hubNeckBottomRight = point(centerX + hubNeckHalf, hubNeckBottomY);
  const lowerOuterLeft = point(centerX - lowerPairHalf, hubShoulderY);
  const lowerOuterRight = point(centerX + lowerPairHalf, hubShoulderY);

  const upperFrame = [
    hubTopLeft,
    upperChamferLeft,
    upperOuterLeft,
    upperOuterRight,
    upperChamferRight,
    hubTopRight,
  ] as const;

  const leftFrame = [
    hubShoulderLeft,
    lowerOuterLeft,
    point(lowerOuterLeft[0], lowerBottomY),
    point(hubNeckBottomLeft[0], lowerBottomY),
    hubNeckBottomLeft,
  ] as const;

  const rightFrame = [
    hubShoulderRight,
    lowerOuterRight,
    point(lowerOuterRight[0], lowerBottomY),
    point(hubNeckBottomRight[0], lowerBottomY),
    hubNeckBottomRight,
  ] as const;

  const hub = [
    hubTopLeft,
    hubTopRight,
    hubShoulderRight,
    hubNeckTopRight,
    hubNeckBottomRight,
    hubNeckBottomLeft,
    hubNeckTopLeft,
    hubShoulderLeft,
  ] as const;

  const voteWidth = 174;
  const voteTextLength = 132;

  return {
    agents: [
      {
        id: 'balthasar',
        name: 'BALTHASAR:2',
        vote: '承認',
        decision: 'approved',
        frame: upperFrame,
        namePlacement: {
          anchor: point(centerX, metrics.top + 84),
          length: 302,
        },
        voteBox: {
          x: centerX - voteWidth / 2,
          y: metrics.top + 126,
          width: voteWidth,
          height: 90,
        },
        votePlacement: {
          anchor: point(centerX, metrics.top + 198),
          length: 128,
        },
      },
      {
        id: 'casper',
        name: 'CASPER:3',
        vote: '否定',
        decision: 'denied',
        frame: leftFrame,
        namePlacement: {
          anchor: point(centerX - 169, hubShoulderY + 239),
          length: 268,
        },
        voteBox: {
          x: centerX - 175 - voteWidth / 2,
          y: hubShoulderY + 57,
          width: voteWidth,
          height: 91,
        },
        votePlacement: {
          anchor: point(centerX - 175, hubShoulderY + 130),
          length: voteTextLength,
        },
      },
      {
        id: 'melchior',
        name: 'MELCHIOR:1',
        vote: '承認',
        decision: 'approved',
        frame: rightFrame,
        namePlacement: {
          anchor: point(centerX + 169, hubShoulderY + 245),
          length: 268,
        },
        voteBox: {
          x: centerX + 175 - voteWidth / 2,
          y: hubShoulderY + 67,
          width: voteWidth,
          height: 91,
        },
        votePlacement: {
          anchor: point(centerX + 175, hubShoulderY + 140),
          length: voteTextLength,
        },
      },
    ],
    hub,
    diagonalConnectors: [
      {
        id: 'left',
        points: createBorderFusedConnector(
          hubTopLeft,
          hubShoulderLeft,
          metrics.diagonalConnectorWidth,
          {
            startPositive: upperChamferLeft,
            startNegative: hubTopRight,
            endPositive: lowerOuterLeft,
            endNegative: hubNeckTopLeft,
          },
        ),
      },
      {
        id: 'right',
        points: createBorderFusedConnector(
          hubTopRight,
          hubShoulderRight,
          metrics.diagonalConnectorWidth,
          {
            startPositive: hubTopLeft,
            startNegative: upperChamferRight,
            endPositive: hubNeckTopRight,
            endNegative: lowerOuterRight,
          },
        ),
      },
    ],
    lowerConnector: {
      start: hubNeckBottomLeft,
      end: hubNeckBottomRight,
      width: metrics.lowerConnectorWidth,
    },
    label: {
      anchor: point(centerX, hubShoulderY + 30),
      length: 132,
    },
  };
};

export const MAGI_NETWORK_LAYOUT = createMagiNetworkLayout();

export const toSvgPoints = (points: readonly SvgPoint[]) =>
  points.map(([x, y]) => `${x},${y}`).join(' ');

export const toSvgTranslate = ([x, y]: SvgPoint) => `translate(${x} ${y})`;
