// Customer Ledger - Simple Ledger Management
// LocalStorage keys
const CUSTOMERS_KEY = "customer_ledger_customers";
const TRANSACTIONS_KEY = "customer_ledger_transactions";

// Current customer being viewed
let currentCustomerId = null;

// Load data on page load
window.addEventListener("load", function () {
  initializeLedger();
});

// ==========================================
// INITIALIZATION
// ==========================================
function initializeLedger() {
  // Set default date to today
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("transactionDate");
  if (dateInput) {
    dateInput.value = today;
  }

  // Load and display customers
  loadCustomerList();
  updateReports();
}

// ==========================================
// DATA MANAGEMENT - LocalStorage
// ==========================================
function loadLedgerData() {
  const customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");
  const transactions = JSON.parse(
    localStorage.getItem(TRANSACTIONS_KEY) || "[]",
  );
  return { customers, transactions };
}

function saveCustomers(customers) {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

function saveTransactions(transactions) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================
function showAddCustomerModal() {
  const modal = new bootstrap.Modal(
    document.getElementById("addCustomerModal"),
  );
  // Reset form
  document.getElementById("addCustomerForm").reset();
  modal.show();
}

function addCustomer() {
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  if (!name) {
    alert("Customer name is required!");
    return;
  }

  const { customers } = loadLedgerData();

  // Check if customer already exists
  const exists = customers.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    alert("Customer with this name already exists!");
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: name,
    phone: phone || "",
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };

  customers.push(newCustomer);
  saveCustomers(customers);

  // Close modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("addCustomerModal"),
  );
  modal.hide();

  // Reload customer list
  loadCustomerList();
  updateReports();

  alert(`Customer "${name}" added successfully!`);
}

function deleteCustomer(customerId) {
  if (
    !confirm(
      "Are you sure you want to delete this customer and all their transactions?",
    )
  ) {
    return;
  }

  const { customers, transactions } = loadLedgerData();

  // Remove customer
  const updatedCustomers = customers.filter((c) => c.id !== customerId);
  saveCustomers(updatedCustomers);

  // Remove all transactions for this customer
  const updatedTransactions = transactions.filter(
    (t) => t.customerId !== customerId,
  );
  saveTransactions(updatedTransactions);

  loadCustomerList();
  updateReports();

  alert("Customer and all transactions deleted successfully!");
}

function deleteCurrentCustomer() {
  if (!currentCustomerId) return;
  deleteCustomer(currentCustomerId);
  backToCustomerList();
}

