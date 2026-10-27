import { describe, expect, test } from "vitest";

import type { Garage } from "../../src/types/Garage";

import { getRouteUrl } from "../../src/util/mapApps";

function createGarage(overrides: Partial<Garage> = {}): Garage {
  return {
    pNumber: "P1",
    name: "Oper",
    address: null,
    operatorUrl: null,
    location: [11.578, 48.139],
    entrances: [],
    freeSpaces: null,
    capacity: null,
    ...overrides,
  };
}

// Latitude and longitude of the destination, wherever the app expects them in its link
function destinationOf(url: string): string {
  return decodeURIComponent(new URL(url).search);
}

describe("map apps route url", () => {
  test.for([
    { app: "apple", host: "maps.apple.com" },
    { app: "google", host: "www.google.com" },
    { app: "osm", host: "www.openstreetmap.org" },
    { app: "waze", host: "waze.com" },
  ] as const)(
    "routes to the first entrance of the garage in $app",
    ({ app, host }) => {
      // given
      const garage = createGarage({
        entrances: [
          [11.5791, 48.1402],
          [11.5775, 48.1388],
        ],
      });

      // when
      const url = getRouteUrl(app, garage);

      // then
      expect(new URL(url).host).toBe(host);
      expect(destinationOf(url)).toContain("48.1402,11.5791");
    }
  );

  test("routes to the garage itself if its entrances are unknown", () => {
    // when
    const url = getRouteUrl("google", createGarage());

    // then
    expect(destinationOf(url)).toContain("48.139,11.578");
  });
});
