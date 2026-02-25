let items = [];
let itemCounter = 1;
let savedInvoices = JSON.parse(localStorage.getItem("savedInvoices") || "[]");
let pendingInvoices = JSON.parse(localStorage.getItem("pendingInvoices") || "[]");
let invoiceNumberCounter = parseInt(
  localStorage.getItem("invoiceNumberCounter") || "1000000000",
);
let currentInvoicePDF = null;
let currentInvoiceData = null;
let currentPendingId = null; // Track if current invoice is from pending
let currentPage = 1;
let pendingCurrentPage = 1;
const itemsPerPage = 5;
let sortOrder = "newest"; // Default sort order
let pendingSortOrder = "newest"; // Default sort order for pending invoices
let invoiceMode = "now"; // "now" or "later"

// Load saved invoices on page load
window.addEventListener("load", function () {
  // Set today's date as default for invoice date
  const today = new Date().toISOString().split("T")[0];
  const invoiceDateInput = document.getElementById("invoiceDate");
  if (invoiceDateInput) {
    invoiceDateInput.value = today;
  }

  displaySavedInvoices();
  displayPendingInvoices();
  updateButtonStates();
});

// Set invoice mode (now or later)
function setInvoiceMode(mode) {
  invoiceMode = mode;
  
  // Update UI
  const nowBtn = document.getElementById("modeNowBtn");
  const laterBtn = document.getElementById("modeLaterBtn");
  const modeDescription = document.getElementById("modeDescription");
  const mainActionText = document.getElementById("mainActionText");
  
  // Update required attributes on form fields
  const itemDescription = document.getElementById("itemDescription");
  const quantity = document.getElementById("quantity");
  const mrp = document.getElementById("mrp");
  
  if (mode === "now") {
    nowBtn.classList.add("active");
    laterBtn.classList.remove("active");
    modeDescription.textContent = "Complete all fields and generate invoice immediately";
    mainActionText.innerHTML = "📄 Generate Invoice";
    
    // Make fields required
    if (itemDescription) itemDescription.required = true;
    if (quantity) quantity.required = true;
    if (mrp) mrp.required = true;
  } else {
    nowBtn.classList.remove("active");
    laterBtn.classList.add("active");
    modeDescription.textContent = "Save incomplete invoices to complete later";
    mainActionText.innerHTML = "💾 Save for Later";
    
    // Make fields optional
    if (itemDescription) itemDescription.required = false;
    if (quantity) quantity.required = false;
    if (mrp) mrp.required = false;
  }
  
  updateButtonStates();
}

// Main action handler (Generate Invoice or Save for Later)
function handleMainAction() {
  if (invoiceMode === "now") {
    generateInvoice();
  } else {
    saveForLater();
  }
}

// Add item to the list
document.getElementById("itemForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const description = document.getElementById("itemDescription").value.toUpperCase();
  const quantity = parseFloat(document.getElementById("quantity").value) || 0;
  const mrp = parseFloat(document.getElementById("mrp").value) || 0;
  const discount = parseFloat(document.getElementById("discount").value) || 0;

  // In "now" mode, validate fields
  if (invoiceMode === "now") {
    if (!description) {
      alert("Please enter item description!");
      return;
    }
    if (quantity <= 0) {
      alert("Please enter a valid quantity!");
      return;
    }
    if (mrp <= 0) {
      alert("Please enter a valid MRP!");
      return;
    }
  }

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
    discount: discount, // Store discount value
    net: netAmount.toFixed(2),
    total: total.toFixed(2),
  };

  items.push(item);
  updateTable();
  updateTotal();
  updateButtonStates();

  // Reset form
  this.reset();
});

// Convert item description to uppercase as user types
document.getElementById("itemDescription").addEventListener("input", function (e) {
  const start = this.selectionStart;
  const end = this.selectionEnd;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(start, end);
});

// Convert customer name to uppercase as user types
document.getElementById("customerName").addEventListener("input", function (e) {
  const start = this.selectionStart;
  const end = this.selectionEnd;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(start, end);
  updateButtonStates(); // Update button states when customer name changes
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
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
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
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
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
      '<tr><td colspan="8" class="text-center text-muted">No items added yet</td></tr>';
    updateButtonStates();
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => {
        // In "later" mode, show "-" for zero/empty values
        const displayQuantity = (invoiceMode === 'later' && (item.quantity === 0 || item.quantity === '0.00')) ? '-' : item.quantity;
        const displayMrp = (invoiceMode === 'later' && (parseFloat(item.mrp) === 0)) ? '-' : `₹${item.mrp}`;
        const displayNet = (invoiceMode === 'later' && (parseFloat(item.net) === 0)) ? '-' : `₹${item.net}`;
        const displayTotal = (invoiceMode === 'later' && (parseFloat(item.total) === 0)) ? '-' : `₹${item.total}`;
        
        return `
          <tr id="row-${item.sno}" data-sno="${item.sno}">
              <td>${item.sno}</td>
              <td class="editable-cell" data-field="description">
                  <span class="view-mode">${item.description || '-'}</span>
                  <input type="text" class="edit-mode form-control form-control-sm" value="${item.description}" style="display:none;">
              </td>
              <td class="editable-cell" data-field="quantity">
                  <span class="view-mode">${displayQuantity}</span>
                  <input type="number" class="edit-mode form-control form-control-sm" value="${item.quantity}" min="1" step="1" style="display:none;">
              </td>
              <td class="editable-cell" data-field="mrp">
                  <span class="view-mode">${displayMrp}</span>
                  <input type="number" class="edit-mode form-control form-control-sm" value="${item.mrp}" min="0" step="0.01" style="display:none;">
              </td>
              <td class="discount-column editable-cell" data-field="discount" style="display:none;">
                  <input type="number" class="edit-mode form-control form-control-sm" value="${item.discount !== undefined ? item.discount : 0}" min="0" max="100" step="0.01">
              </td>
              <td class="editable-cell" data-field="net">
                  <span class="view-mode">${displayNet}</span>
                  <input type="number" class="edit-mode form-control form-control-sm" value="${item.net}" min="0" step="0.01" style="display:none;" readonly>
              </td>
              <td>${displayTotal}</td>
              <td>
                  <button class="btn btn-warning btn-sm edit-btn" onclick="editItem(${item.sno})" title="Edit">✏️</button>
                  <button class="btn btn-success btn-sm save-btn" onclick="saveItem(${item.sno})" title="Save" style="display:none;">💾</button>
                  <button class="btn btn-secondary btn-sm cancel-btn" onclick="cancelEdit(${item.sno})" title="Cancel" style="display:none;">✖️</button>
                  <button class="btn btn-danger btn-sm delete-btn" onclick="removeItem(${item.sno})" title="Delete">🗑️</button>
              </td>
          </tr>
      `;
      },
    )
    .join("");
  updateButtonStates();
}

