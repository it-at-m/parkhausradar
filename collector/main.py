"""Fetches the parking garage occupancy every minute and writes it to the FROST-Server."""

import logging
import os
import signal
import threading
import time
from datetime import UTC, datetime

from frost import FrostClient, sync_garages, write_observations
from garages import Garage, load_garages
from source import fetch_readings

INTERVAL_S = 60

log = logging.getLogger("collector")


def collect(frost: FrostClient, datastream_ids: dict[str, dict[str, int]]) -> tuple[list[str], list[str]]:
    """Returns the P-Numbers only in the source and the ones only in garages.json."""
    measured_at = datetime.now(UTC)
    readings = fetch_readings()

    known = [reading for reading in readings if reading.p_number in datastream_ids]
    write_observations(frost, datastream_ids, known, measured_at)

    unknown = sorted(reading.p_number for reading in readings if reading.p_number not in datastream_ids)
    missing = sorted(set(datastream_ids) - {reading.p_number for reading in readings})
    log.info("Wrote %d garages", len(known))
    return unknown, missing


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    frost = frost_from_environment()
    garages = load_garages()
    log.info("Loaded %d garages, writing to %s every %d s", len(garages), frost.base_url, INTERVAL_S)

    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    run(frost, garages, stop)


def frost_from_environment() -> FrostClient:
    username, password = os.environ.get("FROST_USERNAME"), os.environ.get("FROST_PASSWORD")
    if (username is None) != (password is None):
        raise ValueError("Set either both FROST_USERNAME and FROST_PASSWORD or neither of them")
    project_id = os.environ.get("FROST_PROJECT_ID")
    return FrostClient(
        os.environ["FROST_URL"],
        None if username is None else (username, password),
        None if project_id is None else int(project_id),
    )


def run(frost: FrostClient, garages: list[Garage], stop: threading.Event) -> None:
    datastream_ids = None
    mismatch = None
    next_run = time.monotonic()
    while not stop.is_set():
        try:
            if datastream_ids is None:
                datastream_ids = sync_garages(frost, garages)
            current = collect(frost, datastream_ids)
            # Logged only on change, because the source keeps listing garages that are deliberately not stored
            if current != mismatch:
                unknown, missing = current
                level = logging.WARNING if unknown or missing else logging.INFO
                log.log(level, "Not in garages.json, skipped: %s. Not in source: %s", unknown or "none", missing or "none")
                mismatch = current
        except Exception:
            log.exception("Collecting failed, retrying in the next run")
            # Synced again before the next write, so the collector recovers on its own after FROST was unavailable or reset
            datastream_ids = None
        next_run = max(next_run + INTERVAL_S, time.monotonic())
        stop.wait(max(0.0, next_run - time.monotonic()))


if __name__ == "__main__":
    main()
