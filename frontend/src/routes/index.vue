<template>
  <div class="h-100">
    <div
      class="map h-100"
      :inert="listShown && xs"
    >
      <the-map
        ref="map"
        v-model:selected-garage="selectedGarage"
        :inset="mapInset"
      />
    </div>
    <div class="panels d-flex flex-column ga-2 pa-4">
      <v-btn
        ref="viewToggle"
        data-test="view-toggle-btn"
        class="view-toggle align-self-start"
        :icon="mdiFormatListBulleted"
        :aria-label="t('routes.index.showList')"
        :aria-expanded="listShown"
        @click="listShown ? closeList() : showList()"
      />
      <div
        ref="panelRow"
        class="panel-row d-flex align-start align-self-start ga-4"
      >
        <component
          :is="xs ? VDialog : VDialogTransition"
          v-bind="listOverlayProps"
        >
          <!-- The dialog mounts its content only while it is open -->
          <garage-list
            v-if="xs || listShown"
            ref="list"
            :selected-garage="selectedGarage"
            @select="selectedGarage = $event"
            @close="closeList"
          />
        </component>
        <component :is="xs ? VSlideYReverseTransition : VSlideXTransition">
          <garage-details
            v-if="selectedGarage"
            ref="details"
            :garage="selectedGarage"
            @close="selectedGarage = null"
          />
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";
import type { ComponentPublicInstance } from "vue";

import { mdiFormatListBulleted } from "@mdi/js";
import { useElementBounding, useElementSize } from "@vueuse/core";
import { computed, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import {
  VDialog,
  VDialogTransition,
  VSlideXTransition,
  VSlideYReverseTransition,
} from "vuetify/components";

import GarageDetails from "@/components/GarageDetails.vue";
import GarageList from "@/components/GarageList.vue";
import TheMap from "@/components/TheMap.vue";
import { useGarages } from "@/composables/useGarages";
import { useQueryState } from "@/composables/useQueryState";
import { isFocusInClosedDetails } from "@/util/focus";
import { GARAGE_LINK_QUERY } from "@/util/garageLink";

const { t } = useI18n();
const { xs, smAndDown } = useDisplay();
const query = useQueryState();
const { garages, loaded } = useGarages();
const details = useTemplateRef("details");
const list = useTemplateRef("list");
const map = useTemplateRef("map");
const viewToggle = useTemplateRef<ComponentPublicInstance>("viewToggle");
const viewToggleElement = computed<HTMLElement | undefined>(
  () => viewToggle.value?.$el
);
const { width: detailsWidth, height: detailsHeight } = useElementSize(
  computed(() => details.value?.$el as HTMLElement | undefined),
  undefined,
  { box: "border-box" }
);
const { right: panelRowRight } = useElementBounding(useTemplateRef("panelRow"));

// Kept in the address, so the back button closes the list and the details and shared links open them
const listShown = computed(() => query.get("view") === "list");
const selectedPNumber = computed(() => query.get(GARAGE_LINK_QUERY));

// The list and the details only fit next to each other on larger screens, otherwise one of them is shown
const selectedGarage = computed<Garage | null>({
  get: () =>
    garages.value.find((garage) => garage.pNumber === selectedPNumber.value) ??
    null,
  set: (garage) => {
    if (garage?.pNumber === selectedPNumber.value) {
      return;
    }
    query.change({
      [GARAGE_LINK_QUERY]: garage?.pNumber,
      ...(garage && smAndDown.value && { view: undefined }),
    });
  },
});

const listOverlayProps = computed(() =>
  xs.value
    ? {
        modelValue: listShown.value,
        fullscreen: true,
        transition: "fade-transition",
        // The back button already closes it through the address
        closeOnBack: false,
        "onUpdate:modelValue": closeList,
      }
    : { target: viewToggleElement.value }
);

// On small screens the details cover the bottom of the map, otherwise its left side next to the list
const mapInset = computed(() => {
  if (!selectedGarage.value || !detailsWidth.value) {
    return { left: 0, bottom: 0 };
  }
  return xs.value
    ? { left: 0, bottom: detailsHeight.value }
    : { left: panelRowRight.value, bottom: 0 };
});

function showList() {
  query.change({
    view: "list",
    ...(smAndDown.value && { [GARAGE_LINK_QUERY]: undefined }),
  });
}

// The list unmounts with the focus inside, keyboard users continue at the toggle
function closeList() {
  query.change({ view: undefined });
  viewToggleElement.value?.focus();
}

// Links to garages that do not exist, or no longer do, only show the map
watch([loaded, selectedPNumber], () => {
  if (loaded.value && selectedPNumber.value && !selectedGarage.value) {
    query.change({ [GARAGE_LINK_QUERY]: undefined });
  }
});

// Screens that shrink below the size for both keep the details, which are more specific than the list
watch(smAndDown, (small) => {
  if (small && listShown.value && selectedPNumber.value) {
    query.change({ view: undefined });
  }
});

// Keyboard users closing the details continue at the garage they came from, in the list if it is shown and otherwise on the map
watch(
  () => selectedGarage.value?.pNumber,
  (selected, wasSelected) => {
    if (!wasSelected || selected || !isFocusInClosedDetails()) {
      return;
    }
    if (listShown.value && list.value) {
      list.value.focusGarage(wasSelected);
    } else {
      map.value?.focusMarker(wasSelected);
    }
  },
  { flush: "post" }
);
</script>

<style scoped>
/* Keeps the markers of the map below the panels */
.map {
  isolation: isolate;
}

/* Lets clicks next to the panels through to the map */
.panels {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.view-toggle,
.panel-row > * {
  pointer-events: auto;
}

.panel-row {
  flex: 1 1 auto;
  min-height: 0;
}

.panel-row > * {
  max-height: 100%;
}
</style>
