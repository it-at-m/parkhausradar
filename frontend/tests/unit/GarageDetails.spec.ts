import type { VueWrapper } from "@vue/test-utils";

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nextTick } from "vue";
import { VDialog, VSnackbar } from "vuetify/components";

import type { Garage } from "../../src/types/Garage";

import GarageDetails from "../../src/components/GarageDetails.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";
import { useSettingsStore } from "../../src/stores/settings";
import { useSnackbarStore } from "../../src/stores/snackbar";

const NOW = new Date("2026-10-21T12:00:00Z");
const MINUTE = 60_000;
const DESKTOP_WIDTH = 1024;
const MOBILE_WIDTH = 375;

let overlay: VueWrapper | undefined;
let pinia: ReturnType<typeof createPinia>;

function createGarage(overrides: Partial<Garage> = {}): Garage {
  return {
    pNumber: "P1",
    name: "Oper",
    address: "Max-Joseph-Platz 4, München",
    operatorUrl: null,
    location: [11.578, 48.139],
    entrances: [],
    freeSpaces: {
      value: 312,
      measuredAt: new Date(NOW.getTime() - 2 * MINUTE),
    },
    capacity: { value: 400, measuredAt: NOW },
    ...overrides,
  };
}

function mountDetails(garage: Garage) {
  return mount(GarageDetails, {
    props: { garage },
    attachTo: document.body,
    global: { plugins: [pinia, i18n, vuetify] },
  });
}

