import { afterEach, describe, expect, it, vi } from "vitest";
import core from "./app-core";

function storageWith(value: string | null) {
  return {
    getItem() {
      return value;
    }
  };
}

describe("BizTrackCore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it("downloads CSV files and revokes the generated object URL", () => {
    const appendedLinks: Array<{
      click: ReturnType<typeof vi.fn>;
      download: string;
      href: string;
      remove: ReturnType<typeof vi.fn>;
      style: Record<string, string>;
    }> = [];
    const objectUrl = "blob:biztrack-export";
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn(() => objectUrl);

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("document", {
      body: {
        appendChild(link: (typeof appendedLinks)[number]) {
          appendedLinks.push(link);
          return link;
        }
      },
      createElement(tagName: string) {
        expect(tagName).toBe("a");
        return {
          click: vi.fn(),
          download: "",
          href: "",
          remove: vi.fn(),
          style: {}
        };
      }
    });
    vi.stubGlobal("window", {
      setTimeout(callback: () => void) {
        callback();
        return 0;
      }
    });

    core.downloadCSVFile("name\nBizTrack", "biztrack.csv");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(appendedLinks).toHaveLength(1);
    expect(appendedLinks[0].download).toBe("biztrack.csv");
    expect(appendedLinks[0].href).toBe(objectUrl);
    expect(appendedLinks[0].click).toHaveBeenCalledOnce();
    expect(appendedLinks[0].remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });
});
