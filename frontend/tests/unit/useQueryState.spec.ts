import type { Router } from "vue-router";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import { defineComponent } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import { useQueryState } from "../../src/composables/useQueryState";

async function setup(): Promise<{
  router: Router;
  query: ReturnType<typeof useQueryState>;
}> {
  // jsdom keeps the history between tests, each test starts without a previous entry of the app
  window.history.replaceState(null, "");
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }],
  });
  await router.replace("/");
  let query: ReturnType<typeof useQueryState> | undefined;
  mount(
    defineComponent({
      setup() {
        query = useQueryState();
        return () => null;
      },
    }),
    { global: { plugins: [router] } }
  );
  if (!query) {
    throw new Error("No query state");
  }
  return { router, query };
}

describe("useQueryState", () => {
  test("applies changes of the same click on top of each other", async () => {
    // given
    const { router, query } = await setup();
    await query.change({ dialog: "settings" });

    // when
    // Selecting a garage on the map also closes the settings, which would go back to the map alone
    const selecting = query.change({ garage: "P1" });
    const closing = query.change({ dialog: undefined });
    await Promise.all([selecting, closing]);
    await flushPromises();

    // then
    expect(router.currentRoute.value.query).toEqual({ garage: "P1" });
  });

  test("closing goes back to the entry before opening", async () => {
    // given
    const { router, query } = await setup();
    await query.change({ dialog: "settings" });

    // when
    await query.change({ dialog: undefined });

    // then
    expect(router.currentRoute.value.query).toEqual({});
    expect(router.options.history.state.forward).toBe("/?dialog=settings");
  });
});
