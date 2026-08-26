/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { CSSProperties } from 'react';
import './nerv-logo-anime.css';

const nervLogoUrl = new URL('../../../asset/images.jpeg', import.meta.url).href;

export interface NervLogoAnimeProps {
  /** CSS width value or a pixel number. */
  size?: number | string;
  /** Fade the logo after the entrance and hold sequence. */
  fadeOut?: boolean;
  className?: string;
  style?: CSSProperties;
}

type NervLogoAnimeStyle = CSSProperties & {
  '--nerv-logo-size': string;
};

function resolveSize(size: number | string) {
  return typeof size === 'number' ? `${size}px` : size;
}

export function NervLogoAnime({
  size = 'min(300px, 52vw)',
  fadeOut = true,
  className,
  style
}: NervLogoAnimeProps) {
  const classes = [
    'nerv-logo-anime',
    fadeOut ? 'nerv-logo-anime--fade-out' : '',
    className ?? ''
  ].filter(Boolean).join(' ');

  const componentStyle = {
    ...style,
    '--nerv-logo-size': resolveSize(size)
  } as NervLogoAnimeStyle;

  return (
    <div
      className={classes}
      style={componentStyle}
      role="img"
      aria-label="NERV 标志进场动画"
    >
      <img className="nerv-logo-anime__leaf" src={nervLogoUrl} alt="" />
      <img className="nerv-logo-anime__text" src={nervLogoUrl} alt="" />
    </div>
  );
}

export default NervLogoAnime;
