import json
import logging
import re
from datetime import datetime
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from garages import Garage
from source import Reading

TIMEOUT_S = 15

SENSOR = {
    "name": "Munich Parking Guidance System",
    "description": "Parking garage counting systems published by the Munich Parking Guidance System",
    "encodingType": "text/html",
    "metadata": "https://pls-muc-z.com/pls/info/parkhaus.html",
}

# Keyed by the Datastream property "type" the frontend selects on
OBSERVED_PROPERTIES = {
    "freeSpaces": {
        "name": "Available parking spaces",
        "description": "Number of available parking spaces reported by the parking guidance system",
        "definition": "urn:parkhausradar:observedProperty:freeSpaces",
    },
    "capacity": {
        "name": "Capacity",
        "description": "Number of parking spaces reported by the parking guidance system",
        "definition": "urn:parkhausradar:observedProperty:capacity",
    },
}

UNIT_PARKING_SPACES = {"name": "Parking spaces", "symbol": "", "definition": "urn:parkhausradar:unit:parkingSpaces"}

log = logging.getLogger(__name__)


class FrostClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def get_all(self, path: str, query: dict[str, str]) -> list[dict]:
        _, response = self._request("GET", f"{path}?{urlencode(query)}")
        if "@iot.nextLink" in response:
            raise RuntimeError(f"{path}: more entities than fit into one page, paging is not implemented")
        return response["value"]

    def create(self, path: str, entity: dict) -> int:
        headers, _ = self._request("POST", path, entity)
        # FROST answers with the URL of the created entity, e.g. .../Things(42)
        return int(re.search(r"\((\d+)\)$", headers["Location"]).group(1))

    def create_observations(self, data_arrays: list[dict]) -> list[str]:
        """Data Array extension: answered with one entry per Observation, either its path or "error ..."."""
        _, response = self._request("POST", "CreateObservations", data_arrays)
        return response

    def update(self, path: str, entity: dict) -> None:
        self._request("PATCH", path, entity)

    def delete(self, path: str) -> None:
        self._request("DELETE", path)

    def _request(self, method: str, path: str, body: dict | list | None = None):
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(f"{self.base_url}/{path}", data=data, method=method)
        if data is not None:
            request.add_header("Content-Type", "application/json")
        try:
            with urlopen(request, timeout=TIMEOUT_S) as response:
                content = response.read()
                return response.headers, json.loads(content) if content else None
        except HTTPError as error:
            raise RuntimeError(f"FROST {method} {path} failed: {error.code} {error.read().decode('utf-8', 'replace')}") from error


def sync_garages(frost: FrostClient, garages: list[Garage]) -> dict[str, dict[str, int]]:
    """Brings Things, Locations and Datastreams in line with garages.json and returns the Datastream ids per P-Number and type."""
    sensor_id = _ensure_by_name(frost, "Sensors", SENSOR)
    observed_property_ids = {
        datastream_type: _ensure_by_name(frost, "ObservedProperties", entity) for datastream_type, entity in OBSERVED_PROPERTIES.items()
    }

    existing = {
        thing["properties"].get("pNumber"): thing
        for thing in frost.get_all(
            "Things",
            {
                "$top": "50",
                "$select": "id,name,properties",
                "$expand": "Locations($select=id,name,location,properties),Datastreams($select=id,properties)",
            },
        )
    }

    datastream_ids = {}
    for garage in garages:
        thing = existing.get(garage.p_number)
        if thing is None:
            thing_id = frost.create("Things", {**_thing(garage), "Locations": _locations(garage)})
            log.info("Created Thing %s for %s", thing_id, garage.p_number)
            thing = {"@iot.id": thing_id, "Datastreams": []}
        else:
            thing_id = thing["@iot.id"]
            _update_thing(frost, garage, thing)

        ids = {datastream["properties"].get("type"): datastream["@iot.id"] for datastream in thing["Datastreams"]}
        for datastream_type, observed_property_id in observed_property_ids.items():
            if datastream_type not in ids:
                ids[datastream_type] = frost.create(
                    "Datastreams", _datastream(garage, datastream_type, thing_id, sensor_id, observed_property_id)
                )
        datastream_ids[garage.p_number] = ids

    unknown = sorted(set(existing) - {garage.p_number for garage in garages}, key=str)
    if unknown:
        log.warning("Things in FROST without entry in garages.json, left untouched: %s", unknown)
    return datastream_ids


