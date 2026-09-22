// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Decision } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { DecisionHomeAnimeOriginal } from './main';
import { loadDecisionHistory } from '../decision-home/history-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draft: Decision = {
  id: 'dec-origin',
  subject: '第三新东京市应急供电方案',
  priority: 'normal',
  status: 'draft',
  verdict: 'pending',
  votes: { 'MELCHIOR-1': 'pending', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' },
  createdAt: '2026-08-28T00:00:00.000Z',
};

const running: Decision = {
  ...draft,
  status: 'running',
  votes: { ...draft.votes, 'MELCHIOR-1': 'approve' },
};

const completed: Decision = {
  ...draft,
  status: 'completed',
  verdict: 'approved',
  votes: { 'MELCHIOR-1': 'approve', 'BALTHASAR-2': 'approve', 'CASPER-3': 'reject' },
  completedAt: '2026-08-28T00:00:02.000Z',
};

interface RenderHandle {
  container: HTMLElement;
  root: Root;
}

const handles: RenderHandle[] = [];

function serviceStub(overrides: Partial<DecisionService> = {}): DecisionService {
  return {
    getSystemStatus: vi.fn(),
    getAgents: vi.fn(),
    createDecision: vi.fn().mockResolvedValue(draft),
    getDecision: vi.fn().mockResolvedValue(completed),
    executeDecision: vi.fn().mockResolvedValue(completed),
    getEvents: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as DecisionService;
}

function installMatchMedia(reducedMotion = false) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

function renderOrigin(service: DecisionService): RenderHandle {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<DecisionHomeAnimeOriginal service={service} />));
  const handle = { container, root };
  handles.push(handle);
  return handle;
}

