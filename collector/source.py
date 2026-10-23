from dataclasses import dataclass
from urllib.request import urlopen

SOURCE_URL = "https://pls-muc-z.com/pls/info/parkhaus.txt"
TIMEOUT_S = 15


@dataclass(frozen=True)
class Reading:
    p_number: str
    free: int
    capacity: int


def fetch_readings() -> list[Reading]:
    with urlopen(SOURCE_URL, timeout=TIMEOUT_S) as response:
        return parse_readings(response.read().decode("utf-8"))


def parse_readings(text: str) -> list[Reading]:
    """Parses the tab separated lines: serial number, connection, P-Number, name, free spaces, capacity."""
    readings = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        fields = line.split("\t")
        if len(fields) != 6:
            raise ValueError(f"Line {line_number}: expected 6 fields, got {len(fields)}: {line!r}")
        try:
            readings.append(Reading(p_number=fields[2].strip(), free=int(fields[4]), capacity=int(fields[5])))
        except ValueError as error:
            raise ValueError(f"Line {line_number}: {error}: {line!r}") from error

    p_numbers = [reading.p_number for reading in readings]
    duplicates = sorted({p for p in p_numbers if p_numbers.count(p) > 1})
    if duplicates:
        raise ValueError(f"Duplicate P-Numbers in source: {duplicates}")
    if not readings:
        raise ValueError("Source contains no readings")
    return readings
