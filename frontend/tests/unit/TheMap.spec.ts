import type { VueWrapper } from "@vue/test-utils";

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Garage } from "../../src/types/Garage";

import { getGarages } from "../../src/api/garages-client";
import TheMap from "../../src/components/TheMap.vue";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";
import { useSnackbarStore } from "../../src/stores/snackbar";

// MapLibre needs WebGL, so the map is replaced by a stand-in that only keeps what the component uses
const { maps } = vi.hoisted(() => ({ maps: [] as FakeMap[] }));

interface FakeMap {
  container: HTMLElement;
  easeTo: ReturnType<typeof vi.fn>;
  click(target: Element): void;
}

vi.mock("maplibre-gl", () => {
  class Map {
    container: HTMLElement;
    easeTo = vi.fn();
    private clickHandlers: ((event: { originalEvent: Event }) => void)[] = [];

    constructor(options: { container: HTMLElement }) {
      this.container = options.container;
      maps.push(this);
    }

    on(type: string, handler: (event: { originalEvent: Event }) => void) {
      if (type === "click") {
        this.clickHandlers.push(handler);
      }
      return this;
    }

    click(target: Element) {
      const originalEvent = new MouseEvent("click");
      Object.defineProperty(originalEvent, "target", { value: target });
      this.clickHandlers.forEach((handler) => handler({ originalEvent }));
    }

    getZoom() {
      return 13;
    }

    setStyle() {
      return this;
    }

    remove() {
      this.container.replaceChildren();
    }
  }

  class Marker {
    element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      this.element.classList.add("maplibregl-marker");
    }

    setLngLat() {
      return this;
    }

    addTo(map: Map) {
      map.container.append(this.element);
      return this;
    }

    remove() {
      this.element.remove();
    }
  }

  return { Map, Marker, addProtocol: vi.fn(), setWorkerUrl: vi.fn() };
});

vi.mock("../../src/api/garages-client", () => ({ getGarages: vi.fn() }));

const NOW = new Date("2026-10-22T12:00:00Z");
const MINUTE = 60_000;

let wrapper: VueWrapper | undefined;

function createGarage(
  pNumber: string,
  name: string,
  free: number,
  measuredAt = NOW
): Garage {
  return {
    pNumber,
    name,
    address: null,
    operatorUrl: null,
    location: [11.578, 48.139],
    entrances: [],
    freeSpaces: { value: free, measuredAt },
    capacity: { value: 400, measuredAt },
  };
}

const OPER = createGarage("P1", "Oper", 312);
const PSCHORR = createGarage("P8", "Pschorr", 120);

async function mountMap() {
  wrapper = mount(TheMap, {
    attachTo: document.body,
    props: {
      inset: { left: 0, bottom: 0 },
      selectedGarage: null,
      "onUpdate:selectedGarage": (garage: Garage | null) =>
        wrapper?.setProps({ selectedGarage: garage }),
    },
    global: { plugins: [i18n, vuetify] },
  });
  await flushPromises();
  return wrapper;
}

function fakeMap(): FakeMap {
  const map = maps.at(-1);
  if (!map) {
    throw new Error("No map was created");
  }
  return map;
}

function markerLabels(): (string | undefined)[] {
  return [...document.querySelectorAll("[data-test=garage-marker]")].map(
    (marker) => marker.getAttribute("aria-label") ?? undefined
  );
}

function findMarker(name: string): HTMLElement {
  const marker = [
    ...document.querySelectorAll<HTMLElement>("[data-test=garage-marker]"),
  ].find((element) => element.getAttribute("aria-label")?.startsWith(name));
  if (!marker) {
    throw new Error(`No marker for ${name}`);
  }
  return marker;
}

function lastSelectedGarage(): Garage | null | undefined {
  return wrapper
    ?.emitted<[Garage | null]>("update:selectedGarage")
    ?.at(-1)?.[0];
}

async function advance(milliseconds: number) {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await flushPromises();
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  // Only intervals and the clock are faked, so promises still resolve on their own
  vi.useFakeTimers({
    now: NOW,
    toFake: ["setInterval", "clearInterval", "Date"],
  });
  setActivePinia(createPinia());
  i18n.global.locale.value = "de";
  setVisibility("visible");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
  );
  vi.mocked(getGarages).mockResolvedValue([OPER, PSCHORR]);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  maps.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(getGarages).mockReset();
});

describe("TheMap garages", () => {
  test("shows a described marker per garage", async () => {
    // when
    await mountMap();

    // then
    expect(markerLabels().sort()).toEqual([
      "Oper: 312 von 400 frei",
      "Pschorr: 120 von 400 frei",
    ]);
  });

  test("loads the garages again every minute", async () => {
    // given
    await mountMap();
    vi.mocked(getGarages).mockResolvedValue([
      createGarage("P1", "Oper", 290, new Date(NOW.getTime() + MINUTE)),
    ]);

    // when
    await advance(MINUTE - 1);
    const callsBeforeMinute = vi.mocked(getGarages).mock.calls.length;
    await advance(1);

    // then
    expect(callsBeforeMinute).toBe(1);
    expect(getGarages).toHaveBeenCalledTimes(2);
    expect(markerLabels()).toEqual(["Oper: 290 von 400 frei"]);
  });

  test("adds markers for garages that appear", async () => {
    // given
    vi.mocked(getGarages).mockResolvedValue([OPER]);
    await mountMap();
    vi.mocked(getGarages).mockResolvedValue([OPER, PSCHORR]);

    // when
    await advance(MINUTE);

    // then
    expect(markerLabels()).toHaveLength(2);
  });

  test("describes outdated counts", async () => {
    // given
    await mountMap();

    // when
    await advance(16 * MINUTE);

    // then
    expect(markerLabels()).toContain("Oper: 312 von 400 frei, Stand veraltet");
  });
});

