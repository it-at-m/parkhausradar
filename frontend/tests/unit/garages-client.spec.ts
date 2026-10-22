import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  DatastreamType,
  FrostThing,
  LocationType,
} from "../../src/api/frost";

import { getGarages, toGarage } from "../../src/api/garages-client";

function thing(overrides: Partial<FrostThing> = {}): FrostThing {
  return {
    "@iot.id": 1,
    name: "P3 Testparkhaus Nord",
    properties: { pNumber: "P3", address: "Teststraße 1", operatorUrl: null },
    Locations: [
      {
        name: "P3 Parkhaus",
        location: { type: "Point", coordinates: [11.57, 48.14] },
        properties: { type: "garage" },
      },
      {
        name: "P3 Einfahrt 1",
        location: { type: "Point", coordinates: [11.571, 48.141] },
        properties: { type: "entrance" },
      },
      {
        name: "P3 Einfahrt 2",
        location: { type: "Point", coordinates: [11.572, 48.142] },
        properties: { type: "entrance" },
      },
    ],
    Datastreams: [
      {
        properties: { type: "freeSpaces" },
        Observations: [{ phenomenonTime: "2026-10-14T12:00:00Z", result: 42 }],
      },
      {
        properties: { type: "capacity" },
        Observations: [{ phenomenonTime: "2026-10-14T12:00:00Z", result: 314 }],
      },
    ],
    ...overrides,
  };
}

describe("toGarage", () => {
  test("translates a thing into a garage", () => {
    // when
    const garage = toGarage(thing());

    // then
    expect(garage).toEqual({
      pNumber: "P3",
      name: "Testparkhaus Nord",
      address: "Teststraße 1",
      operatorUrl: null,
      location: [11.57, 48.14],
      entrances: [
        [11.571, 48.141],
        [11.572, 48.142],
      ],
      freeSpaces: { value: 42, measuredAt: new Date("2026-10-14T12:00:00Z") },
      capacity: { value: 314, measuredAt: new Date("2026-10-14T12:00:00Z") },
    });
  });

  test("has no measurement while a datastream has no observation yet", () => {
    // given
    const withoutObservations = thing({
      Datastreams: [
        { properties: { type: "freeSpaces" }, Observations: [] },
        { properties: { type: "capacity" }, Observations: [] },
      ],
    });

    // when
    const garage = toGarage(withoutObservations);

    // then
    expect(garage.freeSpaces).toBeNull();
    expect(garage.capacity).toBeNull();
  });

  test.for([
    { name: "Testparkhaus Nord" },
    { name: "P30 Testparkhaus Nord" },
    { name: "P3Testparkhaus Nord" },
  ])("rejects the name '$name' without its P-number", ({ name }) => {
    // given
    const withoutPNumber = thing({ name });

    // then
    expect(() => toGarage(withoutPNumber)).toThrow(
      `P3: name "${name}" lacks its P-number`
    );
  });

  test.for([{ name: "P3 " }, { name: "P3    " }])(
    "rejects the name '$name' with nothing besides its P-number",
    ({ name }) => {
      // given
      const withoutName = thing({ name });

      // then
      expect(() => toGarage(withoutName)).toThrow(
        `P3: name "${name}" has nothing besides its P-number`
      );
    }
  );

  test("rejects a thing without garage location", () => {
    // given
    const original = thing();
    const withoutGarage = thing({
      Locations: original.Locations.filter(
        (l) => l.properties.type !== "garage"
      ),
    });

    // then
    expect(() => toGarage(withoutGarage)).toThrow(
      "P3: expected exactly one garage location, got 0"
    );
  });

  test("rejects a thing with a missing datastream", () => {
    // given
    const original = thing();
    const withoutCapacity = thing({
      Datastreams: original.Datastreams.filter(
        (d) => d.properties.type !== "capacity"
      ),
    });

    // then
    expect(() => toGarage(withoutCapacity)).toThrow(
      "P3: expected exactly one capacity datastream, got 0"
    );
  });

  test("rejects unknown location and datastream types", () => {
    // given
    const original = thing();
    const unknownLocation = thing({
      Locations: [
        ...original.Locations,
        {
          name: "P3 Ausfahrt",
          location: { type: "Point", coordinates: [11.573, 48.143] },
          properties: { type: "exit" as LocationType },
        },
      ],
    });
    const unknownDatastream = thing({
      Datastreams: [
        ...original.Datastreams,
        {
          properties: { type: "occupancy" as DatastreamType },
          Observations: [],
        },
      ],
    });

    // then
    expect(() => toGarage(unknownLocation)).toThrow(
      "P3: unknown location type exit"
    );
    expect(() => toGarage(unknownDatastream)).toThrow(
      "P3: unknown datastream type occupancy"
    );
  });

  test("rejects an invalid phenomenon time", () => {
    // given
    const original = thing();
    const invalidTime = thing({
      Datastreams: original.Datastreams.map((d) =>
        d.properties.type === "freeSpaces"
          ? { ...d, Observations: [{ phenomenonTime: "yesterday", result: 1 }] }
          : d
      ),
    });

    // then
    expect(() => toGarage(invalidTime)).toThrow(
      "P3: freeSpaces has the invalid phenomenonTime yesterday"
    );
  });
});

describe("getGarages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("gives up on a stalled request, so later refreshes are not held back", async () => {
    // given
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason)
            )
          )
      )
    );
    const request = getGarages();

    // when
    timeout.abort(new DOMException("timed out", "TimeoutError"));

    // then
    await expect(request).rejects.toThrow("timed out");
  });

  test("leaves out malformed garages and still returns all others", async () => {
    // given
    vi.spyOn(console, "debug").mockReturnValue();
    respondWith([
      thing(),
      thing({ name: "Testparkhaus Süd" }),
      thing({
        name: "P4 Testparkhaus West",
        properties: { pNumber: "P4", address: null, operatorUrl: null },
      }),
    ]);

    // when
    const garages = await getGarages();

    // then
    expect(garages.map((garage) => garage.name)).toEqual([
      "Testparkhaus Nord",
      "Testparkhaus West",
    ]);
    expect(console.debug).toHaveBeenCalledWith(
      new Error('P3: name "Testparkhaus Süd" lacks its P-number')
    );
  });

  test("fails if no garage matches the model, instead of showing an empty map", async () => {
    // given
    vi.spyOn(console, "debug").mockReturnValue();
    respondWith([thing({ name: "Testparkhaus Süd" })]);

    // then
    await expect(getGarages()).rejects.toThrow(
      "None of the garages match the model of the collector"
    );
  });

  test("returns no garages if there are none", async () => {
    // given
    respondWith([]);

    // then
    await expect(getGarages()).resolves.toEqual([]);
  });
});

function respondWith(things: FrostThing[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ value: things }))
  );
}
