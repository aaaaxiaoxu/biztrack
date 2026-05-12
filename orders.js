
function openSidebar() {
    var side = document.getElementById('sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}


function openForm() {
    var form = document.getElementById("order-form")
    const willOpen = form.style.display !== "block";
    form.style.display = willOpen ? "block" : "none";
    if (willOpen) {
        form.reset();
        setSubmitMode("add");
    }
}

function closeForm() {
    const form = document.getElementById("order-form");
    form.style.display = "none";
    form.reset();
    setSubmitMode("add");
}

let orders = [];
const core = window.BizTrackCore;
const tables = window.BizTrackTables;
const orderState = window.BizTrackOrderState;
const ordersI18n = window.BizTrackI18n?.useOrdersI18n();
const ordersCommonI18n = window.BizTrackI18n?.useCommonI18n();
let orderTable;
const defaultOrders = [
    {
        orderID: "1001",
        orderDate: "2024-01-05",
        itemName: "Baseball caps",
        itemPrice: 25.00,
        qtyBought: 2,
        shipping: 2.50,
        taxes: 9.00,
        orderTotal: 61.50,
        orderStatus: "Pending"
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
        orderStatus: "Processing"
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
        orderStatus: "Shipped"
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
        orderStatus: "Delivered"
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
        orderStatus: "Pending"
    },
];

window.onload = function () {
    orders = core.parseStoredArray(localStorage, "bizTrackOrders", defaultOrders)
        .map(orderState.normalizeOrder);
    localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

    renderOrders(orders);
    setSubmitMode("add");
}

function addOrUpdate(event) {
    const mode = document.getElementById("submitBtn").dataset.mode || "add";
    if (mode === "add") {
        newOrder(event);
    } else if (mode === "update"){
        const orderID = document.getElementById("order-id").value;
        updateOrder(orderID);
    }
}

function orderT(key, params) {
    return ordersI18n?.t(key, params) || ordersCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode, currentStatus) {
    const submitButton = document.getElementById("submitBtn");
    submitButton.dataset.mode = mode;
    submitButton.textContent = orderT(mode === "update" ? "Update" : "Add");
    updateStatusOptions(mode, currentStatus);
}

function updateStatusOptions(mode, currentStatus) {
    const statusSelect = document.getElementById("order-status");
    if (!statusSelect) return;

    const workflowStatus = mode === "update"
        ? orderState.normalizeStatus(currentStatus || statusSelect.value)
        : orderState.STATUSES.PENDING;
    const availableStatuses = mode === "update"
        ? orderState.getAvailableStatuses(workflowStatus)
        : [orderState.STATUSES.PENDING];

    Array.from(statusSelect.options).forEach((option) => {
        if (!option.value) return;
        option.disabled = !availableStatuses.includes(option.value);
    });

    statusSelect.value = availableStatuses.includes(statusSelect.value)
        ? statusSelect.value
        : workflowStatus;
}


function newOrder(event) {
  event.preventDefault();
  const orderID = document.getElementById("order-id").value;
  const orderDate = document.getElementById("order-date").value;
  const itemName = document.getElementById("item-name").value;
  let itemPrice;
  let qtyBought;
  let shipping;
  let taxes;
  let orderTotal;
  try {
    itemPrice = core.assertNonNegativeNumber(document.getElementById("item-price").value, "Item price");
    qtyBought = core.assertNonNegativeNumber(document.getElementById("qty-bought").value, "Quantity");
    shipping = core.assertNonNegativeNumber(document.getElementById("shipping").value, "Shipping");
    taxes = core.assertNonNegativeNumber(document.getElementById("taxes").value, "Taxes");
    orderTotal = core.calculateOrderTotal(itemPrice, qtyBought, shipping, taxes);
  } catch (error) {
    alert(error.message);
    return;
  }
  const requestedStatus = document.getElementById("order-status").value || orderState.STATUSES.PENDING;
  if (!orderState.isInitialStatus(requestedStatus)) {
    alert(orderT("New orders must start as Pending."));
    updateStatusOptions("add");
    return;
  }
  const orderStatus = orderState.STATUSES.PENDING;

  if (isDuplicateID(orderID, null)) {
    alert(orderT("Order ID already exists. Please use a unique ID."));
    return;
  }

  const order = {
    orderID,
    orderDate,
    itemName,
    itemPrice,
    qtyBought,
    shipping,
    taxes,
    orderTotal,
    orderStatus,
  };

  orders.push(order);

  renderOrders(orders);
  localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

  document.getElementById("order-form").reset();
  setSubmitMode("add");
}


function renderOrders(orders) {
  orderTable = tables.createOrUpdateTable(orderTable, "#order-table", {
    data: orders,
    columns: buildOrderColumns(),
    placeholder: orderT("No orders found"),
  });

  performSearch();
  displayRevenue();
}

function buildOrderColumns() {
    return [
        tables.plainTextColumn(orderT("Order ID"), "orderID"),
        tables.plainTextColumn(orderT("Order Date"), "orderDate", { sorter: "date" }),
        tables.plainTextColumn(orderT("Item Name"), "itemName"),
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
                return `<div class="status ${className}"><span>${tables.escapeHtml(orderT(status))}</span></div>`;
            },
        },
        tables.actionColumn({
            title: orderT("Action"),
            editLabel: (order) => orderT("Edit order", { id: order.orderID }),
            deleteLabel: (order) => orderT("Delete order", { id: order.orderID }),
            onEdit: (order) => editRow(order.orderID),
            onDelete: (order) => deleteOrder(order.orderID),
        }),
    ];
}

