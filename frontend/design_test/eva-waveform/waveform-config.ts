/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */

export const EVA_WAVEFORM_CONFIG = {
  trailCount: 20,
  sampleCount: 36,
  cylinderRadius: 0.11,
  cylinderRadialSegments: 10,
  cylinderLengthScale: 0.92,
  xMin: -6,
  xMax: 6,
  yMin: -3.35,
  yMax: 3.35,
  amplitude: 2.48,
  frequency: 0.56,
  speed: 0.34,
  trailPhaseStep: 0.095,
  phaseOffset: Math.PI * 0.3,
  red: '#ff3147',
  blue: '#536dff',
  staticTime: 6.2,
  afterimageDamp: 0.68,
  bloom: {
    strength: 0.28,
    radius: 0.4,
    threshold: 0.06
  }
} as const;

export const X_AXIS_LABELS = Array.from({ length: 11 }, (_, index) => index - 5);
export const Y_AXIS_TICKS = Array.from({ length: 17 }, (_, index) => index);
export const RETICLE_POSITIONS = [
  [17, 8], [39, 8], [61, 8], [83, 8],
  [17, 50], [39, 50], [61, 50], [83, 50],
  [17, 87], [39, 87], [61, 87], [83, 87]
] as const;
