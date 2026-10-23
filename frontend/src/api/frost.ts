// Shape of the FROST-Server (SensorThings API) responses used by the app.
// Kept free of other imports, so the dev server simulation can share it.

export const FROST_THINGS_PATH = "/api/frost/v1.1/Things";

export type DatastreamType = "freeSpaces" | "capacity";
export type LocationType = "garage" | "entrance";

export interface FrostObservation {
  phenomenonTime: string;
  result: number;
}

export interface FrostDatastream {
  properties: { type: DatastreamType };
  Observations: FrostObservation[];
}

export interface FrostLocation {
  name: string;
  location: { type: "Point"; coordinates: [number, number] };
  properties: { type: LocationType };
}

export interface FrostThing {
  "@iot.id": number;
  name: string;
  properties: {
    pNumber: string;
    address: string | null;
    operatorUrl: string | null;
  };
  Locations: FrostLocation[];
  Datastreams: FrostDatastream[];
}

export interface FrostCollection<T> {
  value: T[];
}

/**
 * All parking garages with their locations and the latest observation of each datastream in one request.
 * Built with URLSearchParams, because the RefArch gateway re-encodes queries with unencoded characters like "(" or ";".
 */
export function garagesQuery(): URLSearchParams {
  return new URLSearchParams({
    $select: "id,name,properties",
    $top: "1000",
    $expand: [
      "Locations($select=name,location,properties)",
      "Datastreams($select=properties;$expand=Observations($top=1;$orderby=phenomenonTime desc;$select=phenomenonTime,result))",
    ].join(","),
  });
}
