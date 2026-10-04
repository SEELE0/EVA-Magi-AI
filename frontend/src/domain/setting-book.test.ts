/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest';
import { MAGI_LOCALES, normalizeLocale } from '../i18n';
import { DEFAULT_SETTING_BOOKS, EVA_BACKGROUND, localizeDefaultSettingBook } from './setting-book';
import { MIXED_SCRIPT_EOE_SECTION, PREVIOUS_EOE_SECTIONS } from './setting-book-legacy';

function priorBook(locale: keyof typeof DEFAULT_SETTING_BOOKS) {
  const book = DEFAULT_SETTING_BOOKS[locale];
  const start = book.indexOf('## EoE');
  const end = book.indexOf('\n## ', start);
  return book.slice(0, start) + PREVIOUS_EOE_SECTIONS[locale] + book.slice(end);
}

describe('localized default setting books', () => {
  it.each(MAGI_LOCALES)('switches every built-in book to %s with all episodes and original references', locale => {
    const expected = DEFAULT_SETTING_BOOKS[locale];
    for (const background of Object.values(DEFAULT_SETTING_BOOKS)) {
      expect(localizeDefaultSettingBook(background, locale)).toBe(expected);
    }
    expect(expected.match(/^### /gm)).toHaveLength(26);
    expect(expected).toContain('25′');
    expect(expected).toContain('26′');
    expect(expected.match(/\]\(([^)]+)\)/g)).toEqual(EVA_BACKGROUND.match(/\]\(([^)]+)\)/g));
  });

  it.each([
    ['zh-CN', '剧情推演前提'], ['zh-TW', '劇情推演前提'],
    ['en-US', 'Premise for Fictional Simulation'], ['ja-JP', '物語シミュレーションの前提']
  ] as const)('includes the simulation premise in %s', (locale, heading) => {
    expect(DEFAULT_SETTING_BOOKS[locale]).toContain(`## ${heading}`);
  });

  it('recognizes the prior unchanged Chinese default without discarding the new premise', () => {
    const opening = EVA_BACKGROUND.slice(0, EVA_BACKGROUND.indexOf('## 剧情推演前提'));
    const remainder = EVA_BACKGROUND.slice(EVA_BACKGROUND.indexOf('## 信息边界'));
    const legacy = opening + remainder;
    expect(localizeDefaultSettingBook(legacy, 'ja-JP')).toBe(DEFAULT_SETTING_BOOKS['ja-JP']);
  });

  it.each(MAGI_LOCALES)('upgrades the previous complete %s default, preserving edited books', locale => {
    const previous = priorBook(locale);
    expect(previous).not.toContain('666');
    for (const target of MAGI_LOCALES) {
      expect(localizeDefaultSettingBook(previous, target)).toBe(DEFAULT_SETTING_BOOKS[target]);
      expect(localizeDefaultSettingBook(previous + '\nCustom additions', target)).toBe(previous + '\nCustom additions');
    }
  });

  it('upgrades the older Chinese default with neither the premise nor the expanded EoE chapters', () => {
    const previous = priorBook('zh-CN');
    const legacy = previous.slice(0, previous.indexOf('## 剧情推演前提'))
      + previous.slice(previous.indexOf('## 信息边界'));
    expect(localizeDefaultSettingBook(legacy, 'en-US')).toBe(DEFAULT_SETTING_BOOKS['en-US']);
  });

  it('upgrades the unchanged mixed-script Chinese default while retaining authored edits', () => {
    const start = EVA_BACKGROUND.indexOf('## EoE');
    const end = EVA_BACKGROUND.indexOf('\n## ', start);
    const mixed = EVA_BACKGROUND.slice(0, start) + MIXED_SCRIPT_EOE_SECTION + EVA_BACKGROUND.slice(end);
    expect(mixed).toContain('MAGI一號機');
    expect(localizeDefaultSettingBook(mixed, 'zh-CN')).toBe(EVA_BACKGROUND);
    expect(EVA_BACKGROUND).toContain('MAGI一号机');
    expect(EVA_BACKGROUND).not.toContain('MAGI一號機');
    expect(localizeDefaultSettingBook(mixed + '\n自定义补充', 'zh-CN')).toBe(mixed + '\n自定义补充');
  });

  it.each(MAGI_LOCALES)('includes the expanded EoE plot in %s', locale => {
    expect(DEFAULT_SETTING_BOOKS[locale]).toContain('666');
    expect(DEFAULT_SETTING_BOOKS[locale]).toContain('REBIRTH');
    expect(DEFAULT_SETTING_BOOKS[locale]).toContain('LCL');
  });

  it.each(MAGI_LOCALES)('preserves authored content, edited defaults and empty books in %s', locale => {
    for (const background of [' 自定义背景 / original text\n', EVA_BACKGROUND + '\n用户新增内容', '', EVA_BACKGROUND + ' ']) {
      expect(localizeDefaultSettingBook(background, locale)).toBe(background);
    }
  });

  it('uses the existing locale fallback for unsupported languages', () => {
    expect(localizeDefaultSettingBook(DEFAULT_SETTING_BOOKS['en-US'], normalizeLocale('unknown'))).toBe(EVA_BACKGROUND);
  });
});