def write_observations(
    frost: FrostClient, datastream_ids: dict[str, dict[str, int]], readings: list[Reading], measured_at: datetime
) -> None:
    phenomenon_time = measured_at.isoformat(timespec="seconds")
    observations = [
        (reading.p_number, datastream_type, result)
        for reading in readings
        for datastream_type, result in (("freeSpaces", reading.free), ("capacity", reading.capacity))
    ]
    results = frost.create_observations(
        [
            {
                "Datastream": {"@iot.id": datastream_ids[p_number][datastream_type]},
                "components": ["phenomenonTime", "result"],
                "dataArray": [[phenomenon_time, result]],
            }
            for p_number, datastream_type, result in observations
        ]
    )
    # FROST still creates the other Observations when single ones fail
    failed = [
        f"{p_number} {datastream_type}: {outcome}"
        for (p_number, datastream_type, _), outcome in zip(observations, results, strict=True)
        if outcome.startswith("error")
    ]
    if failed:
        raise RuntimeError(f"FROST did not create {len(failed)} of {len(results)} Observations: {failed}")


def _ensure_by_name(frost: FrostClient, path: str, entity: dict) -> int:
    name = entity["name"].replace("'", "''")
    found = frost.get_all(path, {"$filter": f"name eq '{name}'", "$select": "id"})
    if len(found) > 1:
        raise RuntimeError(f"{path}: {len(found)} entities named {entity['name']!r}, expected at most one")
    if found:
        return found[0]["@iot.id"]
    return frost.create(path, entity)


def _update_thing(frost: FrostClient, garage: Garage, thing: dict) -> None:
    expected = _thing(garage)
    if thing["name"] != expected["name"] or thing["properties"] != expected["properties"]:
        frost.update(f"Things({thing['@iot.id']})", expected)
        log.info("Updated Thing %s for %s", thing["@iot.id"], garage.p_number)

    expected_locations = _locations(garage)
    if [_comparable(location) for location in thing["Locations"]] != [_comparable(location) for location in expected_locations]:
        for location in thing["Locations"]:
            frost.delete(f"Locations({location['@iot.id']})")
        # Linked in one request, because FROST replaces the previous link when a Location is created for a Thing
        location_ids = [frost.create("Locations", location) for location in expected_locations]
        frost.update(f"Things({thing['@iot.id']})", {"Locations": [{"@iot.id": location_id} for location_id in location_ids]})
        log.info("Replaced Locations of Thing %s for %s", thing["@iot.id"], garage.p_number)


def _comparable(location: dict) -> tuple:
    return (location["name"], location["properties"], location["location"]["coordinates"])


def _thing(garage: Garage) -> dict:
    return {
        "name": f"{garage.p_number} {garage.name}",
        "description": f"Parking garage {garage.p_number}",
        "properties": {"pNumber": garage.p_number, "address": garage.address, "operatorUrl": garage.operator_url},
    }


def _locations(garage: Garage) -> list[dict]:
    points = [("garage", f"{garage.p_number} Garage", garage.location)] + [
        ("entrance", f"{garage.p_number} Entrance {index}", coordinates) for index, coordinates in enumerate(garage.entrances, start=1)
    ]
    return [
        {
            "name": name,
            "description": name,
            "encodingType": "application/geo+json",
            "location": {"type": "Point", "coordinates": list(coordinates)},
            "properties": {"type": location_type},
        }
        for location_type, name, coordinates in points
    ]


def _datastream(garage: Garage, datastream_type: str, thing_id: int, sensor_id: int, observed_property_id: int) -> dict:
    name = f"{garage.p_number} {OBSERVED_PROPERTIES[datastream_type]['name']}"
    return {
        "name": name,
        "description": name,
        "observationType": "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_CountObservation",
        "unitOfMeasurement": UNIT_PARKING_SPACES,
        "properties": {"type": datastream_type},
        "Thing": {"@iot.id": thing_id},
        "Sensor": {"@iot.id": sensor_id},
        "ObservedProperty": {"@iot.id": observed_property_id},
    }
