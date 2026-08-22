/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useState } from 'react';
import { BootIntro, shouldShowBootIntro } from '../features/boot-intro/BootIntro';
import { DecisionHome } from '../features/decision-home';

export default function App() {
  const [introActive, setIntroActive] = useState(shouldShowBootIntro);

  return (
    <>
      <BootIntro onFinished={() => setIntroActive(false)} />
      {/* inert keeps keyboard focus out of the console while the boot overlay is up. */}
      <div inert={introActive}>
        <DecisionHome />
      </div>
    </>
  );
}
