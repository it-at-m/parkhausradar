<template>
  <div
    ref="mapContainer"
    class="the-map"
    role="region"
    :aria-label="t('components.theMap.label')"
    :style="{ '--map-bottom-inset': `${inset.bottom}px` }"
  />
  <template v-if="map">
    <garage-marker
      v-for="garage in garages"
      :key="garage.pNumber"
      :map="map"
      :garage="garage"
      :now="now"
      :selected="garage.pNumber === selectedGarage?.pNumber"
      @select="selectedGarage = garage"
    />
  </template>
  <!-- Bound to the loading state instead of the snackbar queue, so it disappears once loading works again -->
  <v-snackbar
    v-model="garagesErrorShown"
    data-test="garages-error"
    :color="STATUS_INDICATORS.ERROR"
    :timeout="-1"
  >
    <v-layout class="align-center">
      <v-icon
        class="mr-3"
        size="25"
        :icon="mdiAlertCircleOutline"
      />
      <p class="my-0 text-body-large">{{ garagesErrorText }}</p>
    </v-layout>
    <template #actions>
      <v-btn
        data-test="garages-error-dismiss-btn"
        :text="t('components.theMap.dismissGaragesError')"
        @click="garagesErrorShown = false"
      />
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import type { GaragesError } from "@/composables/useGarages";
import type { Garage } from "@/types/Garage";
import type { MapTheme } from "@/util/mapStyle";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { mdiAlertCircleOutline } from "@mdi/js";
import { useIntervalFn, useNow } from "@vueuse/core";
import { addProtocol, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import "maplibre-gl/dist/maplibre-gl.css";

import GarageMarker from "@/components/GarageMarker.vue";
import { useGarages } from "@/composables/useGarages";
import { STATUS_INDICATORS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbar";
import { createMapStyle } from "@/util/mapStyle";
import basemap from "../../basemap.json";

const props = defineProps<{
  /**
   * Space covered by content along the left and bottom edge of the map,
   * the selected garage is centered in the remaining area
   */
  inset: { left: number; bottom: number };
}>();

const selectedGarage = defineModel<Garage | null>("selectedGarage", {
  required: true,
});

// MapLibre derives its worker URL at runtime, which bundlers cannot follow
setWorkerUrl(maplibreWorkerUrl);
addProtocol("pmtiles", new Protocol().tile);

const ASSET_BASE_URL = `${window.location.origin}${import.meta.env.BASE_URL}map/`;
const [minLon, minLat, maxLon, maxLat] = basemap.bbox as [
  number,
  number,
  number,
  number,
];
// Old town, where the garages of the parking guidance system are located
const INITIAL_BOUNDS: [number, number, number, number] = [
  11.555, 48.128, 11.595, 48.148,
];
// Close enough to tell the streets around a garage apart, the map never zooms out on selection
const SELECTED_GARAGE_MIN_ZOOM = 15;

const { t } = useI18n();
const theme = useTheme();
const snackbarStore = useSnackbarStore();
const mapContainer = useTemplateRef("mapContainer");
const { garages, error: garagesError } = useGarages();
// Closed by the user until another error occurs, the text is kept while the snackbar fades out
const garagesErrorShown = ref(false);
const lastGaragesError = ref<GaragesError>("load");
const garagesErrorText = computed(() =>
  lastGaragesError.value === "load"
    ? t("components.theMap.garagesLoadError")
    : t("components.theMap.garagesRefreshError")
);
// Markers turn gray once their data is outdated, even if no new data arrives
const now = useNow({
  scheduler: (callback) => useIntervalFn(callback, 30_000),
});

const map = shallowRef<MapLibreMap>();
let cityBoundary: Feature<Polygon | MultiPolygon> | undefined;
let loadErrorShown = false;

// Failing tile requests raise one error per tile, the user only needs to be told once
function showLoadError(error: unknown) {
  console.debug(error);
  if (!loadErrorShown) {
    loadErrorShown = true;
    snackbarStore.push({
      text: t("components.theMap.loadError"),
      color: STATUS_INDICATORS.ERROR,
    });
  }
}

function currentStyle() {
  const mapTheme: MapTheme = theme.global.current.value.dark ? "dark" : "light";
  return createMapStyle({
    assetBaseUrl: ASSET_BASE_URL,
    tilesetFile: basemap.file,
    theme: mapTheme,
    cityBoundary,
  });
}

function showSelectedGarage() {
  if (!map.value || !selectedGarage.value) {
    return;
  }
  map.value.easeTo({
    center: selectedGarage.value.location,
    zoom: Math.max(map.value.getZoom(), SELECTED_GARAGE_MIN_ZOOM),
    offset: [props.inset.left / 2, -props.inset.bottom / 2],
  });
}

async function fetchCityBoundary(): Promise<Feature<Polygon | MultiPolygon>> {
  const response = await fetch(`${ASSET_BASE_URL}muenchen-grenze.geojson`);
  if (!response.ok) {
    throw new Error(`City boundary request failed: ${response.status}`);
  }
  return response.json();
}

onMounted(async () => {
  if (!mapContainer.value) {
    return;
  }
  try {
    const created = new MapLibreMap({
      container: mapContainer.value,
      style: currentStyle(),
      bounds: INITIAL_BOUNDS,
      maxBounds: [minLon, minLat, maxLon, maxLat],
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    created.on("error", ({ error }) => showLoadError(error));
    // Clicks on markers reach the map as well, only clicks next to them deselect
    created.on("click", ({ originalEvent }) => {
      const target = originalEvent.target;
      if (!(
        target instanceof Element && target.closest(".maplibregl-marker")
      )) {
        selectedGarage.value = null;
      }
    });
    map.value = created;
  } catch (error) {
    showLoadError(error);
    return;
  }

  // The boundary only dims the surroundings, so the map stays usable without it
  try {
    cityBoundary = await fetchCityBoundary();
    map.value?.setStyle(currentStyle());
  } catch (error) {
    console.debug(error);
  }
});

watch(garagesError, (error) => {
  garagesErrorShown.value = error !== null;
  if (error) {
    lastGaragesError.value = error;
  }
});

// Shows the new counts in the details, a garage that disappeared closes them
watch(garages, (loaded) => {
  const selected = selectedGarage.value;
  if (selected) {
    selectedGarage.value =
      loaded.find((garage) => garage.pNumber === selected.pNumber) ?? null;
  }
});

// Refreshed counts of the same garage do not move the map
watch(() => selectedGarage.value?.pNumber, showSelectedGarage);

// The details are measured after they are shown, so the map adjusts once their height is known.
// Separate sources, as the inset object is replaced whenever the selected garage is refreshed.
watch([() => props.inset.left, () => props.inset.bottom], showSelectedGarage);

watch(
  () => theme.global.current.value.dark,
  () => map.value?.setStyle(currentStyle())
);

function focusMarker(pNumber: string) {
  mapContainer.value
    ?.querySelector<HTMLElement>(`[data-p-number="${pNumber}"]`)
    ?.focus({ preventScroll: true });
}

defineExpose({ focusMarker });

// After the markers are unmounted, which remove themselves from the map
onUnmounted(() => {
  map.value?.remove();
  map.value = undefined;
});
</script>

<style scoped>
.the-map {
  width: 100%;
  height: 100%;
}

/* The attribution has to stay visible above content covering the bottom of the map */
.the-map :deep(.maplibregl-ctrl-bottom-right) {
  bottom: var(--map-bottom-inset);
  transition: bottom 150ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .the-map :deep(.maplibregl-ctrl-bottom-right) {
    transition: none;
  }
}
</style>
