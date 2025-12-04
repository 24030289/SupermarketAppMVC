const connection = require('../db'); 

module.exports = {
    register: (req, res) => {
        const { username, email, password, address, contact} = req.body;
        const role = 'user';

        const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
        connection.query(sql, [username, email, password, address, contact, role], (err, result) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Error during registration. Please try again.');
                return res.redirect('/register');
            }

            req.flash('success', 'Registration successful! Please log in.');
            res.redirect('/login');
        });
    },

    login: (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/login');
        }

        const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
        connection.query(sql, [email, password], (err, results) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Error during login. Please try again.');
                return res.redirect('/login');
            }

            if (results.length > 0) {
                req.session.user = results[0];
                req.flash('success', 'Login successful!');
                if (req.session.user.role === 'user') res.redirect('/shopping');
                else res.redirect('/inventory');
            } else {
                req.flash('error', 'Invalid email or password.');
                res.redirect('/login');
            }
        });
    }
};
