const db = require('../db');

const OrderItem = {

    addItemToOrder: (orderId, productId, quantity, price, productName, productImage, callback) => {
        const sql = `
            INSERT INTO order_items (orderId, productId, quantity, price, productName, productImage)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.query(sql, [orderId, productId, quantity, price, productName, productImage], callback);
    },

    getItemsByOrder: (orderId, callback) => {
        const sql = `
            SELECT productName, productImage, price, quantity
            FROM order_items
            WHERE orderId = ?
        `;
        db.query(sql, [orderId], callback);
    }

};

module.exports = OrderItem;
