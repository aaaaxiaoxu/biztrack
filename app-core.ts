import type { BizTrackCore, CsvRecord, DataRecord, StorageReader } from "./types";

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function parseStoredArray<T>(storage: StorageReader, key: string, fallback: T[]): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [...fallback];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [...fallback];
  } catch (_error) {
    return [...fallback];
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function assertNonNegativeNumber(value: unknown, fieldName: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`);
  }
  return number;
}

function calculateOrderTotal(itemPrice: unknown, quantity: unknown, shipping: unknown, taxes: unknown): number {
  const price = assertNonNegativeNumber(itemPrice, "Item price");
  const qty = assertNonNegativeNumber(quantity, "Quantity");
  const delivery = assertNonNegativeNumber(shipping, "Shipping");
  const tax = assertNonNegativeNumber(taxes, "Taxes");
  return price * qty + delivery + tax;
}

function sumBy<T extends DataRecord>(items: T[], key: keyof T & string): number {
  return items.reduce((total, item) => total + toFiniteNumber(item[key]), 0);
}

function nextTransactionId(transactions: Array<{ trID: unknown }>): number {
  return transactions.reduce((max, transaction) => {
    return Math.max(max, toFiniteNumber(transaction.trID));
  }, 0) + 1;
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? "");
  const spreadsheetSafe = CSV_FORMULA_PREFIX.test(text) ? `'${text}` : text;
  const escaped = spreadsheetSafe.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function generateCSV(data: CsvRecord[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => {
    return headers.map((header) => escapeCsvValue(row[header])).join(",");
  });
  return `${headers.join(",")}\n${rows.join("\n")}`;
}

function downloadCSVFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

const core: BizTrackCore = {
  parseStoredArray,
  toFiniteNumber,
  assertNonNegativeNumber,
  calculateOrderTotal,
  sumBy,
  nextTransactionId,
  escapeCsvValue,
  generateCSV,
  downloadCSVFile,
};

(globalThis as typeof globalThis & { BizTrackCore: BizTrackCore }).BizTrackCore = core;

export {
  assertNonNegativeNumber,
  calculateOrderTotal,
  escapeCsvValue,
  generateCSV,
  downloadCSVFile,
  nextTransactionId,
  parseStoredArray,
  sumBy,
  toFiniteNumber,
};

export default core;
