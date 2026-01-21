const db = require('../db');

const Product = {

    getAllProducts: (callback) => {
        const sql = 'SELECT * FROM products';
        db.query(sql, callback);
    },

    getProductById: (productId, callback) => {
        const sql = 'SELECT * FROM products WHERE id = ?';
        db.query(sql, [productId], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result[0]);
        });
    },

    addProduct: (productData, callback) => {
        const sql = 'INSERT INTO products (productName, price, quantity, image) VALUES (?, ?, ?, ?)';
        db.query(sql, [
            productData.productName,
            productData.price,
            productData.quantity,
            productData.image
        ], callback);
    },

    updateProduct: (productId, productData, callback) => {
        const sql = 'UPDATE products SET productName=?, price=?, quantity=?, image=? WHERE id=?';
        db.query(sql, [
            productData.productName,
            productData.price,
            productData.quantity,
            productData.image,
            productId
        ], callback);
    },

    deleteProduct: (productId, callback) => {
        const sql = 'DELETE FROM products WHERE id=?';
        db.query(sql, [productId], callback);
    },

    updateQuantity: (productId, quantity, callback) => {
        const sql = 'UPDATE products SET quantity = quantity + ? WHERE id=?';
        db.query(sql, [quantity, productId], callback);
    },


    // Search Feature
    searchProducts: (keyword, callback) => {
        let sql = "SELECT * FROM products";
        let params = [];

        if (keyword && keyword.trim() !== "") {
            sql += " WHERE productName LIKE ?";
            params.push("%" + keyword + "%");
        }

        db.query(sql, params, callback);
    }
};
// Reduce stock safely
Product.reduceStock = (productId, qtyPurchased, callback) => {
    const sql = `
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE id = ? AND quantity >= ?
    `;
    db.query(sql, [qtyPurchased, productId, qtyPurchased], callback);
};

module.exports = Product;