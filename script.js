let items = [];
let itemCounter = 1;
let savedInvoices = JSON.parse(localStorage.getItem("savedInvoices") || "[]");
let invoiceNumberCounter = parseInt(
  localStorage.getItem("invoiceNumberCounter") || "1000000000",
);
let currentInvoicePDF = null;
let currentInvoiceData = null;
let currentPage = 1;
const itemsPerPage = 5;
let sortOrder = "newest"; // Default sort order

// Load saved invoices on page load
window.addEventListener("load", function () {
  // Set today's date as default for invoice date
  const today = new Date().toISOString().split("T")[0];
  const invoiceDateInput = document.getElementById("invoiceDate");
  if (invoiceDateInput) {
    invoiceDateInput.value = today;
  }

  displaySavedInvoices();
});

// Add item to the list
document.getElementById("itemForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const description = document.getElementById("itemDescription").value;
  const quantity = parseFloat(document.getElementById("quantity").value);
  const mrp = parseFloat(document.getElementById("mrp").value);
  const discount = parseFloat(document.getElementById("discount").value);

  // Calculate net amount (percentage discount only)
  let netAmount = mrp - (mrp * discount) / 100;

  // Ensure net amount is not negative
  if (netAmount < 0) netAmount = 0;

  // Calculate total
  const total = netAmount * quantity;

  // Add item to array
  const item = {
    sno: itemCounter++,
    description: description,
    quantity: quantity,
    mrp: mrp.toFixed(2),
    net: netAmount.toFixed(2),
    total: total.toFixed(2),
  };

  items.push(item);
  updateTable();
  updateTotal();
  updateButtonStates();

  // Reset form
  this.reset();
  document.getElementById("quantity").value = 1;
  document.getElementById("discount").value = 0;
});

// DEV: Add 20 test items for testing pagination
// ***DEVELOPMENT FEATURE***
/*
function addTestItems() {
  const testItems = [
    "Engine Oil (1 Litre)",
    "Oil Filter",
    "Air Filter",
    "Fuel Filter",
    "Spark Plug",
    "Brake Pad Set (Front)",
    "Brake Fluid",
    "Coolant (1 Litre)",
    "Battery (12V)",
    "Headlight Bulb",
    "Wiper Blade",
    "Clutch Cable",
    "Accelerator Cable",
    "Timing Belt",
    "Wheel Alignment",
    "Wheel Balancing",
    "Power Steering Oil",
    "Tyre Valve",
    "Horn",
    "Dashboard Polish",
  ];

  testItems.forEach((itemName, index) => {
    const mrp = Math.floor(Math.random() * 2000) + 100; // Random MRP between 100-2100
    const discount = Math.floor(Math.random() * 20); // Random discount 0-20%
    const quantity = Math.floor(Math.random() * 5) + 1; // Random qty 1-5
    const netAmount = mrp - (mrp * discount) / 100;
    const total = netAmount * quantity;

    items.push({
      sno: itemCounter++,
      description: itemName,
      quantity: quantity,
      mrp: mrp.toFixed(2),
      net: netAmount.toFixed(2),
      total: total.toFixed(2),
    });
  });

  updateTable();
  updateTotal();
  updateButtonStates();
  alert("Added 20 test items!");
}
*/

