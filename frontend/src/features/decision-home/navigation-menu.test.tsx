// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { DecisionHome } from './DecisionHome';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const initialLocale = i18n.resolvedLanguage ?? i18n.language;
let container: HTMLDivElement;
let root: Root;

describe('portrait navigation menu', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<I18nextProvider i18n={i18n}><DecisionHome /></I18nextProvider>);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage(initialLocale);
  });

  it('opens from the menu button and closes on Escape or an outside press', () => {
    const toggle = container.querySelector<HTMLButtonElement>('.magi-home__nav-menu-toggle');
    const nav = container.querySelector<HTMLElement>('.magi-home__primary-nav');
    const language = container.querySelector<HTMLElement>('.magi-language-selector');
    if (!toggle || !nav || !language) throw new Error('Navigation controls were not rendered.');

    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
    expect(nav.contains(language)).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(nav.getAttribute('data-menu-open')).toBe('true');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);

    act(() => toggle.click());
    act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps settings dialogs outside the collapsed navigation after selecting an entry', () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); }
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) { this.removeAttribute('open'); }
    });
    try {
      const toggle = container.querySelector<HTMLButtonElement>('.magi-home__nav-menu-toggle')!;
      const nav = container.querySelector<HTMLElement>('.magi-home__primary-nav')!;
      for (const label of ['设置', '设定书']) {
        act(() => toggle.click());
        const entry = [...nav.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === label)!;
        act(() => entry.click());
        expect(nav.getAttribute('data-menu-open')).toBe('false');
        const dialog = document.body.querySelector<HTMLDialogElement>('dialog[open]')!;
        expect(dialog).not.toBeNull();
        expect(dialog.parentElement).toBe(document.body);
        expect(nav.contains(dialog)).toBe(false);
        act(() => dialog.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true })));
        expect(dialog.open).toBe(false);
      }
    } finally {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
      if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    }
  });
});
