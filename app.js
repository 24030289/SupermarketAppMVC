const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Controllers
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
// Models
const Product = require('./models/Product');
// ----------------------
// Set up multer for file uploads
// ----------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// ----------------------
// View engine and middleware
// ----------------------
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

// ----------------------
// Authentication middleware
// ----------------------
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

// ----------------------
// Registration validation middleware
// ----------------------
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;
    const errors = [];

    if (!username || !email || !password || !address || !contact || !role) {
        errors.push('All fields are required.');
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (email && !emailRegex.test(email)) {
        errors.push('Invalid email format.');
    }

    if (errors.length > 0) {
        req.flash('error', errors);
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

// ----------------------
// Routes
// ----------------------

// Home
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// ----------------------
// Product routes
// ----------------------
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.listProducts);
app.get('/product/:id', checkAuthenticated, ProductController.getProduct);
app.get('/addProduct', checkAuthenticated, checkAdmin, ProductController.showAddForm);
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.addProduct);
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.showEditForm);
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.updateProduct);
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.deleteProduct);

// Shopping page
app.get('/shopping', checkAuthenticated, (req, res) => {
    Product.getAllProducts((err, products) => {
        if (err) {
            return res.status(500).send('Error retrieving products');
        }

        // Render different page based on role
        if (req.session.user.role === 'admin') {
            res.render('inventory', { products, user: req.session.user });
        } else {
            res.render('shopping', { products, user: req.session.user });
        }
    });
});

// cart
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

// ----------------------
// Auth routes
// ----------------------
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
// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
