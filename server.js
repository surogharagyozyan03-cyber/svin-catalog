const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const session = require('express-session'); // Подключаем сессии

const app = express();
const db = new sqlite3.Database('database.db');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Настройка сессий (хранение статуса входа админа)
app.use(session({
    secret: 'svin_secret_key_2026', // Секретный ключ сессии
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Сессия действует 24 часа
}));

app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных SQLite
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
});

// Middlware для проверки авторизации
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    // Если пользователь не авторизован — перенаправляем на login.html
    res.redirect('/login');
}

// --- МАРШРУТЫ СТРАНИЦ ---

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Страница входа (login.html)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Страница админки (доступна ТОЛЬКО после входа)
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- API АВТОРИЗАЦИИ ---

// Обработка формы логина
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // ЗДЕСЬ УКАЖИТЕ ВАШИ ЛОГИН И ПАРОЛЬ:
    const ADMIN_USER = 'admin';
    const ADMIN_PASS = 'svin2026';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true, redirect: '/admin' });
    } else {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
});

// Выход из системы
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- API ЭНДПОИНТЫ ТОВАРОВ ---

// Получить товары (доступно всем)
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении товаров:', err);
            return res.status(500).json({ error: 'Ошибка сервера при получении товаров' });
        }
        res.json(rows);
    });
});

// Добавить товар (Защищено)
app.post('/api/products', requireAdmin, (req, res) => {
    const { name, price, status, category, subcategory, description, image } = req.body;
    if (!name || !price) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const query = `
        INSERT INTO products (name, price, status, category, subcategory, description, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [name, price, status || 'in_stock', category || '', subcategory || '', description || '', image || ''], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка при сохранении' });
        res.json({ success: true, id: this.lastID });
    });
});

// Обновить товар (Защищено)
app.put('/api/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, price, status, category, subcategory, description, image } = req.body;

    const query = `
        UPDATE products 
        SET name = ?, price = ?, status = ?, category = ?, subcategory = ?, description = ?, image = ?
        WHERE id = ?
    `;
    db.run(query, [name, price, status || 'in_stock', category || '', subcategory || '', description || '', image || '', id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка при обновлении' });
        res.json({ success: true });
    });
});

// Удалить товар (Защищено)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка при удалении' });
        res.json({ success: true });
    });
});

// 404 - Перенаправление на главную
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Сервер SVIN запущен!`);
    console.log(`Главная страница: http://localhost:${PORT}`);
    console.log(`Админ-панель:    http://localhost:${PORT}/admin.html`);
    console.log(`=========================================`);
});