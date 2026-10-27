import { describe, expect, test } from "vitest";

import {
  toPercentString,
  toRelativeTimeString,
} from "../../src/util/formatter";

const NOW = new Date("2026-10-21T12:00:00Z");
const MINUTE = 60_000;

describe("toRelativeTimeString", () => {
  test.for([
    { ago: 0, locale: "de", expected: "in dieser Minute" },
    { ago: 2 * MINUTE, locale: "de", expected: "vor 2 Min." },
    { ago: 59 * MINUTE, locale: "de", expected: "vor 59 Min." },
    { ago: 60 * MINUTE, locale: "de", expected: "vor 1 Std." },
    { ago: 23 * 60 * MINUTE, locale: "de", expected: "vor 23 Std." },
    { ago: 24 * 60 * MINUTE, locale: "de", expected: "gestern" },
    { ago: 3 * 24 * 60 * MINUTE, locale: "de", expected: "vor 3 Tagen" },
    { ago: 2 * MINUTE, locale: "en", expected: "2 min. ago" },
    { ago: -2 * MINUTE, locale: "de", expected: "in dieser Minute" },
    { ago: -3 * 60 * MINUTE, locale: "de", expected: "in dieser Minute" },
  ])(
    "describes $ago ms ago in $locale as '$expected'",
    ({ ago, locale, expected }) => {
      // when
      const result = toRelativeTimeString(
        new Date(NOW.getTime() - ago),
        NOW,
        locale
      );

      // then
      expect(result).toBe(expected);
    }
  );
});

describe("toPercentString", () => {
  test.for([
    { share: 0.218, locale: "de", expected: "22 %" },
    { share: 1, locale: "de", expected: "100 %" },
    { share: 0.218, locale: "en", expected: "22%" },
  ])(
    "formats $share in $locale as '$expected'",
    ({ share, locale, expected }) => {
      // when
      const result = toPercentString(share, locale);

      // then
      expect(result.replace(/\s/g, " ")).toBe(expected);
    }
  );
});
