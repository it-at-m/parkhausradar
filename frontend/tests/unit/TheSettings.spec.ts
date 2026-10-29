import type { VueWrapper } from "@vue/test-utils";

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "../../src/App.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";
import BarrierefreiheitPage from "../../src/routes/barrierefreiheit.vue";
import DatenschutzPage from "../../src/routes/datenschutz.vue";
import ImpressumPage from "../../src/routes/impressum.vue";

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
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/impressum", component: ImpressumPage },
      { path: "/datenschutz", component: DatenschutzPage },
      { path: "/barrierefreiheit", component: BarrierefreiheitPage },
    ],
  });
  await router.push("/");

  wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router, createPinia(), i18n, vuetify] },
  });
  await flushPromises();
  return router;
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

describe("TheSettings opening", () => {
  test("closes with the back button", async () => {
    // given
    const router = await mountApp(["de-DE"]);
    await openSettings();

    // Vuetify delays navigations while the selects are mounted, the test waits until it is done
    const navigated = new Promise<void>((resolve) => {
      const remove = router.afterEach(() => {
        remove();
        resolve();
      });
    });

    // when
    router.back();
    await navigated;
    await flushPromises();

    // then
    expect(
      findByDataTest("settings-open-btn").getAttribute("aria-expanded")
    ).toBe("false");
    expect(router.currentRoute.value.query).toEqual({});
  });
});

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

describe("TheSettings feedback", () => {
  test("links to the feedback survey in a new tab", async () => {
    // given
    await mountApp(["en-US"]);

    // when
    await openSettings();

    // then
    const link = findByDataTest("settings-feedback-link");
    expect(link.textContent.trim()).toBe("Take the survey");
    expect(link.getAttribute("href")).toBe(
      "https://umfrage.muenchen.de/index.php/577876"
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("TheSettings legal pages", () => {
  test.for([
    { page: "impressum", title: "Impressum" },
    { page: "datenschutz", title: "Datenschutzerklärung" },
    {
      page: "barrierefreiheit",
      title: "Erklärung zur Barrierefreiheit nach BayDiV",
    },
  ])(
    "opens the $page page and closes the settings",
    async ({ page, title }) => {
      // given
      const router = await mountApp(["de-DE"]);
      await openSettings();

      // when
      await click(findByDataTest(`settings-legal-${page}-link`));

      // then
      await vi.waitFor(() => {
        expect(router.currentRoute.value.path).toBe(`/${page}`);
        expect(
          document.querySelector("article[lang='de'] h1")?.textContent.trim()
        ).toBe(title);
      });
      expect(document.querySelector(".v-overlay--active")).toBeNull();
    }
  );

  test("reaches every legal link with the Tab key", async () => {
    // given
    await mountApp(["de-DE"]);

    // when
    await openSettings();

    // then
    const links = document.querySelectorAll<HTMLElement>(
      '[data-test^="settings-legal-"]'
    );
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  test("returns to the map", async () => {
    // given
    const router = await mountApp(["de-DE"]);
    await router.push("/impressum");
    await flushPromises();

    // when
    await click(findByDataTest("legal-page-back-btn"));

    // then
    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/");
    });
  });

  test.for([
    { deviceLanguages: ["en-US"], shown: true },
    { deviceLanguages: ["de-DE"], shown: false },
  ])(
    "shows the German only notice $shown for device languages $deviceLanguages",
    async ({ deviceLanguages, shown }) => {
      // given
      const router = await mountApp(deviceLanguages);

      // when
      await router.push("/impressum");
      await flushPromises();

      // then
      expect(
        document.body.textContent.includes(
          "This page is only available in German."
        )
      ).toBe(shown);
      expect(document.querySelector(".v-alert") !== null).toBe(shown);
    }
  );
});
