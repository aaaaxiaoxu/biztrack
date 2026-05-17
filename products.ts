import core from "./app-core";
import "./common";
import tables from "./data-table";
import repositoryFactory from "./repository";
import validation from "./validation-pipeline";
import type { I18nParams, LocalStorageRepository, Product, TabulatorTable } from "./types";

interface ProductFormValues extends Record<string, unknown> {
  prodID: string;
  prodName: string;
  prodDesc: string;
  prodCat: string;
  prodPrice: string | number;
  prodSold: string | number;
}

let products: Product[] = [];
let productRepository: LocalStorageRepository<Product>;
let productTable: TabulatorTable<Product> | null = null;

const productsI18n = window.BizTrackI18n?.useProductsI18n();
const productsCommonI18n = window.BizTrackI18n?.useCommonI18n();

const defaultProducts: Product[] = [
  {
    prodID: "PD001",
    prodName: "Baseball caps",
    prodDesc: "Peace embroidered cap",
    prodCat: "Hats",
    prodPrice: 25.00,
    prodSold: 20,
  },
  {
    prodID: "PD002",
    prodName: "Water bottles",
    prodDesc: "Floral lotus printed bottle",
    prodCat: "Drinkware",
    prodPrice: 48.50,
    prodSold: 10,
  },
  {
    prodID: "PD003",
    prodName: "Sweatshirts",
    prodDesc: "Palestine sweater",
    prodCat: "Clothing",
    prodPrice: 17.50,
    prodSold: 70,
  },
  {
    prodID: "PD004",
    prodName: "Posters",
    prodDesc: "Vibes printed poster",
    prodCat: "Home decor",
    prodPrice: 12.00,
    prodSold: 60,
  },
  {
    prodID: "PD005",
    prodName: "Pillow cases",
    prodDesc: "Morrocan print pillow case",
    prodCat: "Accessories",
    prodPrice: 17.00,
    prodSold: 40,
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
  const form = getElement<HTMLFormElement>("product-form");
  form.style.display = form.style.display === "block" ? "none" : "block";
}

function closeForm(): void {
  getElement<HTMLFormElement>("product-form").style.display = "none";
}

function normalizeProduct(product: ProductFormValues | Product): Product {
  return {
    ...product,
    prodPrice: core.toFiniteNumber(product.prodPrice),
    prodSold: core.toFiniteNumber(product.prodSold),
  };
}

function init(): void {
  productRepository = repositoryFactory.createLocalStorageRepository<Product>({
    storage: localStorage,
    key: "bizTrackProducts",
    defaults: defaultProducts,
    idField: "prodID",
    normalize: normalizeProduct,
  });
  products = productRepository.load();

  renderProducts(products);
}

function addOrUpdate(event: Event): void {
  const mode = getElement<HTMLButtonElement>("submitBtn").dataset.mode || "add";
  if (mode === "add") {
    newProduct(event);
  } else if (mode === "update") {
    const prodID = getElement<HTMLInputElement>("product-id").value;
    updateProduct(prodID);
  }
}

function productT(key: string, params?: I18nParams): string {
  return productsI18n?.t(key, params) || productsCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode: "add" | "update"): void {
  const submitButton = getElement<HTMLButtonElement>("submitBtn");
  submitButton.dataset.mode = mode;
  submitButton.textContent = productT(mode === "update" ? "Update" : "Add");
}

function readProductForm(): ProductFormValues {
  return {
    prodID: getElement<HTMLInputElement>("product-id").value,
    prodName: getElement<HTMLSelectElement>("product-name").value,
    prodDesc: getElement<HTMLInputElement>("product-desc").value,
    prodCat: getElement<HTMLSelectElement>("product-cat").value,
    prodPrice: getElement<HTMLInputElement>("product-price").value,
    prodSold: getElement<HTMLInputElement>("product-sold").value,
  };
}

function validateProductInput(currentID: string | null): Product {
  const validate = validation.createPipeline<ProductFormValues>([
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

  return normalizeProduct(validate(readProductForm()));
}

function newProduct(event: Event): void {
  event.preventDefault();
  let product: Product;
  try {
    product = validateProductInput(null);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    return;
  }

  productRepository.add(product);
  products = productRepository.all();

  renderProducts(products);

  getElement<HTMLFormElement>("product-form").reset();
  setSubmitMode("add");
}

function renderProducts(nextProducts: Product[]): void {
  productTable = tables.createOrUpdateTable(productTable, "#product-table", {
    data: nextProducts,
    columns: buildProductColumns(),
    placeholder: productT("No products found"),
  });

  performSearch();
}

function buildProductColumns() {
  return [
    tables.plainTextColumn<Product>(productT("Product ID"), "prodID"),
    tables.plainTextColumn<Product>(productT("Product Name"), "prodName"),
    tables.plainTextColumn<Product>(productT("Description"), "prodDesc"),
    tables.plainTextColumn<Product>(productT("Category"), "prodCat"),
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
    tables.actionColumn<Product>({
      title: productT("Action"),
      editLabel: (product) => productT("Edit product", { id: product.prodID }),
      deleteLabel: (product) => productT("Delete product", { id: product.prodID }),
      onEdit: (product) => editRow(product.prodID),
      onDelete: (product) => deleteProduct(product.prodID),
    }),
  ];
}

function editRow(prodID: string): void {
  const productToEdit = productRepository.findById(prodID);
  if (!productToEdit) return;

  getElement<HTMLInputElement>("product-id").value = productToEdit.prodID;
  getElement<HTMLSelectElement>("product-name").value = productToEdit.prodName;
  getElement<HTMLInputElement>("product-desc").value = productToEdit.prodDesc;
  getElement<HTMLSelectElement>("product-cat").value = productToEdit.prodCat;
  getElement<HTMLInputElement>("product-price").value = String(productToEdit.prodPrice);
  getElement<HTMLInputElement>("product-sold").value = String(productToEdit.prodSold);

  setSubmitMode("update");

  getElement<HTMLFormElement>("product-form").style.display = "block";
}

function deleteProduct(prodID: string): void {
  if (productRepository.remove(prodID)) {
    products = productRepository.all();
    renderProducts(products);
  }
}

function updateProduct(prodID: string): void {
  if (!productRepository.findById(prodID)) return;

  let updatedProduct: Product;
  try {
    updatedProduct = validateProductInput(prodID);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    return;
  }

  productRepository.update(prodID, updatedProduct);
  products = productRepository.all();

  renderProducts(products);

  getElement<HTMLFormElement>("product-form").reset();
  setSubmitMode("add");
}

function isDuplicateID(prodID: string, currentID: string): boolean {
  return productRepository?.existsById(prodID, currentID)
    ?? products.some((product) => product.prodID === prodID && product.prodID !== currentID);
}

function sortTable(column: string): void {
  productTable?.setSort(column, "asc");
}

tables.bindGlobalSearch<Product>("searchInput", () => productTable);

function performSearch(): void {
  tables.applyGlobalSearch(productTable, getElement<HTMLInputElement>("searchInput").value);
}

function bindProductEvents(): void {
  document.querySelector("[data-form-open]")?.addEventListener("click", openForm);
  document.querySelector("[data-form-close]")?.addEventListener("click", closeForm);
  document.querySelector("[data-export-csv]")?.addEventListener("click", exportToCSV);
  document.getElementById("product-form")?.addEventListener("submit", addOrUpdate);
}

function exportToCSV(): void {
  const activeProducts = tables.getActiveData(productTable, products);
  const productsToExport = activeProducts.map((product) => {
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
  core.downloadCSVFile(csvContent, "biztrack_product_table.csv");
}

function generateCSV(data: Parameters<typeof core.generateCSV>[0]): string {
  return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
  renderProducts(products);
  setSubmitMode((getElement<HTMLButtonElement>("submitBtn").dataset.mode as "add" | "update") || "add");
});

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.openForm = openForm;
window.closeForm = closeForm;
window.addOrUpdate = addOrUpdate;
window.exportToCSV = exportToCSV;
window.sortTable = sortTable;

void isDuplicateID;

bindProductEvents();
init();
