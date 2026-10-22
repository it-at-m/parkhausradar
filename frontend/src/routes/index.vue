<template>
  <div class="h-100">
    <the-map
      v-model:selected-garage="selectedGarage"
      :inset="detailsInset"
    />
    <component :is="xs ? VSlideYReverseTransition : VSlideXTransition">
      <garage-details
        v-if="selectedGarage"
        ref="details"
        :garage="selectedGarage"
        @close="selectedGarage = null"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";

import { useElementSize } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";
import { useDisplay } from "vuetify";
import {
  VSlideXTransition,
  VSlideYReverseTransition,
} from "vuetify/components";

import GarageDetails from "@/components/GarageDetails.vue";
import TheMap from "@/components/TheMap.vue";

// Gap between the floating details card and the left edge of the screen on larger screens
const DETAILS_GAP = 16;

const { xs } = useDisplay();
const selectedGarage = ref<Garage | null>(null);
const details = useTemplateRef("details");
const { width: detailsWidth, height: detailsHeight } = useElementSize(
  computed(() => details.value?.$el as HTMLElement | undefined),
  undefined,
  { box: "border-box" }
);

// On small screens the details cover the bottom of the map, otherwise its left side
const detailsInset = computed(() => {
  if (!selectedGarage.value || !detailsWidth.value) {
    return { left: 0, bottom: 0 };
  }
  return xs.value
    ? { left: 0, bottom: detailsHeight.value }
    : { left: detailsWidth.value + DETAILS_GAP, bottom: 0 };
});
</script>
