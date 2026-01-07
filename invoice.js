// Holds invoice number when regenerating
window.manualInvoiceNo = null;

// Save invoice JSON
function saveInvoiceData(invoiceNo, data) {
  localStorage.setItem("invoice_" + invoiceNo, JSON.stringify(data));
}


// function resetInvoiceCounter() {
//   localStorage.setItem('invoiceCounter', '0'); // next generated invoice will be 0001
//   alert('Invoice counter has been reset. Next invoice will start from 0001.');
// }


// Load invoice JSON back into HTML
function loadInvoiceData(invoiceNo) {
  const raw = localStorage.getItem("invoice_" + invoiceNo);
  if (!raw) {
    alert("Invoice not found");
    return;
  }

  const inv = JSON.parse(raw);

  document.getElementById("customer").value = inv.customer;
  document.getElementById("custAddress").value = inv.address;

  const tbody = document.getElementById("itemsBody");
  tbody.innerHTML = "";

  inv.items.forEach(item => {
    const row = document.createElement("tr");
    row.className = "item-row";
    row.innerHTML = `
      <td><input class="itemName" value="${item.name}"></td>
      <td><input class="hsn" value="${item.hsn}"></td>
      <td><input type="number" class="qty" value="${item.qty}"></td>
      <td><input type="number" class="price" value="${item.price}"></td>
      <td><button type="button" onclick="removeItem(this)">Remove</button></td>
    `;
    tbody.appendChild(row);
  });

  window.manualInvoiceNo = invoiceNo;
  alert("Invoice loaded. You can edit and regenerate.");
}

async function generateInvoice() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ---------------- BASIC DATA ----------------
  const customerName = document.getElementById("customer").value || "Customer Name";
  const customerAddress = document.getElementById("custAddress").value || "";

  const items = [];
  document.querySelectorAll("#itemsBody tr").forEach(row => {
    items.push({
      name: row.querySelector(".itemName").value || "Item",
      hsn: row.querySelector(".hsn").value || "",
      qty: Number(row.querySelector(".qty").value) || 1,
      price: Number(row.querySelector(".price").value) || 0
    });
  });

