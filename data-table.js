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
        const editAriaLabel = escapeHtml(resolveLabel(editLabel, rowData));
        const deleteAriaLabel = escapeHtml(resolveLabel(deleteLabel, rowData));

        return `
          <div class="tabulator-actions">
            <button type="button" class="icon-button edit-icon" data-action="edit" aria-label="${editAriaLabel}">
              <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
            </button>
            <button type="button" class="icon-button delete-icon" data-action="delete" aria-label="${deleteAriaLabel}">
              <i class="fas fa-trash-alt" aria-hidden="true"></i>
            </button>
          </div>
        `;
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
        if (nextTable.__bizTrackPendingSearch) {
          applyGlobalSearch(nextTable, nextTable.__bizTrackPendingSearch);
        }
      });
      return nextTable;
    }

    table.setColumns(options.columns);
    if (options.groupBy) {
      if (typeof table.setGroupBy === "function") table.setGroupBy(options.groupBy);
      if (typeof table.setGroupHeader === "function") table.setGroupHeader(options.groupHeader);
    }
    table.replaceData(options.data);
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
