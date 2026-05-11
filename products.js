
function openSidebar() {
  var side = document.getElementById('sidebar');
  side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
  document.getElementById('sidebar').style.display = 'none';
}


function openForm() {
    var form = document.getElementById("product-form")
    form.style.display = (form.style.display === "block") ? "none" : "block";
}

function closeForm() {
    document.getElementById("product-form").style.display = "none";
}


let products = [];
const core = window.BizTrackCore;
const productsI18n = window.BizTrackI18n?.useProductsI18n();
const productsCommonI18n = window.BizTrackI18n?.useCommonI18n();
const defaultProducts = [
  {
    prodID: "PD001",
    prodName: "Baseball caps",
    prodDesc: "Peace embroidered cap",
    prodCat: "Hats",
    prodPrice: 25.00,
    prodSold: 20
  },
  {
    prodID: "PD002",
    prodName: "Water bottles",
    prodDesc: "Floral lotus printed bottle",
    prodCat: "Drinkware",
    prodPrice: 48.50,
    prodSold: 10
  },
  {
    prodID: "PD003",
    prodName: "Sweatshirts",
    prodDesc: "Palestine sweater",
    prodCat: "Clothing",
    prodPrice: 17.50,
    prodSold: 70
  },
  {
    prodID: "PD004",
    prodName: "Posters",
    prodDesc: "Vibes printed poster",
    prodCat: "Home decor",
    prodPrice: 12.00,
    prodSold: 60
  },
  {
    prodID: "PD005",
    prodName: "Pillow cases",
    prodDesc: "Morrocan print pillow case",
    prodCat: "Accessories",
    prodPrice: 17.00,
    prodSold: 40
  },
];

function init() {
  products = core.parseStoredArray(localStorage, "bizTrackProducts", defaultProducts);
  localStorage.setItem("bizTrackProducts", JSON.stringify(products));

    renderProducts(products);
}

function addOrUpdate(event) {
  const mode = document.getElementById("submitBtn").dataset.mode || "add";
  if (mode === "add") {
      newProduct(event);
  } else if (mode === "update"){
      const prodID = document.getElementById("product-id").value;
      updateProduct(prodID);
  }
}

function productT(key, params) {
  return productsI18n?.t(key, params) || productsCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode) {
  const submitButton = document.getElementById("submitBtn");
  submitButton.dataset.mode = mode;
  submitButton.textContent = productT(mode === "update" ? "Update" : "Add");
}

function newProduct(event) {
  event.preventDefault();
  const prodID = document.getElementById("product-id").value;
  const prodName = document.getElementById("product-name").value;
  const prodDesc = document.getElementById("product-desc").value;
  const prodCat = document.getElementById("product-cat").value;
  let prodPrice;
  let prodSold;
  try {
    prodPrice = core.assertNonNegativeNumber(document.getElementById("product-price").value, "Product price");
    prodSold = core.assertNonNegativeNumber(document.getElementById("product-sold").value, "Units sold");
  } catch (error) {
    alert(error.message);
    return;
  }

  if (isDuplicateID(prodID, null)) {
    alert(productT("Product ID already exists. Please use a unique ID."));
    return;
  }

  const product = {
    prodID,
    prodName,
    prodDesc,
    prodCat,
    prodPrice,
    prodSold,
  };

  products.push(product);

  renderProducts(products);
  localStorage.setItem("bizTrackProducts", JSON.stringify(products));

  document.getElementById("product-form").reset();
  setSubmitMode("add");
}


function renderProducts(products) {
  const prodTableBody = document.getElementById("tableBody");
  prodTableBody.replaceChildren();

  const prodToRender = products;

  prodToRender.forEach(product => {
      const prodRow = document.createElement("tr");
      prodRow.className = "product-row";

      prodRow.dataset.prodID = product.prodID;
      prodRow.dataset.prodName = product.prodName;
      prodRow.dataset.prodDesc = product.prodDesc;
      prodRow.dataset.prodCat = product.prodCat;
      prodRow.dataset.prodPrice = product.prodPrice;
      prodRow.dataset.prodSold = product.prodSold;

      appendCells(prodRow, [
        product.prodID,
        product.prodName,
        product.prodDesc,
        product.prodCat,
        `$${core.toFiniteNumber(product.prodPrice).toFixed(2)}`,
        product.prodSold,
      ]);
      prodRow.appendChild(createActionCell(product.prodID));
      prodTableBody.appendChild(prodRow);
  });
}

