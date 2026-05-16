import { describe, expect, it } from "vitest";
import repository from "./repository";

interface TestItem extends Record<string, unknown> {
  id: string;
  amount?: string | number;
  name?: string;
}

function memoryStorage(initialValue?: string) {
  const data = new Map();
  if (initialValue !== undefined) data.set("items", initialValue);

  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

describe("BizTrackRepository", () => {
  it("falls back to defaults and persists normalized records when storage is corrupt", () => {
    const storage = memoryStorage("{bad json");
    const repo = repository.createLocalStorageRepository<TestItem>({
      storage,
      key: "items",
      defaults: [{ id: "1", amount: "2" }],
      idField: "id",
      normalize: (item) => ({ ...item, amount: Number(item.amount) }),
    });

    expect(repo.all()).toEqual([{ id: "1", amount: 2 }]);
    expect(JSON.parse(storage.getItem("items"))).toEqual([{ id: "1", amount: 2 }]);
  });

  it("supports id-based add, update, remove, find, and duplicate checks", () => {
    const repo = repository.createLocalStorageRepository<TestItem>({
      storage: memoryStorage("[]"),
      key: "items",
      defaults: [],
      idField: "id",
    });

    repo.add({ id: "A", name: "Alpha" });
    repo.add({ id: "B", name: "Beta" });

    expect(repo.findById("A")).toEqual({ id: "A", name: "Alpha" });
    expect(repo.existsById("A")).toBe(true);
    expect(repo.existsById("A", "A")).toBe(false);

    expect(repo.update("B", { id: "B", name: "Updated" })).toEqual({ id: "B", name: "Updated" });
    expect(repo.remove("A")).toBe(true);
    expect(repo.remove("missing")).toBe(false);
    expect(repo.all()).toEqual([{ id: "B", name: "Updated" }]);
  });
});
