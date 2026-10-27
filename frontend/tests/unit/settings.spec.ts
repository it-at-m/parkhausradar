import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nextTick } from "vue";

import { useSettingsStore } from "../../src/stores/settings";

const THEME_KEY = "parkhausradar.themePreference";
const LOCALE_KEY = "parkhausradar.localePreference";
const MAP_APP_KEY = "parkhausradar.mapAppPreference";

function mockDeviceLanguages(languages: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
}

function changeDeviceLanguages(languages: string[]) {
  mockDeviceLanguages(languages);
  window.dispatchEvent(new Event("languagechange"));
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("settings store locale", () => {
  test("defaults to the device language", () => {
    // given
    mockDeviceLanguages(["en-US"]);

    // when
    const store = useSettingsStore();

    // then
    expect(store.localePreference).toBe("system");
    expect(store.locale).toBe("en");
  });

  test.for([
    { languages: ["de-DE"], expected: "de" },
    { languages: ["en-US"], expected: "en" },
    { languages: ["de-AT"], expected: "de" },
    { languages: ["en-GB"], expected: "en" },
    { languages: ["EN-us"], expected: "en" },
    { languages: ["en-US", "de-DE"], expected: "en" },
    { languages: ["de-DE", "en-US"], expected: "de" },
    { languages: ["fr-FR", "en-US", "de-DE"], expected: "en" },
  ])(
    "resolves device languages $languages to $expected",
    ({ languages, expected }) => {
      // given
      mockDeviceLanguages(languages);

      // when
      const store = useSettingsStore();

      // then
      expect(store.systemLocale).toBe(expected);
    }
  );

  test.for([{ languages: ["fr-FR", "it-IT"] }, { languages: [] }])(
    "falls back to German for unsupported device languages $languages",
    ({ languages }) => {
      // given
      mockDeviceLanguages(languages);

      // when
      const store = useSettingsStore();

      // then
      expect(store.systemLocale).toBe("de");
      expect(store.locale).toBe("de");
    }
  );

  test("follows device language changes while set to device language", () => {
    // given
    mockDeviceLanguages(["de-DE"]);
    const store = useSettingsStore();

    // when
    changeDeviceLanguages(["en-US"]);

    // then
    expect(store.locale).toBe("en");
  });

  test("keeps the selected language when the device language changes", () => {
    // given
    mockDeviceLanguages(["de-DE"]);
    const store = useSettingsStore();
    store.localePreference = "de";

    // when
    changeDeviceLanguages(["en-US"]);

    // then
    expect(store.systemLocale).toBe("en");
    expect(store.locale).toBe("de");
  });

  test("uses the selected language over the device language", () => {
    // given
    mockDeviceLanguages(["en-US"]);
    const store = useSettingsStore();

    // when
    store.localePreference = "de";

    // then
    expect(store.locale).toBe("de");
  });

  test("returns to the device language when it is selected again", () => {
    // given
    mockDeviceLanguages(["en-US"]);
    const store = useSettingsStore();
    store.localePreference = "de";

    // when
    store.localePreference = "system";

    // then
    expect(store.locale).toBe("en");
  });

  test("persists the selected language", async () => {
    // given
    const store = useSettingsStore();

    // when
    store.localePreference = "en";
    await nextTick();

    // then
    expect(localStorage.getItem(LOCALE_KEY)).toBe("en");
  });

  test("persists switching back to the device language", async () => {
    // given
    localStorage.setItem(LOCALE_KEY, "en");
    const store = useSettingsStore();

    // when
    store.localePreference = "system";
    await nextTick();

    // then
    expect(localStorage.getItem(LOCALE_KEY)).toBe("system");
  });

  test("restores a persisted language over the device language", () => {
    // given
    mockDeviceLanguages(["de-DE"]);
    localStorage.setItem(LOCALE_KEY, "en");

    // when
    const store = useSettingsStore();

    // then
    expect(store.localePreference).toBe("en");
    expect(store.locale).toBe("en");
  });

  test.for([{ stored: "fr" }, { stored: "EN" }, { stored: "" }])(
    "uses the device language for the invalid persisted language '$stored'",
    ({ stored }) => {
      // given
      mockDeviceLanguages(["en-US"]);
      localStorage.setItem(LOCALE_KEY, stored);

      // when
      const store = useSettingsStore();

      // then
      expect(store.localePreference).toBe("system");
      expect(store.locale).toBe("en");
    }
  );
});

describe("settings store theme", () => {
  test("defaults to system", () => {
    // when
    const store = useSettingsStore();

    // then
    expect(store.themePreference).toBe("system");
  });

  test("persists the selected theme", async () => {
    // given
    const store = useSettingsStore();

    // when
    store.themePreference = "dark";
    await nextTick();

    // then
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  test.for([{ stored: "light" }, { stored: "dark" }] as const)(
    "restores the persisted theme $stored",
    ({ stored }) => {
      // given
      localStorage.setItem(THEME_KEY, stored);

      // when
      const store = useSettingsStore();

      // then
      expect(store.themePreference).toBe(stored);
    }
  );

  test.for([{ stored: "sepia" }, { stored: "DARK" }, { stored: "" }])(
    "uses system for the invalid persisted theme '$stored'",
    ({ stored }) => {
      // given
      localStorage.setItem(THEME_KEY, stored);

      // when
      const store = useSettingsStore();

      // then
      expect(store.themePreference).toBe("system");
    }
  );
});

describe("settings store map app", () => {
  test("asks for the map app by default", () => {
    // when
    const store = useSettingsStore();

    // then
    expect(store.mapAppPreference).toBe("ask");
  });

  test.for([{ stored: "here" }, { stored: "GOOGLE" }, { stored: "" }])(
    "asks for the map app if '$stored' is persisted",
    ({ stored }) => {
      // given
      localStorage.setItem(MAP_APP_KEY, stored);

      // when
      const store = useSettingsStore();

      // then
      expect(store.mapAppPreference).toBe("ask");
    }
  );
});
