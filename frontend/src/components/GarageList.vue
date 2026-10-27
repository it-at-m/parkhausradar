<template>
  <section
    ref="root"
    class="garage-list"
    :class="xs ? 'mobile' : 'desktop'"
    data-test="garage-list"
    tabindex="-1"
    aria-labelledby="garage-list-title"
  >
    <panel-card
      class="card"
      :title="t('components.garageList.title')"
      title-id="garage-list-title"
      :close-label="t('components.garageList.close')"
      @close="emit('close')"
    >
      <!-- On small screens the garages form one group like the pages on iOS -->
      <v-sheet
        v-if="sortedGarages.length"
        class="garages"
        :class="xs ? 'mt-2 mx-4 mb-4' : 'px-2 pb-3'"
        :rounded="xs ? 'lg' : 0"
      >
        <ul class="list">
          <li
            v-for="(garage, index) in sortedGarages"
            :key="garage.pNumber"
            :class="{ 'border-t': xs && index > 0 }"
          >
            <v-list-item
              tag="button"
              type="button"
              class="w-100 text-start"
              :class="{ 'px-3': !xs }"
              data-test="garage-list-item"
              :data-p-number="garage.pNumber"
              :active="garage.pNumber === selectedGarage?.pNumber"
              :aria-current="garage.pNumber === selectedGarage?.pNumber"
              :rounded="xs ? 0 : 'lg'"
              min-height="56"
              @click="emit('select', garage)"
            >
              <template #prepend>
                <v-chip
                  class="free-spaces justify-center me-3 font-weight-bold"
                  data-test="garage-list-free-spaces"
                  :color="getStatusColors(garage).background"
                  :style="{ color: getStatusColors(garage).foreground }"
                  variant="flat"
                  density="comfortable"
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
                <!-- Long names wrap instead of being cut off -->
                <span
                  class="d-block text-title-small font-weight-semibold text-wrap"
                  data-test="garage-list-name"
                >
                  {{ garage.name }}
                </span>
              </template>
              <template
                v-if="garage.address"
                #subtitle
              >
                <span data-test="garage-list-address">{{
                  garage.address
                }}</span>
              </template>
              <template #append>
                <span
                  class="ms-3 text-body-small text-medium-emphasis text-no-wrap"
                  data-test="garage-list-occupancy"
                >
                  {{ describeOccupancy(garage) }}
                </span>
              </template>
            </v-list-item>
          </li>
        </ul>
      </v-sheet>
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
    </panel-card>
  </section>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";

import { useEventListener, useIntervalFn, useNow } from "@vueuse/core";
import { computed, onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

import PanelCard from "@/components/PanelCard.vue";
import { useGarages } from "@/composables/useGarages";
import { GARAGE_STATUS_COLORS, UNKNOWN_FREE_SPACES } from "@/constants";
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

// Open details are closed first
useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && !isOverlayOpen() && !props.selectedGarage) {
    emit("close");
  }
});

function focusGarage(pNumber: string) {
  root.value
    ?.querySelector<HTMLElement>(`[data-p-number="${pNumber}"]`)
    ?.focus({ preventScroll: true });
}

defineExpose({ focusGarage });

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
.garages {
  overflow-y: auto;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Wide enough for four digits, so the names of all garages start at the same position */
.free-spaces {
  width: 80px;
}
</style>