// Helper function to create PDF table with pagination
function createPDFTableWithPagination(
  doc,
  tableData,
  invoiceNumber,
  customerName,
  invoiceDate,
) {
  doc.autoTable({
    startY: 38,
    head: [["S.No", "Item Description", "Qty", "MRP", "Net", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    styles: {
      fontSize: 9,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 38, bottom: 55 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add border on every page
      doc.setDrawColor(188, 108, 37);
      doc.setLineWidth(0.5);
      doc.rect(7, 7, 196, 283);

      // Add header on every page
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(188, 108, 37);
        doc.text("ESTIMATE", 105, 20, { align: "center" });

        doc.setDrawColor(188, 108, 37);
        doc.setLineWidth(0.5);
        doc.line(12, 25, 198, 25);

        // Invoice info - Customer Name (left), Date (right)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Customer Name: ${customerName}`, 15, 32);
        doc.text(`Date: ${invoiceDate}`, 195, 32, { align: "right" });
      }

      // Add page number at bottom with more space from border
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`,
        105,
        283,
        { align: "center" },
      );
    },
  });
}

// Update items table
function updateTable() {
  const tbody = document.getElementById("itemsTableBody");

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">No items added yet</td></tr>';
    updateButtonStates();
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
          <tr>
              <td>${item.sno}</td>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>₹${item.mrp}</td>
              <td>₹${item.net}</td>
              <td>₹${item.total}</td>
              <td>
                  <button class="btn btn-danger btn-sm" onclick="removeItem(${item.sno})">🗑️</button>
              </td>
          </tr>
      `,
    )
    .join("");
  updateButtonStates();
}

// Remove item
function removeItem(sno) {
  items = items.filter((item) => item.sno !== sno);
  updateTable();
  updateTotal();
  updateButtonStates();
}

// Update total amount
function updateTotal() {
  const total = items.reduce((sum, item) => sum + parseFloat(item.total), 0);
  document.getElementById("totalBillAmount").textContent = total.toFixed(2);
}

// Clear all items
function clearAll() {
  if (items.length === 0) {
    alert("No items to clear!");
    return;
  }

  if (confirm("Are you sure you want to clear all items?")) {
    items = [];
    itemCounter = 1;
    currentInvoicePDF = null;
    currentInvoiceData = null;
    document.getElementById("downloadBtn").disabled = true;
    updateTable();
    updateTotal();
    updateButtonStates();
  }
}

// Generate Invoice (without downloading)
function generateInvoice() {
  if (items.length === 0) {
    alert("Please add at least one item to generate invoice!");
    return;
  }

  // Get customer name
  const customerName = document.getElementById("customerName").value.trim();
  if (!customerName) {
    alert("Please enter customer name!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Generate invoice number first
  const now = new Date();
  const invoiceNumber = Math.floor(
    1000000000 + Math.random() * 9000000000,
  ).toString();

  // Format date and time
  const date = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Header - ESTIMATE Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("ESTIMATE", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(12, 25, 198, 25);

  // Invoice Info Section - Single line: Customer Name (left), Date (right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  // Left: Customer Name
  doc.text(`Customer Name: ${customerName}`, 15, 32);

  // Right: Date
  doc.text(`Date: ${date}`, 195, 32, { align: "right" });

  // Table data
  const tableData = items.map((item) => [
    item.sno,
    item.description,
    item.quantity,
    "Rs. " + item.mrp,
    "Rs. " + item.net,
    "Rs. " + item.total,
  ]);

  // Add table with helvetica font and pagination
  doc.autoTable({
    startY: 38,
    head: [["S.No", "Item Description", "Qty", "MRP", "Net", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    styles: {
      fontSize: 9,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 38, bottom: 55 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add border on every page
      doc.setDrawColor(188, 108, 37);
      doc.setLineWidth(0.5);
      doc.rect(7, 7, 196, 283);

      // Add header on every page
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(188, 108, 37);
        doc.text("ESTIMATE", 105, 20, { align: "center" });

        doc.setDrawColor(188, 108, 37);
        doc.setLineWidth(0.5);
        doc.line(12, 25, 198, 25);

        // Add invoice info on continued pages - Customer Name (left), Date (right)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Customer Name: ${customerName}`, 15, 32);
        doc.text(`Date: ${date}`, 195, 32, { align: "right" });
      }

      // Add page number at bottom with more space from border
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`,
        105,
        283,
        { align: "center" },
      );
    },
  });

  // Add total section with background
  const finalY = doc.lastAutoTable.finalY + 8;

  // Draw total box
  doc.setFillColor(245, 235, 224);
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, finalY, 180, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(188, 108, 37);
  const totalAmount = document.getElementById("totalBillAmount").textContent;
  doc.text("Total Amount:", 19, finalY + 9);
  doc.text(`Rs. ${totalAmount}`, 191, finalY + 9, { align: "right" });

  // Add footer with decorative line
  doc.setDrawColor(221, 161, 94);
  doc.setLineWidth(0.3);
  doc.line(15, finalY + 22, 195, finalY + 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", 105, finalY + 28, {
    align: "center",
  });

  // Note: Page border is added by didDrawPage callback in autoTable

  // Get selected invoice date for filename
  const selectedDate = document.getElementById("invoiceDate").value;
  let fileDay, fileMonth, fileYear;

  if (selectedDate) {
    const invoiceDate = new Date(selectedDate + "T00:00:00");
    fileDay = String(invoiceDate.getDate()).padStart(2, "0");
    fileMonth = String(invoiceDate.getMonth() + 1).padStart(2, "0");
    fileYear = invoiceDate.getFullYear();
  } else {
    // Fallback to current date if not selected
    fileDay = String(now.getDate()).padStart(2, "0");
    fileMonth = String(now.getMonth() + 1).padStart(2, "0");
    fileYear = now.getFullYear();
  }
  const dateStr = `${fileDay}_${fileMonth}_${fileYear}`;

  // Sanitize customer name for filename (remove special characters)
  const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${sanitizedName}_${dateStr}.pdf`;

  // Save invoice data to localStorage
  const invoiceData = {
    id: Date.now(),
    invoiceNumber: invoiceNumber,
    customerName: customerName,
    filename: filename,
    date: now.toLocaleDateString("en-IN"),
    time: now.toLocaleTimeString("en-IN"),
    totalAmount: totalAmount,
    itemCount: items.length,
    items: [...items], // Copy of items array
    pdfData: doc.output("datauristring"), // Save PDF data
  };

  savedInvoices.unshift(invoiceData); // Add to beginning of array
  localStorage.setItem("savedInvoices", JSON.stringify(savedInvoices));
  currentPage = 1; // Reset to first page
  displaySavedInvoices();

  // Store current PDF and data for download
  currentInvoicePDF = doc;
  currentInvoiceData = invoiceData;

  // Enable download button
  document.getElementById("downloadBtn").disabled = false;
  updateButtonStates();

  alert(`Invoice generated successfully! Click 'Download PDF' to save it.`);
}

// Update button states based on app state
function updateButtonStates() {
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const takeNewOrderBtn = document.getElementById("takeNewOrderBtn");

  // Initial state: all inactive
  if (items.length === 0) {
    generateBtn.disabled = true;
    clearAllBtn.disabled = true;
    downloadBtn.disabled = true;
    takeNewOrderBtn.disabled = false;
    return;
  }

  // Items added, but invoice not generated
  if (items.length > 0 && !currentInvoicePDF) {
    generateBtn.disabled = false;
    clearAllBtn.disabled = false;
    downloadBtn.disabled = true;
    takeNewOrderBtn.disabled = false;
    return;
  }

  // Invoice generated
  if (currentInvoicePDF) {
    generateBtn.disabled = true;
    clearAllBtn.disabled = true;
    downloadBtn.disabled = false;
    takeNewOrderBtn.disabled = false;
    return;
  }
}

// Call updateButtonStates on load
window.addEventListener("load", function () {
  updateButtonStates();
});

// Add Take New Order function
function takeNewOrder() {
  // If items exist and invoice is not generated, show confirmation
  if (items.length > 0 && !currentInvoicePDF) {
    if (
      !confirm(
        "You have unsaved changes. Are you sure you want to start a new order?",
      )
    ) {
      return;
    }
  }
  // Reset all states
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;
  updateTable();
  updateTotal();
  updateButtonStates();
  // Reset form fields
  document.getElementById("itemForm").reset();
  document.getElementById("quantity").value = 1;
  document.getElementById("discount").value = 0;
  document.getElementById("customerName").value = "";

  // Reset invoice date to today
  const today = new Date().toISOString().split("T")[0];
  const invoiceDateInput = document.getElementById("invoiceDate");
  if (invoiceDateInput) {
    invoiceDateInput.value = today;
  }
}

// Download current invoice
function downloadCurrentInvoice() {
  if (!currentInvoicePDF || !currentInvoiceData) {
    alert("Please generate an invoice first!");
    return;
  }

  currentInvoicePDF.save(currentInvoiceData.filename);
  alert(`Invoice downloaded: ${currentInvoiceData.filename}`);
}

// Toggle sort order with icon
function toggleSortOrder() {
  const sortText = document.getElementById("sortText");

  // Toggle sort order
  if (sortOrder === "newest") {
    sortOrder = "oldest";
    sortText.textContent = "Oldest First";
  } else {
    sortOrder = "newest";
    sortText.textContent = "Newest First";
  }

  // Sort and display
  savedInvoices.sort((a, b) => {
    const dateA = new Date(
      a.date.split("/").reverse().join("-") + " " + a.time,
    );
    const dateB = new Date(
      b.date.split("/").reverse().join("-") + " " + b.time,
    );

    if (sortOrder === "newest") {
      return dateB - dateA; // Newest first
    } else {
      return dateA - dateB; // Oldest first
    }
  });

  localStorage.setItem("savedInvoices", JSON.stringify(savedInvoices));
  currentPage = 1; // Reset to first page
  displaySavedInvoices();
}

// Display saved invoices
function displaySavedInvoices() {
  const container = document.getElementById("savedInvoicesList");

  if (savedInvoices.length === 0) {
    container.innerHTML =
      '<div class="no-invoices">No saved invoices found. Generate your first invoice!</div>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(savedInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = savedInvoices.slice(startIndex, endIndex);

  container.innerHTML = paginatedInvoices
    .map(
      (invoice) => `
    <div class="invoice-item" data-search="${invoice.filename} ${
      invoice.invoiceNumber || ""
    } ${invoice.customerName || ""} ${invoice.date} ${invoice.totalAmount}">
      <div class="invoice-filename">
        <ion-icon name="document-text-outline"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename}">${
            invoice.filename
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${invoice.customerName ? invoice.customerName + " | " : ""}${invoice.date} ${invoice.time}</div>
        </div>
      </div>
      <div class="invoice-actions">
        <button class="btn btn-download" onclick="downloadInvoice(${
          invoice.id
        })" title="Download Invoice">
          <ion-icon name="download-outline"></ion-icon>
        </button>
        <button class="btn btn-view" onclick="openInvoicePDF(${
          invoice.id
        })" title="View Invoice">
          <ion-icon name="eye-outline"></ion-icon>
        </button>
        <button class="btn btn-delete" onclick="deleteInvoice(${
          invoice.id
        })" title="Delete Invoice">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  // Add pagination controls
  const paginationHTML = `
    <div class="pagination">
      <button onclick="changePage(${currentPage - 1})" ${
        currentPage === 1 ? "disabled" : ""
      }>← Previous</button>
      <span>Page ${currentPage} of ${totalPages}</span>
      <button onclick="changePage(${currentPage + 1})" ${
        currentPage === totalPages ? "disabled" : ""
      }>Next →</button>
    </div>
  `;
  container.innerHTML += paginationHTML;
}

// Change page
function changePage(newPage) {
  const totalPages = Math.ceil(savedInvoices.length / itemsPerPage);
  if (newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  displaySavedInvoices();
}

// Search invoices
function searchInvoices() {
  const searchTerm = document
    .getElementById("invoiceSearch")
    .value.toLowerCase();

  if (searchTerm === "") {
    // Reset to first page when search is cleared
    currentPage = 1;
    displaySavedInvoices();
    return;
  }

  // Filter invoices based on search
  const container = document.getElementById("savedInvoicesList");
  const filteredInvoices = savedInvoices.filter((invoice) => {
    const searchData = `${invoice.filename} ${
      invoice.invoiceNumber || ""
    } ${invoice.customerName || ""} ${invoice.date} ${invoice.totalAmount}`.toLowerCase();
    return searchData.includes(searchTerm);
  });

  if (filteredInvoices.length === 0) {
    container.innerHTML =
      '<div class="no-invoices">No invoices match your search.</div>';
    return;
  }

  // Display filtered results without pagination
  container.innerHTML = filteredInvoices
    .map(
      (invoice) => `
    <div class="invoice-item" data-search="${invoice.filename} ${
      invoice.invoiceNumber || ""
    } ${invoice.customerName || ""} ${invoice.date} ${invoice.totalAmount}">
      <div class="invoice-filename">
        <ion-icon name="document-text-outline"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename}">${
            invoice.filename
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${invoice.customerName ? invoice.customerName + " | " : ""}${invoice.date} ${invoice.time}</div>
        </div>
      </div>
      <div class="invoice-actions">
        <button class="btn btn-download" onclick="downloadInvoice(${
          invoice.id
        })" title="Download Invoice">
          <ion-icon name="download-outline"></ion-icon>
        </button>
        <button class="btn btn-view" onclick="openInvoicePDF(${
          invoice.id
        })" title="View Invoice">
          <ion-icon name="eye-outline"></ion-icon>
        </button>
        <button class="btn btn-delete" onclick="deleteInvoice(${
          invoice.id
        })" title="Delete Invoice">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

// View invoice details
function viewInvoiceDetails(invoiceId) {
  const invoice = savedInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  let detailsHtml = `
    <strong>Invoice Details:</strong><br>
    <strong>Filename:</strong> ${invoice.filename}<br>
    <strong>Date:</strong> ${invoice.date} at ${invoice.time}<br>
    <strong>Total Amount:</strong> ₹${invoice.totalAmount}<br>
    <strong>Items:</strong><br><br>
  `;

  invoice.items.forEach((item) => {
    detailsHtml += `${item.sno}. ${item.description} - Qty: ${item.quantity}, MRP: ₹${item.mrp}, Net: ₹${item.net}, Total: ₹${item.total}<br>`;
  });

  // Create a modal-like alert
  const newWindow = window.open(
    "",
    "_blank",
    "width=600,height=400,scrollbars=yes",
  );
  newWindow.document.write(`
    <html>
      <head>
        <title>Invoice Details - ${invoice.filename}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { color: #bc6c25; border-bottom: 2px solid #bc6c25; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header"><h2>Invoice Details</h2></div>
        <div style="margin-top: 20px;">${detailsHtml}</div>
        <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background-color: #bc6c25; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
      </body>
    </html>
  `);
}

// Open invoice PDF in new tab
function openInvoicePDF(invoiceId) {
  const invoice = savedInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  if (invoice.pdfData) {
    // Open existing PDF data
    const newWindow = window.open();
    newWindow.document.write(`
      <html>
        <head>
          <title>${invoice.filename}</title>
          <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${invoice.pdfData}"></iframe>
        </body>
      </html>
    `);
  } else {
    // Regenerate PDF for older invoices without pdfData
    regenerateAndOpenInvoice(invoiceId);
  }
}

// Download invoice from saved list
function downloadInvoice(invoiceId) {
  const invoice = savedInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  if (invoice.pdfData) {
    // Download from saved PDF data
    const link = document.createElement("a");
    link.href = invoice.pdfData;
    link.download = invoice.filename;
    link.click();
  } else {
    // Regenerate and download for older invoices
    regenerateInvoice(invoiceId);
  }
}

// Regenerate and open invoice PDF
function regenerateAndOpenInvoice(invoiceId) {
  const invoice = savedInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header - ESTIMATE Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("ESTIMATE", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(15, 25, 195, 25);

  // Invoice Info Section - Three columns: Estimate No (left), Name (center), Date (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  // Left: Estimate No
  doc.text("Estimate No:", 18, 32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber || "N/A", 18, 37);

  // Center: Customer Name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Customer Name:", 105, 32, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.customerName || "N/A", 105, 37, { align: "center" });

  // Right: Date
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Date:", 192, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.date, 192, 37, { align: "right" });

  const tableData = invoice.items.map((item) => [
    item.sno,
    item.description,
    item.quantity,
    "Rs. " + item.mrp,
    "Rs. " + item.net,
    "Rs. " + item.total,
  ]);

  doc.autoTable({
    startY: 38,
    head: [["S.No", "Item Description", "Qty", "MRP", "Net", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    styles: {
      fontSize: 9,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, top: 38, bottom: 55 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    tableLineWidth: 0.1,
    didDrawPage: function (data) {
      // Add border on every page
      doc.setDrawColor(188, 108, 37);
      doc.setLineWidth(0.5);
      doc.rect(7, 7, 196, 283);

      // Add header on every page
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(188, 108, 37);
        doc.text("ESTIMATE", 105, 20, { align: "center" });

        doc.setDrawColor(188, 108, 37);
        doc.setLineWidth(0.5);
        doc.line(12, 25, 198, 25);

        // Add invoice info on continued pages - Customer Name (left), Date (right)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Customer Name: ${invoice.customerName || "N/A"}`, 15, 32);
        doc.text(`Date: ${invoice.date}`, 195, 32, { align: "right" });
      }

      // Add page number at bottom with more space from border
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`,
        105,
        283,
        { align: "center" },
      );
    },
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // Draw total box
  doc.setFillColor(245, 235, 224);
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, finalY, 180, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(188, 108, 37);
  doc.text("Total Amount:", 19, finalY + 9);
  doc.text(`Rs. ${invoice.totalAmount}`, 191, finalY + 9, { align: "right" });

  // Add footer with decorative line
  doc.setDrawColor(221, 161, 94);
  doc.setLineWidth(0.3);
  doc.line(15, finalY + 22, 195, finalY + 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", 105, finalY + 28, {
    align: "center",
  });

  // Open in new tab
  const pdfDataUri = doc.output("datauristring");
  const newWindow = window.open();
  newWindow.document.write(`
    <html>
      <head>
        <title>${invoice.filename}</title>
        <style>
          body { margin: 0; padding: 0; }
          iframe { width: 100%; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${pdfDataUri}"></iframe>
      </body>
    </html>
  `);
}

// Regenerate invoice PDF
function regenerateInvoice(invoiceId) {
  const invoice = savedInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  // Temporarily set items to the saved invoice items
  const originalItems = [...items];
  items = [...invoice.items];

  // Generate PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header - ESTIMATE Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(188, 108, 37);
  doc.text("ESTIMATE", 105, 20, { align: "center" });

  // Add decorative line under title
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.line(15, 25, 195, 25);

  // Invoice Info Section - Three columns: Estimate No (left), Name (center), Date (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  // Left: Estimate No
  doc.text("Estimate No:", 18, 32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber || "N/A", 18, 37);

  // Center: Customer Name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Customer Name:", 105, 32, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.customerName || "N/A", 105, 37, { align: "center" });

  // Right: Date
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Date:", 192, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.date, 192, 37, { align: "right" });

  const tableData = items.map((item) => [
    item.sno,
    item.description,
    item.quantity,
    "Rs. " + item.mrp,
    "Rs. " + item.net,
    "Rs. " + item.total,
  ]);

  doc.autoTable({
    startY: 38,
    head: [["S.No", "Item Description", "Qty", "MRP", "Net", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [188, 108, 37],
      fontSize: 10,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [255, 255, 255],
      halign: "center",
    },
    styles: {
      fontSize: 9,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // Draw total box
  doc.setFillColor(245, 235, 224);
  doc.setDrawColor(188, 108, 37);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, finalY, 180, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(188, 108, 37);
  doc.text("Total Amount:", 19, finalY + 9);
  doc.text(`Rs. ${invoice.totalAmount}`, 191, finalY + 9, { align: "right" });

  // Add footer with decorative line
  doc.setDrawColor(221, 161, 94);
  doc.setLineWidth(0.3);
  doc.line(15, finalY + 22, 195, finalY + 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", 105, finalY + 28, {
    align: "center",
  });

  doc.save(invoice.filename);

  // Restore original items
  items = originalItems;

  alert(`Invoice regenerated: ${invoice.filename}`);
}

// Delete invoice
function deleteInvoice(invoiceId) {
  if (
    confirm("Are you sure you want to delete this invoice from the saved list?")
  ) {
    savedInvoices = savedInvoices.filter((inv) => inv.id !== invoiceId);
    localStorage.setItem("savedInvoices", JSON.stringify(savedInvoices));
    displaySavedInvoices();
  }
}

// Clear all saved invoices
function clearAllInvoices() {
  if (savedInvoices.length === 0) {
    alert("No saved invoices to clear!");
    return;
  }

  if (
    confirm(
      "Are you sure you want to clear all saved invoices? This action cannot be undone.",
    )
  ) {
    savedInvoices = [];
    localStorage.setItem("savedInvoices", JSON.stringify(savedInvoices));
    displaySavedInvoices();
    document.getElementById("invoiceSearch").value = "";
  }
}

// Toggle date range picker visibility
function toggleDateRangePicker() {
  const picker = document.getElementById("dateRangePicker");
  if (picker.style.display === "none") {
    picker.style.display = "block";
  } else {
    picker.style.display = "none";
  }
}

// Download all invoices as ZIP
async function downloadAllInvoices() {
  if (savedInvoices.length === 0) {
    alert("No invoices to download!");
    return;
  }

  try {
    const zip = new JSZip();
    const invoiceFolder = zip.folder("invoices");

    // Add each invoice PDF to the zip
    savedInvoices.forEach((invoice) => {
      if (invoice.pdfData) {
        // Extract base64 data from data URI
        const base64Data = invoice.pdfData.split(",")[1];
        invoiceFolder.file(invoice.filename, base64Data, { base64: true });
      }
    });

    // Generate and download the zip file
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(content);
    link.href = url;
    link.download = `all_invoices_${new Date().toISOString().split("T")[0]}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    alert(`Successfully downloaded ${savedInvoices.length} invoices as ZIP!`);
  } catch (error) {
    console.error("Error creating zip:", error);
    alert("Failed to create ZIP file. Please try again.");
  }
}

// Download invoices by date range as ZIP
async function downloadInvoicesByDateRange() {
  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;

  if (!startDateInput || !endDateInput) {
    alert("Please select both start and end dates!");
    return;
  }

  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);

  // Normalize dates to midnight for proper date-only comparison
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999); // Set to end of day

  if (startDate > endDate) {
    alert("Start date must be before or equal to end date!");
    return;
  }

  // Filter invoices by date range
  const filteredInvoices = savedInvoices.filter((invoice) => {
    // Parse date from DD/MM/YYYY or D/M/YYYY format
    const dateParts = invoice.date.split("/");
    const invoiceDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    // Normalize invoice date to midnight for comparison
    invoiceDate.setHours(0, 0, 0, 0);

    return invoiceDate >= startDate && invoiceDate <= endDate;
  });

  if (filteredInvoices.length === 0) {
    alert("No invoices found in the selected date range!");
    return;
  }

  try {
    const zip = new JSZip();
    const invoiceFolder = zip.folder("invoices");

    // Add filtered invoices to zip
    filteredInvoices.forEach((invoice) => {
      if (invoice.pdfData) {
        const base64Data = invoice.pdfData.split(",")[1];
        invoiceFolder.file(invoice.filename, base64Data, { base64: true });
      }
    });

    // Generate and download the zip file
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(content);
    link.href = url;
    link.download = `invoices_${startDateInput}_to_${endDateInput}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    alert(
      `Successfully downloaded ${filteredInvoices.length} invoices from ${startDateInput} to ${endDateInput} as ZIP!`,
    );

    // Hide the date picker after successful download
    document.getElementById("dateRangePicker").style.display = "none";
  } catch (error) {
    console.error("Error creating zip:", error);
    alert("Failed to create ZIP file. Please try again.");
  }
}

// Remove ₹ and % from labels at <=365px, restore above
function updateLabelsForSmallScreens() {
  const mrpLabel = document.querySelector('label[for="mrp"]');
  const discountLabel = document.querySelector('label[for="discount"]');
  if (window.innerWidth <= 365) {
    if (mrpLabel && mrpLabel.textContent.includes("₹")) {
      mrpLabel.textContent = "MRP";
    }
    if (discountLabel && discountLabel.textContent.includes("%")) {
      discountLabel.textContent = "Discount";
    }
  } else {
    if (mrpLabel && !mrpLabel.textContent.includes("₹")) {
      mrpLabel.textContent = "MRP (₹)";
    }
    if (discountLabel && !discountLabel.textContent.includes("%")) {
      discountLabel.textContent = "Discount (%)";
    }
  }
}
window.addEventListener("resize", updateLabelsForSmallScreens);
window.addEventListener("DOMContentLoaded", updateLabelsForSmallScreens);
