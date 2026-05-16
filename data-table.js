(function (root, factory) {
  root.BizTrackTables = factory(root);
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  function ensureTabulator() {
    if (!root.Tabulator) {
      throw new Error("Tabulator is not loaded. Check the Tabulator script tag before the page script.");
    }
  }

  function formatCurrency(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `$${number.toFixed(2)}` : "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currencyFormatter(cell) {
    return formatCurrency(cell.getValue());
  }

  function plainTextColumn(title, field, options = {}) {
    return {
      title,
      field,
      formatter: "plaintext",
      headerSort: true,
      ...options,
    };
  }

  function actionColumn({ title, editLabel, deleteLabel, onEdit, onDelete }) {
    function resolveLabel(label, rowData) {
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
        const actions = root.document.createElement("div");
        actions.className = "tabulator-actions";

        const editButton = root.document.createElement("button");
        editButton.type = "button";
        editButton.className = "icon-button edit-icon";
        editButton.dataset.action = "edit";
        editButton.setAttribute("aria-label", resolveLabel(editLabel, rowData));

        const editIcon = root.document.createElement("i");
        editIcon.className = "fa-solid fa-pen-to-square";
        editIcon.setAttribute("aria-hidden", "true");
        editButton.appendChild(editIcon);

        const deleteButton = root.document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "icon-button delete-icon";
        deleteButton.dataset.action = "delete";
        deleteButton.setAttribute("aria-label", resolveLabel(deleteLabel, rowData));

        const deleteIcon = root.document.createElement("i");
        deleteIcon.className = "fas fa-trash-alt";
        deleteIcon.setAttribute("aria-hidden", "true");
        deleteButton.appendChild(deleteIcon);

        actions.append(editButton, deleteButton);
        return actions;
      },
      cellClick(event, cell) {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const rowData = cell.getRow().getData();
        if (actionButton.dataset.action === "edit") onEdit(rowData);
        if (actionButton.dataset.action === "delete") onDelete(rowData);
      },
    };
  }

  function schedule(callback) {
    if (typeof root.requestAnimationFrame === "function") {
      root.requestAnimationFrame(callback);
      return;
    }
    root.setTimeout(callback, 0);
  }

  function sortDirectionToAria(direction) {
    if (direction === "asc") return "ascending";
    if (direction === "desc") return "descending";
    return "none";
  }

  function getSorters(table) {
    try {
      return typeof table.getSorters === "function" ? table.getSorters() : [];
    } catch (_error) {
      return [];
    }
  }

  function syncHeaderAriaSort(table, container) {
    const activeSorters = new Map();
    getSorters(table).forEach((sorter) => {
      if (sorter?.field) activeSorters.set(String(sorter.field), sortDirectionToAria(sorter.dir));
    });

    container.querySelectorAll(".tabulator-col.tabulator-sortable").forEach((header) => {
      const field = header.getAttribute("tabulator-field");
      header.setAttribute("aria-sort", activeSorters.get(field) || "none");
    });
  }

  function enhanceSortableHeaders(table, selector) {
    const container = root.document?.querySelector(selector);
    if (!container) return;

    container.querySelectorAll(".tabulator-col.tabulator-sortable").forEach((header) => {
      header.setAttribute("tabindex", "0");
      if (!header.hasAttribute("aria-sort")) header.setAttribute("aria-sort", "none");

      if (header.dataset.bizTrackKeyboardSort === "true") return;
      header.dataset.bizTrackKeyboardSort = "true";
      header.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        header.click();
        schedule(() => syncHeaderAriaSort(table, container));
      });
    });

    syncHeaderAriaSort(table, container);
  }

  function scheduleHeaderEnhancement(table, selector) {
    schedule(() => enhanceSortableHeaders(table, selector));
  }

  function createOrUpdateTable(table, selector, options) {
    ensureTabulator();

    const config = {
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
      const nextTable = new root.Tabulator(selector, config);
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

  function applyGlobalSearch(table, term) {
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

  function bindGlobalSearch(inputId, getTable) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const handleSearch = () => applyGlobalSearch(getTable(), input.value);
    input.addEventListener("input", handleSearch);
    input.addEventListener("keyup", (event) => {
      if (event.key === "Enter") handleSearch();
    });
  }

  function getActiveData(table, fallback) {
    if (!table) return fallback;

    try {
      return table.getData("active");
    } catch (_error) {
      return table.getData();
    }
  }

  return {
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
});
