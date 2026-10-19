import json
from dataclasses import dataclass
from pathlib import Path

GARAGES_PATH = Path(__file__).with_name("garages.json")

Coordinates = tuple[float, float]


@dataclass(frozen=True)
class Garage:
    p_number: str
    name: str
    address: str | None
    operator_url: str | None
    location: Coordinates
    entrances: tuple[Coordinates, ...]


def load_garages(path: Path = GARAGES_PATH) -> list[Garage]:
    entries = json.loads(path.read_text(encoding="utf-8"))
    garages = [_parse_garage(index, entry) for index, entry in enumerate(entries)]

    p_numbers = [garage.p_number for garage in garages]
    duplicates = sorted({p for p in p_numbers if p_numbers.count(p) > 1})
    if duplicates:
        raise ValueError(f"{path.name}: duplicate P-Numbers {duplicates}")
    return garages


def _parse_garage(index: int, entry: dict) -> Garage:
    where = f"garages.json entry {index}"
    expected_keys = {"pNumber", "name", "address", "operatorUrl", "location", "entrances"}
    if set(entry) != expected_keys:
        raise ValueError(f"{where}: expected exactly the keys {sorted(expected_keys)}, got {sorted(entry)}")
    if not entry["pNumber"]:
        raise ValueError(f"{where}: pNumber must not be empty")
    if not entry["name"]:
        raise ValueError(f"{where}: name must not be empty")
    if not entry["entrances"]:
        raise ValueError(f"{where}: entrances must not be empty")

    return Garage(
        p_number=entry["pNumber"],
        name=entry["name"],
        address=entry["address"],
        operator_url=entry["operatorUrl"],
        location=_parse_coordinates(where, entry["location"]),
        entrances=tuple(_parse_coordinates(where, entrance) for entrance in entry["entrances"]),
    )


def _parse_coordinates(where: str, value: list[float]) -> Coordinates:
    """GeoJSON order: longitude, latitude."""
    if len(value) != 2:
        raise ValueError(f"{where}: coordinates must be [longitude, latitude], got {value!r}")
    longitude, latitude = value
    if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
        raise ValueError(f"{where}: coordinates out of range: {value!r}")
    return (float(longitude), float(latitude))
