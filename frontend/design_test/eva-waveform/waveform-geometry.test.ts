/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { EVA_WAVEFORM_CONFIG } from './waveform-config';
import { createWaveGeometry } from './waveform-geometry';

describe('EVA waveform geometry', () => {
  it('creates the approved trail and sampling density', () => {
    const geometry = createWaveGeometry();
    const expectedInstances = EVA_WAVEFORM_CONFIG.trailCount
      * (EVA_WAVEFORM_CONFIG.sampleCount - 1);

    expect(geometry.instanceCount).toBe(expectedInstances);
    expect(geometry.getAttribute('aTrail').count).toBe(expectedInstances);
    expect(geometry.getAttribute('aXStart').count).toBe(expectedInstances);
    expect(geometry.getAttribute('aXEnd').count).toBe(expectedInstances);
    expect(geometry.getAttribute('aXStart').getX(0)).toBe(EVA_WAVEFORM_CONFIG.xMin);
    expect(geometry.getAttribute('aXEnd').getX(expectedInstances - 1)).toBe(EVA_WAVEFORM_CONFIG.xMax);
    expect(geometry.getAttribute('aTrail').getX(0)).toBe(0);
    expect(geometry.getAttribute('aTrail').getX(expectedInstances - 1)).toBe(1);
    expect(geometry.index).toBeNull();
    expect(geometry.getAttribute('position').count).toBe(EVA_WAVEFORM_CONFIG.cylinderRadialSegments * 6);
    expect(geometry.userData.segmentPrimitive).toBe('wireframe-cylinder-cage');

    geometry.dispose();
  });

  it('keeps the approved red-blue phase relationship', () => {
    expect(EVA_WAVEFORM_CONFIG.red).toBe('#ff3147');
    expect(EVA_WAVEFORM_CONFIG.blue).toBe('#536dff');
    expect(EVA_WAVEFORM_CONFIG.phaseOffset).toBeCloseTo(Math.PI * 0.3, 8);
    expect(EVA_WAVEFORM_CONFIG.trailCount).toBeLessThanOrEqual(20);
    expect(EVA_WAVEFORM_CONFIG.sampleCount).toBeLessThanOrEqual(36);
    expect(EVA_WAVEFORM_CONFIG.cylinderRadius).toBeGreaterThanOrEqual(0.1);
    expect(EVA_WAVEFORM_CONFIG.cylinderRadialSegments).toBeGreaterThanOrEqual(10);
    expect(EVA_WAVEFORM_CONFIG.cylinderLengthScale).toBeLessThan(0.95);
    expect(EVA_WAVEFORM_CONFIG.afterimageDamp).toBeLessThan(0.9);
  });
});
