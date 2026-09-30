import { afterEach, describe, expect, it } from 'vitest';
import i18n, { MAGI_LOCALES } from './i18n';

const initialLocale = i18n.resolvedLanguage ?? i18n.language;

describe('canonical MAGI status labels', () => {
  afterEach(async () => {
    await i18n.changeLanguage(initialLocale);
  });

  it.each(MAGI_LOCALES)('keeps the waiting node status in Japanese for %s', async (locale) => {
    await i18n.changeLanguage(locale);
    expect(i18n.t('status.waiting')).toBe('待機');
  });

  it.each([
    ['zh-CN', '设置'],
    ['zh-TW', '設定'],
    ['en-US', 'Settings'],
    ['ja-JP', '設定'],
  ] as const)('localizes the settings navigation label for %s', async (locale, label) => {
    await i18n.changeLanguage(locale);
    expect(i18n.t('nav.settings')).toBe(label);
  });

  it.each([
    ['zh-CN', '打开导航菜单', '关闭导航菜单'],
    ['zh-TW', '開啟導覽選單', '關閉導覽選單'],
    ['en-US', 'Open navigation menu', 'Close navigation menu'],
    ['ja-JP', 'ナビゲーションメニューを開く', 'ナビゲーションメニューを閉じる'],
  ] as const)('localizes the responsive menu controls for %s', async (locale, openLabel, closeLabel) => {
    await i18n.changeLanguage(locale);
    expect(i18n.t('nav.openMenu')).toBe(openLabel);
    expect(i18n.t('nav.closeMenu')).toBe(closeLabel);
  });
});
