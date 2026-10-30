<template>
  <v-container
    class="text-page py-6"
    max-width="800"
  >
    <v-btn
      class="mb-4 ms-n4"
      data-test="text-page-back-btn"
      :prepend-icon="mdiArrowLeft"
      :text="t('components.textPage.back')"
      variant="text"
      @click="backToSettings"
    />
    <v-alert
      v-if="germanOnly && locale !== 'de'"
      class="mb-6"
      type="info"
      variant="tonal"
      density="compact"
      :text="t('components.textPage.germanOnly')"
    />
    <article :lang="germanOnly ? 'de' : undefined">
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
import { useRouter } from "vue-router";

defineProps<{
  title: string;
  /**
   * The text is only available in German, e.g. legal texts
   */
  germanOnly?: boolean;
}>();

const { t, locale } = useI18n();
const router = useRouter();

// Going back restores the map as it was when the page was opened from the settings
async function backToSettings() {
  const previous = router.options.history.state.back;
  if (
    typeof previous === "string" &&
    router.resolve(previous).query.dialog === "settings"
  ) {
    router.back();
  } else {
    // Replaces the page, so the back button closes the settings instead of reopening it
    await router.replace("/");
    await router.push({ path: "/", query: { dialog: "settings" } });
  }
}
</script>

<style scoped>
.text-page :slotted(h2) {
  margin-top: 32px;
  margin-bottom: 8px;
}

.text-page :slotted(h3) {
  margin-top: 24px;
  margin-bottom: 8px;
}

.text-page :slotted(p),
.text-page :slotted(address),
.text-page :slotted(ul) {
  margin-bottom: 16px;
}

.text-page :slotted(address) {
  font-style: normal;
}

.text-page :slotted(ul) {
  padding-left: 24px;
}
</style>
