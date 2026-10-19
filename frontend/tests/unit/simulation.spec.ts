import { describe, expect, test } from "vitest";

import type { SimulatedGarage } from "../../simulator/simulation";

import garages from "../../simulator/garages.json";
import {
  assignScenarios,
  createSimulation,
  FAULT_SCENARIOS,
} from "../../simulator/simulation";

const GARAGES = garages as SimulatedGarage[];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function latest(
  simulation: ReturnType<typeof createSimulation>,
  pNumber: string
) {
  const thing = simulation
    .things()
    .find((t) => t.properties.pNumber === pNumber);
  const [free, capacity] = ["freeSpaces", "capacity"].map(
    (type) =>
      thing?.Datastreams.find((d) => d.properties.type === type)
        ?.Observations[0]
  );
  return { free, capacity };
}

function garageWith(
  simulation: ReturnType<typeof createSimulation>,
  scenario: string
) {
  const entry = Object.entries(simulation.scenarios).find(
    ([, s]) => s === scenario
  );
  if (!entry) throw new Error(`no garage with scenario ${scenario}`);
  return entry[0];
}

describe("assignScenarios", () => {
  test("assigns every fault exactly once and all other garages behave normally", () => {
    // when
    const scenarios = Object.values(assignScenarios(GARAGES, seededRandom(1)));

    // then
    for (const fault of FAULT_SCENARIOS) {
      expect(scenarios.filter((s) => s === fault)).toHaveLength(1);
    }
    expect(scenarios.filter((s) => s === "normal")).toHaveLength(
      GARAGES.length - FAULT_SCENARIOS.length
    );
  });

  test("assigns the faults to different garages depending on the random source", () => {
    // when
    const first = assignScenarios(GARAGES, seededRandom(1));
    const second = assignScenarios(GARAGES, seededRandom(2));

    // then
    expect(first).not.toEqual(second);
  });
});

describe("createSimulation", () => {
  const start = new Date(2026, 9, 13, 14, 0);

  test("returns every garage with both datastreams and its locations", () => {
    // when
    const things = createSimulation(GARAGES, start, seededRandom(1)).things();

    // then
    expect(things).toHaveLength(GARAGES.length);
    for (const thing of things) {
      expect(thing.Datastreams.map((d) => d.properties.type).sort()).toEqual([
        "capacity",
        "freeSpaces",
      ]);
      expect(thing.Locations.map((l) => l.properties.type)).toContain("garage");
      expect(thing.Locations.map((l) => l.properties.type)).toContain(
        "entrance"
      );
    }
  });

  test("keeps the free spaces of a frozen counter over the day", () => {
    // given
    const simulation = createSimulation(GARAGES, start, seededRandom(1));
    const pNumber = garageWith(simulation, "frozen");
    const before = latest(simulation, pNumber).free?.result;

    // when
    simulation.tick(new Date(2026, 9, 13, 22, 0));

    // then
    expect(latest(simulation, pNumber).free?.result).toBe(before);
  });

  test("reports more free spaces than capacity", () => {
    // when
    const simulation = createSimulation(GARAGES, start, seededRandom(1));
    const { free, capacity } = latest(
      simulation,
      garageWith(simulation, "freeAboveCapacity")
    );

    // then
    expect(free?.result).toBeGreaterThan(capacity?.result ?? Infinity);
  });

  test("fills a garage up until no space is left", () => {
    // given
    const simulation = createSimulation(GARAGES, start, seededRandom(1));

    // when
    for (let minute = 1; minute <= 15; minute++) {
      simulation.tick(new Date(start.getTime() + minute * 60_000));
    }

    // then
    expect(
      latest(simulation, garageWith(simulation, "full")).free?.result
    ).toBe(0);
  });

  test("shrinks the reported capacity over night", () => {
    // given
    const simulation = createSimulation(GARAGES, start, seededRandom(1));
    const pNumber = garageWith(simulation, "changingCapacity");
    const fullCapacity = latest(simulation, pNumber).capacity?.result ?? 0;

    // when
    simulation.tick(new Date(2026, 9, 13, 22, 0));

    // then
    expect(latest(simulation, pNumber).capacity?.result).toBe(
      Math.round(fullCapacity * 0.6)
    );
  });
});