function fillTextarea(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function phase(container: HTMLElement) {
  return container.querySelector('.direct-link-page')?.getAttribute('data-phase');
}

describe('DecisionHomeAnimeOriginal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installMatchMedia();
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() { this.setAttribute('open', ''); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() { this.removeAttribute('open'); },
    });
  });

  afterEach(() => {
    handles.splice(0).forEach(({ root }) => {
      act(() => root.unmount());
    });
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects an empty agenda without calling the decision service', () => {
    const service = serviceStub();
    const { container } = renderOrigin(service);

    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());

    expect(phase(container)).toBe('error');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('議題を入力');
    expect(service.createDecision).not.toHaveBeenCalled();
  });

  it('opens an empty local archive without losing the draft and closes it', () => {
    const { container } = renderOrigin(serviceStub());
    fillTextarea(container.querySelector('textarea')!, '未提交的议题');
    act(() => container.querySelector<HTMLButtonElement>('.direct-history-trigger')!.click());
    expect(container.querySelector('dialog.direct-history')?.hasAttribute('open')).toBe(true);
    expect(container.querySelector('.direct-history')?.textContent).toContain('NO RECORDS');
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="关闭历史记录"]')!.click());
    expect(container.querySelector('.direct-history')).toBeNull();
    expect(container.querySelector('textarea')?.value).toBe('未提交的议题');
  });

  it('renders the three nodes, connectors, and core inside one positioned network component', () => {
    const { container } = renderOrigin(serviceStub());
    const leftCalibration = container.querySelector<SVGSVGElement>('.terminal-calibration-layer--left');
    const rightCalibration = container.querySelector<SVGSVGElement>('.terminal-calibration-layer--right');
    const information = container.querySelector<SVGSVGElement>('.terminal-information-layer');
    const connection = container.querySelector<SVGSVGElement>('.terminal-connection-layer');
    const network = container.querySelector<SVGSVGElement>('.terminal-network-layer');
    const networkComponent = container.querySelector<SVGGElement>('[data-magi-network]');

    expect(leftCalibration?.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
    expect(rightCalibration?.getAttribute('preserveAspectRatio')).toBe('xMaxYMin meet');
    expect(information?.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
    expect(connection?.getAttribute('preserveAspectRatio')).toBe('xMaxYMin meet');
    expect(network?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(leftCalibration?.querySelector('[data-calibration-side="left"]')).not.toBeNull();
    expect(rightCalibration?.querySelector('[data-calibration-side="right"]')).not.toBeNull();
    expect(information?.querySelector('.terminal-calibration')).toBeNull();
    expect(information?.contains(container.querySelector('.terminal-header'))).toBe(true);
    expect(information?.contains(container.querySelector('.connection-data'))).toBe(false);
    expect(connection?.contains(container.querySelector('.connection-data'))).toBe(true);
    expect(network?.contains(networkComponent)).toBe(true);
    expect(networkComponent?.querySelectorAll('.agent-module')).toHaveLength(3);
    expect(networkComponent?.querySelectorAll('[data-agent-shared-edge]')).toHaveLength(3);
    networkComponent?.querySelectorAll('.agent-module').forEach((agent) => {
      expect(agent.querySelectorAll('[data-agent-shared-edge]')).toHaveLength(1);
    });
    expect(networkComponent?.querySelectorAll('[data-connector]')).toHaveLength(3);
    const core = networkComponent?.querySelector('.magi-core');
    const firstSharedEdge = networkComponent?.querySelector('[data-agent-shared-edge]');
    expect(core).not.toBeNull();
    expect(firstSharedEdge).not.toBeNull();
    if (!core || !firstSharedEdge) throw new Error('MAGI shared-edge layering was not rendered.');
    expect(core.compareDocumentPosition(firstSharedEdge) & 4).toBe(4);
    const physicalStatus = [...(connection?.querySelectorAll('text') ?? [])]
      .find((node) => node.textContent === 'L401 - BASIC READY');
    expect(physicalStatus?.getAttribute('textLength')).toBe('145');
    expect(physicalStatus?.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
    expect(networkComponent?.dataset.positionX).toBe('0');
    expect(networkComponent?.dataset.positionY).toBe('-25');
    expect(networkComponent?.dataset.scale).toBe('1');
    expect(networkComponent?.style.transform).toBe('translate(0px, -25px) scale(1)');
  });

  it('collapses the composer, publishes partial votes, and reaches the final verdict', async () => {
    const getDecision = vi.fn().mockResolvedValueOnce(running).mockResolvedValueOnce(completed);
    const service = serviceStub({
      getDecision,
      executeDecision: vi.fn().mockResolvedValue(running),
    });
    const { container } = renderOrigin(service);
    const textarea = container.querySelector<HTMLTextAreaElement>('#direct-link-motion');
    if (!textarea) throw new Error('Motion input was not rendered.');

    fillTextarea(textarea, draft.subject);
    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());

    expect(phase(container)).toBe('transitioning');
    expect(container.querySelector('.motion-composer')?.classList.contains('is-collapsed')).toBe(true);
    expect(container.querySelector('.agent-module')?.getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector<SVGGElement>('[data-magi-network]')?.dataset.positionY).toBe('-81');
    expect(container.querySelector<SVGGElement>('[data-magi-network]')?.style.transform).toBe('translate(0px, -81px) scale(1)');

    await advance(520);
    expect(phase(container)).toBe('deliberation');

    await advance(220);
    expect([...container.querySelectorAll('.vote-text')].map((node) => node.textContent)).toContain('承認');

    await advance(220);
    expect(phase(container)).toBe('final');
    expect(loadDecisionHistory()).toHaveLength(1);
    expect(loadDecisionHistory()[0].subject).toBe(completed.subject);
    expect(loadDecisionHistory()[0].votes).toEqual(completed.votes);
    expect(loadDecisionHistory()[0].agents['MELCHIOR-1'].connection).toBe('unknown');
    expect(JSON.stringify(loadDecisionHistory())).not.toContain('apiKey');
    expect([...container.querySelectorAll('.vote-text')].map((node) => node.textContent)).toEqual(['承認', '否決', '承認']);
    expect(container.querySelector('.motion-copy')?.textContent).toBe('FINAL VERDICT : 承認 / 02 / 03');
    expect(container.querySelector<HTMLButtonElement>('.direct-link-new-motion')).not.toBeNull();

    act(() => container.querySelector<HTMLButtonElement>('.direct-link-new-motion')?.click());
    expect(phase(container)).toBe('compose');
    expect(container.querySelector<HTMLTextAreaElement>('#direct-link-motion')?.value).toBe('');
  });

  it('restores the input and preserves the agenda when the service fails', async () => {
    const service = serviceStub({ createDecision: vi.fn().mockRejectedValue(new Error('REMOTE LINK LOST')) });
    const { container } = renderOrigin(service);
    const textarea = container.querySelector<HTMLTextAreaElement>('#direct-link-motion');
    if (!textarea) throw new Error('Motion input was not rendered.');

    fillTextarea(textarea, draft.subject);
    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
    await advance(520);

    expect(phase(container)).toBe('error');
    expect(container.querySelector<HTMLTextAreaElement>('#direct-link-motion')?.value).toBe(draft.subject);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('REMOTE LINK LOST');
    expect(container.querySelector('.motion-copy')?.textContent).toContain('SIGNAL FAILURE / RETRY ENABLED');
    expect(container.querySelector('.direct-link-live-status')?.textContent).toContain('SIGNAL FAILURE. REMOTE LINK LOST');
  });

  it('opens all three node identities and persists public configuration without credentials', () => {
    const { container } = renderOrigin(serviceStub());
    const nodeButtons = [...container.querySelectorAll<SVGGElement>('.agent-module')];

    expect(nodeButtons.map((node) => node.getAttribute('aria-label'))).toEqual([
      'BALTHASAR-2 の設定を開く',
      'CASPER-3 の設定を開く',
      'MELCHIOR-1 の設定を開く',
    ]);

    act(() => nodeButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const dialog = container.querySelector<HTMLDialogElement>('.magi-home__config-dialog--original');
    if (!dialog) throw new Error('Original node configuration dialog was not rendered.');
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('BALTHASAR-2 ノード設定');

    expect(dialog.querySelector('input[type="url"]')).toBeNull();
    act(() => dialog.querySelector<HTMLInputElement>('input[value="openai-compatible"]')?.click());
    const fields = dialog.querySelectorAll<HTMLInputElement>('.magi-home__config-field input');
    const model = fields[1];
    const apiKey = fields[2];
    if (!model || !apiKey) throw new Error('Node configuration fields were not rendered.');
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      inputSetter?.call(fields[0], 'https://example.invalid/v1');
      fields[0]?.dispatchEvent(new Event('input', { bubbles: true }));
      inputSetter?.call(model, 'MAGI-SIM / CUSTOM');
      model.dispatchEvent(new Event('input', { bubbles: true }));
      inputSetter?.call(apiKey, 'sk-page-memory-only');
      apiKey.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
    act(() => nodeButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const reopenedFields = container.querySelectorAll<HTMLInputElement>('.magi-home__config-field input');
    expect(reopenedFields[1]?.value).toBe('MAGI-SIM / CUSTOM');
    expect(reopenedFields[2]?.value).toBe('sk-page-memory-only');
    expect(JSON.stringify(window.localStorage)).not.toContain('sk-page-memory-only');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('skips the visual hold for reduced motion', async () => {
    installMatchMedia(true);
    const { container } = renderOrigin(serviceStub());
    const textarea = container.querySelector<HTMLTextAreaElement>('#direct-link-motion');
    if (!textarea) throw new Error('Motion input was not rendered.');

    fillTextarea(textarea, draft.subject);
    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
    await flush();

    expect(phase(container)).toBe('final');
  });

  it('aborts an in-flight decision when unmounted', async () => {
    let requestSignal: AbortSignal | undefined;
    const createDecision = vi.fn((_request, options) => {
      requestSignal = options?.signal;
      return new Promise<Decision>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    });
    const { container, root } = renderOrigin(serviceStub({ createDecision }));
    const textarea = container.querySelector<HTMLTextAreaElement>('#direct-link-motion');
    if (!textarea) throw new Error('Motion input was not rendered.');

    fillTextarea(textarea, draft.subject);
    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
    await advance(520);
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => root.unmount());
    expect(requestSignal?.aborted).toBe(true);
    handles.splice(handles.findIndex((handle) => handle.root === root), 1);
  });
});
