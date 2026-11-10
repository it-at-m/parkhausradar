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
      <h1
        ref="heading"
        class="heading text-headline-large mb-6"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <slot />
    </article>
  </v-container>
</template>

<script setup lang="ts">
import { mdiArrowLeft } from "@mdi/js";
import { useTitle } from "@vueuse/core";
import { onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { APP_NAME } from "@/constants";
import { focusPageHeading } from "@/util/focus";

const props = defineProps<{
  title: string;
  /**
   * The text is only available in German, e.g. legal texts
   */
  germanOnly?: boolean;
}>();

const { t, locale } = useI18n();
const router = useRouter();
const heading = useTemplateRef("heading");

// Every page sets its own title, restoring the previous one could overwrite the title of the next page
useTitle(() => `${props.title} - ${APP_NAME}`, { restoreOnUnmount: false });

onMounted(() => focusPageHeading(heading.value));

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
/* Only focused to move screen readers to the new page, it is no control */
.heading:focus {
  outline: none;
}

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
