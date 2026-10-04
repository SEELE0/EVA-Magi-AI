// @vitest-environment jsdom
/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { DEFAULT_SETTING_BOOKS } from '../../domain/setting-book';
import { SettingBookDialog } from './SettingBookDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const onSave = vi.fn();
const onClose = vi.fn();
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN');
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.restoreAllMocks();
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  await i18n.changeLanguage('zh-CN');
});

function render(background: string, open = true) {
  act(() => root.render(<I18nextProvider i18n={i18n}>
    <SettingBookDialog open={open} background={background} onSave={onSave} onClose={onClose} />
  </I18nextProvider>));
}
function textarea() { return container.querySelector('textarea')!; }
function edit(value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('localized setting book draft', () => {
  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'] as const)('restores and saves the expanded default in %s', async locale => {
    await i18n.changeLanguage(locale);
    render('User-authored setting');
    act(() => container.querySelector<HTMLButtonElement>('.magi-home__restore-background')!.click());
    expect(textarea().value).toBe(DEFAULT_SETTING_BOOKS[locale]);
    expect(textarea().value).toContain('666');
    act(() => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onSave).toHaveBeenCalledWith(DEFAULT_SETTING_BOOKS[locale]);
  });

  it('updates an unchanged default while open without overwriting an unsaved edit', async () => {
    render(DEFAULT_SETTING_BOOKS['zh-CN']);
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    expect(textarea().value).toBe(DEFAULT_SETTING_BOOKS['ja-JP']);
    const edited = '  My unsaved setting / 未保存の設定\n保持空格  ';
    edit(edited);
    await act(async () => { await i18n.changeLanguage('en-US'); });
    render(DEFAULT_SETTING_BOOKS['en-US']);
    expect(textarea().value).toBe(edited);
    act(() => container.querySelector<HTMLButtonElement>('.magi-home__restore-background')!.click());
    expect(textarea().value).toBe(DEFAULT_SETTING_BOOKS['en-US']);
  });

  it('discards cancelled edits on reopening and saves custom content exactly', async () => {
    const saved = '  Saved / 已保存\noriginal  ';
    render(saved);
    edit('unsaved changes');
    render(saved, false);
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    render(saved);
    expect(textarea().value).toBe(saved);
    act(() => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onSave).toHaveBeenCalledWith(saved);
    expect(onClose).toHaveBeenCalled();
  });
});
