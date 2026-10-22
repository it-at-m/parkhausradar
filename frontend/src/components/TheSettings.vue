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
        border
      />
    </template>

    <!-- A menu taller than the space below its button is shifted over the button, so it scrolls instead -->
    <v-card
      class="d-flex flex-column"
      :width="xs ? undefined : 360"
      :max-height="xs ? undefined : MENU_MAX_HEIGHT"
      :rounded="xs ? 0 : 'lg'"
      :border="!xs"
    >
      <v-card-item class="py-3">
        <template
          v-if="xs"
          #prepend
        >
          <v-icon-btn
            data-test="settings-back-btn"
            :icon="mdiArrowLeft"
            :aria-label="t('components.theSettings.close')"
            variant="text"
            @click="isOpen = false"
          />
        </template>
        <v-card-title>
          {{ t("components.theSettings.title") }}
        </v-card-title>
        <template
          v-if="!xs"
          #append
        >
          <v-icon-btn
            data-test="settings-close-btn"
            :icon="mdiClose"
            :aria-label="t('components.theSettings.close')"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-card-item>

      <div class="flex-grow-1 overflow-y-auto">
        <v-card-text>
          <h3
            id="settings-appearance-label"
            class="text-label-large text-uppercase text-medium-emphasis mb-3"
          >
            {{ t("components.theSettings.appearance") }}
          </h3>
          <v-btn-toggle
            v-model="settingsStore.themePreference"
            class="w-100 h-auto pa-1 ga-1"
            aria-labelledby="settings-appearance-label"
            mandatory
            border
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
              stacked
            />
          </v-btn-toggle>

          <h3
            id="settings-language-label"
            class="text-label-large text-uppercase text-medium-emphasis mt-6 mb-3"
          >
            {{ t("components.theSettings.language") }}
          </h3>
          <v-select
            v-model="settingsStore.localePreference"
            data-test="settings-language-select"
            :items="localeOptions"
            aria-labelledby="settings-language-label"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-card-text>

        <v-divider class="mx-4" />

        <v-list
          tag="nav"
          :aria-label="t('components.theSettings.legal')"
        >
          <v-list-item
            v-for="link in legalLinks"
            :key="link.to"
            :data-test="`settings-legal-${link.to.slice(1)}-link`"
            :to="link.to"
            :prepend-icon="mdiFileDocumentOutline"
            :title="link.label"
            @click="isOpen = false"
          />
        </v-list>
      </div>

      <v-divider />

      <v-card-text class="flex-grow-0 text-body-small text-medium-emphasis">
        <a
          class="d-inline-flex align-center ga-1 mt-2 text-medium-emphasis"
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
    </v-card>
  </component>
</template>

<script setup lang="ts">
import type { Locale } from "@/plugins/i18n";
import type { LocalePreference, ThemePreference } from "@/stores/settings";

import {
  mdiArrowLeft,
  mdiCellphone,
  mdiClose,
  mdiCog,
  mdiFileDocumentOutline,
  mdiGithub,
  mdiMonitor,
  mdiWeatherNight,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { VDialog, VMenu } from "vuetify/components";

import { SUPPORTED_LOCALES } from "@/plugins/i18n";
import { useSettingsStore } from "@/stores/settings";

const SOURCE_CODE_URL = "https://github.com/it-at-m/parkhausradar";
// Space below the button (16px margin, 48px button, 8px offset) and a 16px gap to the bottom of the screen
const MENU_MAX_HEIGHT = "calc(100dvh - 88px)";

const { t } = useI18n();
const { xs } = useDisplay();

const overlayProps = computed(() =>
  xs.value
    ? { fullscreen: true, transition: "dialog-top-transition" }
    : ({
        location: "bottom end",
        offset: 8,
        closeOnContentClick: false,
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
const settingsStore = useSettingsStore();
const isOpen = ref(false);

const legalLinks = computed(() => [
  { to: "/impressum", label: t("components.theSettings.imprint") },
  { to: "/datenschutz", label: t("components.theSettings.privacy") },
  {
    to: "/barrierefreiheit",
    label: t("components.theSettings.accessibility"),
  },
]);

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
</script>
