import type { Garage } from "@/types/Garage";

export const MAP_APPS = ["apple", "google", "osm", "waze"] as const;

export type MapApp = (typeof MAP_APPS)[number];

export function isMapApp(value: string): value is MapApp {
  return (MAP_APPS as readonly string[]).includes(value);
}

/**
 * Links that open the app with a route by car to the garage,
 * or its website on devices without the app
 */
export function getRouteUrl(app: MapApp, garage: Garage): string {
  // Drivers are routed to an entrance instead of the middle of the building
  const [longitude, latitude] = garage.entrances[0] ?? garage.location;
  const destination = `${latitude},${longitude}`;
  switch (app) {
    case "apple":
      return `https://maps.apple.com/?${new URLSearchParams({ daddr: destination, dirflg: "d" })}`;
    case "google":
      return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination, travelmode: "driving" })}`;
    case "osm":
      return `https://www.openstreetmap.org/directions?${new URLSearchParams({ engine: "fossgis_osrm_car", route: `;${destination}` })}`;
    case "waze":
      return `https://waze.com/ul?${new URLSearchParams({ ll: destination, navigate: "yes" })}`;
  }
}
