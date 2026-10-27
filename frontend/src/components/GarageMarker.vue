<template>
  <teleport :to="container">
    <button
      type="button"
      class="garage-marker"
      :class="{ selected }"
      data-test="garage-marker"
      :data-p-number="garage.pNumber"
      :aria-label="label"
      :aria-expanded="selected"
      @click="emit('select')"
    >
      <span class="pill">
        <span class="icon">{{ PARKING_SYMBOL }}</span>
        <span class="free-spaces">{{ freeSpaces }}</span>
        <svg
          class="tip"
          viewBox="-4 -4 18 12"
          aria-hidden="true"
        >
          <path
            class="tip-border"
            d="M-2 -2 L5 5 L12 -2"
          />
          <path
            class="tip-fill"
            d="M-4 -4 L5 5 L14 -4 Z"
          />
        </svg>
      </span>
    </button>
  </teleport>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";
import type { Map as MapLibreMap } from "maplibre-gl";

import { Marker } from "maplibre-gl";
import { computed, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";

import {
  GARAGE_STATUS_COLORS,
  PARKING_SYMBOL,
  UNKNOWN_FREE_SPACES,
} from "@/constants";
import { getGarageStatus, isGarageDataOutdated } from "@/util/garageStatus";

const props = defineProps<{
  map: MapLibreMap;
  garage: Garage;
  /**
   * Turns the marker gray once the counts are outdated
   */
  now: Date;
  /**
   * Enlarges the marker while the details of the garage are shown
   */
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

const { t } = useI18n();
const freeSpaces = computed(
  () => props.garage.freeSpaces?.value ?? UNKNOWN_FREE_SPACES
);
const colors = computed(
  () => GARAGE_STATUS_COLORS[getGarageStatus(props.garage, props.now)]
);

// Read by screen readers, as the visible content is only a number
const label = computed(() => {
  const { name, freeSpaces, capacity } = props.garage;
  if (!freeSpaces) {
    return t("components.theMap.garageWithoutData", { name });
  }
  const outdated = isGarageDataOutdated(props.garage, props.now);
  const free = freeSpaces.value;
  if (!capacity) {
    return outdated
      ? t("components.theMap.garageWithoutCapacityOutdated", { name, free })
      : t("components.theMap.garageWithoutCapacity", { name, free });
  }
  const values = { name, free, capacity: capacity.value };
  return outdated
    ? t("components.theMap.garageOutdated", values)
    : t("components.theMap.garage", values);
});

// MapLibre positions this container via its transform, the button inside stays free to use its own
const container = document.createElement("div");
const marker = new Marker({ element: container, anchor: "bottom" })
  .setLngLat(props.garage.location)
  .addTo(props.map);

watch(
  () => props.garage.location,
  (location) => marker.setLngLat(location)
);

watch(
  () => props.selected,
  (selected) => {
    // Brings the selected marker in front of its neighbours
    container.style.zIndex = selected ? "1" : "";
  },
  { immediate: true }
);

onBeforeUnmount(() => marker.remove());
</script>

<style scoped>
.garage-marker {
  --garage-marker-background: v-bind("colors.background");
  --garage-marker-foreground: v-bind("colors.foreground");
  --garage-marker-symbol: v-bind("colors.symbol");

  display: block;
  /* Room for the tip, so the bottom of the button, which MapLibre places on the garage, is its apex */
  padding: 0 0 8px;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  /* Scales around the tip, so the marker keeps pointing at the garage */
  transform-origin: 50% 100%;
  transition: transform 150ms ease;
}

.garage-marker.selected {
  transform: scale(1.25);
}

.pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px 0 2px;
  border: 2px solid #fff;
  border-radius: 14px;
  background: var(--garage-marker-background);
  color: var(--garage-marker-foreground);
  filter: drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.3));
  transition: transform 150ms ease;
}

/*
 * In the SVG, y = 0 is the bottom edge of the pill. The fill covers the white stroke on its inside,
 * which leaves the 2px border of the tip. Both shapes start inside the pill, the stroke in its white
 * border and the fill in its colored fill, as shapes that only touch let a hairline shine through.
 */
.tip {
  position: absolute;
  top: calc(100% - 2px);
  left: 50%;
  width: 18px;
  height: 12px;
  transform: translateX(-50%);
}

.tip-border {
  fill: none;
  stroke: #fff;
  stroke-width: 4;
}

.tip-fill {
  fill: var(--garage-marker-background);
}

.icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  color: var(--garage-marker-symbol);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.free-spaces {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.garage-marker:hover .pill {
  transform: translateY(-2px);
}

.garage-marker:focus-visible {
  outline: none;
}

/* The symbol color stays visible on the map, unlike the light yellow of a limited garage */
.garage-marker:focus-visible .pill {
  outline: 3px solid var(--garage-marker-symbol);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .garage-marker,
  .pill {
    transition: none;
  }
}
</style>
