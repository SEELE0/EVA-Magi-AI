/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { Vote } from '../../domain/decision';

/** Fixed personality labels; functional UI continues to use the selected locale. */
export const NODE_VOTE_LABELS: Readonly<Record<Vote, string>> = {
  pending: '待機',
  approve: '承認',
  reject: '否決',
  abstain: '棄権'
};
