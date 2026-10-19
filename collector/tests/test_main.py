import unittest
from unittest.mock import patch

import main


class StopAfter:
    """Stands in for threading.Event: stops the loop after the given number of runs without waiting."""

    def __init__(self, runs: int):
        self.remaining = runs

    def is_set(self) -> bool:
        return self.remaining <= 0

    def wait(self, _timeout: float) -> None:
        self.remaining -= 1


class RunTest(unittest.TestCase):
    @patch("main.collect", return_value=([], []))
    @patch("main.sync_garages", return_value={"P1": {"freeSpaces": 1, "capacity": 2}})
    def test_syncs_once_and_collects_every_run(self, sync_garages, collect):
        main.run(None, [], StopAfter(3))

        self.assertEqual(sync_garages.call_count, 1)
        self.assertEqual(collect.call_count, 3)

    @patch("main.collect", side_effect=[([], []), RuntimeError("FROST was reset"), ([], [])])
    @patch("main.sync_garages", return_value={"P1": {"freeSpaces": 1, "capacity": 2}})
    def test_syncs_again_after_a_failed_run(self, sync_garages, collect):
        with self.assertLogs("collector", "ERROR"):
            main.run(None, [], StopAfter(3))

        self.assertEqual(sync_garages.call_count, 2)
        self.assertEqual(collect.call_count, 3)

    @patch("main.collect", return_value=([], []))
    @patch("main.sync_garages", side_effect=[RuntimeError("FROST unavailable"), {"P1": {"freeSpaces": 1, "capacity": 2}}])
    def test_does_not_collect_before_the_sync_succeeded(self, sync_garages, collect):
        with self.assertLogs("collector", "ERROR"):
            main.run(None, [], StopAfter(2))

        self.assertEqual(sync_garages.call_count, 2)
        self.assertEqual(collect.call_count, 1)

    @patch("main.collect", side_effect=[(["P99"], []), (["P99"], []), (["P99"], ["P1"])])
    @patch("main.sync_garages", return_value={"P1": {"freeSpaces": 1, "capacity": 2}})
    def test_logs_the_differing_p_numbers_only_when_they_change(self, sync_garages, collect):
        with self.assertLogs("collector", "WARNING") as logs:
            main.run(None, [], StopAfter(3))

        self.assertEqual(
            [record.getMessage() for record in logs.records],
            [
                "Not in garages.json, skipped: ['P99']. Not in source: none",
                "Not in garages.json, skipped: ['P99']. Not in source: ['P1']",
            ],
        )
