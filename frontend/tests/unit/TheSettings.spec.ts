import type { VueWrapper } from "@vue/test-utils";

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "../../src/App.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";

const LOCALE_KEY = "parkhausradar.localePreference";
const MAP_APP_KEY = "parkhausradar.mapAppPreference";

let wrapper: VueWrapper | undefined;

beforeAll(() => {
  // Browser APIs used by Vuetify overlays and theme detection which jsdom does not provide
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      }
    )
  );
  vi.stubGlobal("visualViewport", {
    width: 1024,
    height: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
});

async function mountApp(deviceLanguages: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(deviceLanguages);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }],
  });
  await router.push("/");

  wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router, createPinia(), i18n, vuetify] },
  });
  await flushPromises();
}

function findByDataTest(dataTest: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-test="${dataTest}"]`
  );
  if (!element) {
    throw new Error(`No element with data-test="${dataTest}"`);
  }
  return element;
}

async function click(element: HTMLElement) {
  element.click();
  await flushPromises();
}

async function openSettings() {
  await click(findByDataTest("settings-open-btn"));
}

/**
 * Title of the open settings menu, which also asserts that the menu is open
 */
function getSettingsTitle(): string {
  const title = document.querySelector(".v-overlay--active .v-card-title");
  if (!title) {
    throw new Error("Settings menu is not open");
  }
  return title.textContent.trim();
}

function getSelectedLanguage(): string {
  const input = findByDataTest("settings-language-select").querySelector(
    "input[role='combobox']"
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Language select has no combobox input");
  }
  return input.value;
}

async function openSelect(dataTest: string) {
  findByDataTest(dataTest)
    .querySelector('[role="combobox"]')
    ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  await flushPromises();
}

async function openLanguageSelect() {
  await openSelect("settings-language-select");
}

function getLanguageOptions(): string[] {
  return [...document.querySelectorAll('[role="option"]')].map((option) =>
    option.textContent.trim()
  );
}

async function selectOption(dataTest: string, name: string) {
  await openSelect(dataTest);
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((option) => option.textContent.trim() === name);
  if (!option) {
    throw new Error(`No option "${name}" in ${dataTest}`);
  }
  await click(option);
}

async function selectLanguage(name: string) {
  await selectOption("settings-language-select", name);
}

describe("TheSettings theme", () => {
  test("applies the selected theme", async () => {
    // given
    await mountApp(["de-DE"]);
    await openSettings();

    // when
    await click(findByDataTest("settings-theme-dark-btn"));

    // then
    expect(vuetify.theme.global.name.value).toBe("dark");
    expect(getSettingsTitle()).toBe("Einstellungen");
  });
});

describe("TheSettings language", () => {
  test("starts in the device language", async () => {
    // given
    await mountApp(["en-US"]);

    // when
    await openSettings();

    // then
    expect(getSettingsTitle()).toBe("Settings");
    expect(document.documentElement.lang).toBe("en");
    expect(getSelectedLanguage()).toBe("Device language (English)");
  });

  test("offers the device language and all languages in their own language", async () => {
    // given
    await mountApp(["en-US"]);
    await openSettings();

    // when
    await openLanguageSelect();

    // then
    expect(getLanguageOptions()).toEqual([
      "Device language (English)",
      "Deutsch",
      "English",
    ]);
  });

  test("keeps language names in their own language after switching", async () => {
    // given
    await mountApp(["en-US"]);
    await openSettings();
    await selectLanguage("Deutsch");

    // when
    await openLanguageSelect();

    // then
    expect(getLanguageOptions()).toEqual([
      "Gerätesprache (English)",
      "Deutsch",
      "English",
    ]);
  });

  test("switches the interface language and keeps the settings open", async () => {
    // given
    await mountApp(["en-US"]);
    await openSettings();

    // when
    await selectLanguage("Deutsch");

    // then
    expect(getSettingsTitle()).toBe("Einstellungen");
    expect(document.documentElement.lang).toBe("de");
    expect(getSelectedLanguage()).toBe("Deutsch");
    expect(localStorage.getItem(LOCALE_KEY)).toBe("de");
  });
});

describe("TheSettings route planning", () => {
  test("remembers the map app for routes", async () => {
    // given
    await mountApp(["de-DE"]);
    await openSettings();

    // when
    await selectOption("settings-map-app-select", "Google Maps");

    // then
    expect(localStorage.getItem(MAP_APP_KEY)).toBe("google");
  });

  test("asks again for the map app once that is selected", async () => {
    // given
    localStorage.setItem(MAP_APP_KEY, "waze");
    await mountApp(["de-DE"]);
    await openSettings();

    // when
    await selectOption("settings-map-app-select", "Jedes Mal fragen");

    // then
    expect(localStorage.getItem(MAP_APP_KEY)).toBe("ask");
  });
});
