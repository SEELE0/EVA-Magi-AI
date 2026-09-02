/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import {
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Sphere,
  Vector3
} from 'three';
import { EVA_WAVEFORM_CONFIG } from './waveform-config';

export function createWaveGeometry() {
  const {
    cylinderRadialSegments,
    cylinderRadius,
    sampleCount,
    trailCount,
    xMin,
    xMax
  } = EVA_WAVEFORM_CONFIG;
  const instanceCount = trailCount * (sampleCount - 1);
  const xStarts = new Float32Array(instanceCount);
  const xEnds = new Float32Array(instanceCount);
  const trailOffsets = new Float32Array(instanceCount);
  let instanceIndex = 0;

  const cagePositions: number[] = [];
  const cageNormals: number[] = [];
  const addCageVertex = (x: number, y: number, z: number, normalX: number, normalZ: number) => {
    cagePositions.push(x, y, z);
    cageNormals.push(normalX, 0, normalZ);
  };

  for (let radial = 0; radial < cylinderRadialSegments; radial += 1) {
    const angle = (radial / cylinderRadialSegments) * Math.PI * 2;
    const nextAngle = ((radial + 1) / cylinderRadialSegments) * Math.PI * 2;
    const x = Math.cos(angle) * cylinderRadius;
    const z = Math.sin(angle) * cylinderRadius;
    const nextX = Math.cos(nextAngle) * cylinderRadius;
    const nextZ = Math.sin(nextAngle) * cylinderRadius;
    const normalX = Math.cos(angle);
    const normalZ = Math.sin(angle);
    const nextNormalX = Math.cos(nextAngle);
    const nextNormalZ = Math.sin(nextAngle);

    // Bottom ring.
    addCageVertex(x, -0.5, z, normalX, normalZ);
    addCageVertex(nextX, -0.5, nextZ, nextNormalX, nextNormalZ);
    // Top ring.
    addCageVertex(x, 0.5, z, normalX, normalZ);
    addCageVertex(nextX, 0.5, nextZ, nextNormalX, nextNormalZ);
    // Longitudinal rail.
    addCageVertex(x, -0.5, z, normalX, normalZ);
    addCageVertex(x, 0.5, z, normalX, normalZ);
  }

  for (let trail = 0; trail < trailCount; trail += 1) {
    const normalizedTrail = trail / (trailCount - 1);

    for (let sample = 0; sample < sampleCount - 1; sample += 1) {
      const firstProgress = sample / (sampleCount - 1);
      const secondProgress = (sample + 1) / (sampleCount - 1);
      const firstX = xMin + ((xMax - xMin) * firstProgress);
      const secondX = xMin + ((xMax - xMin) * secondProgress);

      xStarts[instanceIndex] = firstX;
      xEnds[instanceIndex] = secondX;
      trailOffsets[instanceIndex] = normalizedTrail;
      instanceIndex += 1;
    }
  }

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(cagePositions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(cageNormals, 3));
  geometry.setAttribute('aXStart', new InstancedBufferAttribute(xStarts, 1));
  geometry.setAttribute('aXEnd', new InstancedBufferAttribute(xEnds, 1));
  geometry.setAttribute('aTrail', new InstancedBufferAttribute(trailOffsets, 1));
  geometry.instanceCount = instanceCount;
  geometry.userData.segmentPrimitive = 'wireframe-cylinder-cage';
  geometry.boundingSphere = new Sphere(new Vector3(), 10);
  return geometry;
}
