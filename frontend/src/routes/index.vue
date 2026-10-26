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
import { computed, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
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
import { isFocusInClosedDetails } from "@/util/focus";

const { t } = useI18n();
const { xs, smAndDown } = useDisplay();
const route = useRoute();
const router = useRouter();
const selectedGarage = ref<Garage | null>(null);
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

// Kept in the URL, so the back button returns from the list to the map
const listShown = computed(() => route.query.view === "list");

const listOverlayProps = computed(() =>
  xs.value
    ? {
        modelValue: listShown.value,
        fullscreen: true,
        transition: "fade-transition",
        // The back button already closes it through the URL
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
  router.push({ query: { ...route.query, view: "list" } });
}

function showMap() {
  const mapLocation = router.resolve({
    query: { ...route.query, view: undefined },
  });
  // Going back instead of adding an entry, so the back button does not lead to the list again
  if (router.options.history.state.back === mapLocation.fullPath) {
    router.back();
  } else {
    router.replace(mapLocation);
  }
}

// The list unmounts with the focus inside, keyboard users continue at the toggle
function closeList() {
  showMap();
  viewToggleElement.value?.focus();
}

// The list and the details only fit next to each other on larger screens, otherwise one of them is shown
watch(listShown, (shown) => {
  if (shown && smAndDown.value) {
    selectedGarage.value = null;
  }
});

watch(selectedGarage, (garage) => {
  if (garage && listShown.value && smAndDown.value) {
    showMap();
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
