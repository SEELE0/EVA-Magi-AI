/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Color,
  LineSegments,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createWaveGeometry } from './waveform-geometry';
import {
  EVA_WAVEFORM_CONFIG,
  RETICLE_POSITIONS,
  X_AXIS_LABELS,
  Y_AXIS_TICKS
} from './waveform-config';
import { WAVE_FRAGMENT_SHADER, WAVE_VERTEX_SHADER } from './waveform-shaders';
import './eva-waveform.css';

export interface EvaWaveformScopeProps {
  className?: string;
  paused?: boolean;
}

interface WaveformRuntime {
  dispose: () => void;
  setPaused: (paused: boolean) => void;
}

interface WaveformAnimationState {
  disposed: boolean;
  intersecting: boolean;
  paused: boolean;
  reducedMotion: boolean;
  visible: boolean;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function shouldAnimateWaveform({
  disposed,
  intersecting,
  paused,
  reducedMotion,
  visible
}: WaveformAnimationState) {
  return !paused && !reducedMotion && visible && intersecting && !disposed;
}

function createWaveMaterial(color: string, phase: number, channel: number) {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: WAVE_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uAmplitude: { value: EVA_WAVEFORM_CONFIG.amplitude },
      uChannel: { value: channel },
      uColor: { value: new Color(color) },
      uCylinderLengthScale: { value: EVA_WAVEFORM_CONFIG.cylinderLengthScale },
      uFrequency: { value: EVA_WAVEFORM_CONFIG.frequency },
      uPhase: { value: phase },
      uSpeed: { value: EVA_WAVEFORM_CONFIG.speed },
      uTime: { value: EVA_WAVEFORM_CONFIG.staticTime },
      uTrailPhaseStep: { value: EVA_WAVEFORM_CONFIG.trailPhaseStep }
    },
    vertexShader: WAVE_VERTEX_SHADER
  });
}

function formatScopeTime(elapsedSeconds: number) {
  const baseMilliseconds = ((38 * 60) + 50.909) * 1000;
  const totalMilliseconds = Math.floor(baseMilliseconds + (elapsedSeconds * 1000));
  const minutes = Math.floor(totalMilliseconds / 60_000) % 60;
  const seconds = Math.floor(totalMilliseconds / 1000) % 60;
  const milliseconds = totalMilliseconds % 1000;
  return `10:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${String(milliseconds).padStart(3, '0')}`;
}

