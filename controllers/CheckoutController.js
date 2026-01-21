const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");

// Show checkout summary page
exports.showCheckout = (req, res) => {
  const cart = req.session.cart || [];
  res.render("checkout", {
    cart,
    user: req.session.user,
    paypalClientId: process.env.PAYPAL_CLIENT_ID, // for PayPal SDK in checkout.ejs
  });
};

// Success Page View
exports.successPage = (req, res) => {
  const orderId = req.session.lastOrderId;
  if (!orderId) return res.redirect("/shopping");

  res.render("success", {
    user: req.session.user,
    orderId,
  });
};

// Purchase history (User)
exports.showPurchaseHistory = (req, res) => {
  Order.getOrdersByUser(req.session.user.id, (err, orders) => {
    if (err) return res.status(500).send("Error retrieving orders");
    res.render("mypurchases", { orders, user: req.session.user });
  });
};

// Show invoice (User + Admin both can view, but your EJS can hide buttons based on role)
exports.showInvoice = (req, res) => {
  const orderId = req.params.id;

  Order.getOrderById(orderId, (err, order) => {
    if (err || !order || order.length === 0) {
      return res.status(404).send("Order not found");
    }

    OrderItem.getItemsByOrder(orderId, (err, items) => {
      if (err) return res.status(500).send("Error loading invoice items");

      res.render("invoice", {
        order: order[0],
        items,
        user: req.session.user,
      });
    });
  });
};

// Admin: view all orders
exports.showAllOrders = (req, res) => {
  Order.getAllOrders((err, orders) => {
    if (err) return res.status(500).send("Error retrieving all orders");
    res.render("adminOrders", { orders, user: req.session.user });
  });
};

/**
 * CA2 FINALIZE (PayPal / NETS)
 * This route should be called ONLY after payment success.
 * - PayPal: /checkout/finalize?method=paypal&paypalOrderId=...
 * - NETS:   /checkout/finalize?method=nets&txn_retrieval_ref=...
 */
exports.finalizeAfterPayment = (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect("/cart");

  const method = req.query.method; // "paypal" or "nets"
  const paypalOrderId = req.query.paypalOrderId || null;
  const txnRetrievalRef = req.query.txnRetrievalRef || null;

  // OPTIONAL: simple validation so people cannot call finalize randomly
  if (method === "paypal" && !paypalOrderId) return res.redirect("/checkout");
  if (method === "nets" && !txnRetrievalRef) return res.redirect("/checkout");

  const userId = req.session.user.id;
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  Order.createOrder(userId, total.toFixed(2), (err, result) => {
    if (err) {
      console.error("Finalize createOrder error:", err);
      return res.status(500).send("Order failed");
    }

    const orderId = result.insertId;

    cart.forEach(item => {
      const price = Number(item.price) || 0;

      OrderItem.addItemToOrder(
        orderId,
        item.id,
        item.quantity,
        price.toFixed(2),
        item.productName,
        item.image,
        (err) => {
          if (err) console.error("Finalize addItemToOrder error:", err);
        }
      );

      Product.reduceStock(item.id, item.quantity, (err) => {
        if (err) console.error("Finalize reduceStock error:", err);
      });
    });

    // Save last order for success screen
    req.session.lastOrderId = orderId;

    // Clear cart so cannot double-pay
    req.session.cart = [];
    req.session.pendingPayment = null;

    console.log("Finalized order:", { orderId, method, paypalOrderId, txnRetrievalRef });

    return res.redirect("/checkout/success");
  });
};

// Download invoice as PDF
exports.downloadInvoicePDF = (req, res) => {
  const orderId = req.params.id;

  Order.getOrderById(orderId, (err, order) => {
    if (err || !order || order.length === 0) {
      return res.status(404).send("Invoice not found");
    }

    OrderItem.getItemsByOrder(orderId, (err, items) => {
      if (err) return res.status(500).send("Invoice items error");

      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Invoice_${orderId}.pdf`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("SUPERMARKET APP", { align: "center" });
      doc.fontSize(14).font("Helvetica").text("Invoice", { align: "center" });
      doc.moveDown(2);

      // Order Info
      const invoice = order[0];
      doc.fontSize(12).font("Helvetica-Bold").text("Order Details");
      doc.moveDown(0.3);
      doc.font("Helvetica")
        .text(`Order ID: ${invoice.id}`)
        .text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`)
        .text(`Customer ID: ${invoice.userId}`);

      doc.moveDown();

      // Table Header
      const tableTop = doc.y + 10;
      const columnPositions = { product: 50, qty: 280, price: 340, subtotal: 420 };

      doc.fontSize(12).font("Helvetica-Bold")
        .text("Product", columnPositions.product, tableTop)
        .text("Qty", columnPositions.qty, tableTop)
        .text("Price", columnPositions.price, tableTop)
        .text("Subtotal", columnPositions.subtotal, tableTop);

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.8);

      // Items
      doc.font("Helvetica");
      let totalAmount = 0;
      let rowTop = doc.y;

      items.forEach((item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        const subtotal = price * qty;
        totalAmount += subtotal;

        doc.text(item.productName, columnPositions.product, rowTop);
        doc.text(String(qty), columnPositions.qty, rowTop);
        doc.text(`$${price.toFixed(2)}`, columnPositions.price, rowTop);
        doc.text(`$${subtotal.toFixed(2)}`, columnPositions.subtotal, rowTop);

        rowTop += 22;
      });

      doc.moveTo(50, rowTop).lineTo(550, rowTop).stroke();
      doc.moveDown(1.5);

      // Total
      doc.font("Helvetica-Bold").fontSize(14)
        .text(`Total: $${totalAmount.toFixed(2)}`, { align: "right" });

      doc.moveDown(3);

      // Footer centered (your method)
      const footerText = "Thank you for shopping with Supermarket App!";
      const pageWidth = doc.page.width;
      const textWidth = doc.widthOfString(footerText);

      doc.font("Helvetica").fontSize(11).text(
        footerText,
        (pageWidth - textWidth) / 2,
        doc.y
      );

      doc.end();
    });
  });
};
