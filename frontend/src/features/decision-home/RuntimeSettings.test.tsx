// @vitest-environment jsdom
/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENT_IDS, type AgentId } from '../../domain/decision';
import { defaultSharedSettings } from '../../domain/shared-settings';
import { mockModelFor } from '../../domain/agent-config';
import { loadSharedSettings, saveSharedSettings } from '../../storage/shared-settings-store';
import i18n from '../../i18n';
import { RuntimeSettings } from './RuntimeSettings';
import { useDecisionRuntime } from './use-decision-runtime';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
let runtime: ReturnType<typeof useDecisionRuntime>;
const modalMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype);

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN');
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true,
    value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
  const settings = defaultSharedSettings();
  settings.background = 'User-authored background';
  settings.global = { ...settings.global, connection: 'openai-compatible', baseUrl: 'https://global.invalid/v1', model: 'global-model', prompt: 'Custom global prompt' };
  for (const id of AGENT_IDS) {
    settings.sources[id] = id;
    settings.nodes[id] = { ...settings.nodes[id], displayName: `Custom ${id}`, role: 'Custom role', prompt: `Custom prompt ${id}`,
      connection: 'openai-compatible', baseUrl: `https://${id.toLowerCase()}.invalid/v1`, model: `model-${id}` };
  }
  saveSharedSettings(settings);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root?.unmount()); host?.remove(); window.localStorage.clear();
  for (const name of ['showModal', 'close']) {
    if (modalMethods[name]) Object.defineProperty(HTMLDialogElement.prototype, name, modalMethods[name]);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

function Harness({ variant }: { variant: 'modern' | 'original' }) {
  runtime = useDecisionRuntime();
  const [node, setNode] = useState<AgentId | null>(null);
  return <>
    {AGENT_IDS.map(id => <button key={id} onClick={() => setNode(id)}>{id}</button>)}
    <RuntimeSettings runtime={runtime} selectedAgentId={node} onCloseNode={() => setNode(null)} variant={variant} />
  </>;
}
function render(variant: 'modern' | 'original') {
  act(() => root.render(<I18nextProvider i18n={i18n}><Harness variant={variant} /></I18nextProvider>));
  // Credentials live only in memory, including keys owned by independent nodes.
  act(() => {
    const nodes = runtime.settings.nodes;
    runtime.saveGlobalConfig({ ...runtime.settings.global, apiKey: 'fixture-global-key' });
    for (const id of AGENT_IDS) runtime.saveAgentConfig({ ...nodes[id], apiKey: `fixture-key-${id}` });
  });
}
function openOverall() { act(() => host.querySelector<HTMLButtonElement>('.magi-settings-entry')!.click()); }
function dialog() { return document.body.querySelector<HTMLDialogElement>('dialog[open]')!; }
function reset() { act(() => dialog().querySelector<HTMLButtonElement>('.magi-home__dialog-reset')!.click()); }
function save() { act(() => dialog().querySelector<HTMLButtonElement>('button[type="submit"]')!.click()); }

describe('overall configuration reset', () => {
  it.each(['modern', 'original'] as const)('resets independent connections on save, persists their sources, and updates execution in %s', async variant => {
    render(variant); openOverall(); reset();
    // Draft reset alone must not affect the running configuration.
    expect(runtime.configs['CASPER-3'].apiKey).toBe('fixture-key-CASPER-3');
    save();
    const persisted = loadSharedSettings();
    for (const id of AGENT_IDS) {
      expect(runtime.configs[id].connection).toBe('mock');
      expect(runtime.configs[id].model).toBe(mockModelFor(id));
      expect(runtime.configs[id].apiKey).toBe('');
      expect(runtime.settings.nodes[id].apiKey).toBe('');
      expect(persisted.nodes[id].connection).toBe('mock');
      expect(persisted.sources[id]).toBe('global');
      expect(runtime.configs[id].displayName).toBe(`Custom ${id}`);
      expect(runtime.configs[id].prompt).toBe(`Custom prompt ${id}`);
      expect(runtime.configs[id].role).toBe('Custom role');
    }
    expect(runtime.settings.background).toBe('User-authored background');
    vi.useFakeTimers();
    const created = await runtime.service.createDecision({ subject: 'Reset connection fixture', priority: 'normal' });
    await runtime.service.executeDecision(created.id);
    await vi.advanceTimersByTimeAsync(1600);
    const completed = await runtime.service.getDecision(created.id);
    expect(completed.status).toBe('completed');
    for (const id of AGENT_IDS) expect(completed.outputs?.[id]?.connection).toBe('mock');
    expect(fetch).not.toHaveBeenCalled();
    // A subsequent ordinary global edit reaches all three nodes.
    act(() => runtime.saveGlobalConfig({ ...runtime.settings.global, connection: 'openai-compatible',
      baseUrl: 'https://next.invalid/v1', model: 'next-model', apiKey: 'fixture-next-key' }));
    for (const id of AGENT_IDS) expect(runtime.configs[id]).toMatchObject({ model: 'next-model', apiKey: 'fixture-next-key' });
  });

  it.each(['modern', 'original'] as const)('discards reset when cancelled and restores the saved draft when reopened in %s', variant => {
    render(variant); const before = JSON.stringify(runtime.settings); const stored = JSON.stringify(window.localStorage);
    openOverall(); reset();
    act(() => dialog().querySelector<HTMLButtonElement>('.magi-home__config-actions button[type="button"]')!.click());
    expect(JSON.stringify(runtime.settings)).toBe(before); expect(JSON.stringify(window.localStorage)).toBe(stored);
    openOverall();
    expect(dialog().querySelector<HTMLInputElement>('input[value="openai-compatible"]')!.checked).toBe(true);
    save();
    expect(runtime.settings.global.connection).toBe('openai-compatible');
    expect(runtime.settings.global.apiKey).toBe('fixture-global-key');
    for (const id of AGENT_IDS) expect(runtime.settings.sources[id]).toBe('global');
  });

  it.each(['modern', 'original'] as const)('applies an ordinary global save to independent mock and API nodes and sends three authenticated requests in %s', async variant => {
    render(variant);
    act(() => runtime.saveAgentConfig({ ...runtime.settings.nodes['CASPER-3'], connection: 'mock' }));
    expect(runtime.configs['CASPER-3'].connection).toBe('mock');
    openOverall(); save();
    for (const id of AGENT_IDS) {
      expect(runtime.settings.sources[id]).toBe('global');
      expect(runtime.configs[id]).toMatchObject({ connection: 'openai-compatible', baseUrl: 'https://global.invalid/v1',
        model: 'global-model', apiKey: 'fixture-global-key', displayName: `Custom ${id}`, prompt: `Custom prompt ${id}` });
      expect(runtime.settings.nodes[id].apiKey).toBe('');
      expect(loadSharedSettings().sources[id]).toBe('global');
    }
    const requests = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: {
      content: JSON.stringify({ vote: 'approve', reason: 'Fixture API response' })
    } }] }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', requests);
    const created = await runtime.service.createDecision({ subject: 'Global API fixture', priority: 'normal' });
    await runtime.service.executeDecision(created.id);
    await vi.waitFor(async () => expect((await runtime.service.getDecision(created.id)).status).toBe('completed'));
    expect(requests).toHaveBeenCalledTimes(3);
    for (const [url, init] of requests.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toBe('https://global.invalid/v1/chat/completions');
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-global-key');
      expect(JSON.parse(String(init.body)).model).toBe('global-model');
    }
    // A later node edit overrides only that node until the next overall save.
    act(() => runtime.saveAgentConfig({ ...runtime.configs['CASPER-3'], connection: 'mock' }));
    expect(runtime.configs['CASPER-3'].connection).toBe('mock');
    expect(runtime.configs['MELCHIOR-1'].connection).toBe('openai-compatible');
    openOverall(); save();
    expect(runtime.configs['CASPER-3'].connection).toBe('openai-compatible');
  });

  it('limits a node reset to that node', () => {
    render('modern');
    act(() => [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'CASPER-3')!.click());
    reset(); save();
    expect(runtime.configs['CASPER-3'].connection).toBe('mock');
    expect(runtime.configs['MELCHIOR-1'].apiKey).toBe('fixture-key-MELCHIOR-1');
    expect(runtime.settings.global.apiKey).toBe('fixture-global-key');
  });
});
