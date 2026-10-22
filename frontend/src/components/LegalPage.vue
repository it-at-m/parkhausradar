<template>
  <v-container
    class="legal-page py-6"
    max-width="800"
  >
    <v-btn
      class="mb-4 ms-n4"
      data-test="legal-page-back-btn"
      :prepend-icon="mdiArrowLeft"
      :text="t('components.legalPage.back')"
      to="/"
      variant="text"
    />
    <v-alert
      v-if="locale !== 'de'"
      class="mb-6"
      type="info"
      variant="tonal"
      density="compact"
      :text="t('components.legalPage.germanOnly')"
    />
    <article lang="de">
      <h1 class="text-headline-large mb-6">
        {{ title }}
      </h1>
      <slot />
    </article>
  </v-container>
</template>

<script setup lang="ts">
import { mdiArrowLeft } from "@mdi/js";
import { useI18n } from "vue-i18n";

defineProps<{
  /**
   * German title of the legal text
   */
  title: string;
}>();

const { t, locale } = useI18n();
</script>

<style scoped>
.legal-page :slotted(h2) {
  margin-top: 32px;
  margin-bottom: 8px;
}

.legal-page :slotted(h3) {
  margin-top: 24px;
  margin-bottom: 8px;
}

.legal-page :slotted(p),
.legal-page :slotted(address),
.legal-page :slotted(ul) {
  margin-bottom: 16px;
}

.legal-page :slotted(address) {
  font-style: normal;
}

.legal-page :slotted(ul) {
  padding-left: 24px;
}
</style>
