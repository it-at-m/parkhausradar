<template>
  <v-app>
    <the-snackbar-queue />
    <v-main>
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import TheSnackbarQueue from "@/components/TheSnackbarQueue.vue";
import { useSettingsStore } from "@/stores/settings";

const theme = useTheme();
const { locale: i18nLocale } = useI18n();
const settingsStore = useSettingsStore();

watch(
  () => settingsStore.themePreference,
  (themePreference) => theme.change(themePreference),
  { immediate: true }
);

watch(
  () => settingsStore.locale,
  (locale) => {
    i18nLocale.value = locale;
    document.documentElement.lang = locale;
  },
  { immediate: true }
);
</script>

<style>
:root {
  --standard-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Vuetify only hints the keyboard focus with a faint border, which is hardly visible */
.v-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-on-surface));
  outline-offset: 2px;
}

/* Inside, as the scrolling lists would clip an outline */
.v-list-item:focus-visible::after {
  opacity: 1;
}

.v-list-item::after {
  border-radius: inherit;
}

.v-selection-control--focus-visible .v-selection-control__input {
  outline: 2px solid currentColor;
}

/* Lists of v-list-items outside of v-list, which gives links the wrong roles */
.plain-list {
  margin: 0;
  padding-inline: 0;
  list-style: none;
}
</style>
