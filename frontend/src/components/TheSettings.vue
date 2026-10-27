<template>
  <component
    :is="xs ? VDialog : VMenu"
    v-model="isOpen"
    v-bind="overlayProps"
  >
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        data-test="settings-open-btn"
        class="ma-4"
        :icon="mdiCog"
        :aria-label="t('components.theSettings.open')"
        position="fixed"
        location="top end"
      />
    </template>

    <panel-card
      :title="t('components.theSettings.title')"
      :close-label="t('components.theSettings.close')"
      @close="isOpen = false"
    >
      <v-card-text class="pt-2">
        <h3
          id="settings-appearance-label"
          class="text-label-large text-medium-emphasis mb-2"
        >
          {{ t("components.theSettings.appearance") }}
        </h3>
        <v-btn-toggle
          v-model="settingsStore.themePreference"
          class="w-100 h-auto pa-1 ga-1"
          :class="{ 'bg-surface': xs }"
          aria-labelledby="settings-appearance-label"
          rounded="lg"
          :border="!xs"
          mandatory
        >
          <v-btn
            v-for="option in themeOptions"
            :key="option.value"
            :data-test="`settings-theme-${option.value}-btn`"
            class="flex-1-1-0"
            :value="option.value"
            :prepend-icon="option.icon"
            :text="option.label"
            variant="text"
            height="64"
            rounded="md"
            stacked
          />
        </v-btn-toggle>

        <h3
          id="settings-language-label"
          class="text-label-large text-medium-emphasis mt-6 mb-2"
        >
          {{ t("components.theSettings.language") }}
        </h3>
        <v-defaults-provider :defaults="selectDefaults">
          <v-select
            v-model="settingsStore.localePreference"
            data-test="settings-language-select"
            :items="localeOptions"
            aria-labelledby="settings-language-label"
          />

          <h3
            id="settings-map-app-label"
            class="text-label-large text-medium-emphasis mt-6 mb-2"
          >
            {{ t("components.theSettings.mapApp") }}
          </h3>
          <v-select
            v-model="settingsStore.mapAppPreference"
            data-test="settings-map-app-select"
            :items="mapAppOptions"
            aria-labelledby="settings-map-app-label"
          />
        </v-defaults-provider>
      </v-card-text>

      <v-divider v-if="!xs" />

      <v-card-text
        class="flex-grow-0 py-4 text-body-small text-medium-emphasis"
      >
        <a
          class="d-inline-flex align-center ga-1 text-medium-emphasis"
          :href="SOURCE_CODE_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon
            :icon="mdiGithub"
            size="small"
          />
          {{ t("components.theSettings.sourceCode") }}
        </a>
      </v-card-text>
    </panel-card>
  </component>
</template>

<script setup lang="ts">
import type { Locale } from "@/plugins/i18n";
import type {
  LocalePreference,
  MapAppPreference,
  ThemePreference,
} from "@/stores/settings";

import {
  mdiCellphone,
  mdiCog,
  mdiGithub,
  mdiMonitor,
  mdiWeatherNight,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { VDialog, VMenu } from "vuetify/components";

import PanelCard from "@/components/PanelCard.vue";
import { useMapAppNames } from "@/composables/useMapAppNames";
import { useQueryState } from "@/composables/useQueryState";
import { SUPPORTED_LOCALES } from "@/plugins/i18n";
import { useSettingsStore } from "@/stores/settings";
import { MAP_APPS } from "@/util/mapApps";

const SOURCE_CODE_URL = "https://github.com/it-at-m/parkhausradar";

const { t } = useI18n();
const { xs } = useDisplay();

const overlayProps = computed(() =>
  xs.value
    ? {
        fullscreen: true,
        transition: "fade-transition",
        // The back button already closes it through the address
        closeOnBack: false,
      }
    : ({
        location: "bottom end",
        offset: 8,
        closeOnContentClick: false,
        closeOnBack: false,
        // The menu clips the card to its own radius, which is the smaller one of dropdowns
        contentClass: "rounded-xl",
      } as const)
);

const themeOptions = computed<
  { value: ThemePreference; icon: string; label: string }[]
>(() => [
  {
    value: "light",
    icon: mdiWhiteBalanceSunny,
    label: t("components.theSettings.theme.light"),
  },
  {
    value: "dark",
    icon: mdiWeatherNight,
    label: t("components.theSettings.theme.dark"),
  },
  {
    value: "system",
    icon: xs.value ? mdiCellphone : mdiMonitor,
    label: t("components.theSettings.theme.system"),
  },
]);
// On small screens the fields stand out on the gray background like the groups of the pages
const selectDefaults = computed(() => ({
  VSelect: {
    variant: xs.value ? "solo" : "outlined",
    flat: xs.value,
    rounded: "lg",
    density: "comfortable",
    hideDetails: true,
  },
}));
const settingsStore = useSettingsStore();
const mapAppNames = useMapAppNames();
const query = useQueryState();
// Kept in the address, so the back button closes the full screen page on small screens
const isOpen = computed({
  get: () => query.get("dialog") === "settings",
  set: (open) => query.change({ dialog: open ? "settings" : undefined }),
});

// Languages are shown in their own language so users can find theirs regardless of the current locale
function getLanguageName(locale: Locale): string {
  return (
    new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale
  );
}

const localeOptions = computed<{ value: LocalePreference; title: string }[]>(
  () => [
    {
      value: "system",
      title: t("components.theSettings.systemLanguage", {
        language: getLanguageName(settingsStore.systemLocale),
      }),
    },
    ...SUPPORTED_LOCALES.map((locale) => ({
      value: locale,
      title: getLanguageName(locale),
    })),
  ]
);

const mapAppOptions = computed<{ value: MapAppPreference; title: string }[]>(
  () => [
    {
      value: "ask",
      title: t("components.theSettings.askEveryTime"),
    },
    ...MAP_APPS.map((app) => ({ value: app, title: mapAppNames.value[app] })),
  ]
);
</script>
