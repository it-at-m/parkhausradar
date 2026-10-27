import type { VueWrapper } from "@vue/test-utils";

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Garage } from "../../src/types/Garage";

import { getGarages } from "../../src/api/garages-client";
import GarageList from "../../src/components/GarageList.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";

vi.mock("../../src/api/garages-client", () => ({ getGarages: vi.fn() }));

const NOW = new Date("2026-10-26T12:00:00Z");
const MINUTE = 60_000;

let wrapper: VueWrapper | undefined;

function createGarage(
  pNumber: string,
  name: string,
  overrides: Partial<Garage> = {}
): Garage {
  return {
    pNumber,
    name,
    address: null,
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

async function mountList(selectedGarage: Garage | null = null) {
  wrapper = mount(GarageList, {
    props: { selectedGarage },
    attachTo: document.body,
    global: { plugins: [i18n, vuetify] },
  });
  await flushPromises();
  return wrapper;
}

function items() {
  return wrapper?.findAll("[data-test=garage-list-item]") ?? [];
}

beforeEach(() => {
  // Only intervals and the clock are faked, so promises still resolve on their own
  vi.useFakeTimers({
    now: NOW,
    toFake: ["setInterval", "clearInterval", "Date"],
  });
  i18n.global.locale.value = "de";
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.mocked(getGarages).mockReset();
  document.body.innerHTML = "";
});

describe("GarageList content", () => {
  test("lists the garages alphabetically by name", async () => {
    // given
    vi.mocked(getGarages).mockResolvedValue([
      createGarage("P8", "Pschorr"),
      createGarage("P1", "Oper"),
      createGarage("P3", "Überseequartier"),
      createGarage("P2", "Altstadt"),
    ]);

    // when
    await mountList();

    // then
    expect(
      items().map((item) => item.get("[data-test=garage-list-name]").text())
    ).toEqual(["Altstadt", "Oper", "Pschorr", "Überseequartier"]);
  });

  test("shows the address of a garage below its name", async () => {
    // given
    vi.mocked(getGarages).mockResolvedValue([
      createGarage("P1", "Oper", { address: "Max-Joseph-Platz 4" }),
    ]);

    // when
    await mountList();

    // then
    expect(items()[0]?.get("[data-test=garage-list-address]").text()).toBe(
      "Max-Joseph-Platz 4"
    );
  });

  test.for([
    {
      case: "with capacity",
      overrides: {},
      freeSpaces: "312 frei",
      occupancy: "22 % belegt",
    },
    {
      case: "without capacity",
      overrides: { capacity: null },
      freeSpaces: "312 frei",
      occupancy: "",
    },
    {
      case: "without any counts",
      overrides: { freeSpaces: null, capacity: null },
      freeSpaces: "?",
      occupancy: "Keine Daten",
    },
  ])(
    "describes the occupancy of a garage $case",
    async ({ overrides, freeSpaces, occupancy }) => {
      // given
      vi.mocked(getGarages).mockResolvedValue([
        createGarage("P1", "Oper", overrides),
      ]);

      // when
      await mountList();

      // then
      const item = items()[0];
      expect(item?.get("[data-test=garage-list-free-spaces]").text()).toBe(
        freeSpaces
      );
      // Percentages are separated by a non-breaking space
      expect(
        item
          ?.get("[data-test=garage-list-occupancy]")
          .text()
          .replace(/\s/g, " ")
      ).toBe(occupancy);
    }
  );

  test("shows that the garages are loading", async () => {
    // given
    vi.mocked(getGarages).mockReturnValue(new Promise(() => undefined));

    // when
    await mountList();

    // then
    expect(wrapper?.find("[data-test=garage-list-loading]").exists()).toBe(
      true
    );
    expect(wrapper?.find("[data-test=garage-list-empty]").exists()).toBe(false);
  });

  test.for([
    {
      case: "no garages exist",
      load: () => vi.mocked(getGarages).mockResolvedValue([]),
      text: "Keine Parkhäuser verfügbar.",
    },
    {
      case: "the garages could not be loaded",
      load: () => vi.mocked(getGarages).mockRejectedValue(new Error("down")),
      text: "Die Parkhäuser konnten nicht geladen werden.",
    },
  ])("explains if $case", async ({ load, text }) => {
    // given
    load();

    // when
    await mountList();

    // then
    expect(wrapper?.get("[data-test=garage-list-empty]").text()).toBe(text);
    expect(wrapper?.find("[data-test=garage-list-loading]").exists()).toBe(
      false
    );
  });
});

describe("GarageList interaction", () => {
  test("selects a garage on click", async () => {
    // given
    const oper = createGarage("P1", "Oper");
    vi.mocked(getGarages).mockResolvedValue([oper]);
    await mountList();

    // when
    await items()[0]?.trigger("click");

    // then
    expect(wrapper?.emitted("select")).toEqual([[oper]]);
  });

  test("moves the focus to the list", async () => {
    // given
    vi.mocked(getGarages).mockResolvedValue([createGarage("P1", "Oper")]);

    // when
    await mountList();

    // then
    expect(document.activeElement).toBe(wrapper?.element);
  });

  test("closes on Escape", async () => {
    // given
    vi.mocked(getGarages).mockResolvedValue([createGarage("P1", "Oper")]);
    await mountList();

    // when
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    // then
    expect(wrapper?.emitted("close")).toHaveLength(1);
  });

  test("highlights the selected garage", async () => {
    // given
    const oper = createGarage("P1", "Oper");
    vi.mocked(getGarages).mockResolvedValue([
      oper,
      createGarage("P8", "Pschorr"),
    ]);

    // when
    await mountList(oper);

    // then
    expect(items().map((item) => item.attributes("aria-current"))).toEqual([
      "true",
      "false",
    ]);
  });

  test("leaves Escape to the details of the selected garage", async () => {
    // given
    const oper = createGarage("P1", "Oper");
    vi.mocked(getGarages).mockResolvedValue([oper]);
    await mountList(oper);

    // when
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    // then
    expect(wrapper?.emitted("close")).toBeUndefined();
  });
});
