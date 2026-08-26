/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MagiBoot } from './index';
import './magi-boot-page.css';

createRoot(document.getElementById('magi-boot-test-root')!).render(
  <StrictMode>
    <main className="magi-boot-test-page">
      <MagiBoot size="min(100vw, 100vh)" />
    </main>
  </StrictMode>
);
