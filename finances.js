
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

window.onload = function () {
    transactions = core.parseStoredArray(localStorage, "bizTrackTransactions", defaultTransactions);
    serialNumberCounter = core.nextTransactionId(transactions);
    localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));
  
    renderTransactions(transactions);
}

function addOrUpdate(event) {
    let type = document.getElementById("submitBtn").textContent;
    if (type === 'Add') {
        newTransaction(event);
    } else if (type === 'Update'){
        const trId = document.getElementById("tr-id").value;
        updateTransaction(+trId); // convert to number
    }
}


function newTransaction(event) {
    event.preventDefault();
    const trDate = document.getElementById("tr-date").value;
    const trCategory = document.getElementById("tr-category").value;
    let trAmount;
    try {
        trAmount = core.assertNonNegativeNumber(document.getElementById("tr-amount").value, "Expense amount");
    } catch (error) {
        alert(error.message);
        return;
    }
    const trNotes = document.getElementById("tr-notes").value;

    serialNumberCounter = core.nextTransactionId(transactions);
    let trID = serialNumberCounter;
    
    const transaction = {
      trID,
      trDate,
      trCategory,
      trAmount,
      trNotes,
    };
    
    transactions.push(transaction);
  
    renderTransactions(transactions);
    localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));

    serialNumberCounter++;
    displayExpenses();
  
    document.getElementById("transaction-form").reset();
}


function renderTransactions(transactions) {
    const transactionTableBody = document.getElementById("tableBody");
    transactionTableBody.replaceChildren();

    const transactionToRender = transactions;

    transactionToRender.forEach(transaction => {
        const transactionRow = document.createElement("tr");
        transactionRow.className = "transaction-row";

        transactionRow.dataset.trID = transaction.trID;
        transactionRow.dataset.trDate = transaction.trDate;
        transactionRow.dataset.trCategory = transaction.trCategory;
        transactionRow.dataset.trAmount = transaction.trAmount;
        transactionRow.dataset.trNotes = transaction.trNotes;

        const formattedAmount = typeof transaction.trAmount === 'number' ? `$${transaction.trAmount.toFixed(2)}` : '';

        appendCells(transactionRow, [
            transaction.trID,
            transaction.trDate,
            transaction.trCategory,
        ]);
        const amountCell = document.createElement("td");
        amountCell.className = "tr-amount";
        amountCell.textContent = formattedAmount;
        transactionRow.appendChild(amountCell);
        appendCells(transactionRow, [transaction.trNotes]);
        transactionRow.appendChild(createActionCell(transaction.trID));
        transactionTableBody.appendChild(transactionRow);
  });
  displayExpenses();
}

function appendCells(row, values) {
    values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    });
}

function createActionCell(trID) {
    const actionCell = document.createElement("td");
    actionCell.className = "action";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button edit-icon";
    editButton.setAttribute("aria-label", `Edit expense ${trID}`);
    editButton.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';
    editButton.addEventListener("click", () => editRow(trID));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete-icon";
    deleteButton.setAttribute("aria-label", `Delete expense ${trID}`);
    deleteButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
    deleteButton.addEventListener("click", () => deleteTransaction(trID));

    actionCell.append(editButton, deleteButton);
    return actionCell;
}

function displayExpenses() {
    const resultElement = document.getElementById("total-expenses");

    const totalExpenses = transactions
        .reduce((total, transaction) => total + transaction.trAmount,0);

    resultElement.textContent = `Total Expenses: $${totalExpenses.toFixed(2)}`;
}

function editRow(trID) {
    const trToEdit = transactions.find(transaction => transaction.trID == trID);
    
    document.getElementById("tr-id").value = trToEdit.trID;      
    document.getElementById("tr-date").value = trToEdit.trDate;
    document.getElementById("tr-category").value = trToEdit.trCategory;
    document.getElementById("tr-amount").value = trToEdit.trAmount;
    document.getElementById("tr-notes").value = trToEdit.trNotes;
  
    document.getElementById("submitBtn").textContent = "Update";

    document.getElementById("transaction-form").style.display = "block";
  }
  
function deleteTransaction(trID) {
    const indexToDelete = transactions.findIndex(transaction => transaction.trID == trID);

    if (indexToDelete !== -1) {
        transactions.splice(indexToDelete, 1);

        localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));

        renderTransactions(transactions);
    }
}

  function updateTransaction(trID) {
    const indexToUpdate = transactions.findIndex(transaction => transaction.trID === trID);

    if (indexToUpdate !== -1) {
        let trAmount;
        try {
            trAmount = core.assertNonNegativeNumber(document.getElementById("tr-amount").value, "Expense amount");
        } catch (error) {
            alert(error.message);
            return;
        }
        const updatedTransaction = {
            trID: trID,
            trDate: document.getElementById("tr-date").value,
            trCategory: document.getElementById("tr-category").value,
            trAmount,
            trNotes: document.getElementById("tr-notes").value,
        };

        transactions[indexToUpdate] = updatedTransaction;

        localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));

        renderTransactions(transactions);

        document.getElementById("transaction-form").reset();
        document.getElementById("submitBtn").textContent = "Add";
    }
}

function sortTable(column) {
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const isNumeric = column === "trID" || column === "trAmount";

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
    const rows = document.querySelectorAll(".transaction-row");

    rows.forEach(row => {
        const visible = row.innerText.toLowerCase().includes(searchInput);
        row.style.display = visible ? "table-row" : "none";
    });
}


function exportToCSV() {
    const transactionsToExport = transactions.map(transaction => {
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
