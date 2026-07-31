const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const session = require('express-session');

const app = express();
const db = new sqlite3.Database('database.db');

// Обязательно для правильной работы сессий через HTTPS на Render
app.set('trust proxy', 1);

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Настройка сессий с поддержкой HTTPS на Render
app.use(session({
    secret: 'svin_secret_key_2026',
    resave: true,
    saveUninitialized: false,
    cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            status TEXT NOT NULL,
            category TEXT,
            subcategory TEXT,
            description TEXT,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const columns = ['category', 'subcategory', 'description', 'image', 'status'];
    columns.forEach(col => {
        db.run(`ALTER TABLE products ADD COLUMN ${col} TEXT`, (err) => {});
    });
});

// Middleware проверки прав админа
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

// --- МАРШРУТЫ СТРАНИЦ ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

// --- API АВТОРИЗАЦИИ ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'svin2026') {
        req.session.isAdmin = true;
        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка сохранения сессии' });
            }
            res.json({ success: true, redirect: '/admin' });
        });
    } else {
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
});

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ authenticated: true });
    }
    return res.status(401).json({ authenticated: false });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- API ТОВАРОВ ---

app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Ошибка SELECT:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

app.post('/api/products', requireAdmin, (req, res) => {
    const { name, price, status, category, subcategory, description, image } = req.body;
    
    if (!name || price === undefined || price === null) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const query = `
        INSERT INTO products (name, price, status, category, subcategory, description, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        String(name), 
        Number(price), 
        status || 'in_stock', 
        category || '', 
        subcategory || '', 
        description || '', 
        image || ''
    ];

    db.run(query, params, function(err) {
        if (err) {
            console.error('Ошибка INSERT:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, price, status, category, subcategory, description, image } = req.body;

    const query = `
        UPDATE products 
        SET name = ?, price = ?, status = ?, category = ?, subcategory = ?, description = ?, image = ?
        WHERE id = ?
    `;
    
    const params = [
        String(name), 
        Number(price), 
        status || 'in_stock', 
        category || '', 
        subcategory || '', 
        description || '', 
        image || '', 
        id
    ];

    db.run(query, params, function(err) {
        if (err) {
            console.error('Ошибка UPDATE:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Ошибка DELETE:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Сервер SVIN запущен на порту ${PORT}`);
});