export function EvaWaveformScope({ className = '', paused = false }: EvaWaveformScopeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<WaveformRuntime | null>(null);
  const timecodeRef = useRef<HTMLOutputElement>(null);
  const [rendererOffline, setRendererOffline] = useState(false);

  useEffect(() => {
    runtimeRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer | null = null;
    let composer: EffectComposer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let animationFrame = 0;
    let disposed = false;
    let running = false;
    let isVisible = !document.hidden;
    let isIntersecting = true;
    let isPaused = paused;
    let reducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
    let elapsed = EVA_WAVEFORM_CONFIG.staticTime;
    let lastFrameTime = performance.now();
    let lastTimecodeUpdate = 0;

    const mediaQuery = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const geometry = createWaveGeometry();
    const redMaterial = createWaveMaterial(EVA_WAVEFORM_CONFIG.red, 0, -1);
    const blueMaterial = createWaveMaterial(EVA_WAVEFORM_CONFIG.blue, EVA_WAVEFORM_CONFIG.phaseOffset, 1);
    const scene = new Scene();
    const camera = new OrthographicCamera(
      EVA_WAVEFORM_CONFIG.xMin,
      EVA_WAVEFORM_CONFIG.xMax,
      EVA_WAVEFORM_CONFIG.yMax,
      EVA_WAVEFORM_CONFIG.yMin,
      0.1,
      20
    );
    camera.position.z = 8;
    scene.add(new LineSegments(geometry, redMaterial));
    scene.add(new LineSegments(geometry, blueMaterial));

    const setWaveTime = (time: number) => {
      redMaterial.uniforms.uTime.value = time;
      blueMaterial.uniforms.uTime.value = time;
    };

    const updateTimecode = (time: number) => {
      if (timecodeRef.current) timecodeRef.current.value = formatScopeTime(time);
    };

    const stop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      running = false;
    };

    const renderOnce = () => {
      if (!composer || disposed) return;
      setWaveTime(elapsed);
      updateTimecode(elapsed);
      composer.render();
    };

    const animate = (now: number) => {
      if (disposed || !composer) return;
      const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      elapsed += delta;
      setWaveTime(elapsed);
      if (now - lastTimecodeUpdate >= 100) {
        updateTimecode(elapsed);
        lastTimecodeUpdate = now;
      }
      composer.render();
      animationFrame = requestAnimationFrame(animate);
    };

    const updateAnimationState = () => {
      const shouldRun = shouldAnimateWaveform({
        disposed,
        intersecting: isIntersecting,
        paused: isPaused,
        reducedMotion,
        visible: isVisible
      });
      if (shouldRun && !running) {
        running = true;
        lastFrameTime = performance.now();
        animationFrame = requestAnimationFrame(animate);
      } else if (!shouldRun) {
        stop();
        renderOnce();
      }
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      updateAnimationState();
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) elapsed = EVA_WAVEFORM_CONFIG.staticTime;
      updateAnimationState();
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setRendererOffline(true);
    };

    const handleContextRestored = () => {
      setRendererOffline(false);
      updateAnimationState();
    };

    try {
      renderer = new WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.domElement.className = 'eva-waveform-scope__canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setClearColor(0x010101, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      host.appendChild(renderer.domElement);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new AfterimagePass(EVA_WAVEFORM_CONFIG.afterimageDamp));
      composer.addPass(new UnrealBloomPass(
        new Vector2(1, 1),
        EVA_WAVEFORM_CONFIG.bloom.strength,
        EVA_WAVEFORM_CONFIG.bloom.radius,
        EVA_WAVEFORM_CONFIG.bloom.threshold
      ));

      const resize = () => {
        if (!renderer || !composer) return;
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
        renderOnce();
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
          isIntersecting = entry?.isIntersecting ?? true;
          updateAnimationState();
        }, { threshold: 0.01 });
        intersectionObserver.observe(host);
      }

      document.addEventListener('visibilitychange', handleVisibility);
      mediaQuery?.addEventListener('change', handleMotionPreference);
      setRendererOffline(false);
      resize();
      updateAnimationState();
    } catch {
      setRendererOffline(true);
    }

    const runtime: WaveformRuntime = {
      setPaused(nextPaused) {
        isPaused = nextPaused;
        updateAnimationState();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        stop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
        mediaQuery?.removeEventListener('change', handleMotionPreference);
        if (renderer) {
          renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
          renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
          renderer.domElement.remove();
          renderer.dispose();
        }
        composer?.dispose();
        geometry.dispose();
        redMaterial.dispose();
        blueMaterial.dispose();
      }
    };

    runtimeRef.current = runtime;
    return () => {
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, []);

  const classes = ['eva-waveform-scope', className].filter(Boolean).join(' ');

  return (
    <section
      className={classes}
      data-paused={paused ? 'true' : 'false'}
      data-renderer={rendererOffline ? 'offline' : 'online'}
      role="img"
      aria-label="EVA NERV 红蓝相位信号示波器"
    >
      <div className="eva-waveform-scope__render-host" ref={hostRef} aria-hidden="true" />

      <div className="eva-waveform-scope__instrument" aria-hidden="true">
        <div className="eva-waveform-scope__top-rail" />
        <div className="eva-waveform-scope__bottom-rail" />
        <div className="eva-waveform-scope__vertical-axis">
          {Y_AXIS_TICKS.map((tick) => <i key={tick} className={tick % 4 === 0 ? 'is-major' : ''} />)}
        </div>

        <div className="eva-waveform-scope__axis-labels">
          {X_AXIS_LABELS.map((label) => <span key={label}>{label > 0 ? `+${label}` : label}</span>)}
        </div>

        <div className="eva-waveform-scope__reticles">
          {RETICLE_POSITIONS.map(([left, top]) => (
            <i key={`${left}-${top}`} style={{ left: `${left}%`, top: `${top}%` }} />
          ))}
        </div>

        <output className="eva-waveform-scope__timecode" ref={timecodeRef}>10:38:50909</output>
      </div>

      <div className="eva-waveform-scope__scanlines" aria-hidden="true" />
      <div className="eva-waveform-scope__noise" aria-hidden="true" />
      <div className="eva-waveform-scope__vignette" aria-hidden="true" />

      {rendererOffline ? (
        <div className="eva-waveform-scope__offline" role="status">
          <strong>SIGNAL RENDERER OFFLINE</strong>
          <span>WEBGL CONTEXT NOT AVAILABLE</span>
        </div>
      ) : null}
    </section>
  );
}

export default EvaWaveformScope;
