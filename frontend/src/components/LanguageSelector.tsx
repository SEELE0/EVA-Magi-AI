import { useTranslation } from 'react-i18next';
import { MagiSelect } from './MagiSelect';
import { setMagiLocale, type MagiLocale } from '../i18n';
import translateIcon from '../assets/language-translate-icon.png';

const languageItems: Array<{ value: MagiLocale; key: string }> = [
  { value: 'zh-CN', key: 'language.zhCN' },
  { value: 'zh-TW', key: 'language.zhTW' },
  { value: 'en-US', key: 'language.en' },
  { value: 'ja-JP', key: 'language.ja' }
];

export function LanguageSelector({ variant = 'modern', iconOnly = false }: { variant?: 'modern' | 'original'; iconOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.resolvedLanguage ?? i18n.language ?? 'en-US') as MagiLocale;
  const options = languageItems.map(({ value, key }) => ({ value, label: t(key) }));
  const selectedLocale = languageItems.some((item) => item.value === currentLocale) ? currentLocale : 'en-US';

  return (
    <div className={`magi-language-selector magi-language-selector--${variant}${iconOnly ? ' magi-language-selector--icon' : ''}`}>
      {!iconOnly ? <span className="magi-language-selector__label">{t('language.label')}</span> : null}
      <MagiSelect
        ariaLabel={iconOnly ? `${t('nav.language')}: ${options.find((item) => item.value === selectedLocale)?.label}` : t('nav.language')}
        className="magi-language-selector__trigger"
        options={options}
        positionerClassName={iconOnly ? 'magi-select__positioner--language-icon' : undefined}
        title={iconOnly ? `${t('language.label')}: ${options.find((item) => item.value === selectedLocale)?.label}` : undefined}
        triggerContent={iconOnly ? (
          <span
            aria-hidden="true"
            className="magi-language-selector__translate-icon"
            style={{ maskImage: `url("${translateIcon}")`, WebkitMaskImage: `url("${translateIcon}")` }}
          />
        ) : undefined}
        value={selectedLocale}
        onValueChange={(locale) => { void setMagiLocale(locale as MagiLocale); }}
      />
    </div>
  );
}
