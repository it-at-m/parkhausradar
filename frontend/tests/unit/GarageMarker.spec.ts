import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import GarageMarker from "../../src/components/GarageMarker.vue";

describe("GarageMarker", () => {
  test.for([
    { freeSpaces: 233, shown: "233" },
    { freeSpaces: 0, shown: "0" },
    { freeSpaces: null, shown: "?" },
  ])("shows $shown for $freeSpaces free spaces", ({ freeSpaces, shown }) => {
    // when
    const wrapper = mount(GarageMarker, {
      props: {
        label: "Oper",
        freeSpaces,
        status: "free",
        selected: false,
      },
    });

    // then
    expect(wrapper.find(".free-spaces").text()).toBe(shown);
  });

  test("is a button described by its label", () => {
    // when
    const wrapper = mount(GarageMarker, {
      props: {
        label: "Oper: 233 von 400 frei",
        freeSpaces: 233,
        status: "free",
        selected: false,
      },
    });

    // then
    const button = wrapper.get("button");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBe("Oper: 233 von 400 frei");
  });

  test.for([
    { selected: true, expanded: "true" },
    { selected: false, expanded: "false" },
  ])(
    "marks the details as expanded $expanded when selected is $selected",
    ({ selected, expanded }) => {
      // when
      const wrapper = mount(GarageMarker, {
        props: {
          label: "Oper",
          freeSpaces: 233,
          status: "free",
          selected,
        },
      });

      // then
      const button = wrapper.get("button");
      expect(button.attributes("aria-expanded")).toBe(expanded);
      expect(button.classes("selected")).toBe(selected);
    }
  );
});
