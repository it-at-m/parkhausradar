import { readFileSync } from "node:fs";

import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";

import type { SimulatedGarage } from "./simulation.ts";

import { FROST_THINGS_PATH, garagesQuery } from "../src/api/frost.ts";
import { createSimulation } from "./simulation.ts";

const TICK_MS = 60_000;

function normalized(params: URLSearchParams): string {
  return [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/**
 * Answers the FROST requests of the app with simulated parking garages, so the UI can be developed without Docker.
 * Only the queries the app actually sends are supported. Any other query fails loudly instead of returning made-up data,
 * so the simulation cannot silently drift away from the real FROST-Server.
 */
export function FrostSimulatorPlugin(): Plugin {
  return {
    name: "frost-simulator",
    apply: "serve",
    configureServer(server) {
      const garages: SimulatedGarage[] = JSON.parse(
        readFileSync(new URL("./garages.json", import.meta.url), "utf8")
      );
      const simulation = createSimulation(garages, new Date());
      server.config.logger.info(
        `FROST simulator scenarios: ${JSON.stringify(simulation.scenarios)}`
      );
      const timer = setInterval(() => simulation.tick(new Date()), TICK_MS);
      server.httpServer?.once("close", () => clearInterval(timer));

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/frost/")) {
          next();
          return;
        }
        if (req.method !== "GET" && req.method !== "HEAD") {
          sendJson(res, 405, {
            code: 405,
            message: "The FROST access is read-only",
          });
          return;
        }
        if (
          url.pathname !== FROST_THINGS_PATH ||
          normalized(url.searchParams) !== normalized(garagesQuery())
        ) {
          sendJson(res, 404, {
            code: 404,
            message: `The FROST simulator does not support ${url.pathname}${url.search}. Add the query to simulator/plugin.ts or use "npm run dev:stack".`,
          });
          return;
        }
        sendJson(res, 200, { value: simulation.things() });
      });
    },
  };
}