// Edit item - enable inline editing
function editItem(sno) {
  const row = document.getElementById(`row-${sno}`);
  if (!row) return;

  // Show discount column header
  const discountHeader = document.querySelector(".discount-column-header");
  if (discountHeader) discountHeader.style.display = "";

  // Show discount column in ALL rows to maintain alignment
  const allDiscountCells = document.querySelectorAll(".discount-column");
  allDiscountCells.forEach(cell => cell.style.display = "");

  // Switch to edit mode
  const viewSpans = row.querySelectorAll(".view-mode");
  const editInputs = row.querySelectorAll(".edit-mode");
  const editBtn = row.querySelector(".edit-btn");
  const saveBtn = row.querySelector(".save-btn");
  const cancelBtn = row.querySelector(".cancel-btn");
  const deleteBtn = row.querySelector(".delete-btn");

  viewSpans.forEach((span) => (span.style.display = "none"));
  editInputs.forEach((input) => {
    input.style.display = "block";
    // Give description input more width, others get 80px
    const cell = input.closest('.editable-cell');
    if (cell && cell.dataset.field === 'description') {
      input.style.width = "200px";
    } else {
      input.style.width = "80px";
    }
  });

  editBtn.style.display = "none";
  deleteBtn.style.display = "none";
  saveBtn.style.display = "inline-block";
  cancelBtn.style.display = "inline-block";
  
  // Ensure buttons stay horizontal (not vertically stacked)
  const actionsCell = row.querySelector('td:last-child');
  if (actionsCell) {
    actionsCell.style.whiteSpace = "nowrap";
  }

  // Get input elements
  const mrpInput = row.querySelector('[data-field="mrp"] .edit-mode');
  const discountInput = row.querySelector('[data-field="discount"] .edit-mode');
  const netInput = row.querySelector('[data-field="net"] .edit-mode');
  const quantityInput = row.querySelector('[data-field="quantity"] .edit-mode');

  // Remove any existing event listeners by cloning
  const newMrpInput = mrpInput.cloneNode(true);
  const newDiscountInput = discountInput.cloneNode(true);
  const newNetInput = netInput.cloneNode(true);
  const newQuantityInput = quantityInput.cloneNode(true);
  
  // Ensure they're visible and styled
  newMrpInput.style.display = "block";
  newMrpInput.style.width = "80px";
  newDiscountInput.style.display = "block";
  newDiscountInput.style.width = "80px";
  newNetInput.style.display = "block";
  newNetInput.style.width = "80px";
  newNetInput.readOnly = true; // Make net read-only as it's auto-calculated
  newNetInput.style.backgroundColor = "#f0f0f0"; // Visual indicator that it's read-only
  newQuantityInput.style.display = "block";
  newQuantityInput.style.width = "80px";
  
  mrpInput.replaceWith(newMrpInput);
  discountInput.replaceWith(newDiscountInput);
  netInput.replaceWith(newNetInput);
  quantityInput.replaceWith(newQuantityInput);

  // Function to recalculate net based on MRP and discount
  const recalculateNet = () => {
    const mrp = parseFloat(newMrpInput.value) || 0;
    const discount = parseFloat(newDiscountInput.value) || 0;
    const net = mrp - (mrp * discount / 100);
    newNetInput.value = net.toFixed(2);
    recalculateTotal();
  };

  // Function to recalculate total based on quantity and net
  const recalculateTotal = () => {
    const quantity = parseFloat(newQuantityInput.value) || 0;
    const net = parseFloat(newNetInput.value) || 0;
    const total = quantity * net;
    // Update the total cell directly
    const totalCell = row.querySelector('td:nth-last-child(2)');
    if (totalCell) totalCell.textContent = '₹' + total.toFixed(2);
  };

  // Add event listeners to the new elements
  newMrpInput.addEventListener('input', recalculateNet);
  newDiscountInput.addEventListener('input', recalculateNet);
  newQuantityInput.addEventListener('input', recalculateTotal);

  // Trigger initial calculation to ensure correct values are displayed
  recalculateNet();
}

// Save item - save inline edits
function saveItem(sno) {
  const row = document.getElementById(`row-${sno}`);
  if (!row) return;

  const item = items.find((item) => item.sno === sno);
  if (!item) return;

  // Get new values from inputs
  const descriptionInput = row.querySelector('[data-field="description"] .edit-mode');
  const quantityInput = row.querySelector('[data-field="quantity"] .edit-mode');
  const mrpInput = row.querySelector('[data-field="mrp"] .edit-mode');
  const discountInput = row.querySelector('[data-field="discount"] .edit-mode');
  const netInput = row.querySelector('[data-field="net"] .edit-mode');

  const description = descriptionInput.value.trim().toUpperCase();
  const quantity = parseFloat(quantityInput.value) || 0;
  const mrp = parseFloat(mrpInput.value) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const net = parseFloat(netInput.value) || 0;

  // Validate inputs only in "now" mode
  if (invoiceMode === "now") {
    if (!description) {
      alert("Item description cannot be empty!");
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      alert("Invalid quantity!");
      return;
    }

    if (isNaN(mrp) || mrp < 0) {
      alert("Invalid MRP!");
      return;
    }

    if (discount < 0 || discount > 100) {
      alert("Discount must be between 0 and 100!");
      return;
    }

    if (isNaN(net) || net < 0) {
      alert("Invalid Net amount!");
      return;
    }
  }
  
  // In "later" mode, allow any values including 0
  if (invoiceMode === "later") {
    // Just ensure discount is within range if provided
    if (discount < 0 || discount > 100) {
      alert("Discount must be between 0 and 100!");
      return;
    }
  }

  // Update item with new values
  item.description = description;
  item.quantity = quantity;
  item.mrp = mrp.toFixed(2);
  item.discount = discount;
  item.net = net.toFixed(2);
  item.total = (quantity * net).toFixed(2);

  // Hide discount column header and all discount cells
  const discountHeader = document.querySelector(".discount-column-header");
  if (discountHeader) discountHeader.style.display = "none";
  
  const allDiscountCells = document.querySelectorAll(".discount-column");
  allDiscountCells.forEach(cell => cell.style.display = "none");

  updateTable();
  updateTotal();
}

