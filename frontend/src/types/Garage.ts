export type Coordinates = [longitude: number, latitude: number];

export interface Measurement {
  value: number;
  measuredAt: Date;
}

export interface Garage {
  pNumber: string;
  name: string;
  address: string | null;
  operatorUrl: string | null;
  location: Coordinates;
  entrances: Coordinates[];
  /** null if the counting system has not reported a value yet */
  freeSpaces: Measurement | null;
  /** null if the counting system has not reported a value yet */
  capacity: Measurement | null;
}
