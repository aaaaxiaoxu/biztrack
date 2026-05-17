import core from "./app-core";
import "./common";
import tables from "./data-table";
import orderState from "./order-state";
import repositoryFactory from "./repository";
import validation, { ValidationError } from "./validation-pipeline";
import type { I18nParams, LocalStorageRepository, Order, OrderStatus, TableColumn, TabulatorTable } from "./types";

interface OrderFormValues extends Record<string, unknown> {
  orderID: string;
  orderDate: string;
  itemName: string;
  itemPrice: string | number;
  qtyBought: string | number;
  shipping: string | number;
  taxes: string | number;
  orderStatus: OrderStatus;
  orderTotal?: number;
}

let orders: Order[] = [];
let orderRepository: LocalStorageRepository<Order>;
let orderTable: TabulatorTable<Order> | null = null;

const ordersI18n = window.BizTrackI18n?.useOrdersI18n();
const ordersCommonI18n = window.BizTrackI18n?.useCommonI18n();

const defaultOrders: Order[] = [
  {
    orderID: "1001",
    orderDate: "2024-01-05",
    itemName: "Baseball caps",
    itemPrice: 25.00,
    qtyBought: 2,
    shipping: 2.50,
    taxes: 9.00,
    orderTotal: 61.50,
    orderStatus: "Pending",
  },
  {
    orderID: "1002",
    orderDate: "2024-03-05",
    itemName: "Water bottles",
    itemPrice: 17.00,
    qtyBought: 3,
    shipping: 3.50,
    taxes: 6.00,
    orderTotal: 60.50,
    orderStatus: "Processing",
  },
  {
    orderID: "1003",
    orderDate: "2024-02-05",
    itemName: "Tote bags",
    itemPrice: 20.00,
    qtyBought: 4,
    shipping: 2.50,
    taxes: 2.00,
    orderTotal: 84.50,
    orderStatus: "Shipped",
  },
  {
    orderID: "1004",
    orderDate: "2023-01-05",
    itemName: "Canvas prints",
    itemPrice: 55.00,
    qtyBought: 1,
    shipping: 2.50,
    taxes: 19.00,
    orderTotal: 76.50,
    orderStatus: "Delivered",
  },
  {
    orderID: "1005",
    orderDate: "2024-01-15",
    itemName: "Beanies",
    itemPrice: 15.00,
    qtyBought: 2,
    shipping: 3.90,
    taxes: 4.00,
    orderTotal: 37.90,
    orderStatus: "Pending",
  },
];

function getElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function openSidebar(): void {
  const side = getElement<HTMLElement>("sidebar");
  side.style.display = side.style.display === "block" ? "none" : "block";
}

function closeSidebar(): void {
  getElement<HTMLElement>("sidebar").style.display = "none";
}

function openForm(): void {
  const form = getElement<HTMLFormElement>("order-form");
  const willOpen = form.style.display !== "block";
  form.style.display = willOpen ? "block" : "none";
  if (willOpen) {
    form.reset();
    setSubmitMode("add");
  }
}

function closeForm(): void {
  const form = getElement<HTMLFormElement>("order-form");
  form.style.display = "none";
  form.reset();
  setSubmitMode("add");
}

function normalizeOrder(order: Order | OrderFormValues): Order {
  const normalized = orderState.normalizeOrder(order);
  return {
    orderID: String(normalized.orderID ?? ""),
    orderDate: String(normalized.orderDate ?? ""),
    itemName: String(normalized.itemName ?? ""),
    itemPrice: core.toFiniteNumber(normalized.itemPrice),
    qtyBought: core.toFiniteNumber(normalized.qtyBought),
    shipping: core.toFiniteNumber(normalized.shipping),
    taxes: core.toFiniteNumber(normalized.taxes),
    orderTotal: core.toFiniteNumber(normalized.orderTotal),
    orderStatus: normalized.orderStatus,
  };
}

function init(): void {
  orderRepository = repositoryFactory.createLocalStorageRepository<Order>({
    storage: localStorage,
    key: "bizTrackOrders",
    defaults: defaultOrders,
    idField: "orderID",
    normalize: normalizeOrder,
  });
  orders = orderRepository.load();

  renderOrders(orders);
  setSubmitMode("add");
}

function addOrUpdate(event: Event): void {
  const mode = getElement<HTMLButtonElement>("submitBtn").dataset.mode || "add";
  if (mode === "add") {
    newOrder(event);
  } else if (mode === "update") {
    const orderID = getElement<HTMLInputElement>("order-id").value;
    updateOrder(orderID);
  }
}

function orderT(key: string, params?: I18nParams): string {
  return ordersI18n?.t(key, params) || ordersCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode: "add" | "update", currentStatus?: OrderStatus): void {
  const submitButton = getElement<HTMLButtonElement>("submitBtn");
  submitButton.dataset.mode = mode;
  submitButton.textContent = orderT(mode === "update" ? "Update" : "Add");
  updateStatusOptions(mode, currentStatus);
}

