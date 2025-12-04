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
