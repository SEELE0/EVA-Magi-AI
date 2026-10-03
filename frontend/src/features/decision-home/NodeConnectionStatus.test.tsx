// @vitest-environment jsdom
/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneAgentConfigs, type AgentConfigMap } from '../../domain/agent-config';
import { AGENT_IDS } from '../../domain/decision';
import i18n from '../../i18n';
import { NodeConnectionStatus } from './NodeConnectionStatus';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;
beforeEach(async () => {
  await i18n.changeLanguage('zh-CN');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function render(configs = cloneAgentConfigs(), startupFailed = false) {
  root ??= createRoot(container);
  act(() => root!.render(<NodeConnectionStatus configs={configs} protocol="MAGI/3.0" startupFailed={startupFailed} />));
  return container.querySelector<HTMLButtonElement>('button')!;
}
function liveConfigs(): AgentConfigMap {
  const configs = cloneAgentConfigs();
  AGENT_IDS.forEach(id => { configs[id] = { ...configs[id], connection: 'local-compatible',
    baseUrl: 'http://localhost:1234/v1', model: id, apiKey: 'test-placeholder-key', prompt: 'Do not send this prompt' }; });
  return configs;
}
function okResponse() { return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] })); }
function pendingFetch() {
  const signals: AbortSignal[] = [];
  const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
    const signal = init.signal!;
    signals.push(signal);
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  vi.stubGlobal('fetch', fetch);
  return { fetch, signals };
}

describe('header node connectivity test', () => {
  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'])('localizes the two-state control and test action in %s', async locale => {
    await i18n.changeLanguage(locale);
    const markup = renderToStaticMarkup(<I18nextProvider i18n={i18n}>
      <NodeConnectionStatus configs={cloneAgentConfigs()} protocol="MAGI/3.0" />
    </I18nextProvider>);
    expect(markup).toContain(`<strong>${i18n.t('connectivity.normal')}</strong>`);
    expect(markup).toContain(`aria-label="${i18n.t('connectivity.test')} · ${i18n.t('connectivity.normal')}"`);
    expect(markup).toContain(i18n.t('connectivity.unchecked'));
    expect(i18n.t('connectivity.timeout')).not.toBe('connectivity.timeout');
  });

  it('checks mock nodes locally without making API requests or pretending to verify live access', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const button = render();
    await act(async () => { button.click(); });
    expect(fetch).not.toHaveBeenCalled();
    expect(button.querySelector('strong')?.textContent).toBe('正常');
    expect(button.title).toContain(i18n.t('connectivity.simulated'));
    expect(button.getAttribute('aria-busy')).toBe('false');
  });

  it('probes each effective API configuration with a short request and does not save keys or prompts', async () => {
    const fetch = vi.fn(async () => okResponse()); vi.stubGlobal('fetch', fetch);
    const button = render(liveConfigs());
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => { button.click(); });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(button.querySelector('strong')?.textContent).toBe('正常');
    fetch.mock.calls.forEach(call => {
      const [url, init] = call as unknown as [string, RequestInit];
      expect(url).toBe('http://localhost:1234/v1/chat/completions');
      expect(JSON.parse(init.body as string).messages).toEqual([{ role: 'user', content: 'Connection test. Reply only OK.' }]);
      expect(init.body).not.toContain('test-placeholder-key');
    });
    expect(container.innerHTML).not.toContain('test-placeholder-key');
    expect(localStorage.getItem('magi-nerv:shared-settings:v1')).toBeNull();
  });

  it('shows timeout when any node fails, retains the cause, and recovers on retry', async () => {
    let fail = true;
    const fetch = vi.fn(async (_url: string, init: RequestInit) =>
      fail && JSON.parse(init.body as string).model === 'CASPER-3'
        ? new Response('do not expose the provider error body', { status: 401 }) : okResponse());
    vi.stubGlobal('fetch', fetch);
    const button = render(liveConfigs());
    await act(async () => { button.click(); });
    expect(button.querySelector('strong')?.textContent).toBe('超时');
    expect(button.dataset.connection).toBe('offline');
    expect(button.title).toContain('CASPER-3');
    expect(button.title).toContain('401');
    expect(button.title).not.toContain('provider error body');
    fail = false;
    await act(async () => { button.click(); });
    expect(button.querySelector('strong')?.textContent).toBe('正常');
    expect(button.dataset.connection).toBe('online');
    expect(button.title).not.toContain('401');
  });

  it('tests only the API node when simulation and API connections are mixed', async () => {
    const configs = cloneAgentConfigs();
    configs['BALTHASAR-2'] = liveConfigs()['BALTHASAR-2'];
    const fetch = vi.fn(async () => okResponse()); vi.stubGlobal('fetch', fetch);
    const button = render(configs);
    await act(async () => { button.click(); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(button.querySelector('strong')?.textContent).toBe('正常');
  });

  it('times out stalled requests at 15 seconds and blocks repeated clicks during a check', async () => {
    vi.useFakeTimers();
    const { fetch } = pendingFetch();
    const button = render(liveConfigs());
    await act(async () => { button.click(); button.click(); });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('strong')?.textContent).toBe('正常');
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(button.querySelector('strong')?.textContent).toBe('超时');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels stale checks when connection settings change and ignores their results', async () => {
    const { signals } = pendingFetch();
    const button = render(liveConfigs());
    await act(async () => { button.click(); });
    await act(async () => { render(cloneAgentConfigs()); });
    expect(signals.every(signal => signal.aborted)).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.querySelector('strong')?.textContent).toBe('正常');
    expect(button.title).toContain(i18n.t('connectivity.unchecked'));
  });

  it('keeps a valid result across role edits and language changes but invalidates changed connections', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    const configs = liveConfigs();
    const button = render(configs);
    await act(async () => { button.click(); });
    expect(button.querySelector('strong')?.textContent).toBe('超时');
    const renamed = { ...configs, 'CASPER-3': { ...configs['CASPER-3'], displayName: '审查节点', role: '自定义角色' } };
    render(renamed);
    expect(button.title).toContain('审查节点');
    await act(async () => { await i18n.changeLanguage('en-US'); });
    expect(button.querySelector('strong')?.textContent).toBe('Timeout');
    render({ ...renamed, 'CASPER-3': { ...renamed['CASPER-3'], apiKey: 'replacement-placeholder' } });
    expect(button.querySelector('strong')?.textContent).toBe('Normal');
    expect(button.title).toContain(i18n.t('connectivity.unchecked'));
  });

  it('aborts in-flight checks on unmount', async () => {
    const { signals } = pendingFetch();
    const button = render(liveConfigs());
    await act(async () => { button.click(); });
    await act(async () => { root!.unmount(); root = null; });
    expect(signals.every(signal => signal.aborted)).toBe(true);
  });
});
