/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useState } from 'react';
import { BootIntro, shouldShowBootIntro } from '../features/boot-intro/BootIntro';
import { DecisionHome } from '../features/decision-home';
import { MagiDirectLinkTest } from '../features/magi-direct-link-test/main';
import { readHomeMode, saveHomeMode, type HomeMode } from '../domain/home-mode';

export default function App() {
  const [introActive, setIntroActive] = useState(shouldShowBootIntro);
  const [homeMode, setHomeMode] = useState(readHomeMode);

  const selectHomeMode = (mode: HomeMode) => {
    saveHomeMode(mode);
    setHomeMode(mode);
  };

  return (
    <>
      <BootIntro
        initialMode={homeMode}
        onFinished={() => setIntroActive(false)}
        onModeSelected={selectHomeMode}
      />
      {/* inert keeps keyboard focus out of the console while the boot overlay is up. */}
      <div inert={introActive}>
        {homeMode === 'original' ? <MagiDirectLinkTest /> : <DecisionHome />}
      </div>
    </>
  );
}
