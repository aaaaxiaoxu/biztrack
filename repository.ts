import type {
  BizTrackRepository,
  DataRecord,
  LocalStorageRepository,
  LocalStorageRepositoryOptions,
  StorageLike,
} from "./types";

function cloneItem<T>(item: T): T {
  return item && typeof item === "object" ? { ...item } : item;
}

function cloneItems<T>(items: T[]): T[] {
  return items.map(cloneItem);
}

function requireStorage(storage: StorageLike): void {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("A storage object with getItem and setItem is required.");
  }
}

function createLocalStorageRepository<T extends DataRecord>({
  storage,
  key,
  defaults = [],
  idField,
  normalize = cloneItem,
}: LocalStorageRepositoryOptions<T>): LocalStorageRepository<T> {
  requireStorage(storage);
  if (!key) throw new Error("A repository key is required.");

  let items: T[] = [];

  function normalizeItem(item: T): T {
    return normalize(cloneItem(item));
  }

  function defaultItems(): T[] {
    return cloneItems(defaults).map(normalizeItem);
  }

  function readItems(): T[] {
    try {
      const raw = storage.getItem(key);
      if (!raw) return defaultItems();

      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]).map(normalizeItem) : defaultItems();
    } catch (_error) {
      return defaultItems();
    }
  }

  function persist(nextItems: T[]): T[] {
    items = cloneItems(nextItems).map(normalizeItem);
    storage.setItem(key, JSON.stringify(items));
    return all();
  }

  function load(): T[] {
    return persist(readItems());
  }

  function all(): T[] {
    return cloneItems(items);
  }

  function requireIdField(): keyof T & string {
    if (!idField) throw new Error("An idField is required for id-based repository operations.");
    return idField;
  }

  function matchesId(item: T, id: unknown): boolean {
    const field = requireIdField();
    return String(item[field]) === String(id);
  }

  function findIndexById(id: unknown): number {
    requireIdField();
    return items.findIndex((item) => matchesId(item, id));
  }

  function findById(id: unknown): T | null {
    const index = findIndexById(id);
    return index === -1 ? null : cloneItem(items[index]);
  }

  function existsById(id: unknown, exceptId: unknown = null): boolean {
    requireIdField();
    return items.some((item) => {
      return matchesId(item, id) && (exceptId === null || !matchesId(item, exceptId));
    });
  }

  function add(item: T): T {
    const normalized = normalizeItem(item);
    persist([...items, normalized]);
    return cloneItem(normalized);
  }

  function update(id: unknown, item: T): T | null {
    const index = findIndexById(id);
    if (index === -1) return null;

    const normalized = normalizeItem(item);
    const nextItems = [...items];
    nextItems[index] = normalized;
    persist(nextItems);
    return cloneItem(normalized);
  }

  function remove(id: unknown): boolean {
    const index = findIndexById(id);
    if (index === -1) return false;

    persist(items.filter((_item, itemIndex) => itemIndex !== index));
    return true;
  }

  load();

  return {
    add,
    all,
    existsById,
    findById,
    load,
    remove,
    saveAll: persist,
    update,
  };
}

const repository: BizTrackRepository = {
  createLocalStorageRepository,
};

(globalThis as typeof globalThis & { BizTrackRepository: BizTrackRepository }).BizTrackRepository = repository;

export { createLocalStorageRepository };

export default repository;
