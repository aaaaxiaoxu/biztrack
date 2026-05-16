
function openSidebar() {
    var side = document.getElementById('sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}


function openForm() {
    var form = document.getElementById("transaction-form")
    form.style.display = (form.style.display === "block") ? "none" : "block";
}

function closeForm() {
    document.getElementById("transaction-form").style.display = "none";
}


let transactions = [];
let serialNumberCounter;
const core = window.BizTrackCore;
const tables = window.BizTrackTables;
const repositories = window.BizTrackRepository;
const validation = window.BizTrackValidation;
const expensesI18n = window.BizTrackI18n?.useExpensesI18n();
const expensesCommonI18n = window.BizTrackI18n?.useCommonI18n();
let transactionRepository;
let transactionTable;
const defaultTransactions = [
    {
        trID: 1,
        trDate: "2024-01-05",
        trCategory: "Rent",
        trAmount: 100.00,
        trNotes: "January Rent"
    },
    {
        trID: 2,
        trDate: "2024-01-15",
        trCategory: "Order Fulfillment",
        trAmount: 35.00,
        trNotes: "Order #1005"
    },
    {
        trID: 3,
        trDate: "2024-01-08",
        trCategory: "Utilities",
        trAmount: 120.00,
        trNotes: "Internet"
    },
    {
        trID: 4,
        trDate: "2024-02-05",
        trCategory: "Supplies",
        trAmount: 180.00,
        trNotes: "Embroidery Machine"
    },
    {
        trID: 5,
        trDate: "2024-01-25",
        trCategory: "Miscellaneous",
        trAmount: 20.00,
        trNotes: "Pizza"
    },
];

function normalizeTransaction(transaction) {
    return {
        ...transaction,
        trID: core.toFiniteNumber(transaction.trID),
        trAmount: core.toFiniteNumber(transaction.trAmount),
    };
}

function init() {
    transactionRepository = repositories.createLocalStorageRepository({
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

function addOrUpdate(event) {
    const mode = document.getElementById("submitBtn").dataset.mode || "add";
    if (mode === "add") {
        newTransaction(event);
    } else if (mode === "update"){
        const trId = document.getElementById("tr-id").value;
        updateTransaction(+trId); // convert to number
    }
}

function expenseT(key, params) {
    return expensesI18n?.t(key, params) || expensesCommonI18n?.t(key, params) || key;
}

function setSubmitMode(mode) {
    const submitButton = document.getElementById("submitBtn");
    submitButton.dataset.mode = mode;
    submitButton.textContent = expenseT(mode === "update" ? "Update" : "Add");
}

function readTransactionForm(trID) {
    return {
        trID,
        trDate: document.getElementById("tr-date").value,
        trCategory: document.getElementById("tr-category").value,
        trAmount: document.getElementById("tr-amount").value,
        trNotes: document.getElementById("tr-notes").value,
    };
}

function validateTransactionInput(rawTransaction) {
    const validate = validation.createPipeline([
        validation.requiredField("trDate", "Date"),
        validation.requiredField("trCategory", "Expense category"),
        validation.requiredField("trAmount", "Expense amount"),
        validation.nonNegativeNumber("trAmount", "Expense amount"),
        validation.requiredField("trNotes", "Notes"),
    ]);

    return validate(rawTransaction);
}


function newTransaction(event) {
    event.preventDefault();
    serialNumberCounter = core.nextTransactionId(transactions);
    let transaction;
    try {
        transaction = validateTransactionInput(readTransactionForm(serialNumberCounter));
    } catch (error) {
        alert(error.message);
        return;
    }
    
    transactionRepository.add(transaction);
    transactions = transactionRepository.all();
  
    renderTransactions(transactions);

    serialNumberCounter++;
    displayExpenses();

    document.getElementById("transaction-form").reset();
    setSubmitMode("add");
}


function renderTransactions(transactions) {
  transactionTable = tables.createOrUpdateTable(transactionTable, "#finance-table", {
    data: transactions,
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
        tables.plainTextColumn(expenseT("Date"), "trDate", { sorter: "date" }),
        tables.plainTextColumn(expenseT("Expense Category"), "trCategory"),
        {
            title: expenseT("Amount"),
            field: "trAmount",
            cssClass: "tr-amount",
            formatter: tables.currencyFormatter,
            hozAlign: "right",
            sorter: "number",
        },
        tables.plainTextColumn(expenseT("Notes"), "trNotes"),
        tables.actionColumn({
            title: expenseT("Action"),
            editLabel: (transaction) => expenseT("Edit expense", { id: transaction.trID }),
            deleteLabel: (transaction) => expenseT("Delete expense", { id: transaction.trID }),
            onEdit: (transaction) => editRow(transaction.trID),
            onDelete: (transaction) => deleteTransaction(transaction.trID),
        }),
    ];
}

function displayExpenses() {
    const resultElement = document.getElementById("total-expenses");

    const totalExpenses = transactions
        .reduce((total, transaction) => total + transaction.trAmount,0);

    resultElement.textContent = expenseT("Total Expenses", { amount: `$${totalExpenses.toFixed(2)}` });
}

function editRow(trID) {
    const trToEdit = transactionRepository.findById(trID);
    if (!trToEdit) return;
    
    document.getElementById("tr-id").value = trToEdit.trID;      
    document.getElementById("tr-date").value = trToEdit.trDate;
    document.getElementById("tr-category").value = trToEdit.trCategory;
    document.getElementById("tr-amount").value = trToEdit.trAmount;
    document.getElementById("tr-notes").value = trToEdit.trNotes;
  
    setSubmitMode("update");

    document.getElementById("transaction-form").style.display = "block";
}
  
function deleteTransaction(trID) {
    if (transactionRepository.remove(trID)) {
        transactions = transactionRepository.all();
        renderTransactions(transactions);
    }
}

  function updateTransaction(trID) {
    if (!transactionRepository.findById(trID)) return;

    let updatedTransaction;
    try {
        updatedTransaction = validateTransactionInput(readTransactionForm(trID));
    } catch (error) {
        alert(error.message);
        return;
    }

    transactionRepository.update(trID, updatedTransaction);
    transactions = transactionRepository.all();

    renderTransactions(transactions);

    document.getElementById("transaction-form").reset();
    setSubmitMode("add");
}

function sortTable(column) {
    transactionTable?.setSort(column, "asc");
}

tables.bindGlobalSearch("searchInput", () => transactionTable);

function performSearch() {
    tables.applyGlobalSearch(transactionTable, document.getElementById("searchInput").value);
}

function bindTransactionEvents() {
    document.querySelector("[data-form-open]")?.addEventListener("click", openForm);
    document.querySelector("[data-form-close]")?.addEventListener("click", closeForm);
    document.querySelector("[data-export-csv]")?.addEventListener("click", exportToCSV);
    document.getElementById("transaction-form")?.addEventListener("submit", addOrUpdate);
}


function exportToCSV() {
    const activeTransactions = tables.getActiveData(transactionTable, transactions);
    const transactionsToExport = activeTransactions.map(transaction => {
        return {
            trID: transaction.trID,
            trDate: transaction.trDate,
            trCategory: transaction.trCategory,
            trAmount: transaction.trAmount.toFixed(2),
            trNotes: transaction.trNotes,
        };
    });
  
    const csvContent = generateCSV(transactionsToExport);
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
  
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'biztrack_expense_table.csv';
  
    document.body.appendChild(link);
    link.click();
  
    document.body.removeChild(link);
}
  
function generateCSV(data) {
    return core.generateCSV(data);
}

window.addEventListener("biztrack:languagechange", () => {
    renderTransactions(transactions);
    setSubmitMode(document.getElementById("submitBtn").dataset.mode || "add");
});

bindTransactionEvents();
init();
