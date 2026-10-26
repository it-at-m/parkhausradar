<template>
  <section
    ref="root"
    class="garage-list"
    :class="xs ? 'mobile' : 'desktop'"
    data-test="garage-list"
    tabindex="-1"
    aria-labelledby="garage-list-title"
  >
    <v-card
      class="card d-flex flex-column"
      :width="xs ? undefined : 360"
      :rounded="xs ? 0 : 'lg'"
      :border="!xs"
    >
      <v-card-item class="py-3">
        <template
          v-if="xs"
          #prepend
        >
          <v-icon-btn
            data-test="garage-list-back-btn"
            :icon="mdiArrowLeft"
            :aria-label="t('components.garageList.close')"
            variant="text"
            @click="emit('close')"
          />
        </template>
        <v-card-title
          id="garage-list-title"
          tag="h2"
        >
          {{ t("components.garageList.title") }}
        </v-card-title>
      </v-card-item>

      <ul
        v-if="sortedGarages.length"
        class="list d-flex flex-column ga-1 px-2 pb-2"
      >
        <li
          v-for="garage in sortedGarages"
          :key="garage.pNumber"
        >
          <v-list-item
            tag="button"
            type="button"
            class="w-100 text-start"
            data-test="garage-list-item"
            :data-p-number="garage.pNumber"
            :active="garage.pNumber === selectedGarage?.pNumber"
            :aria-current="garage.pNumber === selectedGarage?.pNumber"
            rounded="lg"
            lines="two"
            @click="emit('select', garage)"
          >
            <template #prepend>
              <v-chip
                class="free-spaces justify-center me-3 font-weight-bold"
                data-test="garage-list-free-spaces"
                :color="getStatusColors(garage).background"
                :style="{ color: getStatusColors(garage).foreground }"
                variant="flat"
                size="small"
              >
                {{
                  garage.freeSpaces
                    ? t("components.garageList.free", {
                        free: garage.freeSpaces.value,
                      })
                    : UNKNOWN_FREE_SPACES
                }}
              </v-chip>
            </template>
            <template #title>
              <span data-test="garage-list-name">{{ garage.name }}</span>
            </template>
            <template #subtitle>
              <span data-test="garage-list-subtitle">
                {{ describeGarage(garage) }}
              </span>
            </template>
          </v-list-item>
        </li>
      </ul>
      <v-progress-linear
        v-else-if="!loaded && !error"
        data-test="garage-list-loading"
        class="mx-4 my-6 flex-grow-0"
        :aria-label="t('components.garageList.loading')"
        indeterminate
        rounded
      />
      <p
        v-else
        data-test="garage-list-empty"
        class="px-4 pb-4 text-body-large text-medium-emphasis"
      >
        {{
          error === "load"
            ? t("components.garageList.loadError")
            : t("components.garageList.empty")
        }}
      </p>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";

import { mdiArrowLeft } from "@mdi/js";
import { useEventListener, useIntervalFn, useNow } from "@vueuse/core";
import { computed, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

import { useGarages } from "@/composables/useGarages";
import { GARAGE_STATUS_COLORS, UNKNOWN_FREE_SPACES } from "@/constants";
import { isFocusInClosedDetails } from "@/util/focus";
import { toPercentString } from "@/util/formatter";
import { getGarageStatus, getOccupancy } from "@/util/garageStatus";
import { isOverlayOpen } from "@/util/overlay";

const props = defineProps<{
  selectedGarage: Garage | null;
}>();

const emit = defineEmits<{
  select: [garage: Garage];
  close: [];
}>();

const { t, locale } = useI18n();
const { xs } = useDisplay();
const { garages, error, loaded } = useGarages();
// Free spaces turn gray once their counts are outdated
const now = useNow({
  scheduler: (callback) => useIntervalFn(callback, 30_000),
});
const root = useTemplateRef("root");

const sortedGarages = computed(() => {
  const collator = new Intl.Collator(locale.value);
  return [...garages.value].sort((a, b) => collator.compare(a.name, b.name));
});

function getStatusColors(garage: Garage) {
  return GARAGE_STATUS_COLORS[getGarageStatus(garage, now.value)];
}

function describeOccupancy(garage: Garage): string | null {
  if (!garage.freeSpaces) {
    return t("components.garageList.noData");
  }
  const occupancy = getOccupancy(garage);
  return occupancy === null
    ? null
    : t("components.garageList.occupied", {
        percent: toPercentString(occupancy, locale.value),
      });
}

function describeGarage(garage: Garage): string {
  return [describeOccupancy(garage), garage.address]
    .filter((part) => part)
    .join(" · ");
}

// Open details are closed first
useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && !isOverlayOpen() && !props.selectedGarage) {
    emit("close");
  }
});

// Keyboard users closing the details continue at the garage in the list instead of its marker.
// Runs before the marker, which only takes the focus if it is still in the details.
watch(
  () => props.selectedGarage?.pNumber,
  (selected, wasSelected) => {
    if (wasSelected && !selected && isFocusInClosedDetails()) {
      root.value
        ?.querySelector<HTMLElement>(`[data-p-number="${wasSelected}"]`)
        ?.focus({ preventScroll: true });
    }
  }
);

// Moves keyboard users to the list, the next tab stop is the first garage
onMounted(() => root.value?.focus({ preventScroll: true }));
</script>

<style scoped>
.garage-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  outline: none;
}

.garage-list.mobile {
  height: 100%;
}

.card {
  flex: 1 1 auto;
  min-height: 0;
}

/* Only the garages scroll, the title stays visible */
.list {
  margin: 0;
  list-style: none;
  overflow-y: auto;
}

/* Wide enough for four digits, so the names of all garages start at the same position */
.free-spaces {
  width: 80px;
}
</style>
