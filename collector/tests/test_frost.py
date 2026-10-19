import unittest
from datetime import UTC, datetime

from frost import write_observations
from source import Reading

DATASTREAM_IDS = {"P1": {"freeSpaces": 1, "capacity": 2}, "P2": {"freeSpaces": 3, "capacity": 4}}
MEASURED_AT = datetime(2026, 10, 14, 12, 0, tzinfo=UTC)


class FakeFrost:
    def __init__(self, outcomes: list[str]):
        self.outcomes = outcomes
        self.requests = []

    def create_observations(self, data_arrays: list[dict]) -> list[str]:
        self.requests.append(data_arrays)
        return self.outcomes


class WriteObservationsTest(unittest.TestCase):
    def test_writes_both_values_of_every_garage_in_one_request(self):
        frost = FakeFrost(["Observations(1)", "Observations(2)", "Observations(3)", "Observations(4)"])

        write_observations(frost, DATASTREAM_IDS, [Reading("P1", 10, 100), Reading("P2", 0, 50)], MEASURED_AT)

        self.assertEqual(
            frost.requests,
            [
                [
                    {"Datastream": {"@iot.id": datastream_id}, "components": ["phenomenonTime", "result"], "dataArray": [["2026-10-14T12:00:00+00:00", result]]}
                    for datastream_id, result in ((1, 10), (2, 100), (3, 0), (4, 50))
                ]
            ],
        )

    def test_names_the_observations_frost_did_not_create(self):
        frost = FakeFrost(["Observations(1)", "Observations(2)", "error Datastream not found", "Observations(4)"])

        with self.assertRaisesRegex(RuntimeError, r"1 of 4 Observations: \['P2 freeSpaces: error Datastream not found'\]"):
            write_observations(frost, DATASTREAM_IDS, [Reading("P1", 10, 100), Reading("P2", 0, 50)], MEASURED_AT)