// Cancel edit - revert to view mode
function cancelEdit(sno) {
  const row = document.getElementById(`row-${sno}`);
  if (!row) return;

  // Hide discount column header and all discount cells
  const discountHeader = document.querySelector(".discount-column-header");
  if (discountHeader) discountHeader.style.display = "none";
  
  const allDiscountCells = document.querySelectorAll(".discount-column");
  allDiscountCells.forEach(cell => cell.style.display = "none");

  // Switch back to view mode without saving
  const viewSpans = row.querySelectorAll(".view-mode");
  const editInputs = row.querySelectorAll(".edit-mode");
  const editBtn = row.querySelector(".edit-btn");
  const saveBtn = row.querySelector(".save-btn");
  const cancelBtn = row.querySelector(".cancel-btn");
  const deleteBtn = row.querySelector(".delete-btn");

  viewSpans.forEach((span) => (span.style.display = "inline"));
  editInputs.forEach((input) => (input.style.display = "none"));

  editBtn.style.display = "inline-block";
  deleteBtn.style.display = "inline-block";
  saveBtn.style.display = "none";
  cancelBtn.style.display = "none";

  // Re-render the table to restore original values
  updateTable();
}

// Remove item
function removeItem(sno) {
  if (!confirm("Are you sure you want to delete this item?")) {
    return;
  }
  items = items.filter((item) => item.sno !== sno);
  updateTable();
  updateTotal();
  updateButtonStates();
}

// Update total amount
function updateTotal() {
  const total = items.reduce((sum, item) => sum + parseFloat(item.total), 0);
  // In "later" mode, show "-" if total is 0
  if (invoiceMode === 'later' && total === 0) {
    document.getElementById("totalBillAmount").textContent = "-";
  } else {
    document.getElementById("totalBillAmount").textContent = total.toFixed(2);
  }
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
  const customerName = document.getElementById("customerName").value.trim().toUpperCase();
  if (!customerName) {
    alert("Please enter customer name!");
    return;
  }

  // Validate all items have complete data
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Check description
    if (!item.description || item.description.trim() === "") {
      alert(`Item ${i + 1}: Description is required!`);
      return;
    }
    
    // Check quantity
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert(`Item ${i + 1} (${item.description}): Quantity must be greater than 0!`);
      return;
    }
    
    // Check MRP
    const mrp = parseFloat(item.mrp);
    if (isNaN(mrp) || mrp <= 0) {
      alert(`Item ${i + 1} (${item.description}): MRP must be greater than 0!`);
      return;
    }
    
    // Check Net
    const net = parseFloat(item.net);
    if (isNaN(net) || net < 0) {
      alert(`Item ${i + 1} (${item.description}): Net amount is invalid!`);
      return;
    }
  }

  // Recalculate total from all items' net values (in case of edits)
  updateTotal();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Generate invoice number first
  const now = new Date();
  const invoiceNumber = Math.floor(
    1000000000 + Math.random() * 9000000000,
  ).toString();

  // Format date as dd/mm/yyyy
  const selectedDate = document.getElementById("invoiceDate").value;
  let date;
  if (selectedDate) {
    const invoiceDate = new Date(selectedDate + "T00:00:00");
    const day = String(invoiceDate.getDate()).padStart(2, "0");
    const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
    const year = invoiceDate.getFullYear();
    date = `${day}/${month}/${year}`;
  } else {
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    date = `${day}/${month}/${year}`;
  }
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
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Left: Customer Name
  doc.text(`Customer Name: ${customerName}`, 15, 32);

  // Right: Date
  doc.text(`Date: ${date}`, 195, 32, { align: "right" });

  // Table data
  const tableData = items.map((item) => [
    item.sno,
    item.description.toUpperCase(),
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
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
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
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
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

  // Get selected invoice date for filename (reuse selectedDate from above)
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
    date: date, // Use the formatted date from the form, not the generation date
    time: now.toLocaleTimeString("en-IN"),
    generatedAt: now.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" }), // Current date and time when generated
    invoiceDate: selectedDate || now.toISOString().split("T")[0], // Save the form date in YYYY-MM-DD format
    totalAmount: totalAmount,
    itemCount: items.length,
    items: [...items], // Copy of items array
    pdfData: doc.output("datauristring"), // Save PDF data
  };

  savedInvoices.unshift(invoiceData); // Add to beginning of array
  localStorage.setItem("savedInvoices", JSON.stringify(savedInvoices));
  currentPage = 1; // Reset to first page
  displaySavedInvoices();

  // If this was from a pending invoice, remove it from pending list
  if (currentPendingId) {
    pendingInvoices = pendingInvoices.filter((inv) => inv.id !== currentPendingId);
    localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
    displayPendingInvoices();
    currentPendingId = null; // Clear the reference
  }

  // Store current PDF and data for download
  currentInvoicePDF = doc;
  currentInvoiceData = invoiceData;

  // Enable download button
  document.getElementById("downloadBtn").disabled = false;
  updateButtonStates();

  alert(`Invoice generated successfully! Click 'Download PDF' to save it.`);
}

