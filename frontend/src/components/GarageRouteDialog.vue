<template>
  <!-- The back button already closes it through the address -->
  <component
    :is="xs ? VBottomSheet : VDialog"
    v-model="isOpen"
    :max-width="xs ? undefined : 400"
    :close-on-back="false"
  >
    <v-card
      data-test="garage-route-dialog"
      :rounded="xs ? 't-xl' : undefined"
      :color="xs ? 'grouped-background' : undefined"
    >
      <v-card-item>
        <v-card-title
          tag="h2"
          class="ma-0 text-wrap"
        >
          {{ t("components.garageRouteDialog.title", { name: garage.name }) }}
        </v-card-title>
        <v-card-subtitle v-if="garage.entrances.length">
          {{ t("components.garageRouteDialog.toEntrance") }}
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="pt-2">
        <v-list
          class="py-0"
          :border="!xs"
          rounded="lg"
        >
          <template
            v-for="(app, index) in MAP_APPS"
            :key="app"
          >
            <v-divider v-if="index > 0" />
            <v-list-item
              :data-test="`garage-route-${app}-link`"
              :href="getRouteUrl(app, garage)"
              target="_blank"
              rel="noopener noreferrer"
              :title="mapAppNames[app]"
              @click="choose(app)"
            >
              <template #prepend>
                <v-avatar
                  color="surface-light"
                  rounded="lg"
                >
                  <v-icon :icon="MAP_APP_ICONS[app]" />
                </v-avatar>
              </template>
              <template #append>
                <v-icon
                  class="text-medium-emphasis"
                  :icon="mdiOpenInNew"
                  size="small"
                />
              </template>
            </v-list-item>
          </template>
        </v-list>

        <v-checkbox
          v-model="remember"
          data-test="garage-route-remember-checkbox"
          class="my-2"
          :label="t('components.garageRouteDialog.remember')"
          hide-details
        />

        <v-btn
          data-test="garage-route-cancel-btn"
          :text="t('components.garageRouteDialog.cancel')"
          variant="outlined"
          size="large"
          rounded="lg"
          block
          @click="isOpen = false"
        />
      </v-card-text>
    </v-card>
  </component>
</template>

<script setup lang="ts">
import type { Garage } from "@/types/Garage";
import type { MapApp } from "@/util/mapApps";

import {
  mdiApple,
  mdiGoogleMaps,
  mdiMap,
  mdiOpenInNew,
  mdiWaze,
} from "@mdi/js";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { VBottomSheet, VDialog } from "vuetify/components";

import { useMapAppNames } from "@/composables/useMapAppNames";
import { useSettingsStore } from "@/stores/settings";
import { getRouteUrl, MAP_APPS } from "@/util/mapApps";

// OpenStreetMap has no icon of its own
const MAP_APP_ICONS: Record<MapApp, string> = {
  apple: mdiApple,
  google: mdiGoogleMaps,
  osm: mdiMap,
  waze: mdiWaze,
};

defineProps<{
  garage: Garage;
}>();

const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { xs } = useDisplay();
const mapAppNames = useMapAppNames();
const settingsStore = useSettingsStore();
const remember = ref(false);

watch(isOpen, (open) => {
  if (open) {
    remember.value = false;
  }
});

// The link opens the app itself, the dialog only has to keep the choice
function choose(app: MapApp) {
  if (remember.value) {
    settingsStore.mapAppPreference = app;
  }
  isOpen.value = false;
}
</script>
