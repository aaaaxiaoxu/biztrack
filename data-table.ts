import type {
  ActionColumnOptions,
  BizTrackTables,
  DataRecord,
  TableColumn,
  TableCreateOptions,
  TabulatorCell,
  TabulatorConstructor,
  TabulatorOptions,
  TabulatorTable,
} from "./types";

type AccessibleTableHost = HTMLElement & {
  __bizTrackAriaObserver?: MutationObserver;
};

function getTabulator(): TabulatorConstructor {
  if (!window.Tabulator) {
    throw new Error("Tabulator is not loaded. Check the Tabulator script tag before the page script.");
  }
  return window.Tabulator;
}

function formatCurrency(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : "";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function currencyFormatter<T extends DataRecord>(cell: TabulatorCell<T>): string {
  return formatCurrency(cell.getValue());
}

function plainTextColumn<T extends DataRecord>(
  title: string,
  field: keyof T & string,
  options: Partial<TableColumn<T>> = {},
): TableColumn<T> {
  return {
    title,
    field,
    formatter: "plaintext",
    headerSort: true,
    ...options,
  };
}

function actionColumn<T extends DataRecord>({
  title,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: ActionColumnOptions<T>): TableColumn<T> {
  function resolveLabel(label: string | ((rowData: T) => string), rowData: T): string {
    return typeof label === "function" ? label(rowData) : label;
  }

  return {
    title,
    field: "__actions",
    headerSort: false,
    hozAlign: "center",
    width: 110,
    download: false,
    formatter(cell) {
      const rowData = cell.getRow().getData();
      const actions = document.createElement("div");
      actions.className = "tabulator-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "icon-button edit-icon";
      editButton.dataset.action = "edit";
      editButton.setAttribute("aria-label", resolveLabel(editLabel, rowData));

      const editIcon = document.createElement("i");
      editIcon.className = "fa-solid fa-pen-to-square";
      editIcon.setAttribute("aria-hidden", "true");
      editButton.appendChild(editIcon);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button delete-icon";
      deleteButton.dataset.action = "delete";
      deleteButton.setAttribute("aria-label", resolveLabel(deleteLabel, rowData));

      const deleteIcon = document.createElement("i");
      deleteIcon.className = "fas fa-trash-alt";
      deleteIcon.setAttribute("aria-hidden", "true");
      deleteButton.appendChild(deleteIcon);

      actions.append(editButton, deleteButton);
      return actions;
    },
    cellClick(event, cell) {
      if (!(event.target instanceof Element)) return;

      const actionButton = event.target.closest<HTMLElement>("[data-action]");
      if (!actionButton) return;

      const rowData = cell.getRow().getData();
      if (actionButton.dataset.action === "edit") onEdit(rowData);
      if (actionButton.dataset.action === "delete") onDelete(rowData);
    },
  };
}

function schedule(callback: () => void): void {
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }
  window.setTimeout(callback, 0);
}

function sortDirectionToAria(direction?: string): string {
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}

function getSorters<T extends DataRecord>(table: TabulatorTable<T>): Array<{ field?: string; dir?: string }> {
  try {
    return typeof table.getSorters === "function" ? table.getSorters() : [];
  } catch (_error) {
    return [];
  }
}

function syncHeaderAriaSort<T extends DataRecord>(table: TabulatorTable<T>, container: Element): void {
  const activeSorters = new Map<string, string>();
  getSorters(table).forEach((sorter) => {
    if (sorter?.field) activeSorters.set(String(sorter.field), sortDirectionToAria(sorter.dir));
  });

  container.querySelectorAll<HTMLElement>(".tabulator-col.tabulator-sortable").forEach((header) => {
    const field = header.getAttribute("tabulator-field");
    header.setAttribute("aria-sort", activeSorters.get(String(field)) || "none");
  });
}

function normalizeGeneratedTableAccessibility(container: Element): void {
  container.querySelectorAll<HTMLElement>(".tabulator-row.tabulator-group").forEach((groupRow) => {
    groupRow.removeAttribute("role");
    const label = groupRow.textContent?.trim();
    if (label) groupRow.setAttribute("aria-label", label);
  });
}

function observeGeneratedTableAccessibility(container: Element): void {
  if (!(container instanceof HTMLElement) || typeof MutationObserver === "undefined") return;

  const host = container as AccessibleTableHost;
  if (host.__bizTrackAriaObserver) return;

  host.__bizTrackAriaObserver = new MutationObserver(() => normalizeGeneratedTableAccessibility(container));
  host.__bizTrackAriaObserver.observe(container, {
    attributeFilter: ["role"],
    attributes: true,
    childList: true,
    subtree: true,
  });
}

function enhanceSortableHeaders<T extends DataRecord>(table: TabulatorTable<T>, selector: string): void {
  const container = document.querySelector(selector);
  if (!container) return;

  normalizeGeneratedTableAccessibility(container);
  observeGeneratedTableAccessibility(container);

  container.querySelectorAll<HTMLElement>(".tabulator-col.tabulator-sortable").forEach((header) => {
    const headerLabel = header.querySelector(".tabulator-col-title")?.textContent?.trim()
      || header.textContent?.trim()
      || "";
    if (headerLabel) header.setAttribute("aria-label", headerLabel);
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-keyshortcuts", "Enter Space");
    if (!header.hasAttribute("aria-sort")) header.setAttribute("aria-sort", "none");

    if (header.dataset.bizTrackKeyboardSort === "true") return;
    header.dataset.bizTrackKeyboardSort = "true";
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      header.classList.add("is-keyboard-focus");
      header.click();
      schedule(() => syncHeaderAriaSort(table, container));
    });
    header.addEventListener("focus", () => header.classList.add("is-keyboard-focus"));
    header.addEventListener("blur", () => header.classList.remove("is-keyboard-focus"));
  });

  syncHeaderAriaSort(table, container);
}