// Save for Later (incomplete invoice)
function saveForLater() {
  // Allow saving with no items or incomplete data
  const customerName = document.getElementById("customerName").value.trim().toUpperCase();
  const selectedDate = document.getElementById("invoiceDate").value;
  
  const now = new Date();
  
  // Format date for display
  let date;
  if (selectedDate) {
    const invoiceDate = new Date(selectedDate + "T00:00:00");
    const day = String(invoiceDate.getDate()).padStart(2, "0");
    const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
    const year = invoiceDate.getFullYear();
    date = `${day}/${month}/${year}`;
  } else {
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    date = `${day}/${month}/${year}`;
  }
  
  // Calculate total
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2);
  
  // Create descriptive name for pending invoice
  let displayName = customerName || "Unnamed Customer";
  displayName = displayName.substring(0, 30); // Limit length
  const sanitizedName = displayName.replace(/[^a-zA-Z0-9]/g, "_") || "Unnamed";
  
  // Create filename with date like saved invoices
  let fileDay, fileMonth, fileYear;
  if (selectedDate) {
    const invoiceDate = new Date(selectedDate + "T00:00:00");
    fileDay = String(invoiceDate.getDate()).padStart(2, "0");
    fileMonth = String(invoiceDate.getMonth() + 1).padStart(2, "0");
    fileYear = invoiceDate.getFullYear();
  } else {
    fileDay = String(now.getDate()).padStart(2, "0");
    fileMonth = String(now.getMonth() + 1).padStart(2, "0");
    fileYear = now.getFullYear();
  }
  const dateStr = `${fileDay}_${fileMonth}_${fileYear}`;
  const filename = `${sanitizedName}_${dateStr}`;
  
  // Check if we're updating an existing pending invoice
  if (currentPendingId) {
    // Find and update the existing pending invoice
    const existingIndex = pendingInvoices.findIndex(inv => inv.id === currentPendingId);
    
    if (existingIndex !== -1) {
      // Update existing pending invoice
      pendingInvoices[existingIndex] = {
        id: currentPendingId, // Keep the same ID
        customerName: customerName,
        displayName: displayName,
        filename: filename,
        date: date,
        invoiceDate: selectedDate || now.toISOString().split("T")[0],
        savedAt: now.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" }),
        totalAmount: totalAmount,
        itemCount: items.length,
        items: [...items], // Copy of items array
      };
      
      localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
      displayPendingInvoices();
      
      alert(`Pending invoice updated!\n\nCustomer: ${displayName}\nItems: ${items.length}`);
    } else {
      // If not found (shouldn't happen), create new one
      createNewPendingInvoice(customerName, displayName, filename, date, selectedDate, now, totalAmount);
    }
  } else {
    // Create new pending invoice
    createNewPendingInvoice(customerName, displayName, filename, date, selectedDate, now, totalAmount);
  }
  
  // Clear the form for new entry without confirmation
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;
  currentPendingId = null;
  updateTable();
  updateTotal();
  updateButtonStates();
  document.getElementById("itemForm").reset();
  document.getElementById("customerName").value = "";
  
  // Keep invoice date
  // Stay in "later" mode
}

// Helper function to create new pending invoice
function createNewPendingInvoice(customerName, displayName, filename, date, selectedDate, now, totalAmount) {
  const pendingId = Date.now();
  
  const pendingData = {
    id: pendingId,
    customerName: customerName,
    displayName: displayName,
    filename: filename,
    date: date,
    invoiceDate: selectedDate || now.toISOString().split("T")[0],
    savedAt: now.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" }),
    totalAmount: totalAmount,
    itemCount: items.length,
    items: [...items], // Copy of items array
  };
  
  pendingInvoices.unshift(pendingData);
  localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
  pendingCurrentPage = 1;
  displayPendingInvoices();
  
  alert(`Pending invoice saved! You can complete it later.\n\nCustomer: ${displayName}\nItems: ${items.length}`);
}

// Helper function to check if all items are valid for invoice generation
function areAllItemsValid() {
  if (items.length === 0) return false;
  
  for (let item of items) {
    // Check description
    if (!item.description || item.description.trim() === "") {
      return false;
    }
    
    // Check quantity
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      return false;
    }
    
    // Check MRP
    const mrp = parseFloat(item.mrp);
    if (isNaN(mrp) || mrp <= 0) {
      return false;
    }
    
    // Check Net
    const net = parseFloat(item.net);
    if (isNaN(net) || net < 0) {
      return false;
    }
  }
  
  return true;
}

// Update button states based on app state
function updateButtonStates() {
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const takeNewOrderBtn = document.getElementById("takeNewOrderBtn");

  // In "later" mode, allow saving even with no items
  if (invoiceMode === "later") {
    generateBtn.disabled = false; // Always allow "Save for Later"
    clearAllBtn.disabled = items.length === 0;
    downloadBtn.disabled = true;
    takeNewOrderBtn.disabled = false;
    return;
  }

  // In "now" mode (original behavior)
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
    // Check if all items are valid and customer name is filled before enabling generate button
    const customerName = document.getElementById("customerName").value.trim();
    generateBtn.disabled = !areAllItemsValid() || !customerName;
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
  
  // Show custom modal to choose mode
  showNewOrderModeModal();
}

