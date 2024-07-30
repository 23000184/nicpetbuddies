const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const session = require('express-session');
const path = require('path');

const app = express();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Use original file name for storing
    }
});
const upload = multer({ storage: storage });

// MySQL database connection setup
const connection = mysql.createConnection({
    //host: 'localhost',
    //user: 'root',
    //password: '',
    //database: 'nicpetbuddies'
    host: 'sql.freedb.tech',
    user: 'freedb_23000184',
    password: '8vdpXA&dfaHnT#X',
    database: 'freedb_miniproj'

});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static('public'));

// Redirect root to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page route
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query to retrieve user information from database
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    connection.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Error retrieving user:', err);
            return res.status(500).send('Error retrieving user');
        }

        if (results.length > 0) {
            const user = results[0];

            // Store user data in session
            req.session.user = {
                id: user.id,
                username: user.username,
                usertype: user.userType,
                firstname: user.firstName,
                lastname: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                dateJoined: user.dateJoined,
                image: user.image
            };
            res.redirect('/home'); // Redirect to home page
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Route for profile page
app.get('/profile', (req, res) => {
    if (req.session.user) {
        res.render('profile', { user: req.session.user });
    } else {
        res.redirect('/profile'); // Redirect to login if session data is not found
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

// Route for home page
app.get('/home', (req, res) => {
    res.render('home');
});

// Route for services page
app.get('/services', (req, res) => {
    const sql = "SELECT * FROM services;";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error retrieving services:', error.message);
            return res.status(500).send("Error retrieving services");
        }
        res.render('services', { services: results });
    });
});

// Route for products page
app.get('/producttab', (req, res) => {
    const sql = "SELECT * FROM products;";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error retrieving products:', error.message);
            return res.status(500).send("Error retrieving products");
        }
        res.render('producttab', { products: results });
    });
});

// Route for single product page
app.get('/product/:id', (req, res) => {
    const productId = req.params.id;
    const sql = "SELECT * FROM products WHERE productID = ?";
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Error retrieving product:', error.message);
            return res.status(500).send("Error retrieving product");
        }
        if (results.length > 0) {
            res.render('product', { product: results[0] });
        } else {
            res.status(404).send("Product not found");
        }
    });
});

//add
app.get('/addProduct', (req, res) => {
    res.render('addProduct');
});

// Route to handle form submission and add a new product to the database
app.post('/addProduct', upload.single('image'), (req, res) => {
    const { productName, quantity, description, price } = req.body;
    let image = req.file ? req.file.filename : null; // Uploaded image filename or null if no file uploaded

    const sql = 'INSERT INTO products (productName, quantity, description, price, image) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [productName, quantity, description, price, image], (error, results) => {
        if (error) {
            console.error('Error adding product:', error.message);
            return res.status(500).send('Error adding product');
        }
        console.log('New product added successfully');
        res.redirect('/producttab'); // Redirect to product listing page
    });
});

//edit 
app.get('/editProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE productId = ?';

    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving product by ID');
        }
        if (results.length > 0) {
            res.render('editProduct', { product: results[0] });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

app.post('/editProduct/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id;
    const { name, quantity, price } = req.body;
    let image = req.body.currentImage;

    if (req.file) {
        image = req.file.filename;
    }

    const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE productId = ?';

    connection.query(sql, [name, quantity, price, image, productId], (error, results) => {
        if (error) {
            console.error('Error updating product:', error.message);
            return res.status(500).send('Error updating product');
        }
        res.redirect('/producttab');
    });
});

//delete 
app.get('/deleteProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE productId=?';

    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error("Error retrieving product:", error);
            return res.status(500).send("Error retrieving product");
        }

        if (results.length > 0) {
            // Render a confirmation page with the product details
            res.render('deleteProduct', { product: results[0] });
        } else {
            res.status(404).send("Product not found");
        }
    });
});

app.post('/deleteProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'DELETE FROM products WHERE productId=?';

    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error("Error deleting product:", error);
            res.status(500).send("Error deleting product");
        } else {
            res.redirect('/producttab');
        }
    });
});

//checkout
app.get('/checkout', (req, res) => {
    res.render('checkout');
});

app.post('/checkout', (req, res) => {
    const { name, address, phone, quantity } = req.body;

    // Insert checkout data into the database
    const sql = 'INSERT INTO orders (name, address, phone_number, quantity) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, address, phone, quantity], (err, results) => {
        if (err) {
            console.error('Error inserting checkout data:', err);
            return res.status(500).send('Error inserting checkout data');
        }
        // Redirect to a success page or do something else
        res.redirect('/payment');
    });
});

// payment
app.get('/payment', (req, res) => {
    res.render('payment');
});

// Route for processing payment form submission (POST request)
app.post('/payment', (req, res) => {
    const { name, cardholderName, cardNumber, MMYY, CCV } = req.body;

    // Insert payment data into the database
    const sql = 'INSERT INTO payments (name, cardholder_name, card_number, expiry_date, ccv) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [name, cardholderName, cardNumber, MMYY, CCV], (err, results) => {
        if (err) {
            console.error('Error inserting payment data:', err);
            res.render('error', { message: 'Payment failed. Please try again later.' });
        } else {
            // Redirect to success page upon successful payment
            res.redirect('/success');
        }
    });
})

//success page
app.get('/success', (req, res) => {
    res.render('success'); // Assuming you have a 'success.ejs' template in your 'views' directory
});

// POST handler for success page (if needed for form submissions)
app.post('/success', (req, res) => {
    // Handle form submissions or other POST actions on the success page
    res.redirect('/producttab'); // Redirect to another page after processing
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
