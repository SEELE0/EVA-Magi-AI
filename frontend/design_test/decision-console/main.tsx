/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/app/app.css';
import { DecisionConsole } from './DecisionConsole';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecisionConsole />
  </StrictMode>
);