// Show custom modal for new order mode selection
function showNewOrderModeModal() {
  const modal = document.createElement('div');
  modal.id = 'newOrderModeModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  `;

  modalContent.innerHTML = `
    <div style="background: linear-gradient(135deg, #606c38, #283618); padding: 25px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 24px;">🆕 New Order</h2>
    </div>
    
    <div style="padding: 30px; text-align: center;">
      <p style="font-size: 16px; color: #333; margin-bottom: 25px; font-weight: 500;">Choose invoice mode for new order:</p>
      
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
        <button id="newOrderNowButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #606c38;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          ⚡ Invoice Now<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">All fields required</span>
        </button>
        
        <button id="newOrderLaterButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #dda15e;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          🕒 Invoice Later<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">Flexible editing</span>
        </button>
      </div>
      
      <button id="cancelNewOrderButton" style="
        margin-top: 20px;
        padding: 10px 30px;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        Cancel
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add hover effects
  const nowBtn = document.getElementById('newOrderNowButton');
  const laterBtn = document.getElementById('newOrderLaterButton');
  const cancelBtn = document.getElementById('cancelNewOrderButton');

  nowBtn.addEventListener('mouseenter', () => nowBtn.style.transform = 'translateY(-2px)');
  nowBtn.addEventListener('mouseleave', () => nowBtn.style.transform = 'translateY(0)');
  laterBtn.addEventListener('mouseenter', () => laterBtn.style.transform = 'translateY(-2px)');
  laterBtn.addEventListener('mouseleave', () => laterBtn.style.transform = 'translateY(0)');
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.backgroundColor = '#5a6268');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.backgroundColor = '#6c757d');

  // Button click handlers
  nowBtn.addEventListener('click', () => {
    modal.remove();
    completeNewOrder('now');
  });

  laterBtn.addEventListener('click', () => {
    modal.remove();
    completeNewOrder('later');
  });

  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Complete new order with selected mode
function completeNewOrder(mode) {
  // Reset all states
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;
  currentPendingId = null;
  updateTable();
  updateTotal();
  updateButtonStates();
  // Reset form fields
  document.getElementById("itemForm").reset();
  document.getElementById("customerName").value = "";

  // Set chosen mode
  setInvoiceMode(mode);

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

// Helper function to convert text to title case (capitalize first letter of each word)
function toTitleCase(text) {
  if (!text) return text;
  return text.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
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
    } ${invoice.customerName || ""} ${invoice.date} ${invoice.totalAmount}" onclick="openInvoicePDF(${invoice.id})" style="cursor: pointer;">
      <div class="invoice-filename">
        <ion-icon name="document-text-outline"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename}">${
            invoice.filename
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${invoice.customerName ? toTitleCase(invoice.customerName) + " | " : ""} ${invoice.generatedAt || (invoice.date + " " + invoice.time)}</div>
        </div>
      </div>
      <div class="invoice-actions" onclick="event.stopPropagation()">
        <button class="btn btn-edit" onclick="loadSavedInvoice(${
          invoice.id
        })" title="Load for Editing">
          <ion-icon name="create-outline"></ion-icon>
        </button>
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
    } ${invoice.customerName || ""} ${invoice.date} ${invoice.totalAmount}" onclick="openInvoicePDF(${invoice.id})" style="cursor: pointer;">
      <div class="invoice-filename">
        <ion-icon name="document-text-outline"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename}">${
            invoice.filename
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${invoice.customerName ? toTitleCase(invoice.customerName) + " | " : ""} ${invoice.generatedAt || (invoice.date + " " + invoice.time)}</div>
        </div>
      </div>
      <div class="invoice-actions" onclick="event.stopPropagation()">
        <button class="btn btn-edit" onclick="loadInvoiceForEditing(${
          invoice.id
        })" title="Load for Editing">
          <ion-icon name="create-outline"></ion-icon>
        </button>
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
    <strong>Invoice Date:</strong> ${invoice.date}<br>
    <strong>Generated At:</strong> ${invoice.generatedAt || (invoice.date + " at " + invoice.time)}<br>
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
    // Convert data URI to blob for better mobile support
    const base64 = invoice.pdfData.split(',')[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([array], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Open in new tab with filename in title
    const newWindow = window.open('', '_blank');
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
          <iframe src="${blobUrl}"></iframe>
        </body>
      </html>
    `);
    newWindow.document.close();
    
    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } else {
    // Regenerate PDF for older invoices without pdfData
    regenerateAndOpenInvoice(invoiceId);
  }
}

// Load saved invoice with mode selection
function loadSavedInvoice(id) {
  const invoice = savedInvoices.find((inv) => inv.id === id);
  if (!invoice) {
    alert("Saved invoice not found!");
    return;
  }

  // Show custom modal to choose mode
  showSavedInvoiceModeSelectionModal(invoice);
}

