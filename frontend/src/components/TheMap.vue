<template>
  <div
    ref="mapContainer"
    class="the-map"
    role="region"
    :aria-label="t('components.theMap.label')"
    :style="{ '--map-bottom-inset': `${inset.bottom}px` }"
  />
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";
import type { MapTheme } from "@/util/mapStyle";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { useDocumentVisibility, useIntervalFn, useNow } from "@vueuse/core";
import {
  addProtocol,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import {
  h,
  onBeforeUnmount,
  onMounted,
  render,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import "maplibre-gl/dist/maplibre-gl.css";

import { getGarages } from "@/api/garages-client";
import GarageMarker, {
  GARAGE_MARKER_SHADOW_HEIGHT,
} from "@/components/GarageMarker.vue";
import { STATUS_INDICATORS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbar";
import {
  GARAGE_DATA_MAX_AGE_MS,
  getGarageStatus,
  isGarageDataOutdated,
} from "@/util/garageStatus";
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
// The collector writes new counts once a minute, polling more often would not show newer data
const GARAGE_REFRESH_INTERVAL_MS = 60_000;

const { t } = useI18n();
const theme = useTheme();
const snackbarStore = useSnackbarStore();
const mapContainer = useTemplateRef("mapContainer");
// Markers turn gray once their data is outdated, even if no new data arrives
const now = useNow({
  scheduler: (callback) => useIntervalFn(callback, 30_000),
});

let map: MapLibreMap | undefined;
let cityBoundary: Feature<Polygon | MultiPolygon> | undefined;
let loadErrorShown = false;
let garagesLoadedAt: number | undefined;
let garagesLoadErrorShown = false;
let garagesLoading = false;
const garageMarkers = new Map<
  string,
  { garage: Garage; marker: Marker; container: HTMLElement }
>();

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

function garageText(garage: Garage): string {
  if (!garage.freeSpaces) {
    return t("components.theMap.garageWithoutData", { name: garage.name });
  }
  const outdated = isGarageDataOutdated(garage, now.value);
  const name = garage.name;
  const free = garage.freeSpaces.value;
  // The marker shows the free spaces even without a capacity, so they have to be announced as well
  if (!garage.capacity) {
    return outdated
      ? t("components.theMap.garageWithoutCapacityOutdated", { name, free })
      : t("components.theMap.garageWithoutCapacity", { name, free });
  }
  const values = { name, free, capacity: garage.capacity.value };
  return outdated
    ? t("components.theMap.garageOutdated", values)
    : t("components.theMap.garage", values);
}

function renderGarageMarker(garage: Garage) {
  const selected = selectedGarage.value?.pNumber === garage.pNumber;
  const container = garageMarkers.get(garage.pNumber)?.container;
  if (!container) {
    return;
  }
  render(
    h(GarageMarker, {
      label: garageText(garage),
      freeSpaces: garage.freeSpaces?.value ?? null,
      status: getGarageStatus(garage, now.value),
      selected,
      onClick: () => (selectedGarage.value = garage),
    }),
    container
  );
  // Brings the selected marker in front of its neighbours
  container.style.zIndex = selected ? "1" : "";
}

function addGarageMarker(target: MapLibreMap, garage: Garage) {
  // MapLibre positions the container via its transform, the marker inside stays free to use its own
  const container = document.createElement("div");
  const marker = new Marker({
    element: container,
    anchor: "bottom",
    offset: [0, GARAGE_MARKER_SHADOW_HEIGHT / 2],
  })
    .setLngLat(garage.location)
    .addTo(target);
  garageMarkers.set(garage.pNumber, { garage, marker, container });
  renderGarageMarker(garage);
}

function removeGarageMarker(pNumber: string) {
  const entry = garageMarkers.get(pNumber);
  if (entry) {
    render(null, entry.container);
    entry.marker.remove();
    garageMarkers.delete(pNumber);
  }
}

function updateGarageMarkers(target: MapLibreMap, garages: Garage[]) {
  const pNumbers = new Set(garages.map((garage) => garage.pNumber));
  for (const pNumber of [...garageMarkers.keys()]) {
    if (!pNumbers.has(pNumber)) {
      removeGarageMarker(pNumber);
    }
  }
  // Southern markers are added last, so they overlap the markers behind them
  const southernmostLast = [...garages].sort(
    (a, b) => b.location[1] - a.location[1]
  );
  for (const garage of southernmostLast) {
    const entry = garageMarkers.get(garage.pNumber);
    if (entry) {
      entry.garage = garage;
      entry.marker.setLngLat(garage.location);
      renderGarageMarker(garage);
    } else {
      addGarageMarker(target, garage);
    }
  }
  // Shows the new counts in the details, a garage that disappeared closes them
  if (selectedGarage.value) {
    selectedGarage.value =
      garageMarkers.get(selectedGarage.value.pNumber)?.garage ?? null;
  }
}

async function loadGarages() {
  const target = map;
  if (!target || garagesLoading) {
    return;
  }
  garagesLoading = true;
  try {
    const garages = await getGarages();
    // The map may have been removed while the request was running
    if (map === target) {
      updateGarageMarkers(target, garages);
      garagesLoadedAt = Date.now();
      garagesLoadErrorShown = false;
    }
  } catch (error) {
    console.debug(error);
    // Failed refreshes keep the last counts, the user is only told once they are outdated
    const lastCountsOutdated =
      garagesLoadedAt === undefined ||
      Date.now() - garagesLoadedAt > GARAGE_DATA_MAX_AGE_MS;
    if (lastCountsOutdated && !garagesLoadErrorShown) {
      garagesLoadErrorShown = true;
      snackbarStore.push({
        text:
          garagesLoadedAt === undefined
            ? t("components.theMap.garagesLoadError")
            : t("components.theMap.garagesRefreshError"),
        color: STATUS_INDICATORS.ERROR,
      });
    }
  } finally {
    garagesLoading = false;
  }
}

// Hidden tabs do not poll, they catch up as soon as they are visible again
const visibility = useDocumentVisibility();
const garageRefresh = useIntervalFn(loadGarages, GARAGE_REFRESH_INTERVAL_MS, {
  immediate: false,
});
watch(visibility, (state) => {
  if (state === "visible") {
    loadGarages();
    garageRefresh.resume();
  } else {
    garageRefresh.pause();
  }
});

function showSelectedGarage() {
  if (!map || !selectedGarage.value) {
    return;
  }
  map.easeTo({
    center: selectedGarage.value.location,
    zoom: Math.max(map.getZoom(), SELECTED_GARAGE_MIN_ZOOM),
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
    map = new MapLibreMap({
      container: mapContainer.value,
      style: currentStyle(),
      bounds: INITIAL_BOUNDS,
      maxBounds: [minLon, minLat, maxLon, maxLat],
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.on("error", ({ error }) => showLoadError(error));
    map.on("click", ({ originalEvent }) => {
      const target = originalEvent.target;
      if (!(
        target instanceof Element && target.closest(".maplibregl-marker")
      )) {
        selectedGarage.value = null;
      }
    });
  } catch (error) {
    showLoadError(error);
    return;
  }
  loadGarages();
  if (visibility.value === "visible") {
    garageRefresh.resume();
  }

  // The boundary only dims the surroundings, so the map stays usable without it
  try {
    cityBoundary = await fetchCityBoundary();
    map?.setStyle(currentStyle());
  } catch (error) {
    console.debug(error);
  }
});

watch(
  selectedGarage,
  (garage, previousGarage) => {
    // Refreshed counts of the same garage neither move the map nor the focus
    if (garage?.pNumber === previousGarage?.pNumber) {
      return;
    }
    if (previousGarage) {
      renderGarageMarker(previousGarage);
    }
    if (garage) {
      renderGarageMarker(garage);
      showSelectedGarage();
      return;
    }
    // Keyboard users closing the details continue at the marker instead of the start of the page
    const focused = document.activeElement;
    if (
      previousGarage &&
      (!focused ||
        focused === document.body ||
        focused.closest("[data-garage-details]"))
    ) {
      garageMarkers
        .get(previousGarage.pNumber)
        ?.container.querySelector("button")
        ?.focus({ preventScroll: true });
    }
  },
  { flush: "post" }
);

watch(now, () => {
  for (const { garage } of garageMarkers.values()) {
    renderGarageMarker(garage);
  }
});

// The details are measured after they are shown, so the map adjusts once their height is known
watch(() => [props.inset.left, props.inset.bottom], showSelectedGarage);

watch(
  () => theme.global.current.value.dark,
  () => map?.setStyle(currentStyle())
);

onBeforeUnmount(() => {
  for (const pNumber of [...garageMarkers.keys()]) {
    removeGarageMarker(pNumber);
  }
  map?.remove();
  map = undefined;
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

/* MapLibre styles the attribution white with a black icon, which glares on the dark map, the border matches the settings button */
.the-map :deep(.maplibregl-ctrl-attrib.maplibregl-compact) {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.the-map :deep(.maplibregl-ctrl-attrib a) {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

/* The icon is a black background image, as a mask it takes the text color instead */
.the-map :deep(.maplibregl-ctrl-attrib-button) {
  background-image: none;
}

.the-map :deep(.maplibregl-ctrl-attrib-button::before) {
  content: "";
  position: absolute;
  inset: 0;
  background-color: currentColor;
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M4%2010a6%206%200%201%200%2012%200%206%206%200%201%200-12%200m5-3a1%201%200%201%200%202%200%201%201%200%201%200-2%200m0%203a1%201%200%201%201%202%200v3a1%201%200%201%201-2%200%22%2F%3E%3C%2Fsvg%3E")
    center / contain no-repeat;
}

.the-map :deep(.maplibregl-compact-show .maplibregl-ctrl-attrib-button) {
  background-color: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

@media (prefers-reduced-motion: reduce) {
  .the-map :deep(.maplibregl-ctrl-bottom-right) {
    transition: none;
  }
}
</style>
