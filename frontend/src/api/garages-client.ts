import type {
  DatastreamType,
  FrostCollection,
  FrostDatastream,
  FrostThing,
} from "@/api/frost";
import type { Garage, Measurement } from "@/types/Garage";

import { defaultResponseHandler, getConfig } from "@/api/fetch-utils";
import { FROST_THINGS_PATH, garagesQuery } from "@/api/frost";

// Requests on unstable connections can stall indefinitely, which would hold back every later refresh
const GARAGES_REQUEST_TIMEOUT_MS = 20_000;

export async function getGarages(): Promise<Garage[]> {
  const response = await fetch(`${FROST_THINGS_PATH}?${garagesQuery()}`, {
    ...getConfig(),
    signal: AbortSignal.timeout(GARAGES_REQUEST_TIMEOUT_MS),
  });
  defaultResponseHandler(response, "Parkhäuser konnten nicht geladen werden.");
  const collection: FrostCollection<FrostThing> = await response.json();
  // One malformed garage must not hide all others, it is only left out
  const garages: Garage[] = [];
  for (const thing of collection.value) {
    try {
      garages.push(toGarage(thing));
    } catch (error) {
      console.debug(error);
    }
  }
  if (collection.value.length > 0 && garages.length === 0) {
    throw new Error("None of the garages match the model of the collector");
  }
  return garages;
}

/**
 * Translates a FROST Thing into the app's model, so no other part of the app depends on the SensorThings structure.
 * Things that do not match the model written by the collector are rejected instead of being shown incompletely.
 */
export function toGarage(thing: FrostThing): Garage {
  const { pNumber, address, operatorUrl } = thing.properties;
  const garages = thing.Locations.filter((l) => l.properties.type === "garage");
  const [garage] = garages;
  if (!garage || garages.length !== 1) {
    throw new Error(
      `${pNumber}: expected exactly one garage location, got ${garages.length}`
    );
  }
  const unknownLocation = thing.Locations.find(
    (l) => l.properties.type !== "garage" && l.properties.type !== "entrance"
  );
  if (unknownLocation) {
    throw new Error(
      `${pNumber}: unknown location type ${unknownLocation.properties.type}`
    );
  }
  const unknownDatastream = thing.Datastreams.find(
    (d) =>
      d.properties.type !== "freeSpaces" && d.properties.type !== "capacity"
  );
  if (unknownDatastream) {
    throw new Error(
      `${pNumber}: unknown datastream type ${unknownDatastream.properties.type}`
    );
  }

  // The collector prefixes names with the P-number to keep them unique in FROST, users only need the name
  const namePrefix = `${pNumber} `;
  if (!thing.name.startsWith(namePrefix)) {
    throw new Error(`${pNumber}: name "${thing.name}" lacks its P-number`);
  }
  const name = thing.name.slice(namePrefix.length).trim();
  if (!name) {
    throw new Error(
      `${pNumber}: name "${thing.name}" has nothing besides its P-number`
    );
  }

  return {
    pNumber,
    name,
    address,
    operatorUrl,
    location: garage.location.coordinates,
    entrances: thing.Locations.filter(
      (l) => l.properties.type === "entrance"
    ).map((l) => l.location.coordinates),
    freeSpaces: latestMeasurement(pNumber, thing.Datastreams, "freeSpaces"),
    capacity: latestMeasurement(pNumber, thing.Datastreams, "capacity"),
  };
}

function latestMeasurement(
  pNumber: string,
  datastreams: FrostDatastream[],
  type: DatastreamType
): Measurement | null {
  const matching = datastreams.filter((d) => d.properties.type === type);
  const [datastream] = matching;
  if (!datastream || matching.length !== 1) {
    throw new Error(
      `${pNumber}: expected exactly one ${type} datastream, got ${matching.length}`
    );
  }
  const [observation] = datastream.Observations;
  if (!observation) {
    return null;
  }
  const measuredAt = new Date(observation.phenomenonTime);
  if (Number.isNaN(measuredAt.getTime())) {
    throw new Error(
      `${pNumber}: ${type} has the invalid phenomenonTime ${observation.phenomenonTime}`
    );
  }
  return { value: observation.result, measuredAt };
}