// Show custom modal for mode selection (saved invoices)
function showSavedInvoiceModeSelectionModal(invoice) {
  const modal = document.createElement('div');
  modal.id = 'savedModeSelectionModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  `;

  modalContent.innerHTML = `
    <div style="background: linear-gradient(135deg, #606c38, #283618); padding: 25px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 24px;">📄 Load Saved Invoice</h2>
    </div>
    
    <div style="padding: 30px; text-align: center;">
      <div style="background: #f5ebe0; padding: 20px; border-radius: 10px; margin-bottom: 25px; text-align: left;">
        <p style="margin: 8px 0; font-size: 15px;"><strong>Customer:</strong> ${invoice.customerName || "Unnamed"}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Items:</strong> ${invoice.items?.length || 0}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Total:</strong> ${parseFloat(invoice.totalAmount) === 0 ? '-' : '₹' + invoice.totalAmount}</p>
      </div>
      
      <p style="font-size: 16px; color: #333; margin-bottom: 25px; font-weight: 500;">Choose how you want to load this invoice:</p>
      
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
        <button id="savedModeNowButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #606c38;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          ⚡ Invoice Now<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">All fields required</span>
        </button>
        
        <button id="savedModeLaterButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #dda15e;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          🕒 Invoice Later<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">Flexible editing</span>
        </button>
      </div>
      
      <button id="savedCancelModalButton" style="
        margin-top: 20px;
        padding: 10px 30px;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        Cancel
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add hover effects
  const nowBtn = document.getElementById('savedModeNowButton');
  const laterBtn = document.getElementById('savedModeLaterButton');
  const cancelBtn = document.getElementById('savedCancelModalButton');

  nowBtn.addEventListener('mouseenter', () => nowBtn.style.transform = 'translateY(-2px)');
  nowBtn.addEventListener('mouseleave', () => nowBtn.style.transform = 'translateY(0)');
  laterBtn.addEventListener('mouseenter', () => laterBtn.style.transform = 'translateY(-2px)');
  laterBtn.addEventListener('mouseleave', () => laterBtn.style.transform = 'translateY(0)');
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.backgroundColor = '#5a6268');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.backgroundColor = '#6c757d');

  // Button click handlers
  nowBtn.addEventListener('click', () => {
    modal.remove();
    loadSavedInvoiceWithMode(invoice, 'now');
  });

  laterBtn.addEventListener('click', () => {
    modal.remove();
    loadSavedInvoiceWithMode(invoice, 'later');
  });

  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Load saved invoice with selected mode
function loadSavedInvoiceWithMode(invoice, mode) {
  // Clear current items and reset PDF state
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;
  currentPendingId = null; // Clear pending ID since this is a saved invoice

  // Set mode
  setInvoiceMode(mode);

  // Set customer name and date
  document.getElementById("customerName").value = invoice.customerName || "";
  // Use invoiceDate (YYYY-MM-DD format) if available, otherwise extract from filename
  if (invoice.invoiceDate) {
    document.getElementById("invoiceDate").value = invoice.invoiceDate;
  } else {
    // Fallback for old invoices: extract date from filename (format: Name_DD_MM_YYYY.pdf)
    const filenameMatch = invoice.filename.match(
      /_(\d{2})_(\d{2})_(\d{4})\.pdf$/,
    );
    if (filenameMatch) {
      const [, day, month, year] = filenameMatch;
      document.getElementById("invoiceDate").value = `${year}-${month}-${day}`;
    } else if (invoice.date) {
      // Last resort: try to parse the display date
      const dateParts = invoice.date.split("/");
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        document.getElementById("invoiceDate").value =
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
  }

  // Load invoice items
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item) => {
      // Calculate MRP and net from the saved data
      const mrp = parseFloat(item.mrp || 0);
      const net = parseFloat(item.net || 0);
      const quantity = parseFloat(item.quantity || 1);
      const total = parseFloat(item.total || 0);
      const discount = parseFloat(item.discount !== undefined ? item.discount : 0);

      items.push({
        sno: itemCounter++,
        description: item.description,
        quantity: quantity,
        mrp: mrp.toFixed(2),
        discount: discount,
        net: net.toFixed(2),
        total: total.toFixed(2),
      });
    });
  }

  // Update the table and total
  updateTable();
  updateTotal();
  updateButtonStates();

  // Scroll to top to show the form
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Load invoice data for editing (old function - kept for backwards compatibility)
function loadInvoiceForEditing(id) {
  const invoice = savedInvoices.find((inv) => inv.id === id);
  if (!invoice) {
    alert("Invoice not found!");
    return;
  }

  // Clear current items and reset PDF state
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;

  // Set customer name and date
  document.getElementById("customerName").value = invoice.customerName || "";
  // Use invoiceDate (YYYY-MM-DD format) if available, otherwise extract from filename
  if (invoice.invoiceDate) {
    document.getElementById("invoiceDate").value = invoice.invoiceDate;
  } else {
    // Fallback for old invoices: extract date from filename (format: Name_DD_MM_YYYY.pdf)
    const filenameMatch = invoice.filename.match(
      /_(\d{2})_(\d{2})_(\d{4})\.pdf$/,
    );
    if (filenameMatch) {
      const [, day, month, year] = filenameMatch;
      document.getElementById("invoiceDate").value = `${year}-${month}-${day}`;
    } else if (invoice.date) {
      // Last resort: try to parse the display date
      const dateParts = invoice.date.split("/");
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        document.getElementById("invoiceDate").value =
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
  }

  // Load invoice items
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item) => {
      // Calculate MRP and net from the saved data
      const mrp = parseFloat(item.mrp || 0);
      const net = parseFloat(item.net || 0);
      const quantity = parseFloat(item.quantity || 1);
      const total = parseFloat(item.total || 0);
      const discount = parseFloat(item.discount !== undefined ? item.discount : 0);

      items.push({
        sno: itemCounter++,
        description: item.description,
        quantity: quantity,
        mrp: mrp.toFixed(2),
        discount: discount,
        net: net.toFixed(2),
        total: total.toFixed(2),
      });
    });
  }

  // Update the table and total
  updateTable();
  updateTotal();
  updateButtonStates();

  // Scroll to top to show the form
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Get the loaded date value from the date picker and format as DD/MM/YYYY
  const loadedDate = document.getElementById("invoiceDate").value;
  let formattedDate = "N/A";
  if (loadedDate) {
    const dateObj = new Date(loadedDate + "T00:00:00");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  }

  // Show a confirmation message
  alert(
    `Invoice loaded for editing!\n\nCustomer: ${invoice.customerName || "N/A"}\nDate: ${formattedDate}\nItems: ${items.length}\n\nYou can now modify the details and save it as a new invoice.`,
  );
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
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Left: Estimate No
  doc.text("Estimate No:", 18, 32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber || "N/A", 18, 37);

  // Center: Customer Name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Customer Name:", 105, 32, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.customerName || "N/A", 105, 37, { align: "center" });

  // Right: Date
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Date:", 192, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.date, 192, 37, { align: "right" });

  const tableData = invoice.items.map((item) => [
    item.sno,
    item.description.toUpperCase(),
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
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
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
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
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
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  // Left: Estimate No
  doc.text("Estimate No:", 18, 32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber || "N/A", 18, 37);

  // Center: Customer Name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Customer Name:", 105, 32, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.customerName || "N/A", 105, 37, { align: "center" });

  // Right: Date
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Date:", 192, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.date, 192, 37, { align: "right" });

  const tableData = items.map((item) => [
    item.sno,
    item.description.toUpperCase(),
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
      fontSize: 10,
      font: "helvetica",
      fontStyle: "normal",
      cellPadding: 3,
      textColor: [50, 50, 50],
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

// ===== PENDING INVOICES FUNCTIONS =====

// Display pending invoices
function displayPendingInvoices() {
  const container = document.getElementById("pendingInvoicesList");

  if (pendingInvoices.length === 0) {
    container.innerHTML =
      '<div class="no-invoices">No pending invoices found.</div>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(pendingInvoices.length / itemsPerPage);
  const startIndex = (pendingCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = pendingInvoices.slice(startIndex, endIndex);

  container.innerHTML = paginatedInvoices
    .map(
      (invoice) => `
    <div class="invoice-item pending-item" data-search="${invoice.filename || invoice.displayName || ""} ${invoice.customerName || ""} ${invoice.date}" onclick="viewPendingInvoice(${invoice.id})" style="cursor: pointer;">
      <div class="invoice-filename">
        <ion-icon name="time-outline" style="color: #dda15e;"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename || invoice.displayName || "Unnamed"}">${
            invoice.filename || invoice.displayName || "Unnamed Customer"
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
            ${invoice.customerName ? toTitleCase(invoice.customerName) + " | " : ""}
            ${invoice.savedAt} | Items: ${invoice.itemCount}
          </div>
        </div>
      </div>
      <div class="invoice-actions" onclick="event.stopPropagation()">
        <button class="btn btn-edit" onclick="loadPendingInvoice(${
          invoice.id
        })" title="Load for Editing">
          <ion-icon name="create-outline"></ion-icon>
        </button>
        <button class="btn btn-view" onclick="viewPendingInvoice(${
          invoice.id
        })" title="View Invoice">
          <ion-icon name="eye-outline"></ion-icon>
        </button>
        <button class="btn btn-delete" onclick="deletePendingInvoice(${
          invoice.id
        })" title="Delete">
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
      <button onclick="changePendingPage(${pendingCurrentPage - 1})" ${
        pendingCurrentPage === 1 ? "disabled" : ""
      }>← Previous</button>
      <span>Page ${pendingCurrentPage} of ${totalPages}</span>
      <button onclick="changePendingPage(${pendingCurrentPage + 1})" ${
        pendingCurrentPage === totalPages ? "disabled" : ""
      }>Next →</button>
    </div>
  `;
  container.innerHTML += paginationHTML;
}

// Change pending page
function changePendingPage(newPage) {
  const totalPages = Math.ceil(pendingInvoices.length / itemsPerPage);
  if (newPage < 1 || newPage > totalPages) return;
  pendingCurrentPage = newPage;
  displayPendingInvoices();
}

// Search pending invoices
function searchPendingInvoices() {
  const searchTerm = document
    .getElementById("pendingInvoiceSearch")
    .value.toLowerCase();

  if (searchTerm === "") {
    pendingCurrentPage = 1;
    displayPendingInvoices();
    return;
  }

  const container = document.getElementById("pendingInvoicesList");
  const filteredInvoices = pendingInvoices.filter((invoice) => {
    const searchData = `${invoice.displayName || ""} ${
      invoice.customerName || ""
    } ${invoice.date}`.toLowerCase();
    return searchData.includes(searchTerm);
  });

  if (filteredInvoices.length === 0) {
    container.innerHTML =
      '<div class="no-invoices">No pending invoices match your search.</div>';
    return;
  }

  container.innerHTML = filteredInvoices
    .map(
      (invoice) => `
    <div class="invoice-item pending-item" data-search="${invoice.filename || invoice.displayName || ""} ${invoice.customerName || ""} ${invoice.date}" onclick="viewPendingInvoice(${invoice.id})" style="cursor: pointer;">
      <div class="invoice-filename">
        <ion-icon name="time-outline" style="color: #dda15e;"></ion-icon>
        <div>
          <span class="filename-text" title="${invoice.filename || invoice.displayName || "Unnamed"}">${
            invoice.filename || invoice.displayName || "Unnamed Customer"
          }</span>
          <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
            ${invoice.customerName ? toTitleCase(invoice.customerName) + " | " : ""}
            Saved: ${invoice.savedAt} | Items: ${invoice.itemCount} | Total: ₹${invoice.totalAmount}
          </div>
        </div>
      </div>
      <div class="invoice-actions" onclick="event.stopPropagation()">
        <button class="btn btn-edit" onclick="loadPendingInvoice(${
          invoice.id
        })" title="Load for Editing">
          <ion-icon name="create-outline"></ion-icon>
        </button>
        <button class="btn btn-view" onclick="viewPendingInvoice(${
          invoice.id
        })" title="View Invoice">
          <ion-icon name="eye-outline"></ion-icon>
        </button>
        <button class="btn btn-delete" onclick="deletePendingInvoice(${
          invoice.id
        })" title="Delete">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

