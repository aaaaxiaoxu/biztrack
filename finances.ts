import core from "./app-core";
import "./common";
import tables from "./data-table";
import repositoryFactory from "./repository";
import validation from "./validation-pipeline";
import type { I18nParams, LocalStorageRepository, TabulatorTable, Transaction } from "./types";

interface TransactionFormValues extends Record<string, unknown> {
  trID: number;
  trDate: string;
  trCategory: string;
  trAmount: string | number;
  trNotes: string;
}

let transactions: Transaction[] = [];
let serialNumberCounter = 1;
let transactionRepository: LocalStorageRepository<Transaction>;
let transactionTable: TabulatorTable<Transaction> | null = null;

const expensesI18n = window.BizTrackI18n?.useExpensesI18n();
const expensesCommonI18n = window.BizTrackI18n?.useCommonI18n();

const defaultTransactions: Transaction[] = [
  {
    trID: 1,
    trDate: "2024-01-05",
    trCategory: "Rent",
    trAmount: 100.00,
    trNotes: "January Rent",
  },
  {
    trID: 2,
    trDate: "2024-01-15",
    trCategory: "Order Fulfillment",
    trAmount: 35.00,
    trNotes: "Order #1005",
  },
  {
    trID: 3,
    trDate: "2024-01-08",
    trCategory: "Utilities",
    trAmount: 120.00,
    trNotes: "Internet",
  },
  {
    trID: 4,
    trDate: "2024-02-05",
    trCategory: "Supplies",
    trAmount: 180.00,
    trNotes: "Embroidery Machine",
  },
  {
    trID: 5,
    trDate: "2024-01-25",
    trCategory: "Miscellaneous",
    trAmount: 20.00,
    trNotes: "Pizza",
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
  const form = getElement<HTMLFormElement>("transaction-form");
  form.style.display = form.style.display === "block" ? "none" : "block";
}

function closeForm(): void {
  getElement<HTMLFormElement>("transaction-form").style.display = "none";
}

function normalizeTransaction(transaction: TransactionFormValues | Transaction): Transaction {
  return {
    ...transaction,
    trID: core.toFiniteNumber(transaction.trID),
    trAmount: core.toFiniteNumber(transaction.trAmount),
  };
}

function init(): void {
  transactionRepository = repositoryFactory.createLocalStorageRepository<Transaction>({
    storage: localStorage,
    key: "bizTrackTransactions",
    defaults: defaultTransactions,
    idField: "trID",
    normalize: normalizeTransaction,
  });
  transactions = transactionRepository.load();
  serialNumberCounter = core.nextTransactionId(transactions);

  renderTransactions(transactions);
}

function addOrUpdate(event: Event): void {
  const mode = getElement<HTMLButtonElement>("submitBtn").dataset.mode || "add";
  if (mode === "add") {
    newTransaction(event);
  } else if (mode === "update") {
    const trId = getElement<HTMLInputElement>("tr-id").value;
    updateTransaction(Number(trId));
  }
}

function expenseT(key: string, params?: I18nParams): string {
  return expensesI18n?.t(key, params) || expensesCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode: "add" | "update"): void {
  const submitButton = getElement<HTMLButtonElement>("submitBtn");
  submitButton.dataset.mode = mode;
  submitButton.textContent = expenseT(mode === "update" ? "Update" : "Add");
}

function readTransactionForm(trID: number): TransactionFormValues {
  return {
    trID,
    trDate: getElement<HTMLInputElement>("tr-date").value,
    trCategory: getElement<HTMLSelectElement>("tr-category").value,
    trAmount: getElement<HTMLInputElement>("tr-amount").value,
    trNotes: getElement<HTMLInputElement>("tr-notes").value,
  };
}

function validateTransactionInput(rawTransaction: TransactionFormValues): Transaction {
  const validate = validation.createPipeline<TransactionFormValues>([
    validation.requiredField("trDate", "Date"),
    validation.requiredField("trCategory", "Expense category"),
    validation.requiredField("trAmount", "Expense amount"),
    validation.nonNegativeNumber("trAmount", "Expense amount"),
    validation.requiredField("trNotes", "Notes"),
  ]);

  return normalizeTransaction(validate(rawTransaction));
}

function newTransaction(event: Event): void {
  event.preventDefault();
  serialNumberCounter = core.nextTransactionId(transactions);
  let transaction: Transaction;
  try {
    transaction = validateTransactionInput(readTransactionForm(serialNumberCounter));
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    return;
  }

  transactionRepository.add(transaction);
  transactions = transactionRepository.all();

  renderTransactions(transactions);

  serialNumberCounter++;
  displayExpenses();

  getElement<HTMLFormElement>("transaction-form").reset();
  setSubmitMode("add");
}

function renderTransactions(nextTransactions: Transaction[]): void {
  transactionTable = tables.createOrUpdateTable(transactionTable, "#finance-table", {
    data: nextTransactions,
    columns: buildTransactionColumns(),
    placeholder: expenseT("No expenses found"),
  });

  performSearch();
  displayExpenses();
}

function buildTransactionColumns() {
  return [
    {
      title: expenseT("S/N"),
      field: "trID",
      hozAlign: "right",
      sorter: "number",
      width: 90,
    },
    tables.plainTextColumn<Transaction>(expenseT("Date"), "trDate", { sorter: "date" }),
    tables.plainTextColumn<Transaction>(expenseT("Expense Category"), "trCategory"),
    {
      title: expenseT("Amount"),
      field: "trAmount",
      cssClass: "tr-amount",
      formatter: tables.currencyFormatter,
      hozAlign: "right",
      sorter: "number",
    },
    tables.plainTextColumn<Transaction>(expenseT("Notes"), "trNotes"),
    tables.actionColumn<Transaction>({
      title: expenseT("Action"),
      editLabel: (transaction) => expenseT("Edit expense", { id: transaction.trID }),
      deleteLabel: (transaction) => expenseT("Delete expense", { id: transaction.trID }),
      onEdit: (transaction) => editRow(transaction.trID),
      onDelete: (transaction) => deleteTransaction(transaction.trID),
    }),
  ];
}

function displayExpenses(): void {
  const resultElement = getElement<HTMLElement>("total-expenses");

  const totalExpenses = transactions
    .reduce((total, transaction) => total + transaction.trAmount, 0);

  resultElement.textContent = expenseT("Total Expenses", { amount: `$${totalExpenses.toFixed(2)}` });
}

function editRow(trID: number): void {
  const trToEdit = transactionRepository.findById(trID);
  if (!trToEdit) return;

  getElement<HTMLInputElement>("tr-id").value = String(trToEdit.trID);
  getElement<HTMLInputElement>("tr-date").value = trToEdit.trDate;
  getElement<HTMLSelectElement>("tr-category").value = trToEdit.trCategory;
  getElement<HTMLInputElement>("tr-amount").value = String(trToEdit.trAmount);
  getElement<HTMLInputElement>("tr-notes").value = trToEdit.trNotes;

  setSubmitMode("update");

  getElement<HTMLFormElement>("transaction-form").style.display = "block";
}

function deleteTransaction(trID: number): void {
  if (transactionRepository.remove(trID)) {
    transactions = transactionRepository.all();
    renderTransactions(transactions);
  }
}

function updateTransaction(trID: number): void {
  if (!transactionRepository.findById(trID)) return;

  let updatedTransaction: Transaction;
  try {
    updatedTransaction = validateTransactionInput(readTransactionForm(trID));
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    return;
  }

  transactionRepository.update(trID, updatedTransaction);
  transactions = transactionRepository.all();

  renderTransactions(transactions);

  getElement<HTMLFormElement>("transaction-form").reset();
  setSubmitMode("add");
}

function sortTable(column: string): void {
  transactionTable?.setSort(column, "asc");
}

tables.bindGlobalSearch<Transaction>("searchInput", () => transactionTable);

function performSearch(): void {
  tables.applyGlobalSearch(transactionTable, getElement<HTMLInputElement>("searchInput").value);
}

function bindTransactionEvents(): void {
  document.querySelector("[data-form-open]")?.addEventListener("click", openForm);
  document.querySelector("[data-form-close]")?.addEventListener("click", closeForm);
  document.querySelector("[data-export-csv]")?.addEventListener("click", exportToCSV);
  document.getElementById("transaction-form")?.addEventListener("submit", addOrUpdate);
}

function exportToCSV(): void {
  const activeTransactions = tables.getActiveData(transactionTable, transactions);
  const transactionsToExport = activeTransactions.map((transaction) => {
    return {
      trID: transaction.trID,
      trDate: transaction.trDate,
      trCategory: transaction.trCategory,
      trAmount: transaction.trAmount.toFixed(2),
      trNotes: transaction.trNotes,
    };
  });

  const csvContent = generateCSV(transactionsToExport);

  const blob = new Blob([csvContent], { type: "text/csv" });

  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = "biztrack_expense_table.csv";

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
}

function generateCSV(data: Parameters<typeof core.generateCSV>[0]): string {
  return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
  renderTransactions(transactions);
  setSubmitMode((getElement<HTMLButtonElement>("submitBtn").dataset.mode as "add" | "update") || "add");
});

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.openForm = openForm;
window.closeForm = closeForm;
window.addOrUpdate = addOrUpdate;
window.exportToCSV = exportToCSV;
window.sortTable = sortTable;

bindTransactionEvents();
init();