function displayRevenue() {
    const resultElement = document.getElementById("total-revenue");

    const totalRevenue = orders
        .reduce((total, order) => total + order.orderTotal, 0);

    resultElement.textContent = orderT("Total Revenue", { amount: `$${totalRevenue.toFixed(2)}` });
}

function editRow(orderID) {
    const orderToEdit = orders.find(order => order.orderID === orderID);
    if (!orderToEdit) return;

    document.getElementById("order-id").value = orderToEdit.orderID;
    document.getElementById("order-date").value = orderToEdit.orderDate;
    document.getElementById("item-name").value = orderToEdit.itemName;
    document.getElementById("item-price").value = orderToEdit.itemPrice;
    document.getElementById("qty-bought").value = orderToEdit.qtyBought;
    document.getElementById("shipping").value = orderToEdit.shipping;
    document.getElementById("taxes").value = orderToEdit.taxes;
    document.getElementById("order-total").value = orderToEdit.orderTotal;
    document.getElementById("order-status").value = orderState.normalizeStatus(orderToEdit.orderStatus);

    setSubmitMode("update", orderToEdit.orderStatus);

    document.getElementById("order-form").style.display = "block";
}

function deleteOrder(orderID) {
  const indexToDelete = orders.findIndex(order => order.orderID === orderID);

  if (indexToDelete !== -1) {
      orders.splice(indexToDelete, 1);

      localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

      renderOrders(orders);
  }
}

function updateOrder(orderID) {
    const indexToUpdate = orders.findIndex(order => order.orderID === orderID);

    if (indexToUpdate !== -1) {
        const currentOrder = orders[indexToUpdate];
        let itemPrice;
        let qtyBought;
        let shipping;
        let taxes;
        let orderTotal;
        let orderStatus;
        try {
            itemPrice = core.assertNonNegativeNumber(document.getElementById("item-price").value, "Item price");
            qtyBought = core.assertNonNegativeNumber(document.getElementById("qty-bought").value, "Quantity");
            shipping = core.assertNonNegativeNumber(document.getElementById("shipping").value, "Shipping");
            taxes = core.assertNonNegativeNumber(document.getElementById("taxes").value, "Taxes");
            orderTotal = core.calculateOrderTotal(itemPrice, qtyBought, shipping, taxes);
            orderStatus = orderState.assertValidTransition(currentOrder.orderStatus, document.getElementById("order-status").value);
        } catch (error) {
            const requestedStatus = document.getElementById("order-status").value;
            if (error.message.startsWith("Invalid order status transition")) {
                alert(orderT("Order {id} cannot move from {from} to {to}.", {
                    id: currentOrder.orderID,
                    from: orderT(orderState.normalizeStatus(currentOrder.orderStatus)),
                    to: orderT(requestedStatus || "Choose a status"),
                }));
                updateStatusOptions("update", currentOrder.orderStatus);
            } else {
                alert(error.message);
            }
            return;
        }
        const updatedOrder = {
            orderID: document.getElementById("order-id").value,
            orderDate: document.getElementById("order-date").value,
            itemName: document.getElementById("item-name").value,
            itemPrice: itemPrice,
            qtyBought: qtyBought,
            shipping: shipping,
            taxes: taxes,
            orderTotal,
            orderStatus,
        };

        if (isDuplicateID(updatedOrder.orderID, orderID)) {
            alert(orderT("Order ID already exists. Please use a unique ID."));
            return;
        }

        orders[indexToUpdate] = updatedOrder;

        localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

        renderOrders(orders);

        document.getElementById("order-form").reset();
        setSubmitMode("add");
    }
}

function isDuplicateID(orderID, currentID) {
    return orders.some(order => order.orderID === orderID && order.orderID !== currentID);
}

function sortTable(column) {
    orderTable?.setSort(column, "asc");
}

tables.bindGlobalSearch("searchInput", () => orderTable);

function performSearch() {
    tables.applyGlobalSearch(orderTable, document.getElementById("searchInput").value);
}


function exportToCSV() {
    const activeOrders = tables.getActiveData(orderTable, orders);
    const ordersToExport = activeOrders.map(order => {
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
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
  
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'biztrack_order_table.csv';
  
    document.body.appendChild(link);
    link.click();
  
    document.body.removeChild(link);
}
  
function generateCSV(data) {
    return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
    renderOrders(orders);
    const mode = document.getElementById("submitBtn").dataset.mode || "add";
    const editingOrder = mode === "update"
        ? orders.find(order => order.orderID === document.getElementById("order-id").value)
        : null;
    setSubmitMode(mode, editingOrder?.orderStatus);
});