function scheduleHeaderEnhancement<T extends DataRecord>(table: TabulatorTable<T>, selector: string): void {
  const enhance = () => enhanceSortableHeaders(table, selector);
  schedule(enhance);
  window.setTimeout(enhance, 50);
  window.setTimeout(enhance, 250);
}

function createOrUpdateTable<T extends DataRecord>(
  table: TabulatorTable<T> | null | undefined,
  selector: string,
  options: TableCreateOptions<T>,
): TabulatorTable<T> {
  const Tabulator = getTabulator();

  const config: TabulatorOptions<T> = {
    data: options.data,
    columns: options.columns,
    layout: "fitColumns",
    maxHeight: options.maxHeight || "560px",
    movableColumns: true,
    pagination: "local",
    paginationSize: options.paginationSize || 8,
    paginationSizeSelector: [5, 8, 10, 20],
    placeholder: options.placeholder || "",
  };

  if (options.groupBy) {
    config.groupBy = options.groupBy;
    config.groupHeader = options.groupHeader;
    config.groupStartOpen = true;
  }

  if (!table) {
    const nextTable = new Tabulator<T>(selector, config);
    nextTable.__bizTrackBuilt = false;
    nextTable.__bizTrackPendingSearch = "";
    nextTable.on("tableBuilt", () => {
      nextTable.__bizTrackBuilt = true;
      scheduleHeaderEnhancement(nextTable, selector);
      if (nextTable.__bizTrackPendingSearch) {
        applyGlobalSearch(nextTable, nextTable.__bizTrackPendingSearch);
      }
    });
    nextTable.on("dataSorted", () => scheduleHeaderEnhancement(nextTable, selector));
    scheduleHeaderEnhancement(nextTable, selector);
    return nextTable;
  }

  table.setColumns(options.columns);
  if (options.groupBy) {
    if (typeof table.setGroupBy === "function") table.setGroupBy(options.groupBy);
    if (typeof table.setGroupHeader === "function") table.setGroupHeader(options.groupHeader);
  }
  table.replaceData(options.data);
  scheduleHeaderEnhancement(table, selector);
  return table;
}

function applyGlobalSearch<T extends DataRecord>(table: TabulatorTable<T> | null | undefined, term: unknown): void {
  if (!table) return;

  const needle = String(term || "").trim().toLowerCase();
  if (!table.__bizTrackBuilt) {
    table.__bizTrackPendingSearch = needle;
    return;
  }

  table.clearFilter();
  if (!needle) return;

  table.setFilter((data) => {
    return Object.values(data).some((value) => {
      return String(value ?? "").toLowerCase().includes(needle);
    });
  });
}

function bindGlobalSearch<T extends DataRecord>(
  inputId: string,
  getTable: () => TabulatorTable<T> | null | undefined,
): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return;

  const handleSearch = () => applyGlobalSearch(getTable(), input.value);
  input.addEventListener("input", handleSearch);
  input.addEventListener("keyup", (event) => {
    if (event.key === "Enter") handleSearch();
  });
}

function getActiveData<T extends DataRecord>(table: TabulatorTable<T> | null | undefined, fallback: T[]): T[] {
  if (!table) return fallback;

  try {
    return table.getData("active");
  } catch (_error) {
    return table.getData();
  }
}

const tables: BizTrackTables = {
  actionColumn,
  applyGlobalSearch,
  bindGlobalSearch,
  createOrUpdateTable,
  currencyFormatter,
  escapeHtml,
  formatCurrency,
  getActiveData,
  plainTextColumn,
};

window.BizTrackTables = tables;

export {
  actionColumn,
  applyGlobalSearch,
  bindGlobalSearch,
  createOrUpdateTable,
  currencyFormatter,
  escapeHtml,
  formatCurrency,
  getActiveData,
  plainTextColumn,
};

export default tables;
