<template>
  <v-card
    class="d-flex flex-column"
    :width="xs ? undefined : 380"
    :rounded="xs ? 0 : undefined"
    :color="xs ? 'grouped-background' : undefined"
    :flat="xs"
  >
    <v-card-item :class="{ 'py-3': xs }">
      <template
        v-if="xs"
        #prepend
      >
        <v-icon-btn
          data-test="panel-back-btn"
          :icon="mdiArrowLeft"
          :aria-label="closeLabel"
          variant="text"
          @click="emit('close')"
        />
      </template>
      <v-card-title
        :id="titleId"
        class="ma-0"
        tag="h2"
      >
        {{ title }}
      </v-card-title>
    </v-card-item>
    <slot />
  </v-card>
</template>

<script setup lang="ts">
import { mdiArrowLeft } from "@mdi/js";
import { useDisplay } from "vuetify";

// Floating next to the map on larger screens, a full screen page with a back button on small screens
defineProps<{
  title: string;
  titleId?: string;
  closeLabel: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { xs } = useDisplay();
</script>
