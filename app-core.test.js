import { describe, expect, it } from "vitest";
import core from "./app-core.js";

function storageWith(value) {
  return {
    getItem() {
      return value;
    }
  };
}

describe("BizTrackCore", () => {
  it("loads valid stored arrays and falls back for corrupted localStorage", () => {
    const fallback = [{ id: 1 }];

    expect(core.parseStoredArray(storageWith('[{"id":2}]'), "items", fallback)).toEqual([{ id: 2 }]);
    expect(core.parseStoredArray(storageWith("{bad json"), "items", fallback)).toEqual(fallback);
    expect(core.parseStoredArray(storageWith('{"id":2}'), "items", fallback)).toEqual(fallback);
    expect(core.parseStoredArray(storageWith(null), "items", fallback)).toEqual(fallback);
  });

  it("calculates order totals and rejects invalid numeric input", () => {
    expect(core.calculateOrderTotal("10.5", "2", "3", "1.5")).toBe(25.5);
    expect(() => core.calculateOrderTotal("-1", "2", "3", "1")).toThrow("Item price");
    expect(() => core.assertNonNegativeNumber("abc", "Amount")).toThrow("Amount");
  });

  it("sums numeric fields without letting malformed values poison totals", () => {
    expect(core.sumBy([{ total: 10 }, { total: "5.5" }, { total: "oops" }], "total")).toBe(15.5);
  });

  it("creates monotonic transaction IDs after deletion", () => {
    expect(core.nextTransactionId([{ trID: 1 }, { trID: 4 }, { trID: "2" }])).toBe(5);
  });

  it("escapes CSV values, commas, quotes, newlines, and spreadsheet formulas", () => {
    const csv = core.generateCSV([
      { name: "=cmd", note: 'hello, "world"', amount: 2 },
      { name: "normal", note: "line\nbreak", amount: 3 }
    ]);

    expect(csv).toContain("name,note,amount");
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('"hello, ""world"""');
    expect(csv).toContain('"line\nbreak"');
    expect(core.generateCSV([])).toBe("");
  });
});
