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
    <the-settings v-if="route.path === '/'" />
  </v-app>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";

import TheSettings from "@/components/TheSettings.vue";
import TheSnackbarQueue from "@/components/TheSnackbarQueue.vue";
import { useSettingsStore } from "@/stores/settings";

const route = useRoute();
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
