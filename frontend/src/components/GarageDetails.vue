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
      :rounded="xs ? 't-xl' : undefined"
      :color="xs ? 'grouped-background' : undefined"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="cancelDrag"
    >
      <div
        v-if="xs"
        class="handle"
      />
      <!-- The handle of the sheet already adds space above the title -->
      <v-card-item :class="{ 'pt-4': xs }">
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
          class="ma-0 text-wrap text-break"
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
            :color="innerSurfaceColor"
            variant="flat"
            size="32"
            icon-size="18"
            @click="emit('close')"
          />
        </template>
      </v-card-item>

      <v-card-text class="pt-2">
        <v-sheet
          class="pa-4"
          :color="innerSurfaceColor"
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

        <v-defaults-provider :defaults="ACTION_BUTTON_DEFAULTS">
          <div class="d-flex ga-2 mt-3">
            <!-- Opens the remembered app directly, otherwise lets users choose one -->
            <v-btn
              data-test="garage-details-route-btn"
              :href="routeUrl"
              :target="routeUrl ? '_blank' : undefined"
              rel="noopener noreferrer"
              :prepend-icon="mdiDirections"
              :text="t('components.garageDetails.route')"
              color="primary"
              @click="showRoute"
            />
            <v-btn
              data-test="garage-details-share-btn"
              :prepend-icon="mdiShareVariant"
              :text="t('components.garageDetails.share')"
              :color="innerSurfaceColor"
              @click="share"
            />
          </div>
        </v-defaults-provider>
      </v-card-text>
      <garage-route-dialog
        v-model="routeDialogShown"
        :garage="garage"
      />
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";

import {
  mdiClose,
  mdiDirections,
  mdiMapMarker,
  mdiShareVariant,
} from "@mdi/js";
import { useEventListener, useIntervalFn, useNow } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

import GarageRouteDialog from "@/components/GarageRouteDialog.vue";
import {
  GARAGE_STATUS_COLORS,
  PARKING_SYMBOL,
  STATUS_INDICATORS,
} from "@/constants";
import { useSettingsStore } from "@/stores/settings";
import { useSnackbarStore } from "@/stores/snackbar";
import { toPercentString, toRelativeTimeString } from "@/util/formatter";
import { getGarageLink } from "@/util/garageLink";
import { getGarageStatus, getOccupancy } from "@/util/garageStatus";
import { getRouteUrl } from "@/util/mapApps";
import { isOverlayOpen } from "@/util/overlay";

const props = defineProps<{
  garage: Garage;
}>();

const emit = defineEmits<{
  close: [];
}>();

const ACTION_BUTTON_DEFAULTS = {
  VBtn: { class: "flex-1-1-0", variant: "flat", size: "large", rounded: "lg" },
};

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
// The sheet has the gray background of the full screen pages, its boxes stand out in the surface color
const innerSurfaceColor = computed(() =>
  xs.value ? "surface" : "surface-light"
);
const colors = computed(
  () => GARAGE_STATUS_COLORS[getGarageStatus(props.garage, now.value)]
);

const settingsStore = useSettingsStore();
const snackbarStore = useSnackbarStore();
const routeDialogShown = ref(false);

const routeUrl = computed(() =>
  settingsStore.mapAppPreference === "ask"
    ? undefined
    : getRouteUrl(settingsStore.mapAppPreference, props.garage)
);

function showRoute() {
  if (!routeUrl.value) {
    routeDialogShown.value = true;
  }
}

// The share sheet of the device where there is one, otherwise the link is copied
async function share() {
  const url = getGarageLink(props.garage.pNumber);
  try {
    if (navigator.share) {
      await navigator.share({ title: props.garage.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      snackbarStore.push({
        text: t("components.garageDetails.linkCopied"),
        color: STATUS_INDICATORS.SUCCESS,
      });
    }
  } catch (error) {
    // Closing the share sheet without choosing a target is no error
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    snackbarStore.push({
      text: t("components.garageDetails.shareError"),
      color: STATUS_INDICATORS.ERROR,
    });
  }
}

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
