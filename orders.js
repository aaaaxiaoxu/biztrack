
function openSidebar() {
    var side = document.getElementById('sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}


function openForm() {
    var form = document.getElementById("order-form")
    form.style.display = (form.style.display === "block") ? "none" : "block";
}

function closeForm() {
    document.getElementById("order-form").style.display = "none";
}

let orders = [];
const core = window.BizTrackCore;
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
    orders = core.parseStoredArray(localStorage, "bizTrackOrders", defaultOrders);
    localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

    renderOrders(orders);
}

function addOrUpdate(event) {
    let type = document.getElementById("submitBtn").textContent;
    if (type === 'Add') {
        newOrder(event);
    } else if (type === 'Update'){
        const orderID = document.getElementById("order-id").value;
        updateOrder(orderID);
    }
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
  const orderStatus = document.getElementById("order-status").value;

  if (isDuplicateID(orderID, null)) {
    alert("Order ID already exists. Please use a unique ID.");
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
}


function renderOrders(orders) {
    const orderTableBody = document.getElementById("tableBody");
    orderTableBody.replaceChildren();

    const orderToRender = orders;
    const statusMap = {
        "Pending": "pending",
        "Processing": "processing",
        "Shipped": "shipped",
        "Delivered": "delivered"
    }

    orderToRender.forEach(order => {
      const orderRow = document.createElement("tr");
      orderRow.className = "order-row";

      orderRow.dataset.orderID = order.orderID;
      orderRow.dataset.orderDate = order.orderDate;
      orderRow.dataset.itemName = order.itemName;
      orderRow.dataset.itemPrice = order.itemPrice;
      orderRow.dataset.qtyBought = order.qtyBought;
      orderRow.dataset.shipping = order.shipping;
      orderRow.dataset.taxes = order.taxes;
      orderRow.dataset.orderTotal = order.orderTotal;
      orderRow.dataset.orderStatus = order.orderStatus;

      const formattedPrice = typeof order.itemPrice === 'number' ? `$${order.itemPrice.toFixed(2)}` : '';
      const formattedShipping = typeof order.shipping === 'number' ? `$${order.shipping.toFixed(2)}` : '';
      const formattedTaxes = typeof order.taxes === 'number' ? `$${order.taxes.toFixed(2)}` : '';
      const formattedTotal = typeof order.orderTotal === 'number' ? `$${order.orderTotal.toFixed(2)}` : '';

      appendCells(orderRow, [
        order.orderID,
        order.orderDate,
        order.itemName,
        formattedPrice,
        order.qtyBought,
        formattedShipping,
        formattedTaxes,
      ]);
      const totalCell = document.createElement("td");
      totalCell.className = "order-total";
      totalCell.textContent = formattedTotal;
      orderRow.appendChild(totalCell);
      const statusCell = document.createElement("td");
      const status = document.createElement("div");
      status.className = `status ${statusMap[order.orderStatus] || ""}`;
      const statusText = document.createElement("span");
      statusText.textContent = order.orderStatus;
      status.appendChild(statusText);
      statusCell.appendChild(status);
      orderRow.appendChild(statusCell);
      orderRow.appendChild(createActionCell(order.orderID));
      orderTableBody.appendChild(orderRow);
  });
  displayRevenue();
}

function appendCells(row, values) {
  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });
}

function createActionCell(orderID) {
  const actionCell = document.createElement("td");
  actionCell.className = "action";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button edit-icon";
  editButton.setAttribute("aria-label", `Edit order ${orderID}`);
  editButton.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';
  editButton.addEventListener("click", () => editRow(orderID));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button delete-icon";
  deleteButton.setAttribute("aria-label", `Delete order ${orderID}`);
  deleteButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
  deleteButton.addEventListener("click", () => deleteOrder(orderID));

  actionCell.append(editButton, deleteButton);
  return actionCell;
}

function displayRevenue() {
    const resultElement = document.getElementById("total-revenue");

    const totalRevenue = orders
        .reduce((total, order) => total + order.orderTotal, 0);

    resultElement.textContent = `Total Revenue: $${totalRevenue.toFixed(2)}`;
}

function editRow(orderID) {
    const orderToEdit = orders.find(order => order.orderID === orderID);

    document.getElementById("order-id").value = orderToEdit.orderID;
    document.getElementById("order-date").value = orderToEdit.orderDate;
    document.getElementById("item-name").value = orderToEdit.itemName;
    document.getElementById("item-price").value = orderToEdit.itemPrice;
    document.getElementById("qty-bought").value = orderToEdit.qtyBought;
    document.getElementById("shipping").value = orderToEdit.shipping;
    document.getElementById("taxes").value = orderToEdit.taxes;
    document.getElementById("order-total").value = orderToEdit.orderTotal;
    document.getElementById("order-status").value = orderToEdit.orderStatus;

    document.getElementById("submitBtn").textContent = "Update";

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
        const updatedOrder = {
            orderID: document.getElementById("order-id").value,
            orderDate: document.getElementById("order-date").value,
            itemName: document.getElementById("item-name").value,
            itemPrice: itemPrice,
            qtyBought: qtyBought,
            shipping: shipping,
            taxes: taxes,
            orderTotal,
            orderStatus: document.getElementById("order-status").value,
        };

        if (isDuplicateID(updatedOrder.orderID, orderID)) {
            alert("Order ID already exists. Please use a unique ID.");
            return;
        }

        orders[indexToUpdate] = updatedOrder;

        localStorage.setItem("bizTrackOrders", JSON.stringify(orders));

        renderOrders(orders);

        document.getElementById("order-form").reset();
        document.getElementById("submitBtn").textContent = "Add";
    }
}

function isDuplicateID(orderID, currentID) {
    return orders.some(order => order.orderID === orderID && order.orderID !== currentID);
}

function sortTable(column) {
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const isNumeric = column === "itemPrice" || column === "qtyBought" || column === "shipping"|| column === "taxes"|| column === "orderTotal";

    const sortedRows = rows.sort((a, b) => {
        const aValue = isNumeric ? parseFloat(a.dataset[column]) : a.dataset[column];
        const bValue = isNumeric ? parseFloat(b.dataset[column]) : b.dataset[column];

        if (typeof aValue === "string" && typeof bValue === "string") {
            // Case-insensitive string comparison for text columns
            return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
        } else {
            return aValue - bValue;
        }
    });

    rows.forEach(row => tbody.removeChild(row));

    sortedRows.forEach(row => tbody.appendChild(row));
}

document.getElementById("searchInput").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        performSearch();
    }
});


function performSearch() {
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll(".order-row");

    rows.forEach(row => {
        const visible = row.innerText.toLowerCase().includes(searchInput);
        row.style.display = visible ? "table-row" : "none";
    });
}


function exportToCSV() {
    const ordersToExport = orders.map(order => {
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
