(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BizTrackRepository = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function cloneItem(item) {
    return item && typeof item === "object" ? { ...item } : item;
  }

  function cloneItems(items) {
    return items.map(cloneItem);
  }

  function requireStorage(storage) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new Error("A storage object with getItem and setItem is required.");
    }
  }

  function createLocalStorageRepository({ storage, key, defaults = [], idField, normalize = cloneItem }) {
    requireStorage(storage);
    if (!key) throw new Error("A repository key is required.");

    let items = [];

    function normalizeItem(item) {
      return normalize(cloneItem(item));
    }

    function readItems() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return cloneItems(defaults).map(normalizeItem);

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(normalizeItem) : cloneItems(defaults).map(normalizeItem);
      } catch (_error) {
        return cloneItems(defaults).map(normalizeItem);
      }
    }

    function persist(nextItems) {
      items = cloneItems(nextItems).map(normalizeItem);
      storage.setItem(key, JSON.stringify(items));
      return all();
    }

    function load() {
      return persist(readItems());
    }

    function all() {
      return cloneItems(items);
    }

    function requireIdField() {
      if (!idField) throw new Error("An idField is required for id-based repository operations.");
    }

    function matchesId(item, id) {
      return String(item?.[idField]) === String(id);
    }

    function findIndexById(id) {
      requireIdField();
      return items.findIndex((item) => matchesId(item, id));
    }

    function findById(id) {
      const index = findIndexById(id);
      return index === -1 ? null : cloneItem(items[index]);
    }

    function existsById(id, exceptId = null) {
      requireIdField();
      return items.some((item) => {
        return matchesId(item, id) && (exceptId === null || !matchesId(item, exceptId));
      });
    }

    function add(item) {
      const normalized = normalizeItem(item);
      persist([...items, normalized]);
      return cloneItem(normalized);
    }

    function update(id, item) {
      const index = findIndexById(id);
      if (index === -1) return null;

      const normalized = normalizeItem(item);
      const nextItems = [...items];
      nextItems[index] = normalized;
      persist(nextItems);
      return cloneItem(normalized);
    }

    function remove(id) {
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

  return {
    createLocalStorageRepository,
  };
});
