import type { Garage } from "@/types/Garage";

import { useDocumentVisibility, useIntervalFn } from "@vueuse/core";
import { shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { getGarages } from "@/api/garages-client";
import { STATUS_INDICATORS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbar";

// The collector writes new counts once a minute, polling more often would not show newer data
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Loads the garages and refreshes them every minute while the tab is visible.
 * Failed refreshes keep the last garages, which turn gray once they are outdated.
 */
export function useGarages() {
  const { t } = useI18n();
  const snackbarStore = useSnackbarStore();
  const garages = shallowRef<Garage[]>([]);
  let loaded = false;
  let errorShown = false;
  let loading = false;

  async function load() {
    if (loading) {
      return;
    }
    loading = true;
    try {
      garages.value = await getGarages();
      loaded = true;
    } catch (error) {
      console.debug(error);
      if (!loaded && !errorShown) {
        errorShown = true;
        snackbarStore.push({
          text: t("components.theMap.garagesLoadError"),
          color: STATUS_INDICATORS.ERROR,
        });
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

  return { garages };
}
