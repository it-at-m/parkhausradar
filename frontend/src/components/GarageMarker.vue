<template>
  <button
    type="button"
    class="garage-marker"
    :class="{ selected }"
    data-test="garage-marker"
    :aria-label="label"
    :aria-expanded="selected"
  >
    <span class="pill">
      <span class="icon">{{ PARKING_SYMBOL }}</span>
      <span class="free-spaces">{{ freeSpaces ?? UNKNOWN_FREE_SPACES }}</span>
    </span>
  </button>
</template>

<script lang="ts">
// Must match the styles below, MapLibre aligns the tip of the marker with the garage by this size
export const GARAGE_MARKER_SHADOW_HEIGHT = 4;
</script>

<script setup lang="ts">
import type { GarageStatus } from "@/util/garageStatus";

import { computed } from "vue";

import { GARAGE_STATUS_COLORS, PARKING_SYMBOL } from "@/constants";

const props = defineProps<{
  /**
   * Accessible description of the garage, as the visible content is only a number
   */
  label: string;
  /**
   * null if the counting system has not reported a value yet
   */
  freeSpaces: number | null;
  /**
   * Colors the marker like a traffic light
   */
  status: GarageStatus;
  /**
   * Enlarges the marker while the details of the garage are shown
   */
  selected: boolean;
}>();

// Language independent symbol, so it is not translated
const UNKNOWN_FREE_SPACES = "?";

const colors = computed(() => GARAGE_STATUS_COLORS[props.status]);
</script>

<style scoped>
.garage-marker {
  --garage-marker-background: v-bind("colors.background");
  --garage-marker-foreground: v-bind("colors.foreground");
  --garage-marker-symbol: v-bind("colors.symbol");

  position: relative;
  display: block;
  height: 38px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  /* Scales around the tip, so the marker keeps pointing at the garage */
  transform-origin: 50% calc(100% - 2px);
  transition: transform 150ms ease;
}

.garage-marker.selected {
  transform: scale(1.25);
}

.garage-marker::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 12px;
  height: 4px;
  margin-left: -6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  filter: blur(1px);
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
 * The tip is a white triangle with a colored triangle on top, both with 45° edges and their apex
 * 8px below the pill. 2.83px is the 2px border measured vertically along these edges (2 × √2).
 * Both triangles start inside the pill instead of at its edges: shapes that only touch are blended
 * separately on fractional pixels (e.g. at 125% scaling), which lets a hairline shine through.
 * The white one starts at the bottom border, the colored one 2px above it in the solid fill.
 */
.pill::before,
.pill::after {
  content: "";
  position: absolute;
  left: 50%;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform: translateX(-50%);
}

.pill::before {
  top: 100%;
  width: 20px;
  height: 10px;
  background: #fff;
}

.pill::after {
  top: calc(100% - 2px);
  width: calc(2 * (12px - 2.83px));
  height: calc(12px - 2.83px);
  background: var(--garage-marker-background);
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
