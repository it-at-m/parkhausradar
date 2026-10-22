import type { Garage } from "@/types/Garage";

export type GarageStatus = "free" | "limited" | "full" | "unknown";

// Counting systems report every few minutes, older values no longer reflect the garage
export const GARAGE_DATA_MAX_AGE_MS = 15 * 60_000;

// Free spaces are judged relative to the capacity, but small garages need a minimum of absolute spaces
const FREE_MIN_SHARE = 0.2;
const FREE_MIN_SPACES = 30;
const FULL_MAX_SHARE = 0.05;
const FULL_MAX_SPACES = 10;

/**
 * Share of occupied spaces, null without data or if the reported values do not fit together
 */
export function getOccupancy(garage: Garage): number | null {
  const free = garage.freeSpaces?.value;
  const capacity = garage.capacity?.value;
  if (
    free === undefined ||
    capacity === undefined ||
    capacity <= 0 ||
    free < 0 ||
    free > capacity
  ) {
    return null;
  }
  return (capacity - free) / capacity;
}

export function isGarageDataOutdated(garage: Garage, now: Date): boolean {
  return (
    garage.freeSpaces !== null &&
    now.getTime() - garage.freeSpaces.measuredAt.getTime() >
      GARAGE_DATA_MAX_AGE_MS
  );
}

export function getGarageStatus(garage: Garage, now: Date): GarageStatus {
  const occupancy = getOccupancy(garage);
  if (
    occupancy === null ||
    !garage.freeSpaces ||
    isGarageDataOutdated(garage, now)
  ) {
    return "unknown";
  }
  const free = garage.freeSpaces.value;
  // Derived from the counts instead of the occupancy, as 1 - 0.8 is slightly below 0.2 in floating point
  const freeShare = free / (garage.capacity?.value ?? 0);
  if (freeShare < FULL_MAX_SHARE || free < FULL_MAX_SPACES) {
    return "full";
  }
  if (freeShare >= FREE_MIN_SHARE && free >= FREE_MIN_SPACES) {
    return "free";
  }
  return "limited";
}
