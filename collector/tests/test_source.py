import unittest

from source import Reading, parse_readings

SAMPLE = (
    "106501\tmodem switch\tP19\tParkhaus am Stachus\t390\t390\n"
    "106525\trouter switch\tP11\tParkhaus am Hauptbahnhof (Einfahrt Nord)\t0\t110\n"
    "106525\trouter switch\tP25\tParken am Hbf - Einfahrt Süd\t0\t113\n"
    "\n"
)


class ParseReadingsTest(unittest.TestCase):
    def test_parses_every_line_by_p_number(self):
        self.assertEqual(
            parse_readings(SAMPLE),
            [Reading("P19", 390, 390), Reading("P11", 0, 110), Reading("P25", 0, 113)],
        )

    def test_rejects_a_changed_format(self):
        with self.assertRaisesRegex(ValueError, "Line 1: expected 6 fields"):
            parse_readings("106501;P19;390;390\n")

    def test_rejects_non_numeric_counts(self):
        with self.assertRaisesRegex(ValueError, "Line 1"):
            parse_readings("106501\tmodem\tP19\tStachus\t-\t390\n")

    def test_rejects_duplicate_p_numbers(self):
        with self.assertRaisesRegex(ValueError, "P19"):
            parse_readings(SAMPLE + "106502\tmodem\tP19\tStachus\t1\t390\n")

    def test_rejects_an_empty_source(self):
        with self.assertRaisesRegex(ValueError, "no readings"):
            parse_readings("\n")


if __name__ == "__main__":
    unittest.main()
