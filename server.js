const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('database.db');

// Настройки CORS и лимитов для приема изображений Base64
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Указываем папку public для всех статических файлов
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

// --- МАРШРУТЫ СТРАНИЦ ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- API ЭНДПОИНТЫ ---

// 1. Получить список всех товаров
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении товаров:', err);
            return res.status(500).json({ error: 'Ошибка сервера при получении товаров' });
        }
        res.json(rows);
    });
});

// 2. Добавить новый товар
app.post('/api/products', (req, res) => {
    const { name, price, status, category, subcategory, description, image } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const query = `
        INSERT INTO products (name, price, status, category, subcategory, description, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
        query, 
        [
            name, 
            price, 
            status || 'in_stock', 
            category || '', 
            subcategory || '', 
            description || '', 
            image || ''
        ], 
        function(err) {
            if (err) {
                console.error('Ошибка при сохранении товара:', err);
                return res.status(500).json({ error: 'Ошибка при сохранении товара' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 3. Обновить существующий товар по ID
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, status, category, subcategory, description, image } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const query = `
        UPDATE products 
        SET name = ?, price = ?, status = ?, category = ?, subcategory = ?, description = ?, image = ?
        WHERE id = ?
    `;

    db.run(
        query,
        [
            name,
            price,
            status || 'in_stock',
            category || '',
            subcategory || '',
            description || '',
            image || '',
            id
        ],
        function (err) {
            if (err) {
                console.error('Ошибка при обновлении товара:', err);
                return res.status(500).json({ error: 'Ошибка при обновлении товара' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Товар не найден' });
            }
            res.json({ success: true });
        }
    );
});

// 4. Удалить товар по ID
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Ошибка при удалении товара:', err);
            return res.status(500).json({ error: 'Ошибка при удалении товара' });
        }
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