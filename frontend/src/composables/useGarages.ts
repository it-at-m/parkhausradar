import type { Garage } from "@/types/Garage";

import {
  createSharedComposable,
  useDocumentVisibility,
  useIntervalFn,
} from "@vueuse/core";
import { shallowRef, watch } from "vue";

import { getGarages } from "@/api/garages-client";
import { GARAGE_DATA_MAX_AGE_MS } from "@/util/garageStatus";

/**
 * "load" if the garages could not be loaded at all,
 * "refresh" if the last garages are outdated because refreshing them keeps failing
 */
export type GaragesError = "load" | "refresh";

// The collector writes new counts once a minute, polling more often would not show newer data
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Loads the garages and refreshes them every minute while the tab is visible.
 * Failed refreshes keep the last garages, the error is only set once their counts are outdated
 * and cleared again as soon as loading works.
 * Shared, so the map and the list show the same garages without polling twice.
 */
export const useGarages = createSharedComposable(() => {
  const garages = shallowRef<Garage[]>([]);
  const error = shallowRef<GaragesError | null>(null);
  // Tells an empty result apart from garages that are still loading
  const loaded = shallowRef(false);
  let loadedAt: number | undefined;
  let loading = false;

  async function load() {
    if (loading) {
      return;
    }
    loading = true;
    try {
      garages.value = await getGarages();
      loadedAt = Date.now();
      loaded.value = true;
      error.value = null;
    } catch (cause) {
      console.debug(cause);
      if (loadedAt === undefined) {
        error.value = "load";
      } else if (Date.now() - loadedAt > GARAGE_DATA_MAX_AGE_MS) {
        error.value = "refresh";
      }
    } finally {
      loading = false;
    }
  }

  // Hidden tabs do not poll, they catch up as soon as they are visible again
  const visibility = useDocumentVisibility();
  const refresh = useIntervalFn(load, REFRESH_INTERVAL_MS, {
    immediate: false,
  });
  watch(
    visibility,
    (state) => {
      if (state === "visible") {
        load();
        refresh.resume();
      } else {
        refresh.pause();
      }
    },
    { immediate: true }
  );

  return { garages, error, loaded };
});
