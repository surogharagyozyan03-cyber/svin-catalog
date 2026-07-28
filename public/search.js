document.addEventListener('DOMContentLoaded', () => {
    // 1. Создаем CSS-стили для выпадающего списка Live Search прямо из JS
    const style = document.createElement('style');
    style.textContent = `
        .search-box {
            position: relative !important;
        }
        .live-search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #ffffff;
            border: 2px solid #0f172a;
            border-top: none;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            max-height: 380px;
            overflow-y: auto;
            z-index: 9999;
            display: none;
            margin-top: 4px;
        }
        .live-search-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            cursor: pointer;
            transition: background 0.2s ease;
            text-decoration: none;
            color: #0f172a;
        }
        .live-search-item:last-child {
            border-bottom: none;
        }
        .live-search-item:hover {
            background: #f1f5f9;
        }
        .live-search-img {
            width: 45px;
            height: 45px;
            object-fit: contain;
            border-radius: 6px;
            margin-right: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            flex-shrink: 0;
        }
        .live-search-info {
            flex-grow: 1;
            overflow: hidden;
        }
        .live-search-title {
            font-size: 14px;
            font-weight: 600;
            margin: 0 0 3px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #0f172a;
        }
        .live-search-price {
            font-size: 13px;
            font-weight: 700;
            color: #166534;
        }
        .live-search-empty {
            padding: 15px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    // 2. Инициализируем поиск для всех поисковых блоков на странице
    const searchBoxes = document.querySelectorAll('.search-box');

    searchBoxes.forEach(box => {
        const input = box.querySelector('input');
        const btn = box.querySelector('.btn-search');

        if (!input) return;

        // Создаем выпадающий блок для подсказок внутри текущего .search-box
        let dropdown = box.querySelector('.live-search-results');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'live-search-results';
            box.appendChild(dropdown);
        }

        // Загрузка товаров из localStorage
        const allProducts = JSON.parse(localStorage.getItem('svin_products')) || [];

        // Функция рендера результатов Live Search
        const handleLiveSearch = () => {
            const query = input.value.trim().toLowerCase();

            if (query.length === 0) {
                dropdown.innerHTML = '';
                dropdown.style.display = 'none';
                return;
            }

            // Фильтруем товары по названию или описанию
            const filtered = allProducts.filter(p => 
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query))
            );

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="live-search-empty">Ապրանքներ չեն գտնվել</div>';
                dropdown.style.display = 'block';
                return;
            }

            // Показываем максимум 6 совпадений
            const topResults = filtered.slice(0, 6);
            dropdown.innerHTML = '';

            topResults.forEach(prod => {
                const item = document.createElement('div');
                item.className = 'live-search-item';

                item.innerHTML = `
                    <img src="${prod.image || 'logo.png'}" class="live-search-img" alt="${prod.name}">
                    <div class="live-search-info">
                        <div class="live-search-title">${prod.name}</div>
                        <div class="live-search-price">${Number(prod.price).toLocaleString()} ֏</div>
                    </div>
                `;

                // Переход к товару при клике
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const subTarget = prod.subcategory || prod.subCategory || '';
                    const catTarget = prod.category || prod.categoryId || '';
                    
                    window.location.href = `subcategory.html?sub=${encodeURIComponent(subTarget)}&cat=${encodeURIComponent(catTarget)}&product=${encodeURIComponent(prod.id || prod.name)}`;
                });

                dropdown.appendChild(item);
            });

            dropdown.style.display = 'block';
        };

        // События ввода текста
        input.addEventListener('input', handleLiveSearch);
        input.addEventListener('focus', handleLiveSearch);

        // Правильное перенаправление при клике на «Որոնել» или Enter
        const executeSearchRedirect = () => {
            const query = input.value.trim();
            if (query) {
                window.location.href = `subcategory.html?search=${encodeURIComponent(query)}`;
            }
        };

        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                executeSearchRedirect();
            });
        }

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearchRedirect();
            }
        });
    });

    // Закрытие списка подсказок при клике вне поля поиска
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            document.querySelectorAll('.live-search-results').forEach(el => {
                el.style.display = 'none';
            });
        }
    });
});