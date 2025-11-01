const db = require('../db');

const Product = {
    // Get all products
    getAllProducts: (callback) => {
        const sql = 'SELECT * FROM products';
        db.query(sql, (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result);
        });
    },

    // Get product by ID
    getProductById: (productId, callback) => {
        const sql = 'SELECT * FROM products WHERE id = ?';
        db.query(sql, [productId], (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result[0]);
        });
    },

    // Add new product
    addProduct: (productData, callback) => {
        const sql = 'INSERT INTO products (productName, price, quantity, image) VALUES (?, ?, ?, ?)';
        db.query(sql, [
            productData.productName,
            productData.price,
            productData.quantity,
            productData.image
        ], (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result.insertId);
        });
    },

    // Update product
    updateProduct: (productId, productData, callback) => {
        const sql = 'UPDATE products SET productName = ?, price = ?, quantity = ?, image = ? WHERE id = ?';
        db.query(sql, [
            productData.productName,
            productData.price,
            productData.quantity,
            productData.image,
            productId
        ], (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result.affectedRows > 0);
        });
    },

    // Delete product
    deleteProduct: (productId, callback) => {
        const sql = 'DELETE FROM products WHERE id = ?';
        db.query(sql, [productId], (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result.affectedRows > 0);
        });
    },

    // Update product quantity
    updateQuantity: (productId, quantity, callback) => {
        const sql = 'UPDATE products SET quantity = quantity + ? WHERE id = ?';
        db.query(sql, [quantity, productId], (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, result.affectedRows > 0);
        });
    }
};

module.exports = Product;