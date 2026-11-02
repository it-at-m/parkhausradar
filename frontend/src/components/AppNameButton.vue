<template>
  <v-btn
    class="app-name-button"
    data-test="app-name-btn"
    height="48"
  >
    <v-icon
      :icon="icon"
      size="24"
    />
    <span class="app-name font-weight-medium">{{ APP_NAME }}</span>
  </v-btn>
</template>

<script setup lang="ts">
import { APP_NAME } from "@/constants";

defineProps<{
  icon: string;
}>();
</script>

<style scoped>
/* A fixed radius instead of the pill of Vuetify, so it can transition to the panel header */
.app-name-button {
  padding-inline: 12px 20px;
  border-radius: 24px;
  transition-property:
    box-shadow, transform, opacity, background, border-radius;
}

.app-name-button :deep(.v-btn__content) {
  gap: 12px;
}

/* Centers the capital letters on the icon instead of the line box, which includes space for descenders */
.app-name {
  text-box: trim-both cap alphabetic;
}
</style>