const invoiceNo = window.manualInvoiceNo || getInvoiceNo();
  const dateStr = new Date().toLocaleDateString("en-IN");

  // ---------------- TOP DESIGN LINE ----------------
  doc.setFillColor(255, 204, 0);
  doc.rect(0, 0, 210, 5, "F");

  // ---------------- LOGO ----------------
  const logo = new Image();
  logo.src = "Vaazhaii_logo.png";

  logo.onload = async () => {

    // ---------------- LOGO (AUTO SCALE - PROFESSIONAL) ----------------
  const maxLogoWidth = 70;   // mm
  const maxLogoHeight = 70;  // mm

  const imgWidth = logo.width;
  const imgHeight = logo.height;

  let drawWidth = maxLogoWidth;
  let drawHeight = (imgHeight / imgWidth) * drawWidth;

  // If height exceeds max, scale by height instead
  if (drawHeight > maxLogoHeight) {
    drawHeight = maxLogoHeight;
    drawWidth = (imgWidth / imgHeight) * drawHeight;
  }

  // Right aligned logo
  const logoX = 190 - drawWidth;
  const logoY = 10;

  doc.addImage(logo, "PNG", logoX, logoY, drawWidth, drawHeight);


    // ---------------- TITLE ----------------
    doc.setFont("Brush Script MT", "bold");
    doc.setFontSize(26);
    doc.text("Invoice", 14, 25);

    // ---------------- COMPANY ----------------
    doc.setFontSize(16);
    doc.text("Vaazhaii Foods", 14, 35);

    doc.setFont("Brush Script MT", "normal");
    doc.setFontSize(10);

    const companyLines = [
      "A-15, Kattabomman Street, Rayon Nagar",
      "Sirumugai, Mettupalayam",
      "Coimbatore - 641302",
      "Phone: +91 9488844216",
      "Email: vaazhaii.foods@gmail.com",
      "GSTIN: 33BNPPL2356F1ZZ",
      "FSSAI: 30251119122239652"
    ];

    let y = 42;
    companyLines.forEach(l => {
      doc.text(l, 14, y);
      y += 5;
    });

    // ---------------- CUSTOMER BOX ----------------
    const custBoxY = y + 5;
    const custHeight = 28 + customerAddress.split("\n").length * 5;

    doc.setFillColor(255, 255, 220);
    doc.rect(14, custBoxY, 182, custHeight, "F");

    doc.setFont("Brush Script MT", "bold");
    doc.text(customerName, 16, custBoxY + 10);

    doc.setFont("Brush Script MT", "normal");
    let cy = custBoxY + 17;
    customerAddress.split("\n").forEach(l => {
      doc.text(l, 16, cy);
      cy += 5;
    });

    // ---------------- INVOICE INFO ----------------
    doc.setFont("Brush Script MT", "bold");
    doc.text("Invoice No:", 140, custBoxY + 10);
    doc.text("Date:", 140, custBoxY + 18);

    doc.setFont("Brush Script MT", "normal");
    doc.text(invoiceNo, 190, custBoxY + 10, { align: "right" });
    doc.text(dateStr, 190, custBoxY + 18, { align: "right" });

    // ---------------- ITEMS TABLE ----------------
    const startY = custBoxY + custHeight + 15;
    const colX = [18, 100, 130, 155, 185];
    const headerHeight = 10;
    const rowHeight = 8;

    // Header
    doc.setFillColor(243, 156, 18);
    doc.rect(14, startY, 182, headerHeight, "F");

    doc.setFont("Brush Script MT", "bold");
    doc.setTextColor(255, 255, 255);
    const headerTextY = startY + 7;

    ["Item", "HSN", "Qty", "Rate (Rs.)", "Amount (Rs.)"].forEach((t, i) => {
      doc.text(t, colX[i], headerTextY, { align: i >= 3 ? "right" : "left" });
    });

    // Rows
    doc.setFont("Brush Script MT", "normal");
    doc.setTextColor(0, 0, 0);

    let rowY = startY + headerHeight + 6;
    let taxableTotal = 0;

    items.forEach(item => {
      const taxableRate = item.price / 1.12; // reverse GST
      const amount = taxableRate * item.qty;
      taxableTotal += amount;

      doc.text(item.name, colX[0], rowY);
      doc.text(item.hsn, colX[1], rowY);
      doc.text(String(item.qty), colX[2], rowY);
      doc.text(taxableRate.toFixed(2), colX[3], rowY, { align: "right" });
      doc.text(amount.toFixed(2), colX[4], rowY, { align: "right" });

      rowY += rowHeight;
    });

    // ---------------- TOTALS ----------------
    const cgst = taxableTotal * 0.06;
    const sgst = taxableTotal * 0.06;
    const grandTotal = taxableTotal + cgst + sgst;

    rowY += 5;
    doc.setFont("Brush Script MT", "bold");
    doc.text("Taxable Value:", colX[3], rowY, { align: "right" });
    doc.text(taxableTotal.toFixed(2), colX[4], rowY, { align: "right" });

    rowY += 7;
    doc.text("CGST @ 6%:", colX[3], rowY, { align: "right" });
    doc.text(cgst.toFixed(2), colX[4], rowY, { align: "right" });

    rowY += 7;
    doc.text("SGST @ 6%:", colX[3], rowY, { align: "right" });
    doc.text(sgst.toFixed(2), colX[4], rowY, { align: "right" });

    rowY += 10;
    doc.text("Total Amount:", colX[3], rowY, { align: "right" });
    doc.text(grandTotal.toFixed(2), colX[4], rowY, { align: "right" });

    // ---------------- QR PAYMENT ----------------
    rowY += 15;
    doc.text("Payment (UPI QR):", 14, rowY);

    const upiURL =
      `upi://pay?pa=lokeshvb30000@okaxis&pn=LOKESHWARAN%20V&am=${grandTotal.toFixed(2)}&cu=INR`;

    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, upiURL, { width: 120 });

    doc.addImage(canvas.toDataURL("image/png"), "PNG", 160, rowY - 5, 30, 30);

    // ---------------- FOOTER ----------------
    doc.setFontSize(10);
    doc.setFont("Slab serif", "normal");
    doc.text("Thank you for your business!", 105, 285, { align: "center" });

    // ---------------- SAVE ----------------
    // ---------------- SAVE DATA ----------------
const invoiceData = {
  invoiceNo,
  customer: customerName,
  address: customerAddress,
  items,
  date: dateStr
};

saveInvoiceData(invoiceNo, invoiceData);

// reset manual mode after save
window.manualInvoiceNo = null;

    doc.save(invoiceNo + ".pdf");
  };
}
