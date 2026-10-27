import type { MapApp } from "@/util/mapApps";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Spelled out, so the keys are found by the check for unused translations
export function useMapAppNames() {
  const { t } = useI18n();
  return computed<Record<MapApp, string>>(() => ({
    apple: t("mapApps.apple"),
    google: t("mapApps.google"),
    osm: t("mapApps.osm"),
    waze: t("mapApps.waze"),
  }));
}