function updateStatusOptions(mode: "add" | "update", currentStatus?: OrderStatus): void {
  const statusSelect = document.getElementById("order-status") as HTMLSelectElement | null;
  if (!statusSelect) return;

  const workflowStatus = mode === "update"
    ? orderState.normalizeStatus(currentStatus || statusSelect.value)
    : orderState.STATUSES.PENDING;
  const availableStatuses = mode === "update"
    ? orderState.getAvailableStatuses(workflowStatus)
    : [orderState.STATUSES.PENDING];

  Array.from(statusSelect.options).forEach((option) => {
    if (!option.value) return;
    option.disabled = !availableStatuses.includes(option.value as OrderStatus);
  });

  statusSelect.value = availableStatuses.includes(statusSelect.value as OrderStatus)
    ? statusSelect.value
    : workflowStatus;
}

function readOrderForm(): OrderFormValues {
  return {
    orderID: getElement<HTMLInputElement>("order-id").value,
    orderDate: getElement<HTMLInputElement>("order-date").value,
    itemName: getElement<HTMLSelectElement>("item-name").value,
    itemPrice: getElement<HTMLInputElement>("item-price").value,
    qtyBought: getElement<HTMLInputElement>("qty-bought").value,
    shipping: getElement<HTMLInputElement>("shipping").value,
    taxes: getElement<HTMLInputElement>("taxes").value,
    orderStatus: orderState.normalizeStatus(getElement<HTMLSelectElement>("order-status").value || orderState.STATUSES.PENDING),
  };
}

function validateOrderInput(currentOrder: Order | null): Order {
  const validate = validation.createPipeline<OrderFormValues>([
    validation.requiredField("orderID", "Order ID"),
    validation.requiredField("orderDate", "Order date"),
    validation.requiredField("itemName", "Item name"),
    validation.requiredField("itemPrice", "Item price"),
    validation.nonNegativeNumber("itemPrice", "Item price"),
    validation.requiredField("qtyBought", "Quantity"),
    validation.nonNegativeNumber("qtyBought", "Quantity"),
    validation.requiredField("shipping", "Shipping"),
    validation.nonNegativeNumber("shipping", "Shipping"),
    validation.requiredField("taxes", "Taxes"),
    validation.nonNegativeNumber("taxes", "Taxes"),
    validation.uniqueId({
      field: "orderID",
      exists: (orderID) => orderRepository.existsById(orderID, currentOrder?.orderID ?? null),
      message: () => orderT("Order ID already exists. Please use a unique ID."),
    }),
    validation.custom((values) => {
      const orderTotal = core.calculateOrderTotal(values.itemPrice, values.qtyBought, values.shipping, values.taxes);

      if (!currentOrder) {
        if (!orderState.isInitialStatus(values.orderStatus)) {
          throw new ValidationError(orderT("New orders must start as Pending."));
        }

        return {
          orderStatus: orderState.STATUSES.PENDING,
          orderTotal,
        };
      }

      return {
        orderStatus: orderState.assertValidTransition(currentOrder.orderStatus, values.orderStatus),
        orderTotal,
      };
    }),
  ]);

  return normalizeOrder(validate(readOrderForm()));
}

