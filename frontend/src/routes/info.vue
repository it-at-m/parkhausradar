<template>
  <div class="info-page bg-grouped-background">
    <text-page :title="t('routes.info.title')">
      <p>{{ t("routes.info.intro") }}</p>
      <p>{{ t("routes.info.coverage") }}</p>

      <v-list
        class="mt-8"
        rounded="lg"
      >
        <v-list-item
          :href="PROJECT_REPORT_URL"
          target="_blank"
          rel="noopener noreferrer"
          :prepend-icon="mdiFileDocumentOutline"
          :title="t('routes.info.reportLink')"
          :subtitle="t('routes.info.reportHint')"
          rounded="lg"
        >
          <template #append>
            <v-icon
              :icon="mdiOpenInNew"
              size="small"
            />
          </template>
        </v-list-item>
      </v-list>

      <footer class="mt-12">
        <p class="text-body-small text-medium-emphasis">
          {{ t("routes.info.origin") }}
        </p>
        <div class="d-flex flex-wrap align-center ga-8">
          <img
            class="logo"
            :src="isDark ? muenchenDigitalWhiteLogo : muenchenDigitalLogo"
            alt="München Digital"
            height="56"
          />
          <img
            class="logo"
            :src="isDark ? muenchenUnterwegsWhiteLogo : muenchenUnterwegsLogo"
            alt="München Unterwegs"
            height="32"
          />
        </div>
      </footer>
    </text-page>
  </div>
</template>

<script setup lang="ts">
import { mdiFileDocumentOutline, mdiOpenInNew } from "@mdi/js";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import muenchenDigitalWhiteLogo from "@/assets/logos/muenchen-digital-white.svg";
import muenchenDigitalLogo from "@/assets/logos/muenchen-digital.svg";
import muenchenUnterwegsWhiteLogo from "@/assets/logos/muenchen-unterwegs-white.svg";
import muenchenUnterwegsLogo from "@/assets/logos/muenchen-unterwegs.svg";
import TextPage from "@/components/TextPage.vue";

const PROJECT_REPORT_URL =
  "https://innolab.muenchen.de/projekte/parkhausradar.html";

const { t } = useI18n();
const theme = useTheme();

const isDark = computed(() => theme.global.current.value.dark);
</script>

<style scoped>
.info-page {
  min-height: 100dvh;
}

.logo {
  max-width: 100%;
}
</style>
