import threading
import unittest
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

from frost import FrostClient, write_observations
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
                    {
                        "Datastream": {"@iot.id": datastream_id},
                        "components": ["phenomenonTime", "result"],
                        "dataArray": [["2026-10-14T12:00:00+00:00", result]],
                    }
                    for datastream_id, result in ((1, 10), (2, 100), (3, 0), (4, 50))
                ]
            ],
        )

    def test_names_the_observations_frost_did_not_create(self):
        frost = FakeFrost(["Observations(1)", "Observations(2)", "error Datastream not found", "Observations(4)"])

        with self.assertRaisesRegex(RuntimeError, r"1 of 4 Observations: \['P2 freeSpaces: error Datastream not found'\]"):
            write_observations(frost, DATASTREAM_IDS, [Reading("P1", 10, 100), Reading("P2", 0, 50)], MEASURED_AT)


class QuietHandler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass


class RecordingHandler(QuietHandler):
    authorizations = []

    def do_GET(self):
        self.authorizations.append(self.headers.get("Authorization"))
        body = b'{"value": []}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class RedirectingHandler(QuietHandler):
    target = None

    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", self.target + self.path)
        self.send_header("Content-Length", "0")
        self.end_headers()


class FrostClientTest(unittest.TestCase):
    def setUp(self):
        RecordingHandler.authorizations = []
        self.origin = self._serve(RecordingHandler)
        self.base_url = f"{self.origin}/FROST-Server/v1.1"

    def _serve(self, handler: type[BaseHTTPRequestHandler]) -> str:
        server = HTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return f"http://127.0.0.1:{server.server_port}"

    def test_sends_the_credentials_as_basic_auth(self):
        FrostClient(self.base_url, ("collector", "secret")).get_all("Things", {})

        self.assertEqual(RecordingHandler.authorizations, ["Basic Y29sbGVjdG9yOnNlY3JldA=="])

    def test_sends_no_authorization_without_credentials(self):
        FrostClient(self.base_url).get_all("Things", {})

        self.assertEqual(RecordingHandler.authorizations, [None])

    def test_does_not_forward_the_credentials_to_a_redirect_target(self):
        RedirectingHandler.target = self.origin
        redirecting_origin = self._serve(RedirectingHandler)

        FrostClient(f"{redirecting_origin}/FROST-Server/v1.1", ("collector", "secret")).get_all("Things", {})

        self.assertEqual(RecordingHandler.authorizations, [None])