function newOrder(event: Event): void {
  event.preventDefault();
  let order: Order;
  try {
    order = validateOrderInput(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(message);
    if (message === orderT("New orders must start as Pending.")) {
      updateStatusOptions("add");
    }
    return;
  }

  orderRepository.add(order);
  orders = orderRepository.all();

  renderOrders(orders);

  getElement<HTMLFormElement>("order-form").reset();
  setSubmitMode("add");
}

function renderOrders(nextOrders: Order[]): void {
  orderTable = tables.createOrUpdateTable(orderTable, "#order-table", {
    data: nextOrders,
    columns: buildOrderColumns(),
    placeholder: orderT("No orders found"),
  });

  performSearch();
  displayRevenue();
}

function buildOrderColumns(): TableColumn<Order>[] {
  return [
    tables.plainTextColumn<Order>(orderT("Order ID"), "orderID"),
    tables.plainTextColumn<Order>(orderT("Order Date"), "orderDate", { sorter: "date" }),
    tables.plainTextColumn<Order>(orderT("Item Name"), "itemName"),
    {
      title: orderT("Item Price"),
      field: "itemPrice",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: orderT("Qty"),
      field: "qtyBought",
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: orderT("Shipping Fee"),
      field: "shipping",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: orderT("Taxes"),
      field: "taxes",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: orderT("Order Total"),
      field: "orderTotal",
      cssClass: "order-total",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: orderT("Order Status"),
      field: "orderStatus",
      formatter(cell) {
        const status = orderState.normalizeStatus(cell.getValue());
        const className = orderState.getStatusClass(status);
        const statusBadge = document.createElement("div");
        statusBadge.className = `status ${className}`;

        const statusText = document.createElement("span");
        statusText.textContent = orderT(status);
        statusBadge.appendChild(statusText);

        return statusBadge;
      },
    },
    tables.actionColumn<Order>({
      title: orderT("Action"),
      editLabel: (order) => orderT("Edit order", { id: order.orderID }),
      deleteLabel: (order) => orderT("Delete order", { id: order.orderID }),
      onEdit: (order) => editRow(order.orderID),
      onDelete: (order) => deleteOrder(order.orderID),
    }),
  ];
}

function displayRevenue(): void {
  const resultElement = getElement<HTMLElement>("total-revenue");

  const totalRevenue = orders
    .reduce((total, order) => total + order.orderTotal, 0);

  resultElement.textContent = orderT("Total Revenue", { amount: `$${totalRevenue.toFixed(2)}` });
}

function editRow(orderID: string): void {
  const orderToEdit = orderRepository.findById(orderID);
  if (!orderToEdit) return;

  getElement<HTMLInputElement>("order-id").value = orderToEdit.orderID;
  getElement<HTMLInputElement>("order-date").value = orderToEdit.orderDate;
  getElement<HTMLSelectElement>("item-name").value = orderToEdit.itemName;
  getElement<HTMLInputElement>("item-price").value = String(orderToEdit.itemPrice);
  getElement<HTMLInputElement>("qty-bought").value = String(orderToEdit.qtyBought);
  getElement<HTMLInputElement>("shipping").value = String(orderToEdit.shipping);
  getElement<HTMLInputElement>("taxes").value = String(orderToEdit.taxes);
  getElement<HTMLInputElement>("order-total").value = String(orderToEdit.orderTotal);
  getElement<HTMLSelectElement>("order-status").value = orderState.normalizeStatus(orderToEdit.orderStatus);

  setSubmitMode("update", orderToEdit.orderStatus);

  getElement<HTMLFormElement>("order-form").style.display = "block";
}

function deleteOrder(orderID: string): void {
  if (orderRepository.remove(orderID)) {
    orders = orderRepository.all();
    renderOrders(orders);
  }
}

function updateOrder(orderID: string): void {
  const currentOrder = orderRepository.findById(orderID);
  if (!currentOrder) return;

  let updatedOrder: Order;
  try {
    updatedOrder = validateOrderInput(currentOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const requestedStatus = getElement<HTMLSelectElement>("order-status").value;
    if (message.startsWith("Invalid order status transition")) {
      alert(orderT("Order {id} cannot move from {from} to {to}.", {
        id: currentOrder.orderID,
        from: orderT(orderState.normalizeStatus(currentOrder.orderStatus)),
        to: orderT(requestedStatus || "Choose a status"),
      }));
      updateStatusOptions("update", currentOrder.orderStatus);
    } else {
      alert(message);
    }
    return;
  }

  orderRepository.update(orderID, updatedOrder);
  orders = orderRepository.all();

  renderOrders(orders);

  getElement<HTMLFormElement>("order-form").reset();
  setSubmitMode("add");
}

function isDuplicateID(orderID: string, currentID: string): boolean {
  return orderRepository?.existsById(orderID, currentID)
    ?? orders.some((order) => order.orderID === orderID && order.orderID !== currentID);
}

function sortTable(column: string): void {
  orderTable?.setSort(column, "asc");
}

tables.bindGlobalSearch<Order>("searchInput", () => orderTable);

function performSearch(): void {
  tables.applyGlobalSearch(orderTable, getElement<HTMLInputElement>("searchInput").value);
}

function bindOrderEvents(): void {
  document.querySelector("[data-form-open]")?.addEventListener("click", openForm);
  document.querySelector("[data-form-close]")?.addEventListener("click", closeForm);
  document.querySelector("[data-export-csv]")?.addEventListener("click", exportToCSV);
  document.getElementById("order-form")?.addEventListener("submit", addOrUpdate);
}

function exportToCSV(): void {
  const activeOrders = tables.getActiveData(orderTable, orders);
  const ordersToExport = activeOrders.map((order) => {
    return {
      orderID: order.orderID,
      orderDate: order.orderDate,
      itemName: order.itemName,
      itemPrice: order.itemPrice.toFixed(2),
      qtyBought: order.qtyBought,
      shipping: order.shipping.toFixed(2),
      taxes: order.taxes.toFixed(2),
      orderTotal: order.orderTotal.toFixed(2),
      orderStatus: order.orderStatus,
    };
  });

  const csvContent = generateCSV(ordersToExport);
  core.downloadCSVFile(csvContent, "biztrack_order_table.csv");
}

function generateCSV(data: Parameters<typeof core.generateCSV>[0]): string {
  return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
  renderOrders(orders);
  const mode = (getElement<HTMLButtonElement>("submitBtn").dataset.mode as "add" | "update") || "add";
  const editingOrder = mode === "update"
    ? orders.find((order) => order.orderID === getElement<HTMLInputElement>("order-id").value)
    : null;
  setSubmitMode(mode, editingOrder?.orderStatus);
});

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.openForm = openForm;
window.closeForm = closeForm;
window.addOrUpdate = addOrUpdate;
window.exportToCSV = exportToCSV;
window.sortTable = sortTable;

void isDuplicateID;

bindOrderEvents();
init();
