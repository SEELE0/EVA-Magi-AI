/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NervLogoAnime } from './index';
import './nerv-logo-anime-page.css';

function NervLogoAnimePreview() {
  const [seed, setSeed] = useState(0);

  return (
    <main className="nerv-logo-anime-test-page">
      <NervLogoAnime key={seed} size="min(300px, 52vw)" />
      <button
        className="nerv-logo-anime-replay"
        type="button"
        onClick={() => setSeed((value) => value + 1)}
      >
        重新播放
      </button>
    </main>
  );
}

createRoot(document.getElementById('nerv-logo-anime-test-root')!).render(
  <StrictMode>
    <NervLogoAnimePreview />
  </StrictMode>
);
