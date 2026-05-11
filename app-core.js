(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BizTrackCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

  function parseStoredArray(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return [...fallback];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...fallback];
    } catch (_error) {
      return [...fallback];
    }
  }

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function assertNonNegativeNumber(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(`${fieldName} must be a non-negative number.`);
    }
    return number;
  }

  function calculateOrderTotal(itemPrice, quantity, shipping, taxes) {
    const price = assertNonNegativeNumber(itemPrice, "Item price");
    const qty = assertNonNegativeNumber(quantity, "Quantity");
    const delivery = assertNonNegativeNumber(shipping, "Shipping");
    const tax = assertNonNegativeNumber(taxes, "Taxes");
    return price * qty + delivery + tax;
  }

  function sumBy(items, key) {
    return items.reduce((total, item) => total + toFiniteNumber(item[key]), 0);
  }

  function nextTransactionId(transactions) {
    return transactions.reduce((max, transaction) => {
      return Math.max(max, toFiniteNumber(transaction.trID));
    }, 0) + 1;
  }

  function escapeCsvValue(value) {
    const text = String(value ?? "");
    const spreadsheetSafe = CSV_FORMULA_PREFIX.test(text) ? `'${text}` : text;
    const escaped = spreadsheetSafe.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  function generateCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => {
      return headers.map((header) => escapeCsvValue(row[header])).join(",");
    });
    return `${headers.join(",")}\n${rows.join("\n")}`;
  }

  return {
    parseStoredArray,
    toFiniteNumber,
    assertNonNegativeNumber,
    calculateOrderTotal,
    sumBy,
    nextTransactionId,
    escapeCsvValue,
    generateCSV,
  };
});
