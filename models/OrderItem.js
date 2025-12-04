// models/OrderItem.js
const db = require('../db');

exports.addItemToOrder = (orderId, productId, quantity, price, callback) => {
    const sql = "INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)";
    db.query(sql, [orderId, productId, quantity, price], callback);
};

// Get items for a single order
exports.getItemsByOrder = (orderId, callback) => {
    const sql = `
        SELECT oi.*, p.productName, p.image
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
    `;
    db.query(sql, [orderId], callback);
};
