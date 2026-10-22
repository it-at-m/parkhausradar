import type { DateTimeOptions } from "vue-i18n";

import { createI18n } from "vue-i18n";
import { de as deVuetify, en as enVuetify } from "vuetify/locale";

import deApp from "@/locales/de.json";
import enApp from "@/locales/en.json";

type MessageSchema = typeof deApp;

export const SUPPORTED_LOCALES = ["de", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const messages = {
  de: {
    $vuetify: {
      ...deVuetify,
    },
    ...deApp,
  },
  en: {
    $vuetify: {
      ...enVuetify,
    },
    ...enApp,
  },
};

const dateTimeFormat: Record<string, DateTimeOptions> = {
  short: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
  long: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  timestamp: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
};

// Field order and separators are derived from the locale, e.g. TT.MM.JJJJ for de and MM/DD/YYYY for en
const datetimeFormats: Record<Locale, Record<string, DateTimeOptions>> = {
  de: dateTimeFormat,
  en: dateTimeFormat,
};

export default createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: "de",
  fallbackLocale: "de",
  messages,
  datetimeFormats,
});