function appendCells(row, values) {
  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });
}

function createActionCell(prodID) {
  const actionCell = document.createElement("td");
  actionCell.className = "action";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button edit-icon";
  editButton.setAttribute("aria-label", productT("Edit product", { id: prodID }));
  editButton.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';
  editButton.addEventListener("click", () => editRow(prodID));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button delete-icon";
  deleteButton.setAttribute("aria-label", productT("Delete product", { id: prodID }));
  deleteButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
  deleteButton.addEventListener("click", () => deleteProduct(prodID));

  actionCell.append(editButton, deleteButton);
  return actionCell;
}

function editRow(prodID) {
  const productToEdit = products.find(product => product.prodID === prodID);

  document.getElementById("product-id").value = productToEdit.prodID;
  document.getElementById("product-name").value = productToEdit.prodName;
  document.getElementById("product-desc").value = productToEdit.prodDesc;
  document.getElementById("product-cat").value = productToEdit.prodCat;
  document.getElementById("product-price").value = productToEdit.prodPrice;
  document.getElementById("product-sold").value = productToEdit.prodSold;

  setSubmitMode("update");

  document.getElementById("product-form").style.display = "block";
}

function deleteProduct(prodID) {
  const indexToDelete = products.findIndex(product => product.prodID === prodID);

  if (indexToDelete !== -1) {
      products.splice(indexToDelete, 1);

      localStorage.setItem("bizTrackProducts", JSON.stringify(products));

      renderProducts(products);
  }
}

function updateProduct(prodID) {
    const indexToUpdate = products.findIndex(product => product.prodID === prodID);

    if (indexToUpdate !== -1) {
        let prodPrice;
        let prodSold;
        try {
            prodPrice = core.assertNonNegativeNumber(document.getElementById("product-price").value, "Product price");
            prodSold = core.assertNonNegativeNumber(document.getElementById("product-sold").value, "Units sold");
        } catch (error) {
            alert(error.message);
            return;
        }
        const updatedProduct = {
            prodID: document.getElementById("product-id").value,
            prodName: document.getElementById("product-name").value,
            prodDesc: document.getElementById("product-desc").value,
            prodCat: document.getElementById("product-cat").value,
            prodPrice,
            prodSold,
        };

        if (isDuplicateID(updatedProduct.prodID, prodID)) {
            alert(productT("Product ID already exists. Please use a unique ID."));
            return;
        }

        products[indexToUpdate] = updatedProduct;

        localStorage.setItem("bizTrackProducts", JSON.stringify(products));

        renderProducts(products);

        document.getElementById("product-form").reset();
        setSubmitMode("add");
    }
}

function isDuplicateID(prodID, currentID) {
    return products.some(product => product.prodID === prodID && product.prodID !== currentID);
}

function sortTable(column) {
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const isNumeric = column === "prodPrice" || column === "prodSold";

    const sortedRows = rows.sort((a, b) => {
        const aValue = isNumeric ? parseFloat(a.dataset[column]) : a.dataset[column];
        const bValue = isNumeric ? parseFloat(b.dataset[column]) : b.dataset[column];

        if (typeof aValue === "string" && typeof bValue === "string") {
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
    const rows = document.querySelectorAll(".product-row");

    rows.forEach(row => {
        const visible = row.innerText.toLowerCase().includes(searchInput);
        row.style.display = visible ? "table-row" : "none";
    });
}


function exportToCSV() {
  const productsToExport = products.map(product => {
      return {
        prodID: product.prodID,
        prodName: product.prodName,
        prodDesc: product.prodDesc,
        prodCategory: product.prodCat,
        prodPrice: product.prodPrice.toFixed(2),
        QtySold: product.prodSold,
      };
  });

  const csvContent = generateCSV(productsToExport);

  const blob = new Blob([csvContent], { type: 'text/csv' });

  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = 'biztrack_product_table.csv';

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
}

function generateCSV(data) {
  return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
  renderProducts(products);
  setSubmitMode(document.getElementById("submitBtn").dataset.mode || "add");
});

init();
