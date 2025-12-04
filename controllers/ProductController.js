const Product = require('../models/Product');

const ProductController = {
    // List all products
    listProducts: (req, res) => {
        Product.getAllProducts((err, products) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error retrieving products',
                    details: err
                });
            }
            res.render('inventory', { products: products,user: req.session.user });
        });
    },

    // Get product details by ID
    getProduct: (req, res) => {
        const productId = req.params.id;
        Product.getProductById(productId, (err, product) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error retrieving product',
                    details: err
                });
            }
            if (!product) {
                return res.status(404).json({
                    error: 'Product not found'
                });
            }
            res.render('product', { product: product,user: req.session.user });
        });
    },

    // Show add product form
    showAddForm: (req, res) => {
        res.render('addProduct', { user: req.session.user });
    },

    // Add new product
    addProduct: (req, res) => {
        const productData = {
            productName: req.body.productName,
            price: parseFloat(req.body.price),
            quantity: parseInt(req.body.quantity),
            image: req.file ? req.file.filename : 'default-product.jpg'
        };

        Product.addProduct(productData, (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error adding product',
                    details: err
                });
            }
            res.redirect('/inventory');
        });
    },

    // Show edit product form
    showEditForm: (req, res) => {
        const productId = req.params.id;
        Product.getProductById(productId, (err, product) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error retrieving product',
                    details: err
                });
            }
            if (!product) {
                return res.status(404).json({
                    error: 'Product not found'
                });
            }
            res.render('editProduct', { product: product, user: req.session.use });
        });
    },

    // Update product
    updateProduct: (req, res) => {
        const productId = req.params.id;
        const productData = {
            productName: req.body.productName,
            price: parseFloat(req.body.price),
            quantity: parseInt(req.body.quantity),
            image: req.file ? req.file.filename : req.body.currentImage
        };

        Product.updateProduct(productId, productData, (err, success) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error updating product',
                    details: err
                });
            }
            if (!success) {
                return res.status(404).json({
                    error: 'Product not found'
                });
            }
            res.redirect('/inventory');
        });
    },

    // Delete product
    deleteProduct: (req, res) => {
        const productId = req.params.id;
        Product.deleteProduct(productId, (err, success) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error deleting product',
                    details: err
                });
            }
            if (!success) {
                return res.status(404).json({
                    error: 'Product not found'
                });
            }
            res.redirect('/inventory');
        });
    }, 
    addToCart: (req, res, productId, quantity) => {
    if (!req.session.cart) req.session.cart = [];

    // Get product details first
    Product.getProductById(productId, (err, product) => {
        if (err || !product) {
            req.flash('error', 'Product not found');
            return res.redirect('/shopping');
        }

        // Check if product already in cart
        const existing = req.session.cart.find(item => item.id === productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            // Store all required info
            req.session.cart.push({
                id: product.id,      
                productName: product.productName,
                price: parseFloat(product.price),
                quantity: quantity,
                image: product.image
            });
        }

        res.redirect('/cart');
    });
}

};

module.exports = ProductController;