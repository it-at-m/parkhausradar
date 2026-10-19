// Simulated parking garages for local development, answered by the dev server instead of the FROST-Server.
// Every start assigns the main data quality cases to randomly chosen garages, so no fault sticks to one garage.
import type { FrostDatastream, FrostThing } from "../src/api/frost.ts";

export interface SimulatedGarage {
  pNumber: string;
  name: string;
  capacity: number;
  location: [number, number];
  entrances: [number, number][];
}

export type Scenario =
  "normal" | "frozen" | "freeAboveCapacity" | "changingCapacity" | "full";

export const FAULT_SCENARIOS: Scenario[] = [
  "frozen",
  "freeAboveCapacity",
  "changingCapacity",
  "full",
];

interface GarageState {
  scenario: Scenario;
  free: number;
  capacity: number;
  measuredAt: Date;
}

export interface Simulation {
  readonly scenarios: Record<string, Scenario>;
  tick(now: Date): void;
  things(): FrostThing[];
}

export function assignScenarios(
  garages: SimulatedGarage[],
  random: () => number
): Record<string, Scenario> {
  const shuffled = garages.map((garage) => garage.pNumber);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as string, shuffled[i] as string];
  }
  return Object.fromEntries(
    shuffled.map((pNumber, index) => [
      pNumber,
      FAULT_SCENARIOS[index] ?? "normal",
    ])
  );
}

// Typical occupancy over the day in the city centre: low at night, highest in the afternoon
function occupancyAt(date: Date): number {
  const hour = date.getHours() + date.getMinutes() / 60;
  return 0.15 + 0.7 * Math.exp(-(((hour - 14.5) / 4) ** 2));
}

function reportedCapacity(
  scenario: Scenario,
  capacity: number,
  now: Date
): number {
  if (scenario !== "changingCapacity") {
    return capacity;
  }
  // Some spaces are rented out over night, so the reported capacity shrinks
  const hour = now.getHours();
  return hour >= 20 || hour < 7 ? Math.round(capacity * 0.6) : capacity;
}

function nextFree(
  state: GarageState,
  capacity: number,
  now: Date,
  random: () => number
): number {
  const typical = Math.round(
    capacity * (1 - occupancyAt(now)) + (random() - 0.5) * 6
  );
  switch (state.scenario) {
    case "normal":
    case "changingCapacity":
      return Math.min(Math.max(typical, 0), capacity);
    case "full":
      return Math.max(state.free - 2, 0);
    case "frozen":
      return state.free;
    case "freeAboveCapacity":
      return capacity * 2 + 143;
  }
}

export function createSimulation(
  garages: SimulatedGarage[],
  start: Date,
  random: () => number = Math.random
): Simulation {
  const scenarios = assignScenarios(garages, random);
  const states = new Map<string, GarageState>(
    garages.map((garage) => {
      const scenario = scenarios[garage.pNumber] as Scenario;
      const capacity = reportedCapacity(scenario, garage.capacity, start);
      const initialFree = {
        normal: Math.round(capacity * (1 - occupancyAt(start))),
        changingCapacity: Math.round(capacity * (1 - occupancyAt(start))),
        full: Math.min(20, capacity),
        frozen: Math.round(capacity * 0.4),
        freeAboveCapacity: capacity * 2 + 143,
      }[scenario];
      return [
        garage.pNumber,
        {
          scenario,
          free: initialFree,
          capacity,
          measuredAt: start,
        },
      ];
    })
  );

  function tick(now: Date): void {
    for (const garage of garages) {
      const state = states.get(garage.pNumber) as GarageState;
      const capacity = reportedCapacity(state.scenario, garage.capacity, now);
      const free = nextFree(state, capacity, now, random);
      Object.assign(state, { free, capacity, measuredAt: now });
    }
  }

  function datastream(
    type: FrostDatastream["properties"]["type"],
    state: GarageState
  ): FrostDatastream {
    return {
      properties: { type },
      Observations: [
        {
          phenomenonTime: state.measuredAt.toISOString(),
          result: type === "freeSpaces" ? state.free : state.capacity,
        },
      ],
    };
  }

  function things(): FrostThing[] {
    return garages.map((garage, index) => {
      const state = states.get(garage.pNumber) as GarageState;
      return {
        "@iot.id": index + 1,
        name: `${garage.pNumber} ${garage.name}`,
        properties: {
          pNumber: garage.pNumber,
          address: null,
          operatorUrl: null,
        },
        Locations: [
          {
            name: `${garage.pNumber} Parkhaus`,
            location: { type: "Point", coordinates: garage.location },
            properties: { type: "garage" },
          },
          ...garage.entrances.map((coordinates, entranceIndex) => ({
            name: `${garage.pNumber} Einfahrt ${entranceIndex + 1}`,
            location: { type: "Point" as const, coordinates },
            properties: { type: "entrance" as const },
          })),
        ],
        Datastreams: [
          datastream("freeSpaces", state),
          datastream("capacity", state),
        ],
      };
    });
  }

  return { scenarios, tick, things };
}