describe("TheMap selection", () => {
  test("moves the map to a selected garage", async () => {
    // given
    await mountMap();

    // when
    findMarker("Oper").click();
    await flushPromises();

    // then
    expect(lastSelectedGarage()?.pNumber).toBe("P1");
    expect(findMarker("Oper").getAttribute("aria-expanded")).toBe("true");
    expect(fakeMap().easeTo).toHaveBeenCalledTimes(1);
    expect(fakeMap().easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: OPER.location, zoom: 15 })
    );
  });

  test("keeps the selection and the map position when the counts are refreshed", async () => {
    // given
    await mountMap();
    findMarker("Oper").click();
    await flushPromises();
    vi.mocked(getGarages).mockResolvedValue([
      createGarage("P1", "Oper", 290),
      PSCHORR,
    ]);

    // when
    await advance(MINUTE);

    // then
    expect(lastSelectedGarage()?.freeSpaces?.value).toBe(290);
    expect(findMarker("Oper").getAttribute("aria-expanded")).toBe("true");
    expect(fakeMap().easeTo).toHaveBeenCalledTimes(1);
  });

  test("deselects a garage that disappears", async () => {
    // given
    await mountMap();
    findMarker("Oper").click();
    await flushPromises();
    vi.mocked(getGarages).mockResolvedValue([PSCHORR]);

    // when
    await advance(MINUTE);

    // then
    expect(lastSelectedGarage()).toBeNull();
    expect(markerLabels()).toEqual(["Pschorr: 120 von 400 frei"]);
  });

  test("deselects on clicks on the map, but not on clicks on markers", async () => {
    // given
    await mountMap();
    findMarker("Oper").click();
    await flushPromises();

    // when
    fakeMap().click(findMarker("Pschorr"));
    const afterMarkerClick = lastSelectedGarage();
    fakeMap().click(fakeMap().container);
    await flushPromises();

    // then
    expect(afterMarkerClick?.pNumber).toBe("P1");
    expect(lastSelectedGarage()).toBeNull();
  });
});

describe("TheMap refresh", () => {
  test("pauses while hidden and refreshes right away when visible again", async () => {
    // given
    await mountMap();

    // when
    setVisibility("hidden");
    await advance(5 * MINUTE);
    const callsWhileHidden = vi.mocked(getGarages).mock.calls.length;
    setVisibility("visible");
    await flushPromises();

    // then
    expect(callsWhileHidden).toBe(1);
    expect(getGarages).toHaveBeenCalledTimes(2);
  });

  test("reports a failed first load and shows the garages once loading works again", async () => {
    // given
    vi.mocked(getGarages).mockRejectedValue(new Error("unavailable"));

    // when
    await mountMap();
    vi.mocked(getGarages).mockResolvedValue([OPER]);
    await advance(MINUTE);

    // then
    expect(useSnackbarStore().queue.map((message) => message.text)).toEqual([
      "Die Parkhäuser konnten nicht geladen werden.",
    ]);
    expect(markerLabels()).toEqual(["Oper: 312 von 400 frei"]);
  });

  test("keeps the last counts without reporting failed refreshes", async () => {
    // given
    await mountMap();
    vi.mocked(getGarages).mockRejectedValue(new Error("unavailable"));

    // when
    await advance(3 * MINUTE);

    // then
    expect(useSnackbarStore().queue).toHaveLength(0);
    expect(markerLabels().sort()).toEqual([
      "Oper: 312 von 400 frei",
      "Pschorr: 120 von 400 frei",
    ]);
  });

  test("reports failed refreshes once the last counts are outdated", async () => {
    // given
    await mountMap();
    vi.mocked(getGarages).mockRejectedValue(new Error("unavailable"));
    await advance(15 * MINUTE);
    const messagesWhileCurrent = useSnackbarStore().queue.length;

    // when
    await advance(5 * MINUTE);

    // then
    expect(messagesWhileCurrent).toBe(0);
    expect(useSnackbarStore().queue.map((message) => message.text)).toEqual([
      "Die Belegung konnte nicht aktualisiert werden.",
    ]);
  });

  test("reports refreshes failing again after they had recovered", async () => {
    // given
    await mountMap();
    vi.mocked(getGarages).mockRejectedValue(new Error("unavailable"));
    await advance(16 * MINUTE);
    vi.mocked(getGarages).mockResolvedValue([OPER, PSCHORR]);
    await advance(MINUTE);
    vi.mocked(getGarages).mockRejectedValue(new Error("unavailable"));

    // when
    await advance(16 * MINUTE);

    // then
    expect(useSnackbarStore().queue).toHaveLength(2);
  });
});
