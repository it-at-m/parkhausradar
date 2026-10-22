import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nextTick } from "vue";

import type { Garage } from "../../src/types/Garage";

import GarageDetails from "../../src/components/GarageDetails.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";

const NOW = new Date("2026-10-21T12:00:00Z");
const MINUTE = 60_000;
const DESKTOP_WIDTH = 1024;
const MOBILE_WIDTH = 375;

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
    global: { plugins: [i18n, vuetify] },
  });
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
  // jsdom has no pointer capture, the sheet uses it to keep receiving moves outside of itself
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(async () => {
  vi.useRealTimers();
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
