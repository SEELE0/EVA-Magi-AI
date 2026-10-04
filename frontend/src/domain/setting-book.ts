/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { MagiLocale } from '../i18n';
import zhCN from './eva-tv-reference-draft.md?raw';
import zhTW from './eva-tv-reference-draft.zh-TW.md?raw';
import enUS from './eva-tv-reference-draft.en-US.md?raw';
import jaJP from './eva-tv-reference-draft.ja-JP.md?raw';
import { MIXED_SCRIPT_EOE_SECTION, PREVIOUS_EOE_SECTIONS } from './setting-book-legacy';

export const DEFAULT_SETTING_BOOKS: Record<MagiLocale, string> = {
  'zh-CN': zhCN.trim(),
  'zh-TW': zhTW.trim(),
  'en-US': enUS.trim(),
  'ja-JP': jaJP.trim()
};

export const EVA_BACKGROUND = DEFAULT_SETTING_BOOKS['zh-CN'];

// Reconstruct exact prior defaults so saved books upgrade without treating authored text as defaults.
const eoeSection = /^## EoE[^\n]*\n[\s\S]*?(?=\n## )/m;
const priorDefaults = Object.fromEntries(Object.entries(DEFAULT_SETTING_BOOKS).map(([locale, book]) =>
  [locale, book.replace(eoeSection, () => PREVIOUS_EOE_SECTIONS[locale as MagiLocale])]
)) as Record<MagiLocale, string>;
const mixedScriptDefault = EVA_BACKGROUND.replace(eoeSection, () => MIXED_SCRIPT_EOE_SECTION);
const withoutPremise = (book: string) => book.replace(/\n## 剧情推演前提\n[\s\S]*?(?=\n## 信息边界)/, '');
const builtInBackgrounds = new Set([
  ...Object.values(DEFAULT_SETTING_BOOKS), ...Object.values(priorDefaults), mixedScriptDefault,
  withoutPremise(EVA_BACKGROUND), withoutPremise(priorDefaults['zh-CN']), withoutPremise(mixedScriptDefault)
]);

/** Only known, unedited defaults follow the locale; authored content remains exact. */
export function localizeDefaultSettingBook(background: string, locale: MagiLocale): string {
  return builtInBackgrounds.has(background) ? DEFAULT_SETTING_BOOKS[locale] : background;
}
