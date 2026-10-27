import type { VueWrapper } from "@vue/test-utils";
import type { Router } from "vue-router";

import { flushPromises, mount } from "@vue/test-utils";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { defineComponent } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import type { Garage } from "../../src/types/Garage";

import { getGarages } from "../../src/api/garages-client";
import i18n from "../../src/plugins/i18n";
import vuetify from "../../src/plugins/vuetify";
import IndexRoute from "../../src/routes/index.vue";

vi.mock("../../src/api/garages-client", () => ({ getGarages: vi.fn() }));

const focusMarker = vi.fn();

// MapLibre needs WebGL, the map is replaced by a stand-in that only shows the selected garage
const TheMapStub = defineComponent({
  props: { selectedGarage: { type: Object, default: null } },
  setup(_, { expose }) {
    expose({ focusMarker });
  },
  template: `<div data-test="map">{{ selectedGarage?.name }}</div>`,
});

const OPER: Garage = {
  pNumber: "P1",
  name: "Oper",
  address: null,
  operatorUrl: null,
  location: [11.578, 48.139],
  entrances: [],
  freeSpaces: { value: 312, measuredAt: new Date() },
  capacity: { value: 400, measuredAt: new Date() },
};

const DESKTOP_WIDTH = 1024;
const TABLET_WIDTH = 768;
const MOBILE_WIDTH = 375;

let wrapper: VueWrapper | undefined;
let router: Router;

async function mountIndex(path = "/") {
  router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/", component: IndexRoute }],
  });
  await router.replace(path);
  wrapper = mount(
    { template: "<router-view />" },
    {
      attachTo: document.body,
      global: {
        plugins: [i18n, vuetify, router],
        stubs: { TheMap: TheMapStub },
      },
    }
  );
  await flushPromises();
  return wrapper;
}

// Vuetify reads the screen width on resize
function setScreenWidth(width: number) {
  window.innerWidth = width;
  window.dispatchEvent(new Event("resize"));
}

function toggle() {
  const button = wrapper?.find("[data-test=view-toggle-btn]");
  if (!button) {
    throw new Error("No view toggle");
  }
  return button;
}

// On small screens the list is shown in a dialog outside of the wrapper, which keeps it while fading out
function listShown(): boolean {
  const list = document.querySelector("[data-test=garage-list]");
  return list !== null && !list.closest(".v-overlay:not(.v-overlay--active)");
}

function firstListItem(): HTMLElement {
  const item = document.querySelector<HTMLElement>(
    "[data-test=garage-list-item]"
  );
  if (!item) {
    throw new Error("No garage in the list");
  }
  return item;
}

// Going back is reported by the browser asynchronously, so the test waits for the navigation
async function navigation(trigger: () => unknown) {
  const done = new Promise<void>((resolve) => {
    const remove = router.afterEach(() => {
      remove();
      resolve();
    });
  });
  await trigger();
  await done;
  await flushPromises();
}

