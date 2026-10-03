// @vitest-environment jsdom
/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneAgentConfigs } from '../../domain/agent-config';
import i18n from '../../i18n';
import { NodeConnectionStatus } from './NodeConnectionStatus';
import type { DecisionRequestOptions } from '../../services/decision-service';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;
const status = { systemName: 'MAGI', source: 'remote' as const, connection: 'online' as const, protocol: 'MAGI/3.0', uptimeSeconds: 1, updatedAt: '2026-10-03T00:00:00Z' };
const agents = [{ id: 'MELCHIOR-1' as const, role: '科学者論理', health: 'nominal' as const, latencyMs: 0, vote: 'pending' as const }];
function serviceStub() { return { getSystemStatus: vi.fn(async (_options?: DecisionRequestOptions) => status), getAgents: vi.fn(async (_options?: DecisionRequestOptions) => agents) }; }
beforeEach(async () => { await i18n.changeLanguage('zh-CN'); container = document.createElement('div'); document.body.appendChild(container); });
afterEach(() => { if(root) act(() => root!.unmount()); root = null; container.remove(); vi.unstubAllGlobals(); });
function render(service = serviceStub(), startupFailed = false) {
  root ??= createRoot(container);
  act(() => root!.render(<NodeConnectionStatus service={service} configs={cloneAgentConfigs()} protocol="MAGI/3.0" startupFailed={startupFailed} />));
  return container.querySelector<HTMLButtonElement>('button')!;
}
describe('backend connectivity control', () => {
  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'])('localizes status and the backend test in %s', async locale => {
    await i18n.changeLanguage(locale); const button = render();
    expect(button.querySelector('strong')?.textContent).toBe(i18n.t('connectivity.normal'));
    expect(button.title).toContain(i18n.t('settings.testHelp'));
  });
  it('only calls the injected project backend adapter, never node provider URLs', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); const service = serviceStub(); const button = render(service);
    expect(service.getSystemStatus).not.toHaveBeenCalled(); await act(async () => { button.click(); });
    expect(service.getSystemStatus).toHaveBeenCalledTimes(1); expect(service.getAgents).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled(); expect(button.dataset.connection).toBe('online');
  });
  it('shows backend failure and recovers after retry', async () => {
    const service = serviceStub(); service.getSystemStatus.mockRejectedValueOnce(new Error('BACKEND UNAVAILABLE'));
    const button = render(service); await act(async () => { button.click(); });
    expect(button.querySelector('strong')?.textContent).toBe('超时'); expect(button.title).toContain('BACKEND UNAVAILABLE');
    await act(async () => { button.click(); }); expect(button.querySelector('strong')?.textContent).toBe('正常');
  });
  it('reports offline nodes even when the backend responds', async () => {
    const service = serviceStub(); service.getAgents.mockResolvedValueOnce([{ ...agents[0], health: 'offline' as never }]);
    const button = render(service); await act(async () => { button.click(); }); expect(button.dataset.connection).toBe('offline');
  });
  it('blocks duplicate checks and cancels work on unmount', async () => {
    const service = serviceStub(); service.getSystemStatus.mockImplementation(() => new Promise(() => {}));
    const button = render(service); await act(async () => { button.click(); button.click(); });
    expect(service.getSystemStatus).toHaveBeenCalledTimes(1); expect(button.getAttribute('aria-busy')).toBe('true');
    const signal = service.getSystemStatus.mock.calls[0]?.[0]?.signal;
    act(() => root!.unmount()); root = null; expect(signal?.aborted).toBe(true);
  });
});