// Toggle pending sort order
function togglePendingSortOrder() {
  const sortText = document.getElementById("pendingSortText");

  if (pendingSortOrder === "newest") {
    pendingSortOrder = "oldest";
    sortText.textContent = "Oldest First";
  } else {
    pendingSortOrder = "newest";
    sortText.textContent = "Newest First";
  }

  pendingInvoices.sort((a, b) => {
    // Parse savedAt which is in format "DD/MM/YY, HH:MM:SS am/pm"
    // Example: "25/02/26, 11:42:03 am"
    const parseDateTime = (savedAt) => {
      const parts = savedAt.split(", ");
      const datePart = parts[0]; // "25/02/26"
      const timePart = parts[1]; // "11:42:03 am"
      
      // Convert DD/MM/YY to YYYY-MM-DD
      const dateParts = datePart.split("/");
      const day = dateParts[0];
      const month = dateParts[1];
      const year = "20" + dateParts[2]; // Add 20 to convert YY to YYYY
      
      return new Date(year + "-" + month + "-" + day + " " + timePart);
    };
    
    const dateA = parseDateTime(a.savedAt);
    const dateB = parseDateTime(b.savedAt);

    if (pendingSortOrder === "newest") {
      return dateB - dateA; // Newest first
    } else {
      return dateA - dateB; // Oldest first
    }
  });

  localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
  pendingCurrentPage = 1; // Reset to first page
  displayPendingInvoices();
}

// View pending invoice in modal
function viewPendingInvoice(id) {
  const invoice = pendingInvoices.find((inv) => inv.id === id);
  if (!invoice) {
    alert("Pending invoice not found!");
    return;
  }

  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'pendingInvoiceModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    overflow: auto;
    padding: 20px;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 15px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    position: relative;
    display: flex;
    flex-direction: column;
  `;

  // Build items table HTML
  let itemsTableHtml = '';
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      const displayQty = (parseFloat(item.quantity) === 0) ? '-' : item.quantity;
      const displayMrp = (parseFloat(item.mrp) === 0) ? '-' : `₹${parseFloat(item.mrp).toFixed(2)}`;
      const displayNet = (parseFloat(item.net) === 0) ? '-' : `₹${parseFloat(item.net).toFixed(2)}`;
      const displayTotal = (parseFloat(item.total) === 0) ? '-' : `₹${parseFloat(item.total).toFixed(2)}`;
      const bgColor = index % 2 === 0 ? '#fefefe' : '#f9f9f9';
      
      itemsTableHtml += `
        <tr style="background-color: ${bgColor};">
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; font-weight: 500;">${item.sno}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 500; color: #333;">${item.description || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${displayQty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${displayMrp}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${displayNet}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #606c38;">${displayTotal}</td>
        </tr>
      `;
    });
  } else {
    itemsTableHtml = `
      <tr>
        <td colspan="6" style="padding: 30px; text-align: center; color: #999; font-style: italic;">No items added yet</td>
      </tr>
    `;
  }

  modalContent.innerHTML = `
    <div style="background: linear-gradient(135deg, #dda15e, #bc6c25); padding: 25px 30px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">📋 Pending Invoice Details</h2>
    </div>
    
    <div style="flex: 1; overflow-y: auto; padding: 30px;">
      <div style="background: linear-gradient(135deg, #f5ebe0, #fdf8f3); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #dda15e; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div style="padding: 8px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Filename</div>
            <div style="font-size: 15px; font-weight: 600; color: #333;">${invoice.filename || invoice.displayName || "Unnamed"}</div>
          </div>
          <div style="padding: 8px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Customer</div>
            <div style="font-size: 15px; font-weight: 600; color: #333;">${invoice.customerName || "Not specified"}</div>
          </div>
          <div style="padding: 8px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Date</div>
            <div style="font-size: 15px; font-weight: 600; color: #333;">${invoice.date}</div>
          </div>
          <div style="padding: 8px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Saved At</div>
            <div style="font-size: 15px; font-weight: 600; color: #333;">${invoice.savedAt}</div>
          </div>
          <div style="padding: 8px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Total Amount</div>
            <div style="font-size: 18px; font-weight: 700; color: #606c38;">₹${invoice.totalAmount}</div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <h3 style="color: #bc6c25; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <span style="background: #dda15e; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">${invoice.itemCount}</span>
          Items
        </h3>
      </div>
      
      <div style="overflow-x: auto; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background: linear-gradient(135deg, #606c38, #283618);">
              <th style="padding: 14px 12px; text-align: center; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">S.No</th>
              <th style="padding: 14px 12px; text-align: left; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
              <th style="padding: 14px 12px; text-align: center; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
              <th style="padding: 14px 12px; text-align: right; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">MRP</th>
              <th style="padding: 14px 12px; text-align: right; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Net</th>
              <th style="padding: 14px 12px; text-align: right; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableHtml}
          </tbody>
        </table>
      </div>
    </div>
    
    <div style="padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
      <button id="closePendingModalBtn" style="padding: 12px 40px; background: linear-gradient(135deg, #bc6c25, #9d5a1f); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease;">
        Close
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add button hover effect
  const closeBtn = document.getElementById('closePendingModalBtn');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.transform = 'translateY(-2px)';
    closeBtn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.transform = 'translateY(0)';
    closeBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  });

  // Close button handler
  closeBtn.addEventListener('click', () => {
    closeModal('pendingInvoiceModal');
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal('pendingInvoiceModal');
    }
  });
}

