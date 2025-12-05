const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Controllers
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CheckoutController = require('./controllers/CheckoutController');

// Models
const Product = require('./models/Product');

// File uploads (multer)

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// View Engine & Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(flash());

// Auth Middlewares

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied');
    res.redirect('/shopping');
};

// Registration Validation

const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;
    const errors = [];

    if (!username || !email || !password || !address || !contact) {
        errors.push('All fields are required.');
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (email && !emailRegex.test(email)) {
        errors.push('Invalid email format.');
    }

    // Force role = user
    req.body.role = "user";

    if (errors.length > 0) {
        req.flash('error', errors);
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

// Routes

// Home
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Inventory (Admin)
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.listProducts);
app.get('/product/:id', checkAuthenticated, ProductController.getProduct);
app.get('/addProduct', checkAuthenticated, checkAdmin, ProductController.showAddForm);
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.addProduct);
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.showEditForm);
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.updateProduct);
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.deleteProduct);


// Shopping page with Search + Sort
app.get('/shopping', checkAuthenticated, (req, res) => {
    const search = req.query.search || "";
    const sort = req.query.sort || "";

    Product.searchProducts(search, (err, products) => {
        if (err) return res.status(500).send("Error retrieving products");

        // Apply sorting
        switch (sort) {
            case "price_asc":
                products.sort((a, b) => a.price - b.price);
                break;
            case "price_desc":
                products.sort((a, b) => b.price - a.price);
                break;
            case "name_asc":
                products.sort((a, b) => a.productName.localeCompare(b.productName));
                break;
            case "name_desc":
                products.sort((a, b) => b.productName.localeCompare(a.productName));
                break;
        }

        res.render('shopping', {
            products,
            user: req.session.user,
            search,
            sort
        });
    });
});

// Cart
app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    if (!req.session.cart) req.session.cart = [];

    ProductController.addToCart(req, res, productId, quantity);
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
});

// Update qty
app.post('/cart/update/:id', checkAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id);
    const newQty = parseInt(req.body.quantity);

    if (req.session.cart) {
        req.session.cart = req.session.cart.map(item => {
            if (item.id === productId) item.quantity = newQty;
            return item;
        });
    }
    res.redirect('/cart');
});

// Remove item
app.get('/cart/remove/:id', checkAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id);
    req.session.cart = req.session.cart.filter(item => item.id !== productId);
    res.redirect('/cart');
});

// Clear cart
app.get('/cart/clear', checkAuthenticated, (req, res) => {
    req.session.cart = [];
    res.redirect('/cart');
});

// Checkout
app.get('/checkout', checkAuthenticated, CheckoutController.showCheckout);
app.post('/checkout', checkAuthenticated, CheckoutController.completeCheckout);

// Success Page
app.get('/checkout/success', checkAuthenticated, CheckoutController.successPage);

// Purchase History
app.get('/mypurchases', checkAuthenticated, CheckoutController.showPurchaseHistory);
// Admin view all orders
app.get('/admin/orders', checkAuthenticated, checkAdmin, CheckoutController.showAllOrders);


// Invoice
app.get('/invoice/:id', checkAuthenticated, CheckoutController.showInvoice);
app.get('/invoice/:id/pdf', checkAuthenticated, CheckoutController.downloadInvoicePDF);


// Authentication
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

app.post('/register', validateRegistration, UserController.register);

app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

app.post('/login', UserController.login);

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
