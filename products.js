
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
const tables = window.BizTrackTables;
const repositories = window.BizTrackRepository;
const validation = window.BizTrackValidation;
const productsI18n = window.BizTrackI18n?.useProductsI18n();
const productsCommonI18n = window.BizTrackI18n?.useCommonI18n();
let productRepository;
let productTable;
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

function normalizeProduct(product) {
  return {
    ...product,
    prodPrice: core.toFiniteNumber(product.prodPrice),
    prodSold: core.toFiniteNumber(product.prodSold),
  };
}

function init() {
  productRepository = repositories.createLocalStorageRepository({
    storage: localStorage,
    key: "bizTrackProducts",
    defaults: defaultProducts,
    idField: "prodID",
    normalize: normalizeProduct,
  });
  products = productRepository.load();

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

function readProductForm() {
  return {
    prodID: document.getElementById("product-id").value,
    prodName: document.getElementById("product-name").value,
    prodDesc: document.getElementById("product-desc").value,
    prodCat: document.getElementById("product-cat").value,
    prodPrice: document.getElementById("product-price").value,
    prodSold: document.getElementById("product-sold").value,
  };
}

function validateProductInput(currentID) {
  const validate = validation.createPipeline([
    validation.requiredField("prodID", "Product ID"),
    validation.requiredField("prodName", "Product name"),
    validation.requiredField("prodCat", "Product category"),
    validation.requiredField("prodPrice", "Product price"),
    validation.nonNegativeNumber("prodPrice", "Product price"),
    validation.requiredField("prodSold", "Units sold"),
    validation.nonNegativeNumber("prodSold", "Units sold"),
    validation.uniqueId({
      field: "prodID",
      exists: (prodID) => productRepository.existsById(prodID, currentID),
      message: () => productT("Product ID already exists. Please use a unique ID."),
    }),
  ]);

  return validate(readProductForm());
}

function newProduct(event) {
  event.preventDefault();
  let product;
  try {
    product = validateProductInput(null);
  } catch (error) {
    alert(error.message);
    return;
  }

  productRepository.add(product);
  products = productRepository.all();

  renderProducts(products);

  document.getElementById("product-form").reset();
  setSubmitMode("add");
}


function renderProducts(products) {
  productTable = tables.createOrUpdateTable(productTable, "#product-table", {
    data: products,
    columns: buildProductColumns(),
    placeholder: productT("No products found"),
  });

  performSearch();
}

function buildProductColumns() {
  return [
    tables.plainTextColumn(productT("Product ID"), "prodID"),
    tables.plainTextColumn(productT("Product Name"), "prodName"),
    tables.plainTextColumn(productT("Description"), "prodDesc"),
    tables.plainTextColumn(productT("Category"), "prodCat"),
    {
      title: productT("Price"),
      field: "prodPrice",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    {
      title: productT("Units Sold"),
      field: "prodSold",
      hozAlign: "right",
      sorter: "number",
    },
    tables.actionColumn({
      title: productT("Action"),
      editLabel: (product) => productT("Edit product", { id: product.prodID }),
      deleteLabel: (product) => productT("Delete product", { id: product.prodID }),
      onEdit: (product) => editRow(product.prodID),
      onDelete: (product) => deleteProduct(product.prodID),
    }),
  ];
}

function editRow(prodID) {
  const productToEdit = productRepository.findById(prodID);
  if (!productToEdit) return;

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
  if (productRepository.remove(prodID)) {
    products = productRepository.all();
    renderProducts(products);
  }
}

function updateProduct(prodID) {
    if (!productRepository.findById(prodID)) return;

    let updatedProduct;
    try {
      updatedProduct = validateProductInput(prodID);
    } catch (error) {
      alert(error.message);
      return;
    }

    productRepository.update(prodID, updatedProduct);
    products = productRepository.all();

    renderProducts(products);

    document.getElementById("product-form").reset();
    setSubmitMode("add");
}

function isDuplicateID(prodID, currentID) {
    return productRepository?.existsById(prodID, currentID)
      ?? products.some(product => product.prodID === prodID && product.prodID !== currentID);
}

function sortTable(column) {
  productTable?.setSort(column, "asc");
}

tables.bindGlobalSearch("searchInput", () => productTable);

function performSearch() {
  tables.applyGlobalSearch(productTable, document.getElementById("searchInput").value);
}


function exportToCSV() {
  const activeProducts = tables.getActiveData(productTable, products);
  const productsToExport = activeProducts.map(product => {
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
