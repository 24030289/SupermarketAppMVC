const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');

// Show checkout summary page
exports.showCheckout = (req, res) => {
    const cart = req.session.cart || [];
    res.render('checkout', { cart, user: req.session.user });
};

exports.completeCheckout = (req, res) => {
    const userId = req.session.user.id;
    const cart = req.session.cart;

    if (!cart || cart.length === 0) {
        return res.redirect('/cart');
    }

    let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    Order.createOrder(userId, total, (err, result) => {
        if (err) {
            console.error(err);
            return res.send("Order failed");
        }

        const orderId = result.insertId;

        // Insert + reduce stock
        cart.forEach(item => {

            // 1. Add order item
            OrderItem.addItemToOrder(
                orderId,
                item.id,
                item.quantity,
                item.price,
                err => {
                    if (err) console.error("Item insert error:", err);
                }
            );

            // 2. Reduce product stock
            Product.reduceStock(item.id, item.quantity, err => {
                if (err) console.error("Stock update error:", err);
            });
        });

        // 3. Clear cart
        req.session.cart = [];

        // 4. Redirect to invoice
        res.redirect(`/invoice/${orderId}`);
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

            res.render('invoice', { order: order[0], items, user: req.session.user });
        });
    });
};