function loadCustomerList() {
  const { customers } = loadLedgerData();
  const tbody = document.getElementById("customerTableBody");

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No customers added yet
        </td>
      </tr>
    `;
    return;
  }

  // Sort by name
  customers.sort((a, b) => a.name.localeCompare(b.name));

  tbody.innerHTML = customers
    .map((customer, index) => {
      const balance = getCustomerBalance(customer.id);
      const balanceClass =
        balance > 0 ? "text-danger" : balance < 0 ? "text-success" : "";
      const balanceText =
        balance >= 0
          ? `₹${balance.toFixed(2)}`
          : `₹${Math.abs(balance).toFixed(2)}`;

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${customer.name}</td>
        <td>${customer.phone || "-"}</td>
        <td class="${balanceClass}" style="font-weight: bold;">${balanceText}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewCustomerDetail(${customer.id})" title="View Details">
            <ion-icon name="eye-outline"></ion-icon>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})" title="Delete">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function searchCustomers() {
  const searchTerm = document
    .getElementById("customerSearch")
    .value.toLowerCase();
  const { customers } = loadLedgerData();

  if (searchTerm === "") {
    loadCustomerList();
    return;
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm) ||
      c.phone.toLowerCase().includes(searchTerm),
  );

  const tbody = document.getElementById("customerTableBody");

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No customers found matching "${searchTerm}"
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((customer, index) => {
      const balance = getCustomerBalance(customer.id);
      const balanceClass =
        balance > 0 ? "text-danger" : balance < 0 ? "text-success" : "";
      const balanceText =
        balance >= 0
          ? `₹${balance.toFixed(2)}`
          : `₹${Math.abs(balance).toFixed(2)}`;

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${customer.name}</td>
        <td>${customer.phone || "-"}</td>
        <td class="${balanceClass}" style="font-weight: bold;">${balanceText}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewCustomerDetail(${customer.id})">
            <ion-icon name="eye-outline"></ion-icon>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ==========================================
// CUSTOMER DETAIL VIEW
// ==========================================
function viewCustomerDetail(customerId) {
  currentCustomerId = customerId;

  const { customers } = loadLedgerData();
  const customer = customers.find((c) => c.id === customerId);

  if (!customer) {
    alert("Customer not found!");
    return;
  }

  // Update customer info
  document.getElementById("detailCustomerName").textContent = customer.name;
  document.getElementById("detailCustomerPhone").textContent = customer.phone
    ? `Phone: ${customer.phone}`
    : "Phone: -";
  document.getElementById("detailCustomerNotes").textContent = customer.notes
    ? `Notes: ${customer.notes}`
    : "Notes: -";

  const balance = getCustomerBalance(customerId);
  const balanceEl = document.getElementById("detailCustomerBalance");
  balanceEl.textContent = `₹${Math.abs(balance).toFixed(2)}`;
  balanceEl.style.color =
    balance > 0 ? "#dc3545" : balance < 0 ? "#28a745" : "#bc6c25";

  // Load transactions
  loadTransactionList(customerId);

  // Switch views
  document.getElementById("customerListView").style.display = "none";
  document.getElementById("customerDetailView").style.display = "block";

  // Reset transaction form
  document.getElementById("transactionForm").reset();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("transactionDate").value = today;
}

function backToCustomerList() {
  currentCustomerId = null;
  document.getElementById("customerListView").style.display = "block";
  document.getElementById("customerDetailView").style.display = "none";
  loadCustomerList();
  updateReports();
}

// ==========================================
// TRANSACTION MANAGEMENT
// ==========================================
document
  .getElementById("transactionForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    addTransaction();
  });

function addTransaction() {
  if (!currentCustomerId) {
    alert("No customer selected!");
    return;
  }

  const type = document.getElementById("transactionType").value;
  const amount = parseFloat(document.getElementById("transactionAmount").value);
  const date = document.getElementById("transactionDate").value;
  const description = document
    .getElementById("transactionDescription")
    .value.trim();

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount!");
    return;
  }

  if (!date) {
    alert("Please select a date!");
    return;
  }

  const { transactions } = loadLedgerData();

  const newTransaction = {
    id: Date.now(),
    customerId: currentCustomerId,
    type: type,
    amount: amount,
    date: date,
    description: description || "-",
    createdAt: new Date().toISOString(),
  };

  transactions.push(newTransaction);
  saveTransactions(transactions);

  // Reset form
  document.getElementById("transactionForm").reset();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("transactionDate").value = today;

  // Reload transaction list
  loadTransactionList(currentCustomerId);

  // Update balance
  const balance = getCustomerBalance(currentCustomerId);
  const balanceEl = document.getElementById("detailCustomerBalance");
  balanceEl.textContent = `₹${Math.abs(balance).toFixed(2)}`;
  balanceEl.style.color =
    balance > 0 ? "#dc3545" : balance < 0 ? "#28a745" : "#bc6c25";

  // Update reports
  updateReports();

  alert("Transaction added successfully!");
}

function deleteTransaction(transactionId) {
  if (!confirm("Are you sure you want to delete this transaction?")) {
    return;
  }

  const { transactions } = loadLedgerData();
  const updatedTransactions = transactions.filter(
    (t) => t.id !== transactionId,
  );
  saveTransactions(updatedTransactions);

  // Reload transaction list
  loadTransactionList(currentCustomerId);

  // Update balance
  const balance = getCustomerBalance(currentCustomerId);
  const balanceEl = document.getElementById("detailCustomerBalance");
  balanceEl.textContent = `₹${Math.abs(balance).toFixed(2)}`;
  balanceEl.style.color =
    balance > 0 ? "#dc3545" : balance < 0 ? "#28a745" : "#bc6c25";

  // Update reports
  updateReports();

  alert("Transaction deleted successfully!");
}

// Transaction sort order
let transactionSortOrder = "oldest"; // Default: oldest first

function loadTransactionList(customerId) {
  const { transactions } = loadLedgerData();
  const customerTransactions = transactions.filter(
    (t) => t.customerId === customerId,
  );

  const tbody = document.getElementById("transactionTableBody");
  const tfoot = document.getElementById("transactionTableFooter");

  if (customerTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No transactions yet
        </td>
      </tr>
    `;
    tfoot.style.display = "none";
    return;
  }

  // Sort by date and ID for consistent ordering
  const sortedTransactions = [...customerTransactions].sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.id - b.id; // Same date: sort by ID (creation order)
  });

  // Apply user's sort preference
  if (transactionSortOrder === "newest") {
    sortedTransactions.reverse();
  }

  let runningBalance = 0;
  let totalCredit = 0;
  let totalDebit = 0;

  // Calculate running balance in chronological order
  const chronologicalOrder = [...customerTransactions].sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.id - b.id;
  });

  const transactionsWithBalance = sortedTransactions.map((txn) => {
    // Find position in chronological order
    const chronoIndex = chronologicalOrder.findIndex((t) => t.id === txn.id);
    let balance = 0;

    // Calculate balance up to this transaction
    for (let i = 0; i <= chronoIndex; i++) {
      const t = chronologicalOrder[i];
      if (t.type === "credit") {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
    }

    // Track totals
    if (txn.type === "credit") {
      totalCredit += txn.amount;
    } else {
      totalDebit += txn.amount;
    }

    return { ...txn, balance };
  });

  tbody.innerHTML = transactionsWithBalance
    .map((txn) => {
      const creditAmount =
        txn.type === "credit" ? `₹${txn.amount.toFixed(2)}` : "-";
      const debitAmount =
        txn.type === "debit" ? `₹${txn.amount.toFixed(2)}` : "-";
      const balanceClass =
        txn.balance > 0 ? "text-danger" : txn.balance < 0 ? "text-success" : "";

      // Format date
      const dateObj = new Date(txn.date);
      const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return `
      <tr>
        <td>${formattedDate}</td>
        <td>${txn.description}</td>
        <td class="text-danger" style="font-weight: bold;">${creditAmount}</td>
        <td class="text-success" style="font-weight: bold;">${debitAmount}</td>
        <td class="${balanceClass}" style="font-weight: bold;">₹${Math.abs(txn.balance).toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");

  // Update footer
  const finalBalance = totalCredit - totalDebit;
  const finalBalanceClass =
    finalBalance > 0 ? "text-danger" : finalBalance < 0 ? "text-success" : "";

  document.getElementById("footerTotalCredit").textContent =
    `₹${totalCredit.toFixed(2)}`;
  document.getElementById("footerTotalDebit").textContent =
    `₹${totalDebit.toFixed(2)}`;
  document.getElementById("footerTotalBalance").textContent =
    `₹${Math.abs(finalBalance).toFixed(2)}`;
  document.getElementById("footerTotalBalance").className = finalBalanceClass;

  tfoot.style.display = "";
}

// Toggle transaction order
function toggleTransactionOrder() {
  if (transactionSortOrder === "oldest") {
    transactionSortOrder = "newest";
    document.getElementById("transactionSortText").textContent = "Newest First";
  } else {
    transactionSortOrder = "oldest";
    document.getElementById("transactionSortText").textContent = "Oldest First";
  }
  loadTransactionList(currentCustomerId);
}

// ==========================================
// BALANCE CALCULATION
// ==========================================
function getCustomerBalance(customerId) {
  const { transactions } = loadLedgerData();
  const customerTransactions = transactions.filter(
    (t) => t.customerId === customerId,
  );

  const balance = customerTransactions.reduce((acc, txn) => {
    if (txn.type === "credit") {
      return acc + txn.amount;
    } else if (txn.type === "debit") {
      return acc - txn.amount;
    }
    return acc;
  }, 0);

  return balance;
}

// ==========================================
// REPORTS & ANALYTICS
// ==========================================
function updateReports() {
  const { customers, transactions } = loadLedgerData();

  let totalCredit = 0;
  let totalDebit = 0;

  transactions.forEach((txn) => {
    if (txn.type === "credit") {
      totalCredit += txn.amount;
    } else if (txn.type === "debit") {
      totalDebit += txn.amount;
    }
  });

  const totalPending = totalCredit - totalDebit;

  document.getElementById("totalCredit").textContent =
    `₹${totalCredit.toFixed(2)}`;
  document.getElementById("totalDebit").textContent =
    `₹${totalDebit.toFixed(2)}`;
  document.getElementById("totalPending").textContent =
    `₹${Math.abs(totalPending).toFixed(2)}`;

  // Enable/disable reset button based on balance
  const resetBtn = document.getElementById("resetReportsBtn");
  if (resetBtn) {
    if (totalPending === 0 && (totalCredit !== 0 || totalDebit !== 0)) {
      resetBtn.disabled = false;
      resetBtn.style.opacity = "1";
    } else {
      resetBtn.disabled = true;
      resetBtn.style.opacity = "0.5";
    }
  }
}

// Reset reports summary
function resetReports() {
  const { customers, transactions } = loadLedgerData();

  let totalCredit = 0;
  let totalDebit = 0;

  transactions.forEach((txn) => {
    if (txn.type === "credit") {
      totalCredit += txn.amount;
    } else if (txn.type === "debit") {
      totalDebit += txn.amount;
    }
  });

  const totalPending = totalCredit - totalDebit;

  // Check if balance is exactly 0
  if (totalPending !== 0) {
    alert("Reset is only available when total pending balance is 0!");
    return;
  }

  // Check if there's any data to reset
  if (totalCredit === 0 && totalDebit === 0) {
    alert("No data to reset!");
    return;
  }

  // Confirmation dialog
  const confirmReset = confirm(
    `Are you sure you want to reset the summary reports?\n\n` +
      `This will clear:\n` +
      `- Total Credit: ₹${totalCredit.toFixed(2)}\n` +
      `- Total Debit: ₹${totalDebit.toFixed(2)}\n\n` +
      `This action cannot be undone!`,
  );

  if (!confirmReset) {
    return;
  }

  // Clear transactions
  saveTransactions([]);

  // Update reports display
  document.getElementById("totalCredit").textContent = "₹0.00";
  document.getElementById("totalDebit").textContent = "₹0.00";
  document.getElementById("totalPending").textContent = "₹0.00";

  // Disable reset button
  const resetBtn = document.getElementById("resetReportsBtn");
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.style.opacity = "0.5";
  }

  // Refresh customer list (all balances will be 0)
  loadCustomerList();

  // If viewing a customer, reload their view
  if (currentCustomerId) {
    viewCustomer(currentCustomerId);
  }

  alert("Reports have been reset successfully!");
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

// Export all customers to Excel (CSV)
function exportAllCustomersCSV() {
  const { customers } = loadLedgerData();

  if (customers.length === 0) {
    alert("No customers to export!");
    return;
  }

  const data = customers.map((customer) => {
    const balance = getCustomerBalance(customer.id);
    return {
      Name: customer.name,
      Phone: customer.phone || "-",
      Balance: balance.toFixed(2),
      Notes: customer.notes || "-",
    };
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");

  // Download
  const date = new Date().toLocaleDateString("en-IN").replace(/\//g, "_");
  XLSX.writeFile(wb, `Customer_Ledger_All_Customers_${date}.xlsx`);

  alert("Customer list exported successfully!");
}

// Export customer ledger to PDF
function exportCustomerPDF() {
  if (!currentCustomerId) return;

  const { customers, transactions } = loadLedgerData();
  const customer = customers.find((c) => c.id === currentCustomerId);
  const customerTransactions = transactions
    .filter((t) => t.customerId === currentCustomerId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (customerTransactions.length === 0) {
    alert("No transactions to export!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header - CUSTOMER LEDGER Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("CUSTOMER LEDGER", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(12, 25, 198, 25);

  // Customer Info Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Customer Name (left)
  doc.text("Customer: " + customer.name, 15, 32);

  // Phone (right)
  if (customer.phone) {
    doc.text("Phone: " + customer.phone, 195, 32, { align: "right" });
  }

  // Current Balance
  const balance = getCustomerBalance(currentCustomerId);
  const balanceStatus = balance >= 0 ? "(Customer Owes)" : "(Advance Paid)";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(
    balance >= 0 ? 220 : 40,
    balance >= 0 ? 53 : 167,
    balance >= 0 ? 69 : 69,
  );
  doc.text(
    "Current Balance: Rs. " +
      Math.abs(balance).toFixed(2) +
      " " +
      balanceStatus,
    15,
    38,
  );

  // Table
  let runningBalance = 0;
  const tableData = customerTransactions.map((txn) => {
    if (txn.type === "credit") {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }

    const dateObj = new Date(txn.date);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return [
      formattedDate,
      txn.description,
      txn.type === "credit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      txn.type === "debit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      "Rs. " + Math.abs(runningBalance).toFixed(2),
    ];
  });

  // Calculate totals
  let totalCredit = 0;
  let totalDebit = 0;
  customerTransactions.forEach((txn) => {
    if (txn.type === "credit") totalCredit += txn.amount;
    else totalDebit += txn.amount;
  });

  doc.autoTable({
    startY: 44,
    head: [
      ["Date", "Description", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"],
    ],
    body: tableData,
    foot: [
      [
        "",
        "Total:",
        "Rs. " + totalCredit.toFixed(2),
        "Rs. " + totalDebit.toFixed(2),
        "Rs. " + Math.abs(balance).toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    footStyles: {
      fillColor: [245, 235, 224],
      textColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 44, bottom: 30 },
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add page border
      doc.setDrawColor(221, 161, 94);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Add footer with page number
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      const pageCount = doc.internal.getNumberOfPages();
      const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
      doc.text("Thank you for your business!", 105, 285, { align: "center" });
      doc.text("Page " + pageCurrent + " of " + pageCount, 195, 285, {
        align: "right",
      });
    },
  });

  // Save
  const sanitizedName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const dateStr = day + "_" + month + "_" + year;
  doc.save("Customer_Ledger_" + sanitizedName + "_" + dateStr + ".pdf");

  alert("Ledger exported to PDF successfully!");
}

// View Statement (all transactions)
function viewStatement() {
  printLedger();
}

// Toggle date range statement picker
function toggleDateRangeStatement() {
  const picker = document.getElementById("dateRangeStatement");
  if (picker.style.display === "none") {
    picker.style.display = "block";
  } else {
    picker.style.display = "none";
  }
}

// View statement by date range
function viewStatementByDateRange() {
  if (!currentCustomerId) return;

  const startDate = document.getElementById("statementStartDate").value;
  const endDate = document.getElementById("statementEndDate").value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates!");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date must be before end date!");
    return;
  }

  const { customers, transactions } = loadLedgerData();
  const customer = customers.find((c) => c.id === currentCustomerId);
  const customerTransactions = transactions
    .filter((t) => {
      if (t.customerId !== currentCustomerId) return false;
      const txnDate = new Date(t.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return txnDate >= start && txnDate <= end;
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id - b.id;
    });

  if (customerTransactions.length === 0) {
    alert("No transactions found in the selected date range!");
    return;
  }

  // Calculate balance at start date (before range)
  const transactionsBeforeRange = transactions
    .filter((t) => {
      if (t.customerId !== currentCustomerId) return false;
      return new Date(t.date) < new Date(startDate);
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id - b.id;
    });

  let openingBalance = 0;
  transactionsBeforeRange.forEach((txn) => {
    if (txn.type === "credit") {
      openingBalance += txn.amount;
    } else {
      openingBalance -= txn.amount;
    }
  });

  // Calculate totals and rows
  let totalCredit = 0;
  let totalDebit = 0;
  let runningBalance = openingBalance;

  const rows = customerTransactions
    .map((txn) => {
      if (txn.type === "credit") {
        runningBalance += txn.amount;
        totalCredit += txn.amount;
      } else {
        runningBalance -= txn.amount;
        totalDebit += txn.amount;
      }

      const dateObj = new Date(txn.date);
      const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return `
      <tr>
        <td style="text-align: center;">${formattedDate}</td>
        <td>${txn.description}</td>
        <td style="text-align: right;">${txn.type === "credit" ? `Rs. ${txn.amount.toFixed(2)}` : "-"}</td>
        <td style="text-align: right;">${txn.type === "debit" ? `Rs. ${txn.amount.toFixed(2)}` : "-"}</td>
        <td style="text-align: right;">Rs. ${Math.abs(runningBalance).toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");

  const closingBalance = runningBalance;
  const closingBalanceStatus =
    closingBalance >= 0 ? "(Customer Owes)" : "(Advance Paid)";
  const closingBalanceColor = closingBalance >= 0 ? "#dc3545" : "#28a745";

  const startFormatted = new Date(startDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const endFormatted = new Date(endDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Create print window
  const printWindow = window.open("", "_blank", "width=900,height=700");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Statement - ${customer.name} (${startFormatted} to ${endFormatted})</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            margin: 10px;
            padding: 0;
            background: white;
            border: 4px solid #dda15e;
            min-height: calc(100vh - 20px);
          }
          .page-container {
            max-width: 100%;
            margin: 0;
            padding: 30px;
            position: relative;
            min-height: calc(100vh - 100px);
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #bc6c25;
          }
          .header h1 {
            color: #bc6c25;
            font-size: 28px;
            font-weight: bold;
          }
          .customer-info {
            margin: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #666;
          }
          .customer-info .left { text-align: left; }
          .customer-info .right { text-align: right; }
          .date-range {
            font-size: 13px;
            color: #666;
            margin: 10px 0;
            font-style: italic;
          }
          .balance-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 13px;
            font-weight: bold;
          }
          .balance-row .opening { color: #666; }
          .balance-row .closing { color: ${closingBalanceColor}; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 12px;
          }
          th {
            background-color: #bc6c25;
            color: white;
            padding: 10px 8px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #999;
          }
          th:first-child,
          td:first-child {
            text-align: center;
          }
          th:nth-child(3),
          th:nth-child(4),
          th:nth-child(5),
          td:nth-child(3),
          td:nth-child(4),
          td:nth-child(5) {
            text-align: right;
          }
          td {
            padding: 8px;
            border: 1px solid #ddd;
            background: white;
          }
          tfoot td {
            background: #f5ebe0;
            font-weight: bold;
            color: #bc6c25;
            padding: 10px 8px;
            border: 1px solid #999;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #dda15e;
            color: #808080;
            font-style: italic;
            font-size: 12px;
            position: absolute;
            bottom: 50px;
            left: 30px;
            right: 30px;
          }
          .page-number {
            text-align: right;
            color: #808080;
            font-size: 12px;
            position: absolute;
            bottom: 30px;
            right: 30px;
          }
          .button-container {
            text-align: center;
            margin-top: 20px;
            margin-bottom: 80px;
          }
          button {
            padding: 12px 24px;
            margin: 0 5px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          }
          .btn-print {
            background-color: #bc6c25;
            color: white;
          }
          .btn-print:hover {
            background-color: #a85a1f;
          }
          .btn-close {
            background-color: #6c757d;
            color: white;
          }
          .btn-close:hover {
            background-color: #5a6268;
          }
          @media print {
            body { margin: 10px; border: 4px solid #dda15e; }
            .page-container { padding: 20px; }
            .button-container { display: none; }
            .footer { bottom: 30px; }
            .page-number { bottom: 10px; }
          }
        </style>
      </head>
      <body>
        <div class=\"page-container\">
          <div class=\"header\">
            <h1>CUSTOMER LEDGER</h1>
          </div>
          
          <div class="customer-info">
            <div class="left">Customer: ${customer.name}</div>
            <div class="right">${customer.phone ? "Phone: " + customer.phone : ""}</div>
          </div>
          
          <div class="date-range">Period: ${startFormatted} to ${endFormatted}</div>
          
          <div class="balance-row">
            <div class="opening">Opening Balance: Rs. ${Math.abs(openingBalance).toFixed(2)}</div>
            <div class="closing">Closing Balance: Rs. ${Math.abs(closingBalance).toFixed(2)} ${closingBalanceStatus}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit (Rs.)</th>
                <th>Credit (Rs.)</th>
                <th>Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan=\"2\" style=\"text-align: right;\">Total:</td>
                <td style=\"text-align: right;\">Rs. ${totalCredit.toFixed(2)}</td>
                <td style=\"text-align: right;\">Rs. ${totalDebit.toFixed(2)}</td>
                <td style=\"text-align: right;\">Rs. ${Math.abs(closingBalance).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class=\"footer\">
            <p>Thank you for your business!</p>
          </div>
          <div class=\"page-number\">Page 1 of 1</div>

          <div class=\"button-container\">
            <button class=\"btn-print\" onclick=\"window.print()\">\ud83d\udda8\ufe0f Print</button>
            <button class=\"btn-close\" onclick=\"window.close()\">\u2716\ufe0f Close</button>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
}

// View statement by date range (using jsPDF like export)
function viewStatementByDateRange() {
  if (!currentCustomerId) return;

  const startDate = document.getElementById("statementStartDate").value;
  const endDate = document.getElementById("statementEndDate").value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates!");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date must be before end date!");
    return;
  }

  const { customers, transactions } = loadLedgerData();
  const customer = customers.find((c) => c.id === currentCustomerId);
  const customerTransactions = transactions
    .filter((t) => {
      if (t.customerId !== currentCustomerId) return false;
      const txnDate = new Date(t.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return txnDate >= start && txnDate <= end;
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id - b.id;
    });

  if (customerTransactions.length === 0) {
    alert("No transactions found in the selected date range!");
    return;
  }

  // Calculate balance at start date (before range)
  const transactionsBeforeRange = transactions
    .filter((t) => {
      if (t.customerId !== currentCustomerId) return false;
      return new Date(t.date) < new Date(startDate);
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.id - b.id;
    });

  let openingBalance = 0;
  transactionsBeforeRange.forEach((txn) => {
    if (txn.type === "credit") {
      openingBalance += txn.amount;
    } else {
      openingBalance -= txn.amount;
    }
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header - CUSTOMER LEDGER Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("CUSTOMER LEDGER", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(12, 25, 198, 25);

  // Customer Info Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Customer Name (left)
  doc.text("Customer: " + customer.name, 15, 32);

  // Phone (right)
  if (customer.phone) {
    doc.text("Phone: " + customer.phone, 195, 32, { align: "right" });
  }

  // Date Range
  const startFormatted = new Date(startDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const endFormatted = new Date(endDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.setFont("helvetica", "italic");
  doc.text("Period: " + startFormatted + " to " + endFormatted, 15, 38);

  // Opening and Closing Balance
  let totalCredit = 0;
  let totalDebit = 0;
  let runningBalance = openingBalance;

  customerTransactions.forEach((txn) => {
    if (txn.type === "credit") {
      runningBalance += txn.amount;
      totalCredit += txn.amount;
    } else {
      runningBalance -= txn.amount;
      totalDebit += txn.amount;
    }
  });

  const closingBalance = runningBalance;
  const closingBalanceStatus =
    closingBalance >= 0 ? "(Customer Owes)" : "(Advance Paid)";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(
    "Opening Balance: Rs. " + Math.abs(openingBalance).toFixed(2),
    15,
    44,
  );

  doc.setTextColor(
    closingBalance >= 0 ? 220 : 40,
    closingBalance >= 0 ? 53 : 167,
    closingBalance >= 0 ? 69 : 69,
  );
  doc.text(
    "Closing Balance: Rs. " +
      Math.abs(closingBalance).toFixed(2) +
      " " +
      closingBalanceStatus,
    195,
    44,
    { align: "right" },
  );

  // Table
  runningBalance = openingBalance;
  const tableData = customerTransactions.map((txn) => {
    if (txn.type === "credit") {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }

    const dateObj = new Date(txn.date);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return [
      formattedDate,
      txn.description,
      txn.type === "credit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      txn.type === "debit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      "Rs. " + Math.abs(runningBalance).toFixed(2),
    ];
  });

  doc.autoTable({
    startY: 50,
    head: [
      ["Date", "Description", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"],
    ],
    body: tableData,
    foot: [
      [
        "",
        "Total:",
        "Rs. " + totalCredit.toFixed(2),
        "Rs. " + totalDebit.toFixed(2),
        "Rs. " + Math.abs(closingBalance).toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    footStyles: {
      fillColor: [245, 235, 224],
      textColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 50, bottom: 30 },
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add page border
      doc.setDrawColor(221, 161, 94);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Add footer with page number
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      const pageCount = doc.internal.getNumberOfPages();
      const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
      doc.text("Thank you for your business!", 105, 285, { align: "center" });
      doc.text("Page " + pageCurrent + " of " + pageCount, 195, 285, {
        align: "right",
      });
    },
  });

  // Open PDF in new window
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}

// View Statement (calls printLedger)
function viewStatement() {
  printLedger();
}

// Print ledger (using jsPDF like export)
function printLedger() {
  if (!currentCustomerId) return;

  const { customers, transactions } = loadLedgerData();
  const customer = customers.find((c) => c.id === currentCustomerId);
  const customerTransactions = transactions
    .filter((t) => t.customerId === currentCustomerId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (customerTransactions.length === 0) {
    alert("No transactions to print!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header - CUSTOMER LEDGER Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("CUSTOMER LEDGER", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(12, 25, 198, 25);

  // Customer Info Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Customer Name (left)
  doc.text("Customer: " + customer.name, 15, 32);

  // Phone (right)
  if (customer.phone) {
    doc.text("Phone: " + customer.phone, 195, 32, { align: "right" });
  }

  // Current Balance
  const balance = getCustomerBalance(currentCustomerId);
  const balanceStatus = balance >= 0 ? "(Customer Owes)" : "(Advance Paid)";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(
    balance >= 0 ? 220 : 40,
    balance >= 0 ? 53 : 167,
    balance >= 0 ? 69 : 69,
  );
  doc.text(
    "Current Balance: Rs. " +
      Math.abs(balance).toFixed(2) +
      " " +
      balanceStatus,
    15,
    38,
  );

  // Table
  let runningBalance = 0;
  const tableData = customerTransactions.map((txn) => {
    if (txn.type === "credit") {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }

    const dateObj = new Date(txn.date);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return [
      formattedDate,
      txn.description,
      txn.type === "credit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      txn.type === "debit" ? "Rs. " + txn.amount.toFixed(2) : "-",
      "Rs. " + Math.abs(runningBalance).toFixed(2),
    ];
  });

  // Calculate totals
  let totalCredit = 0;
  let totalDebit = 0;
  customerTransactions.forEach((txn) => {
    if (txn.type === "credit") totalCredit += txn.amount;
    else totalDebit += txn.amount;
  });

  doc.autoTable({
    startY: 44,
    head: [
      ["Date", "Description", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"],
    ],
    body: tableData,
    foot: [
      [
        "",
        "Total:",
        "Rs. " + totalCredit.toFixed(2),
        "Rs. " + totalDebit.toFixed(2),
        "Rs. " + Math.abs(balance).toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    footStyles: {
      fillColor: [245, 235, 224],
      textColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 44, bottom: 30 },
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add page border
      doc.setDrawColor(221, 161, 94);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Add footer with page number
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      const pageCount = doc.internal.getNumberOfPages();
      const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
      doc.text("Thank you for your business!", 105, 285, { align: "center" });
      doc.text("Page " + pageCurrent + " of " + pageCount, 195, 285, {
        align: "right",
      });
    },
  });

  // Open PDF in new window
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
}

// ==========================================
// CLEAR DATA
// ==========================================
function clearAllLedgerData() {
  if (
    !confirm(
      "⚠️ WARNING: This will permanently delete ALL customers and transactions. Are you sure?",
    )
  ) {
    return;
  }

  if (
    !confirm(
      "This is your FINAL confirmation. All data will be lost forever. Continue?",
    )
  ) {
    return;
  }

  localStorage.removeItem(CUSTOMERS_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);

  loadCustomerList();
  updateReports();

  alert("All Customer Ledger data has been cleared!");
}
