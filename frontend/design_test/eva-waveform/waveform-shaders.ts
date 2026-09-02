/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */

export const WAVE_VERTEX_SHADER = /* glsl */ `
  attribute float aTrail;
  attribute float aXEnd;
  attribute float aXStart;

  uniform float uAmplitude;
  uniform float uChannel;
  uniform float uCylinderLengthScale;
  uniform float uFrequency;
  uniform float uPhase;
  uniform float uSpeed;
  uniform float uTime;
  uniform float uTrailPhaseStep;

  varying float vTrail;
  varying float vSignal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  float waveformY(float x, float phase, float trail) {
    float history = trail - 0.5;
    float localPhase = phase
      + (sin((x * 0.31) - (uTime * 0.08)) * 0.22)
      + (uChannel * tanh(x * 0.42) * 0.22);
    float carrier = sin((x * uFrequency) + localPhase);
    float compressed = tanh(carrier * 1.34) / tanh(1.34);
    float shaped = mix(carrier, compressed, 0.68);
    float envelope = 1.0
      + (sin((x * 0.23) - 0.7 + (uChannel * 0.4)) * 0.1)
      + (history * 0.035)
      + (sin((trail * 91.7) + (uChannel * 0.8)) * 0.018);
    float shoulder = sin((x * 1.18) - (phase * 0.27) + (trail * 1.7)) * 0.095;
    float instability = sin((x * 0.37) + (uTime * 0.13) + (trail * 6.28318)) * 0.07;
    float lowerCompression = -0.12 * smoothstep(0.35, 1.0, -shaped);
    return (shaped * uAmplitude * envelope) + shoulder + instability + lowerCompression;
  }

  float waveformZ(float x, float phase, float trail) {
    float history = trail - 0.5;
    return (sin((x * 0.78) + (phase * 0.54) + (trail * 2.2)) * 0.55)
      + (history * 0.22);
  }

  void main() {
    float traceIndex = (aTrail - 0.5) * 35.0;
    float traceJitter = (sin(traceIndex * 1.73) * 0.026) + (sin(traceIndex * 0.63) * 0.018);
    float macroPhase = 2.48 + (sin(uTime * uSpeed) * 0.16);
    float phase = macroPhase + uPhase - (traceIndex * uTrailPhaseStep) + traceJitter;
    vec3 startPoint = vec3(
      aXStart,
      waveformY(aXStart, phase, aTrail),
      waveformZ(aXStart, phase, aTrail)
    );
    vec3 endPoint = vec3(
      aXEnd,
      waveformY(aXEnd, phase, aTrail),
      waveformZ(aXEnd, phase, aTrail)
    );
    vec3 segment = endPoint - startPoint;
    float segmentLength = length(segment);
    vec3 forward = normalize(segment);
    vec3 lateral = normalize(vec3(-forward.y, forward.x, 0.0));
    vec3 depthAxis = normalize(cross(forward, lateral));
    vec3 center = (startPoint + endPoint) * 0.5;
    vec3 transformed = center
      + (forward * position.y * segmentLength * uCylinderLengthScale)
      + (lateral * position.x)
      + (depthAxis * position.z);
    vec3 tubeNormal = normalize(
      (lateral * normal.x)
      + (forward * normal.y)
      + (depthAxis * normal.z)
    );
    float carrier = sin((((aXStart + aXEnd) * 0.5) * uFrequency) + phase);
    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);

    vTrail = aTrail;
    vSignal = abs(carrier);
    vViewNormal = normalize(normalMatrix * tubeNormal);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const WAVE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;

  varying float vTrail;
  varying float vSignal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    float centerWeight = 1.0 - abs((vTrail * 2.0) - 1.0);
    float historyFade = mix(0.045, 0.22, pow(centerWeight, 0.48));
    float crestEnergy = mix(0.8, 1.02, vSignal);
    vec3 normal = normalize(vViewNormal);
    vec3 viewDirection = normalize(-vViewPosition);
    vec3 lightDirection = normalize(vec3(-0.42, 0.58, 1.0));
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 24.0);
    float facing = max(dot(normal, viewDirection), 0.0);
    float roundBand = pow(facing, 1.35);
    float sideLight = 0.035 + (roundBand * 0.96) + (diffuse * 0.12) + (specular * 0.82);
    float curvedLight = sideLight;
    vec3 highlight = vec3(1.0, 0.88, 0.92) * specular * 0.8;
    vec3 cylinderColor = (uColor * (curvedLight + 0.16)) + highlight;
    gl_FragColor = vec4(cylinderColor * crestEnergy, historyFade);
  }
`;