beforeAll(() => {
  // Used by the Vuetify dialog of the list on small screens, jsdom does not provide it
  vi.stubGlobal("visualViewport", {
    width: MOBILE_WIDTH,
    height: 812,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

beforeEach(() => {
  i18n.global.locale.value = "de";
  setScreenWidth(DESKTOP_WIDTH);
  vi.mocked(getGarages).mockResolvedValue([OPER]);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.mocked(getGarages).mockReset();
  focusMarker.mockReset();
  document.body.innerHTML = "";
});

describe("index view toggle", () => {
  test("switches from the map to the list and back", async () => {
    // given
    await mountIndex();
    expect(toggle().attributes("aria-label")).toBe("Liste anzeigen");

    // when
    await toggle().trigger("click");
    await flushPromises();
    const queryWithList = router.currentRoute.value.query;
    const expandedWithList = toggle().attributes("aria-expanded");
    await navigation(() => toggle().trigger("click"));

    // then
    expect(queryWithList).toEqual({ view: "list" });
    expect(expandedWithList).toBe("true");
    expect(router.currentRoute.value.query).toEqual({});
    expect(toggle().attributes("aria-expanded")).toBe("false");
    expect(listShown()).toBe(false);
  });

  test("closes the list by going back, so the forward button opens it again", async () => {
    // given
    await mountIndex();
    await toggle().trigger("click");
    await flushPromises();
    await navigation(() => toggle().trigger("click"));

    // when
    await navigation(() => router.forward());

    // then
    expect(listShown()).toBe(true);
  });

  test("returns to the map with the back button", async () => {
    // given
    await mountIndex();
    await toggle().trigger("click");
    await flushPromises();

    // when
    await navigation(() => router.back());

    // then
    expect(listShown()).toBe(false);
  });

  test("shows the list for a link to it", async () => {
    // when
    await mountIndex("/?view=list");

    // then
    expect(listShown()).toBe(true);
  });

  test("returns the focus to the toggle when the list is closed with Escape", async () => {
    // given
    await mountIndex("/?view=list");

    // when
    await navigation(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    );

    // then
    expect(listShown()).toBe(false);
    expect(document.activeElement).toBe(toggle().element);
  });
});

describe("index list closing", () => {
  test("closes the list with its back button on small screens", async () => {
    // given
    setScreenWidth(MOBILE_WIDTH);
    await mountIndex();
    await toggle().trigger("click");
    await flushPromises();

    // when
    await navigation(() =>
      document
        .querySelector<HTMLElement>(
          "[data-test=garage-list] [data-test=panel-back-btn]"
        )
        ?.click()
    );

    // then
    expect(listShown()).toBe(false);
    expect(router.currentRoute.value.query).toEqual({});
    expect(document.activeElement).toBe(toggle().element);
  });
});

describe("index garage selection on small screens", () => {
  beforeEach(() => setScreenWidth(MOBILE_WIDTH));

  test("shows a garage selected in the list on the map with its details", async () => {
    // given
    await mountIndex();
    await toggle().trigger("click");
    await flushPromises();

    // when
    await navigation(() => firstListItem().click());

    // then
    expect(listShown()).toBe(false);
    expect(router.currentRoute.value.query).toEqual({});
    expect(wrapper?.get("[data-test=map]").text()).toBe("Oper");
    expect(wrapper?.get("#garage-details-title").text()).toBe("Oper");
  });

  test("closes the details when the list is opened", async () => {
    // given
    await mountIndex();
    await toggle().trigger("click");
    await flushPromises();
    await navigation(() => firstListItem().click());

    // when
    await toggle().trigger("click");
    await flushPromises();

    // then
    expect(listShown()).toBe(true);
    expect(wrapper?.find("#garage-details-title").exists()).toBe(false);
    expect(wrapper?.get("[data-test=map]").text()).toBe("");
  });
});

describe("index focus after closing the details", () => {
  test("returns the focus to the marker if the list is not shown", async () => {
    // given
    await mountIndex("/?view=list");
    await wrapper?.get("[data-test=garage-list-item]").trigger("click");
    await navigation(() => toggle().trigger("click"));

    const closeButton = wrapper?.get("[data-test=garage-details-close-btn]");
    (closeButton?.element as HTMLElement | undefined)?.focus();

    // when
    await closeButton?.trigger("click");
    await flushPromises();

    // then
    expect(focusMarker).toHaveBeenCalledWith("P1");
  });
});

describe("index garage selection on medium screens", () => {
  test("closes the list when a garage is selected, as the details do not fit next to it", async () => {
    // given
    setScreenWidth(TABLET_WIDTH);
    await mountIndex("/?view=list");

    // when
    await navigation(() => firstListItem().click());

    // then
    expect(listShown()).toBe(false);
    expect(router.currentRoute.value.query).toEqual({});
    expect(wrapper?.get("#garage-details-title").text()).toBe("Oper");
  });
});

describe("index garage selection on larger screens", () => {
  test("keeps the list open while showing the details", async () => {
    // given
    await mountIndex("/?view=list");

    // when
    await wrapper?.get("[data-test=garage-list-item]").trigger("click");
    await flushPromises();

    // then
    expect(listShown()).toBe(true);
    expect(router.currentRoute.value.query).toEqual({ view: "list" });
    expect(wrapper?.get("[data-test=map]").text()).toBe("Oper");
    expect(wrapper?.get("#garage-details-title").text()).toBe("Oper");
    expect(
      wrapper?.get("[data-test=garage-list-item]").attributes("aria-current")
    ).toBe("true");
  });

  test("closes the details before the list on Escape", async () => {
    // given
    await mountIndex("/?view=list");
    await wrapper?.get("[data-test=garage-list-item]").trigger("click");
    await flushPromises();

    // when
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();

    // then
    expect(wrapper?.find("#garage-details-title").exists()).toBe(false);
    expect(listShown()).toBe(true);
    // Keyboard users continue at the garage they selected
    expect(document.activeElement).toBe(
      wrapper?.get("[data-test=garage-list-item]").element
    );
  });
});
