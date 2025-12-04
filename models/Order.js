// models/Order.js
const db = require('../db');

// Create new order
exports.createOrder = (userId, totalAmount, callback) => {
    const sql = "INSERT INTO orders (userId, totalAmount) VALUES (?, ?)";
    db.query(sql, [userId, totalAmount], callback);
};

// Get all orders for a user
exports.getOrdersByUser = (userId, callback) => {
    const sql = "SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC";
    db.query(sql, [userId], callback);
};

// Get single order by ID
exports.getOrderById = (orderId, callback) => {
    const sql = "SELECT * FROM orders WHERE id = ?";
    db.query(sql, [orderId], callback);
};
