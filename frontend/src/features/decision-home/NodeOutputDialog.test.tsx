// @vitest-environment jsdom
/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import type { Decision } from '../../domain/decision';
import { NodeOutputDialog } from './NodeOutputDialog';

vi.mock('../../../design_test/eva-waveform/EvaWaveformScope', () => ({ default: (props: { paused: boolean; showTimecode: boolean; label: string }) =>
  <div data-waveform="" data-paused={String(props.paused)} data-timecode={String(props.showTimecode)} aria-label={props.label} /> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const running: Decision = { id: 'run', subject: '议题原文', priority: 'normal', status: 'running', verdict: 'pending',
  votes: { 'MELCHIOR-1': 'pending', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' },
  agentNames: { 'MELCHIOR-1': '判定时名称', 'BALTHASAR-2': 'BALTHASAR-2', 'CASPER-3': 'CASPER-3' },
  partialResponses: { 'MELCHIOR-1': '原文 / original 日本語\n<not markup>' }, createdAt: '2026-10-04T00:00:00Z' };
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const close = vi.fn();
async function render(decision: Decision) {
  await act(async () => root.render(<I18nextProvider i18n={i18n}><NodeOutputDialog agentId="MELCHIOR-1" decision={decision}
    name="当前名称" onClose={close} /></I18nextProvider>));
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); close.mockClear();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); await i18n.changeLanguage('zh-CN'); });

describe('node output dialog', () => {
  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'])('shows only the selected node and preserves raw output in %s', async locale => {
    await i18n.changeLanguage(locale); await render(running);
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain(i18n.t('stream.receiving'));
    expect(dialog.querySelector('h2')?.textContent).toBe('判定时名称');
    expect(dialog.querySelector('pre')?.textContent).toContain('原文 / original 日本語\n<not markup>');
    expect(dialog.querySelector('not')).toBeNull();
    expect(dialog.textContent).not.toContain('CASPER-3');
    expect(dialog.querySelector('[data-waveform]')?.getAttribute('data-paused')).toBe('false');
    expect(dialog.querySelector('[data-waveform]')?.getAttribute('data-timecode')).toBe('true');
  });

  it('updates an open terminal as previews and the verified result arrive without reopening', async () => {
    await render(running); const dialog = document.querySelector('dialog')!;
    await render({ ...running, partialResponses: { 'MELCHIOR-1': '新增正文' } });
    expect(dialog.querySelector('pre')?.textContent).toContain('新增正文');
    await render({ ...running, status: 'completed', votes: { ...running.votes, 'MELCHIOR-1': 'approve' }, responses: { 'MELCHIOR-1': '完整最终正文' } });
    expect(dialog.querySelector('pre')?.textContent).toBe('完整最终正文');
    expect(dialog.querySelector('[role="status"]')?.textContent).toBe('承認');
    expect(dialog.querySelector('[data-waveform]')?.getAttribute('data-paused')).toBe('false');
    expect(dialog.querySelector('.node-output-dialog__cursor')).toBeNull();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
  });

  it('retains failed partial text and marks it incomplete without a verified vote', async () => {
    await render({ ...running, status: 'failed', failures: { 'MELCHIOR-1': 'invalid stream' } });
    const dialog = document.querySelector('dialog')!;
    expect(dialog.dataset.state).toBe('failed');
    expect(dialog.textContent).toContain(i18n.t('stream.failedHint'));
    expect(dialog.querySelector('pre')?.textContent).toContain('原文 / original 日本語');
    expect(dialog.textContent).not.toContain('承認');
    expect(dialog.querySelector('[data-waveform]')?.getAttribute('data-paused')).toBe('false');
  });

  it('closes using the button or Escape and returns focus when unmounted', async () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    await render(running); const dialog = document.querySelector('dialog')!;
    act(() => dialog.querySelector<HTMLButtonElement>('button')!.click());
    expect(close).toHaveBeenCalledTimes(1);
    act(() => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(close).toHaveBeenCalledTimes(2);
    await act(async () => root.render(null));
    expect(document.activeElement).toBe(trigger); trigger.remove();
  });
});
