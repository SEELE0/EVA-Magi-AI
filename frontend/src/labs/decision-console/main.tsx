/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../app/app.css';
import { DecisionConsole } from '../../features/decision-console/DecisionConsole';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecisionConsole />
  </StrictMode>
);
