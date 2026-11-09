<template>
  <component
    :is="xs ? VDialog : VMenu"
    v-model="isOpen"
    v-bind="overlayProps"
  >
    <template #activator="{ props: activatorProps }">
      <!-- The menu holds settings instead of menu items. Unlike a menu, the dialog must not be owned
           by the button, whose content screen readers present as a single element. -->
      <v-btn
        v-bind="activatorProps"
        aria-haspopup="dialog"
        :aria-owns="undefined"
        data-test="settings-open-btn"
        class="ma-4"
        :icon="mdiCog"
        :aria-label="t('components.theSettings.open')"
        position="fixed"
        location="top end"
      />
    </template>

    <panel-card
      :max-height="xs ? undefined : MENU_MAX_HEIGHT"
      title-id="settings-title"
      :title="t('components.theSettings.title')"
      :close-label="t('components.theSettings.close')"
      @close="isOpen = false"
    >
      <!-- Takes the place of the button that opened the menu -->
      <v-btn
        v-if="!xs"
        data-test="settings-close-btn"
        class="ma-2"
        :icon="mdiCog"
        :aria-label="t('components.theSettings.close')"
        variant="text"
        position="absolute"
        location="top end"
        @click="isOpen = false"
      />
      <div class="flex-grow-1 overflow-y-auto">
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
            role="group"
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
              :aria-pressed="settingsStore.themePreference === option.value"
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

          <h3 class="text-label-large text-medium-emphasis mt-6 mb-2">
            {{ t("components.theSettings.feedback") }}
          </h3>
          <v-sheet
            class="overflow-hidden"
            :border="!xs"
            rounded="lg"
          >
            <v-list-item
              data-test="settings-feedback-link"
              :href="FEEDBACK_SURVEY_URL"
              target="_blank"
              rel="noopener noreferrer"
              :title="t('components.theSettings.feedbackSurvey')"
              lines="one"
            >
              <template #append>
                <v-icon
                  class="text-medium-emphasis"
                  :icon="mdiOpenInNew"
                  size="small"
                />
                <span class="d-sr-only">{{ t("common.opensInNewTab") }}</span>
              </template>
            </v-list-item>
          </v-sheet>
        </v-card-text>

        <!-- Leaving the map closes the settings, as they are kept in the address of the map -->
        <nav
          :class="xs ? 'mx-5 mb-4' : 'mx-2'"
          :aria-label="t('components.theSettings.pages')"
        >
          <v-sheet
            tag="ul"
            class="plain-list py-2"
            rounded="lg"
          >
            <li
              v-for="link in pageLinks"
              :key="link.to"
            >
              <v-list-item
                :data-test="`settings-page-${link.to.slice(1)}-link`"
                :to="link.to"
                :prepend-icon="link.icon"
                :title="link.label"
                rounded="lg"
                lines="one"
              />
            </li>
          </v-sheet>
        </nav>
      </div>
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
  mdiCardAccountDetailsOutline,
  mdiCellphone,
  mdiCog,
  mdiHumanHandsup,
  mdiInformationOutline,
  mdiMonitor,
  mdiOpenInNew,
  mdiShieldLockOutline,
  mdiWeatherNight,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { VDialog, VMenu } from "vuetify/components";

import PanelCard from "@/components/PanelCard.vue";
import RevealTransition from "@/components/RevealTransition.vue";
import { useMapAppNames } from "@/composables/useMapAppNames";
import { useQueryState } from "@/composables/useQueryState";
import { SUPPORTED_LOCALES } from "@/plugins/i18n";
import { useSettingsStore } from "@/stores/settings";
import { MAP_APPS } from "@/util/mapApps";

const FEEDBACK_SURVEY_URL = "https://umfrage.muenchen.de/index.php/577876";
// 8px around the button with its 16px margin, 16px gap to the bottom of the screen
const MENU_INSET = "8px";
const MENU_MAX_HEIGHT = "calc(100dvh - 24px)";

const { t } = useI18n();
const { xs } = useDisplay();

const overlayProps = computed(() =>
  xs.value
    ? {
        fullscreen: true,
        transition: "fade-transition",
        // The back button already closes it through the address
        closeOnBack: false,
        "aria-labelledby": "settings-title",
      }
    : ({
        // A panel next to the map, which unlike a menu holds settings
        role: "dialog",
        "aria-labelledby": "settings-title",
        locationStrategy: "static",
        contentProps: { style: { top: MENU_INSET, right: MENU_INSET } },
        transition: { component: RevealTransition },
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

const pageLinks = computed(() => [
  {
    to: "/info",
    label: t("components.theSettings.about"),
    icon: mdiInformationOutline,
  },
  {
    to: "/impressum",
    label: t("components.theSettings.imprint"),
    icon: mdiCardAccountDetailsOutline,
  },
  {
    to: "/datenschutz",
    label: t("components.theSettings.privacy"),
    icon: mdiShieldLockOutline,
  },
  {
    to: "/barrierefreiheit",
    label: t("components.theSettings.accessibility"),
    icon: mdiHumanHandsup,
  },
]);
</script>
