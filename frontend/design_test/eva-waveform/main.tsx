/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EvaWaveformScope } from './EvaWaveformScope';

createRoot(document.getElementById('eva-waveform-test-root')!).render(
  <StrictMode>
    <main className="eva-waveform-test-page">
      <EvaWaveformScope />
    </main>
  </StrictMode>
);

