<template>
  <text-page :title="t('routes.info.title')">
    <p>{{ t("routes.info.intro") }}</p>

    <h2 class="text-title-large">{{ t("routes.info.coverageTitle") }}</h2>
    <p>{{ t("routes.info.coverage") }}</p>
    <p>{{ t("routes.info.coverageMissing") }}</p>

    <h2 class="text-title-large">{{ t("routes.info.originTitle") }}</h2>
    <p>{{ t("routes.info.origin") }}</p>
    <i18n-t
      keypath="routes.info.report"
      tag="p"
    >
      <template #link>
        <a
          :href="PROJECT_REPORT_URL"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t("routes.info.reportLink") }}</a
        >
      </template>
    </i18n-t>

    <!-- The logos are dark on a transparent background, so they keep a light background in the dark theme -->
    <v-sheet
      class="d-flex flex-wrap align-center justify-center ga-8 mt-8 pa-6"
      color="white"
      rounded="lg"
      border
    >
      <img
        class="logo"
        :src="muenchenDigitalLogo"
        alt="München Digital"
        height="96"
      />
      <img
        class="logo"
        :src="muenchenUnterwegsLogo"
        alt="München Unterwegs"
        height="40"
      />
    </v-sheet>
  </text-page>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import muenchenDigitalLogo from "@/assets/logos/muenchen-digital.svg";
import muenchenUnterwegsLogo from "@/assets/logos/muenchen-unterwegs.svg";
import TextPage from "@/components/TextPage.vue";

const PROJECT_REPORT_URL =
  "https://innolab.muenchen.de/projekte/parkhausradar.html";

const { t } = useI18n();
</script>

<style scoped>
.logo {
  max-width: 100%;
}
</style>
