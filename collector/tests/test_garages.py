import json
import tempfile
import unittest
from pathlib import Path

from garages import GARAGES_PATH, load_garages

VALID = {
    "pNumber": "P19",
    "name": "Parkhaus am Stachus",
    "address": None,
    "operatorUrl": None,
    "location": [11.565, 48.139],
    "entrances": [[11.566, 48.139]],
}


def load(entries: object):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "garages.json"
        path.write_text(json.dumps(entries), encoding="utf-8")
        return load_garages(path)


class LoadGaragesTest(unittest.TestCase):
    def test_the_checked_in_file_is_valid(self):
        load_garages(GARAGES_PATH)

    def test_loads_a_garage(self):
        [garage] = load([VALID])
        self.assertEqual(garage.p_number, "P19")
        self.assertEqual(garage.entrances, ((11.566, 48.139),))

    def test_rejects_missing_and_unknown_keys(self):
        with self.assertRaisesRegex(ValueError, "expected exactly the keys"):
            load([{**VALID, "capacity": 390}])

    def test_rejects_a_garage_without_entrance(self):
        with self.assertRaisesRegex(ValueError, "entrances"):
            load([{**VALID, "entrances": []}])

    def test_rejects_invalid_coordinates(self):
        with self.assertRaisesRegex(ValueError, "coordinates"):
            load([{**VALID, "location": [48.139]}])

    def test_rejects_duplicate_p_numbers(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            load([VALID, VALID])


if __name__ == "__main__":
    unittest.main()
