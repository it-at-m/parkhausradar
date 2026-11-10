<template>
  <!-- The panels and the settings come before the map, so keyboard users reach them before every marker -->
  <div class="h-100">
    <!-- The app name is only shown in the toggle, screen readers still find the page by its heading -->
    <h1
      ref="heading"
      class="d-sr-only"
      tabindex="-1"
    >
      {{ APP_NAME }}
    </h1>
    <div class="panels d-flex flex-column ga-2 pa-4">
      <app-name-button
        ref="viewToggle"
        data-test="view-toggle-btn"
        class="view-toggle align-self-start"
        :class="{ 'panel-header': panelShown }"
        :icon="detailsInPanel ? mdiArrowLeft : mdiFormatListBulleted"
        :variant="panelShown ? 'text' : 'elevated'"
        :aria-label="
          detailsInPanel
            ? t('routes.index.closeDetails')
            : t('routes.index.list')
        "
        :aria-expanded="detailsInPanel ? undefined : listVisible"
        @click="toggleView"
      />
      <div
        ref="panelRow"
        class="panel-row d-flex align-start align-self-start ga-4"
      >
        <component
          :is="xs ? VDialog : RevealTransition"
          v-bind="listOverlayProps"
        >
          <!-- Stays mounted behind the details, so returning to it keeps its focus target -->
          <garage-list
            v-if="xs || listShown"
            ref="list"
            :class="{
              'below-toggle': !xs,
              'behind-details': !listVisible && !xs,
            }"
            :selected-garage="selectedGarage"
            @select="selectedGarage = $event"
            @close="closeList"
          />
        </component>
        <component
          :is="xs ? VSlideYReverseTransition : RevealTransition"
          v-bind="detailsTransitionProps"
        >
          <garage-details
            v-if="selectedGarage"
            ref="details"
            :class="{ 'below-toggle': !xs }"
            :garage="selectedGarage"
            @close="selectedGarage = null"
          />
        </component>
      </div>
    </div>
    <the-settings />
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
  </div>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";
import type { ComponentPublicInstance } from "vue";

import { mdiArrowLeft, mdiFormatListBulleted } from "@mdi/js";
import { useElementBounding, useElementSize, useTitle } from "@vueuse/core";
import { computed, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { VDialog, VSlideYReverseTransition } from "vuetify/components";

import AppNameButton from "@/components/AppNameButton.vue";
import GarageDetails from "@/components/GarageDetails.vue";
import GarageList from "@/components/GarageList.vue";
import RevealTransition from "@/components/RevealTransition.vue";
import TheMap from "@/components/TheMap.vue";
import TheSettings from "@/components/TheSettings.vue";
import { useGarages } from "@/composables/useGarages";
import { useQueryState } from "@/composables/useQueryState";
import { APP_NAME } from "@/constants";
import { focusPageHeading, isFocusInClosedDetails } from "@/util/focus";
import { GARAGE_LINK_QUERY } from "@/util/garageLink";

// Every page sets its own title, restoring the previous one could overwrite the title of the next page
useTitle(APP_NAME, { restoreOnUnmount: false });

const { t } = useI18n();
const { xs } = useDisplay();
const query = useQueryState();
const { garages, loaded } = useGarages();
const details = useTemplateRef("details");
const list = useTemplateRef("list");
const map = useTemplateRef("map");
const heading = useTemplateRef("heading");
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

// On larger screens the address keeps the list to return to from the details
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
      ...(garage && xs.value && { view: undefined }),
    });
  },
});

const listVisible = computed(
  () => listShown.value && (xs.value || !selectedGarage.value)
);
const detailsInPanel = computed(
  () => !xs.value && selectedGarage.value !== null
);
const panelShown = computed(
  () => !xs.value && (listShown.value || detailsInPanel.value)
);

const listOverlayProps = computed(() => ({
  target: viewToggleElement.value,
  ...(xs.value && {
    modelValue: listShown.value,
    fullscreen: true,
    transition: { component: RevealTransition },
    scrim: false,
    // The back button already closes it through the address
    closeOnBack: false,
    "aria-labelledby": "garage-list-title",
    "onUpdate:modelValue": closeList,
  }),
}));

// In the open list panel the details replace the list instead of growing out of the button
const detailsTransitionProps = computed(() =>
  xs.value || listShown.value ? {} : { target: viewToggleElement.value }
);

const mapInset = computed(() => {
  if (selectedGarage.value && detailsWidth.value) {
    return xs.value
      ? { left: 0, bottom: detailsHeight.value }
      : { left: panelRowRight.value, bottom: 0 };
  }
  // The list covers the map as well, the map moves focused markers out from under it
  if (listVisible.value && !xs.value) {
    return { left: panelRowRight.value, bottom: 0 };
  }
  return { left: 0, bottom: 0 };
});

function toggleView() {
  if (detailsInPanel.value) {
    selectedGarage.value = null;
  } else if (listVisible.value) {
    closeList();
  } else {
    showList();
  }
}

function showList() {
  query.change({
    view: "list",
    [GARAGE_LINK_QUERY]: undefined,
  });
}

// The list unmounts with the focus inside, keyboard users continue at the toggle
function closeList() {
  query.change({ view: undefined });
  viewToggleElement.value?.focus();
}

watch([loaded, selectedPNumber], () => {
  if (loaded.value && selectedPNumber.value && !selectedGarage.value) {
    query.change({ [GARAGE_LINK_QUERY]: undefined });
  }
});

// Screens that shrink to a full screen list keep the details, which are more specific than the list
watch(xs, (small) => {
  if (small && listShown.value && selectedPNumber.value) {
    query.change({ view: undefined });
  }
});

// Keyboard users closing the details continue at the garage they came from
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

onMounted(() => focusPageHeading(heading.value));
</script>

<style scoped>
/* Keeps the markers of the map below the panels */
.map {
  isolation: isolate;
}

/* Lets clicks next to the panels through to the map, which comes later and would otherwise cover them */
.panels {
  position: fixed;
  z-index: 1;
  inset: 0;
  pointer-events: none;
}

.view-toggle,
.panel-row > * {
  pointer-events: auto;
}

.view-toggle {
  z-index: 1;
}

/* Concentric with the card around it */
.view-toggle.panel-header {
  border-radius: 12px;
}

/* Pulls the panel behind the button: 48px button, 8px gap and 8px inset */
.panel-row > .below-toggle {
  width: 380px;
  margin-top: -64px;
  margin-left: -8px;
  max-height: calc(100% + 64px);
}

/* Room for the button with its 8px inset above the content */
.panel-row > .below-toggle > :deep(.v-card) {
  padding-top: 56px;
}

.panel-row > .behind-details {
  display: none;
}

.panel-row {
  flex: 1 1 auto;
  min-height: 0;
}

.panel-row > * {
  max-height: 100%;
}
</style>
