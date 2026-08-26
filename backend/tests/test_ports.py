# Copyright (C) 2026 SEELE0
# SPDX-License-Identifier: AGPL-3.0-or-later
# License: https://www.gnu.org/licenses/agpl-3.0.html

from dataclasses import asdict
from unittest import TestCase

from app.ports import AgentConfigurationUpdate


class PublicConfigurationTests(TestCase):
    def test_public_view_never_contains_the_api_key(self) -> None:
        update = AgentConfigurationUpdate(
            agent_id="MELCHIOR-1",
            connection="openai-compatible",
            base_url="https://provider.example/v1",
            model="example-model",
            role_prompt="Return a user-visible final answer.",
            api_key="test-only-secret",
        )

        payload = asdict(update.public_view(role="科学者論理", credential_configured=True))

        self.assertNotIn("api_key", payload)
        self.assertNotIn("test-only-secret", repr(payload))
        self.assertTrue(payload["credential_configured"])
