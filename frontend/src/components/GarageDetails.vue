<template>
  <section
    ref="root"
    class="garage-details"
    :class="xs ? 'mobile' : 'desktop'"
    data-garage-details
    tabindex="-1"
    aria-labelledby="garage-details-title"
  >
    <v-card
      class="card"
      :class="{ dragging: dragOffset !== null }"
      :style="{ transform: `translateY(${dragOffset ?? 0}px)` }"
      :rounded="xs ? 't-xl' : 'xl'"
      elevation="8"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="cancelDrag"
    >
      <div
        v-if="xs"
        class="handle"
      />
      <v-card-item class="pt-4">
        <template #prepend>
          <v-avatar
            :color="colors.background"
            size="40"
          >
            <span
              class="text-title-medium font-weight-bold"
              :style="{ color: colors.foreground }"
            >
              {{ PARKING_SYMBOL }}
            </span>
          </v-avatar>
        </template>
        <v-card-title
          id="garage-details-title"
          tag="h2"
          class="text-title-large font-weight-bold text-wrap text-break"
        >
          {{ garage.name }}
        </v-card-title>
        <v-card-subtitle
          v-if="garage.address"
          data-test="garage-details-address"
          class="d-flex align-center ga-1 opacity-100 text-medium-emphasis text-wrap"
        >
          <v-icon
            :icon="mdiMapMarker"
            size="small"
          />
          {{ garage.address }}
        </v-card-subtitle>
        <template #append>
          <v-icon-btn
            data-test="garage-details-close-btn"
            :icon="mdiClose"
            :aria-label="t('components.garageDetails.close')"
            variant="text"
            @click="emit('close')"
          />
        </template>
      </v-card-item>

      <v-card-text class="pt-2">
        <v-sheet
          class="pa-4"
          color="surface-light"
          rounded="lg"
        >
          <template v-if="garage.freeSpaces">
            <p class="d-flex align-baseline ga-2">
              <span
                class="free-spaces text-display-small font-weight-bold"
                data-test="garage-details-free-spaces"
              >
                {{ garage.freeSpaces.value }}
              </span>
              <span class="text-body-large text-medium-emphasis">
                {{
                  garage.capacity
                    ? t("components.garageDetails.ofCapacityFree", {
                        capacity: garage.capacity.value,
                      })
                    : t("components.garageDetails.free")
                }}
              </span>
            </p>
            <v-progress-linear
              v-if="occupancy !== null"
              class="my-3"
              data-test="garage-details-occupancy"
              :model-value="occupancy * 100"
              :color="colors.background"
              :aria-label="t('components.garageDetails.occupancy')"
              height="8"
              rounded
            />
            <div
              class="d-flex justify-space-between ga-4 text-body-small text-medium-emphasis"
              :class="{ 'mt-3': occupancy === null }"
            >
              <span v-if="occupancy !== null">
                {{
                  t("components.garageDetails.occupied", {
                    percent: toPercentString(occupancy, locale),
                  })
                }}
              </span>
              <span class="ms-auto">
                {{
                  t("components.garageDetails.updated", {
                    time: toRelativeTimeString(
                      garage.freeSpaces.measuredAt,
                      now,
                      locale
                    ),
                  })
                }}
              </span>
            </div>
          </template>
          <p
            v-else
            class="text-body-large text-medium-emphasis"
          >
            {{ t("components.garageDetails.noData") }}
          </p>
        </v-sheet>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";

import { mdiClose, mdiMapMarker } from "@mdi/js";
import { useEventListener, useIntervalFn, useNow } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

import { GARAGE_STATUS_COLORS, PARKING_SYMBOL } from "@/constants";
import { toPercentString, toRelativeTimeString } from "@/util/formatter";
import { getGarageStatus, getOccupancy } from "@/util/garageStatus";
import { isOverlayOpen } from "@/util/overlay";

const props = defineProps<{
  garage: Garage;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Distance the sheet has to be dragged down on mobile to close it
const CLOSE_DRAG_DISTANCE = 80;
// Movement below this distance still counts as a click, e.g. on the close button
const DRAG_START_DISTANCE = 6;

const { t, locale } = useI18n();
const { xs } = useDisplay();
// Relative times are shown in minutes, refreshing twice a minute keeps them accurate enough
const now = useNow({
  scheduler: (callback) => useIntervalFn(callback, 30_000),
});
const root = useTemplateRef("root");

const occupancy = computed(() => getOccupancy(props.garage));
const colors = computed(
  () => GARAGE_STATUS_COLORS[getGarageStatus(props.garage, now.value)]
);

const dragOffset = ref<number | null>(null);
let dragStartY: number | null = null;

function startDrag(event: PointerEvent) {
  if (xs.value) {
    dragStartY = event.clientY;
  }
}

function drag(event: PointerEvent) {
  if (dragStartY === null) {
    return;
  }
  const distance = event.clientY - dragStartY;
  if (dragOffset.value === null && distance < DRAG_START_DISTANCE) {
    return;
  }
  if (dragOffset.value === null) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  dragOffset.value = Math.max(0, distance);
}

function endDrag() {
  if (dragOffset.value !== null && dragOffset.value >= CLOSE_DRAG_DISTANCE) {
    emit("close");
  }
  cancelDrag();
}

function cancelDrag() {
  dragStartY = null;
  dragOffset.value = null;
}

useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && !isOverlayOpen()) {
    emit("close");
  }
});

// Moves keyboard users to the details, the next tab stop is the close button
onMounted(() => root.value?.focus({ preventScroll: true }));
</script>

<style scoped>
.garage-details {
  outline: none;
}

.garage-details.mobile {
  position: fixed;
  z-index: 4;
  right: 0;
  bottom: 0;
  left: 0;
}

/* As wide as the name, long names wrap instead of stretching the card across the map */
.garage-details.desktop {
  width: max-content;
  min-width: 320px;
  max-width: 480px;
}

.card {
  transition: transform 150ms ease;
}

.mobile .card {
  touch-action: none;
}

.card.dragging {
  transition: none;
}

.handle {
  width: 36px;
  height: 4px;
  margin: 8px auto 0;
  border-radius: 2px;
  background: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* The marker colors are too light or too dark as text on one of the surfaces */
.free-spaces {
  color: v-bind("colors.textLight");
  line-height: 1;
}

.v-theme--dark .free-spaces {
  color: v-bind("colors.textDark");
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
</style>
