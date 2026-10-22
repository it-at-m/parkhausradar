import { describe, expect, test } from "vitest";

import type { Garage } from "../../src/types/Garage";

import {
  getGarageStatus,
  getOccupancy,
  isGarageDataOutdated,
} from "../../src/util/garageStatus";

const NOW = new Date("2026-10-22T12:00:00Z");
const MINUTE = 60_000;

function createGarage(
  free: number | null,
  capacity: number | null,
  ageInMinutes = 0
): Garage {
  const measuredAt = new Date(NOW.getTime() - ageInMinutes * MINUTE);
  return {
    pNumber: "P1",
    name: "Oper",
    address: null,
    operatorUrl: null,
    location: [11.578, 48.139],
    entrances: [],
    freeSpaces: free === null ? null : { value: free, measuredAt },
    capacity: capacity === null ? null : { value: capacity, measuredAt },
  };
}

describe("getGarageStatus", () => {
  test.for([
    // 20 % of 400 is 80, 5 % of 400 is 20
    { free: 80, capacity: 400, expected: "free" },
    { free: 79, capacity: 400, expected: "limited" },
    { free: 20, capacity: 400, expected: "limited" },
    { free: 19, capacity: 400, expected: "full" },
    { free: 0, capacity: 400, expected: "full" },
    // Small garages need at least 30 free spaces for green and turn red below 10
    { free: 30, capacity: 100, expected: "free" },
    { free: 29, capacity: 100, expected: "limited" },
    { free: 10, capacity: 100, expected: "limited" },
    { free: 9, capacity: 100, expected: "full" },
    { free: 30, capacity: 40, expected: "free" },
    { free: 29, capacity: 40, expected: "limited" },
    // Large garages are judged by their share
    { free: 200, capacity: 1000, expected: "free" },
    { free: 199, capacity: 1000, expected: "limited" },
    { free: 50, capacity: 1000, expected: "limited" },
    { free: 49, capacity: 1000, expected: "full" },
    { free: 1000, capacity: 1000, expected: "free" },
  ])(
    "rates $free of $capacity free spaces as $expected",
    ({ free, capacity, expected }) => {
      // when
      const status = getGarageStatus(createGarage(free, capacity), NOW);

      // then
      expect(status).toBe(expected);
    }
  );

  test.for([
    { case: "without free spaces", garage: createGarage(null, 400) },
    { case: "without capacity", garage: createGarage(80, null) },
    {
      case: "with more free spaces than capacity",
      garage: createGarage(463, 160),
    },
    { case: "with negative free spaces", garage: createGarage(-1, 400) },
    { case: "with a capacity of zero", garage: createGarage(0, 0) },
  ])("rates a garage $case as unknown", ({ garage }) => {
    // when
    const status = getGarageStatus(garage, NOW);

    // then
    expect(status).toBe("unknown");
  });

  test.for([
    { ageInMinutes: -2, expected: "free" },
    { ageInMinutes: 15, expected: "free" },
    { ageInMinutes: 15.01, expected: "unknown" },
    { ageInMinutes: 60, expected: "unknown" },
  ])(
    "rates data that is $ageInMinutes minutes old as $expected",
    ({ ageInMinutes, expected }) => {
      // when
      const status = getGarageStatus(createGarage(200, 400, ageInMinutes), NOW);

      // then
      expect(status).toBe(expected);
    }
  );
});

describe("isGarageDataOutdated", () => {
  test("is false without data, as there is nothing that could be outdated", () => {
    // when
    const outdated = isGarageDataOutdated(createGarage(null, null), NOW);

    // then
    expect(outdated).toBe(false);
  });
});

describe("getOccupancy", () => {
  test.for([
    { free: 312, capacity: 400, expected: 0.22 },
    { free: 0, capacity: 400, expected: 1 },
    { free: 400, capacity: 400, expected: 0 },
  ])(
    "is $expected for $free of $capacity free spaces",
    ({ free, capacity, expected }) => {
      // when
      const occupancy = getOccupancy(createGarage(free, capacity));

      // then
      expect(occupancy).toBe(expected);
    }
  );
});
