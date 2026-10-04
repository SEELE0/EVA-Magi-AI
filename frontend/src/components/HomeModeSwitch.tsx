import { useTranslation } from 'react-i18next';
import type { HomeMode } from '../domain/home-mode';
import './home-mode-switch.css';

export function HomeModeSwitch({ mode, onSwitch, variant }: {
  mode: HomeMode;
  onSwitch: () => void;
  variant: 'modern' | 'original';
}) {
  const { t } = useTranslation();
  const label = mode === 'original' ? t('nav.switchToModern') : t('nav.switchToOriginal');

  return (
    <button
      className={`home-mode-switch home-mode-switch--${variant}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onSwitch}
    >
      <span className="home-mode-switch__icon" aria-hidden="true" />
    </button>
  );
}
