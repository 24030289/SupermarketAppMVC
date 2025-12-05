const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');

// Show checkout summary page
exports.showCheckout = (req, res) => {
    const cart = req.session.cart || [];
    res.render('checkout', { cart, user: req.session.user });
};

// Complete Checkout → Create Order → Show Success Page
exports.completeCheckout = (req, res) => {
    const userId = req.session.user.id;
    const cart = req.session.cart;

    if (!cart || cart.length === 0) {
        return res.redirect('/cart');
    }

    let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    Order.createOrder(userId, total, (err, result) => {
        if (err) {
            console.error("Order creation error:", err);
            return res.send("Order failed");
        }

        const orderId = result.insertId;

        // Insert each cart item + Reduce stock
        cart.forEach(item => {
            OrderItem.addItemToOrder(
                orderId,
                item.id,
                item.quantity,
                item.price,
                item.productName,
                item.image,
                err => {
                    if (err) console.error("Order item insert error:", err);
                }
            );

            Product.reduceStock(item.id, item.quantity, err => {
                if (err) console.error("Stock update error:", err);
            });
        });

        // Save last order for success screen
        req.session.lastOrderId = orderId;

        // Clear cart after order
        req.session.cart = [];

        // Redirect to success confirmation
        res.redirect('/checkout/success');
    });
};

// Success Page View
exports.successPage = (req, res) => {
    const orderId = req.session.lastOrderId;

    if (!orderId) {
        return res.redirect('/shopping'); 
    }

    res.render('success', {
        user: req.session.user,
        orderId
    });
};

// Purchase history
exports.showPurchaseHistory = (req, res) => {
    Order.getOrdersByUser(req.session.user.id, (err, orders) => {
        if (err) return res.send("Error retrieving orders");

        res.render('mypurchases', { orders, user: req.session.user });
    });
};

// Show invoice
exports.showInvoice = (req, res) => {
    const orderId = req.params.id;

    Order.getOrderById(orderId, (err, order) => {
        if (err || !order || order.length === 0) {
            return res.send("Order not found");
        }

        OrderItem.getItemsByOrder(orderId, (err, items) => {
            if (err) return res.send("Error loading invoice items");

            res.render('invoice', {
                order: order[0],
                items,
                user: req.session.user
            });
        });
    });
};

exports.showAllOrders = (req, res) => {
    Order.getAllOrders((err, orders) => {
        if (err) return res.send("Error retrieving all orders");
        res.render('adminOrders', { orders, user: req.session.user });
    });
};

// Download invoice as PDF
exports.downloadInvoicePDF = (req, res) => {
    const orderId = req.params.id;

    Order.getOrderById(orderId, (err, order) => {
        if (err || !order || order.length === 0) {
            return res.send("Invoice not found");
        }

        OrderItem.getItemsByOrder(orderId, (err, items) => {
            if (err) return res.send("Invoice items error");

            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 50 });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=Invoice_${orderId}.pdf`
            );

            doc.pipe(res);

            // Header
            doc
                .fontSize(20)
                .font("Helvetica-Bold")
                .text("SUPERMARKET APP", { align: "center" });

            doc
                .fontSize(14)
                .font("Helvetica")
                .text("Invoice", { align: "center" });

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
            const columnPositions = {
                product: 50,
                qty: 280,
                price: 340,
                subtotal: 420,
            };

            doc
                .fontSize(12)
                .font("Helvetica-Bold")
                .text("Product", columnPositions.product, tableTop)
                .text("Qty", columnPositions.qty, tableTop)
                .text("Price", columnPositions.price, tableTop)
                .text("Subtotal", columnPositions.subtotal, tableTop);

            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.8);

            // Items Table
            doc.font("Helvetica");
            let totalAmount = 0;
            let rowTop = doc.y;

            items.forEach(item => {
                const price = Number(item.price);
                const subtotal = price * item.quantity;
                totalAmount += subtotal;

                doc.text(item.productName, columnPositions.product, rowTop);
                doc.text(item.quantity.toString(), columnPositions.qty, rowTop);
                doc.text(`$${price.toFixed(2)}`, columnPositions.price, rowTop);
                doc.text(`$${subtotal.toFixed(2)}`, columnPositions.subtotal, rowTop);

                rowTop += 22;
            });

            doc.moveTo(50, rowTop).lineTo(550, rowTop).stroke();
            doc.moveDown(1.5);

            // Total
            doc
                .font("Helvetica-Bold")
                .fontSize(14)
                .text(`Total: $${totalAmount.toFixed(2)}`, {
                    align: "right"
                });

            doc.moveDown(3);

            //Center Footer 
            const footerText = "Thank you for shopping with Supermarket App!";
            const pageWidth = doc.page.width;
            const textWidth = doc.widthOfString(footerText);

            doc
                .font("Helvetica")
                .fontSize(11)
                .text(
                    footerText,
                    (pageWidth - textWidth) / 2, 
                    doc.y // 
                );

            doc.end();
        });
    });
};