// Close modal helper function
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

// Load pending invoice
function loadPendingInvoice(id) {
  const invoice = pendingInvoices.find((inv) => inv.id === id);
  if (!invoice) {
    alert("Pending invoice not found!");
    return;
  }

  // Show custom modal to choose mode
  showModeSelectionModal(invoice, id);
}

// Show custom modal for mode selection
function showModeSelectionModal(invoice, pendingId) {
  const modal = document.createElement('div');
  modal.id = 'modeSelectionModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  `;

  modalContent.innerHTML = `
    <div style="background: linear-gradient(135deg, #606c38, #283618); padding: 25px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 24px;">📋 Load Pending Invoice</h2>
    </div>
    
    <div style="padding: 30px; text-align: center;">
      <div style="background: #f5ebe0; padding: 20px; border-radius: 10px; margin-bottom: 25px; text-align: left;">
        <p style="margin: 8px 0; font-size: 15px;"><strong>Customer:</strong> ${invoice.customerName || "Unnamed"}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Items:</strong> ${invoice.itemCount}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Total:</strong> ${parseFloat(invoice.totalAmount) === 0 ? '-' : '₹' + invoice.totalAmount}</p>
      </div>
      
      <p style="font-size: 16px; color: #333; margin-bottom: 25px; font-weight: 500;">Choose how you want to load this invoice:</p>
      
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
        <button id="modeNowButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #606c38;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          ⚡ Invoice Now<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">All fields required</span>
        </button>
        
        <button id="modeLaterButton" style="
          flex: 1;
          min-width: 180px;
          padding: 15px 25px;
          background-color: #dda15e;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          🕒 Invoice Later<br>
          <span style="font-size: 12px; font-weight: normal; opacity: 0.9;">Flexible editing</span>
        </button>
      </div>
      
      <button id="cancelModalButton" style="
        margin-top: 20px;
        padding: 10px 30px;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        Cancel
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add hover effects
  const nowBtn = document.getElementById('modeNowButton');
  const laterBtn = document.getElementById('modeLaterButton');
  const cancelBtn = document.getElementById('cancelModalButton');

  nowBtn.addEventListener('mouseenter', () => nowBtn.style.transform = 'translateY(-2px)');
  nowBtn.addEventListener('mouseleave', () => nowBtn.style.transform = 'translateY(0)');
  laterBtn.addEventListener('mouseenter', () => laterBtn.style.transform = 'translateY(-2px)');
  laterBtn.addEventListener('mouseleave', () => laterBtn.style.transform = 'translateY(0)');
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.backgroundColor = '#5a6268');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.backgroundColor = '#6c757d');

  // Button click handlers
  nowBtn.addEventListener('click', () => {
    modal.remove();
    loadPendingInvoiceWithMode(invoice, pendingId, 'now');
  });

  laterBtn.addEventListener('click', () => {
    modal.remove();
    loadPendingInvoiceWithMode(invoice, pendingId, 'later');
  });

  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Load pending invoice with selected mode
function loadPendingInvoiceWithMode(invoice, pendingId, mode) {
  // Clear current items and reset PDF state
  items = [];
  itemCounter = 1;
  currentInvoicePDF = null;
  currentInvoiceData = null;
  currentPendingId = pendingId; // Track that this is from a pending invoice

  // Set mode
  setInvoiceMode(mode);

  // Set customer name and date
  document.getElementById("customerName").value = invoice.customerName || "";
  document.getElementById("invoiceDate").value = invoice.invoiceDate || "";

  // Load invoice items
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item) => {
      const mrp = parseFloat(item.mrp || 0);
      const net = parseFloat(item.net || 0);
      const quantity = item.quantity !== undefined && item.quantity !== null ? parseFloat(item.quantity) : 0;
      const total = parseFloat(item.total || 0);
      const discount = parseFloat(item.discount !== undefined ? item.discount : 0);

      items.push({
        sno: itemCounter++,
        description: item.description || "",
        quantity: quantity,
        mrp: mrp.toFixed(2),
        discount: discount,
        net: net.toFixed(2),
        total: total.toFixed(2),
      });
    });
  }

  // Update the table and total
  updateTable();
  updateTotal();
  updateButtonStates();

  // Scroll to top to show the form
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete pending invoice
function deletePendingInvoice(id) {
  if (confirm("Are you sure you want to delete this pending invoice?")) {
    pendingInvoices = pendingInvoices.filter((inv) => inv.id !== id);
    localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
    displayPendingInvoices();
  }
}

// Clear all pending invoices
function clearAllPendingInvoices() {
  if (pendingInvoices.length === 0) {
    alert("No pending invoices to clear!");
    return;
  }

  if (
    confirm(
      "Are you sure you want to clear all pending invoices? This action cannot be undone."
    )
  ) {
    pendingInvoices = [];
    localStorage.setItem("pendingInvoices", JSON.stringify(pendingInvoices));
    displayPendingInvoices();
    document.getElementById("pendingInvoiceSearch").value = "";
  }
}