// jsdom lacks the viewport API Vuetify uses to position overlays
function stubVisualViewport() {
  vi.stubGlobal("visualViewport", {
    width: DESKTOP_WIDTH,
    height: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

// jsdom has neither a share sheet nor a clipboard
function stubNavigator(property: "share" | "clipboard", value: unknown) {
  Object.defineProperty(navigator, property, { value, configurable: true });
}

function routeLink(app: string): HTMLAnchorElement {
  const link = document.querySelector<HTMLAnchorElement>(
    `[data-test=garage-route-${app}-link]`
  );
  if (!link) {
    throw new Error(`No route link for ${app}`);
  }
  return link;
}

function isRouteDialogShown(): boolean {
  return (
    document.querySelector(
      ".v-overlay--active [data-test=garage-route-dialog]"
    ) !== null
  );
}

// jsdom has no PointerEvent, a MouseEvent of the same type carries everything the sheet reads
async function pointer(element: Element, type: string, clientY: number) {
  element.dispatchEvent(new MouseEvent(type, { clientY, bubbles: true }));
  await nextTick();
}

async function setScreenWidth(width: number) {
  window.innerWidth = width;
  window.dispatchEvent(new Event("resize"));
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  i18n.global.locale.value = "de";
  pinia = createPinia();
  setActivePinia(pinia);
  // jsdom has no pointer capture, the sheet uses it to keep receiving moves outside of itself
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(async () => {
  overlay?.unmount();
  overlay = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
  localStorage.clear();
  document.body.innerHTML = "";
  await setScreenWidth(DESKTOP_WIDTH);
});

describe("GarageDetails content", () => {
  test("shows name, address and occupancy of the garage", () => {
    // when
    const wrapper = mountDetails(createGarage());

    // then
    expect(wrapper.get("h2").text()).toBe("Oper");
    expect(wrapper.get("[data-test=garage-details-address]").text()).toBe(
      "Max-Joseph-Platz 4, München"
    );
    expect(wrapper.get("[data-test=garage-details-free-spaces]").text()).toBe(
      "312"
    );
    expect(wrapper.text()).toContain("von 400 frei");
    expect(wrapper.text()).toMatch(/22\s%\sbelegt/);
    expect(wrapper.text()).toContain("Stand: vor 2 Min.");
    expect(
      wrapper
        .get("[data-test=garage-details-occupancy]")
        .attributes("aria-valuenow")
    ).toBe("22");
  });

  test("leaves out the address if it is unknown", () => {
    // when
    const wrapper = mountDetails(createGarage({ address: null }));

    // then
    expect(wrapper.find("[data-test=garage-details-address]").exists()).toBe(
      false
    );
  });

  test("explains missing occupancy data", () => {
    // when
    const wrapper = mountDetails(
      createGarage({ freeSpaces: null, capacity: null })
    );

    // then
    expect(wrapper.text()).toContain("Keine aktuellen Belegungsdaten");
    expect(
      wrapper.find("[data-test=garage-details-free-spaces]").exists()
    ).toBe(false);
  });

  test("shows free spaces without occupancy if the capacity is unknown", () => {
    // when
    const wrapper = mountDetails(createGarage({ capacity: null }));

    // then
    expect(wrapper.get("[data-test=garage-details-free-spaces]").text()).toBe(
      "312"
    );
    expect(wrapper.text()).toMatch(/312\s*frei/);
    expect(wrapper.text()).not.toContain("von");
    expect(wrapper.find("[data-test=garage-details-occupancy]").exists()).toBe(
      false
    );
    expect(wrapper.text()).toContain("Stand: vor 2 Min.");
  });

  test("shows no occupancy if more spaces are free than the garage has", () => {
    // when
    const wrapper = mountDetails(
      createGarage({ freeSpaces: { value: 463, measuredAt: NOW } })
    );

    // then
    expect(wrapper.get("[data-test=garage-details-free-spaces]").text()).toBe(
      "463"
    );
    expect(wrapper.find("[data-test=garage-details-occupancy]").exists()).toBe(
      false
    );
    expect(wrapper.text()).not.toContain("belegt");
  });

  test("keeps the time of the counts up to date", async () => {
    // given
    const wrapper = mountDetails(createGarage());

    // when
    await vi.advanceTimersByTimeAsync(3 * MINUTE);

    // then
    expect(wrapper.text()).toContain("Stand: vor 5 Min.");
  });
});

describe("GarageDetails closing", () => {
  test.for([
    {
      trigger: "the close button",
      close: (wrapper: ReturnType<typeof mountDetails>) =>
        wrapper.get("[data-test=garage-details-close-btn]").trigger("click"),
    },
    {
      trigger: "Escape",
      close: () =>
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    },
  ])("closes via $trigger", async ({ close }) => {
    // given
    const wrapper = mountDetails(createGarage());

    // when
    await close(wrapper);

    // then
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  test.for([
    { overlay: "dialog", component: VDialog, closes: false },
    { overlay: "snackbar", component: VSnackbar, closes: true },
  ])(
    "Escape with an open $overlay closes the details: $closes",
    async ({ component, closes }) => {
      // given
      stubVisualViewport();
      overlay = mount(component, {
        props: { modelValue: true },
        slots: { default: "Overlay" },
        attachTo: document.body,
        global: { plugins: [vuetify] },
      });
      await nextTick();
      const wrapper = mountDetails(createGarage());

      // when
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      // then
      expect(wrapper.emitted("close") !== undefined).toBe(closes);
    }
  );

  test.for([
    { screen: "mobile", width: MOBILE_WIDTH, distance: 120, closes: true },
    { screen: "mobile", width: MOBILE_WIDTH, distance: 40, closes: false },
    { screen: "desktop", width: DESKTOP_WIDTH, distance: 120, closes: false },
  ])(
    "dragging $distance px down on $screen closes the details: $closes",
    async ({ width, distance, closes }) => {
      // given
      await setScreenWidth(width);
      const wrapper = mountDetails(createGarage());
      const card = wrapper.get(".card");

      // when
      await pointer(card.element, "pointerdown", 500);
      await pointer(card.element, "pointermove", 500 + distance);
      await pointer(card.element, "pointerup", 500 + distance);

      // then
      expect(wrapper.emitted("close") !== undefined).toBe(closes);
      expect(card.element.style.transform).toBe("translateY(0px)");
    }
  );
});

describe("GarageDetails focus", () => {
  test("moves the focus to the details when shown", () => {
    // when
    const wrapper = mountDetails(createGarage());

    // then
    expect(document.activeElement).toBe(wrapper.element);
  });
});

describe("GarageDetails route", () => {
  beforeEach(stubVisualViewport);

  async function openRouteDialog(wrapper: ReturnType<typeof mountDetails>) {
    await wrapper.get("[data-test=garage-details-route-btn]").trigger("click");
    await flushPromises();
  }

  // The link would open a new tab, which jsdom cannot
  async function chooseMapApp(app: string) {
    window.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    routeLink(app).click();
    await flushPromises();
  }

  test("lets users choose the map app, which opens in a new tab", async () => {
    // given
    const wrapper = mountDetails(createGarage());

    // when
    await openRouteDialog(wrapper);

    // then
    expect(isRouteDialogShown()).toBe(true);
    expect(
      ["apple", "google", "osm", "waze"].map((app) => routeLink(app).target)
    ).toEqual(["_blank", "_blank", "_blank", "_blank"]);
  });

  test("opens the remembered map app directly", async () => {
    // given
    useSettingsStore().mapAppPreference = "waze";
    const wrapper = mountDetails(createGarage());
    const button = wrapper.get("[data-test=garage-details-route-btn]");

    // when
    await button.trigger("click");
    await flushPromises();

    // then
    expect(new URL(button.attributes("href") ?? "").host).toBe("waze.com");
    expect(button.attributes("target")).toBe("_blank");
    expect(isRouteDialogShown()).toBe(false);
  });

  test("remembers the chosen map app if asked to", async () => {
    // given
    const wrapper = mountDetails(createGarage());
    await openRouteDialog(wrapper);
    document
      .querySelector<HTMLInputElement>(
        "[data-test=garage-route-remember-checkbox] input"
      )
      ?.click();

    // when
    await chooseMapApp("osm");

    // then
    expect(useSettingsStore().mapAppPreference).toBe("osm");
    expect(isRouteDialogShown()).toBe(false);
  });

  test("asks again next time if the chosen map app is not remembered", async () => {
    // given
    const wrapper = mountDetails(createGarage());
    await openRouteDialog(wrapper);

    // when
    await chooseMapApp("osm");

    // then
    expect(useSettingsStore().mapAppPreference).toBe("ask");
    expect(isRouteDialogShown()).toBe(false);
  });
});

describe("GarageDetails sharing", () => {
  function sharedUrl(url: string) {
    const { pathname, searchParams } = new URL(url);
    return { pathname, garage: searchParams.get("garage") };
  }

  test("shares a link to the garage with the share sheet of the device", async () => {
    // given
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator("share", share);
    const wrapper = mountDetails(createGarage());

    // when
    await wrapper.get("[data-test=garage-details-share-btn]").trigger("click");
    await flushPromises();

    // then
    expect(share).toHaveBeenCalledWith({
      title: "Oper",
      url: expect.any(String),
    });
    expect(sharedUrl(share.mock.calls[0]?.[0].url)).toEqual({
      pathname: "/",
      garage: "P1",
    });
  });

  test("copies the link without a share sheet", async () => {
    // given
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator("clipboard", { writeText });
    const wrapper = mountDetails(createGarage());

    // when
    await wrapper.get("[data-test=garage-details-share-btn]").trigger("click");
    await flushPromises();

    // then
    expect(sharedUrl(writeText.mock.calls[0]?.[0])).toEqual({
      pathname: "/",
      garage: "P1",
    });
    expect(useSnackbarStore().queue.map(({ text }) => text)).toEqual([
      "Link kopiert",
    ]);
  });

  test.for([
    {
      case: "is closed",
      error: new DOMException("", "AbortError"),
      messages: [],
    },
    {
      case: "fails",
      error: new DOMException("", "NotAllowedError"),
      messages: ["Der Link konnte nicht geteilt werden."],
    },
  ])(
    "reports only real errors if sharing $case",
    async ({ error, messages }) => {
      // given
      stubNavigator("share", vi.fn().mockRejectedValue(error));
      const wrapper = mountDetails(createGarage());

      // when
      await wrapper
        .get("[data-test=garage-details-share-btn]")
        .trigger("click");
      await flushPromises();

      // then
      expect(useSnackbarStore().queue.map(({ text }) => text)).toEqual(
        messages
      );
    }
  );
});
