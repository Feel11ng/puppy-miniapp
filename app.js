// Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Применяем тему Telegram
document.documentElement.style.setProperty('--bg', tg.themeParams.bg_color || '#1a1a2e');
document.documentElement.style.setProperty('--text', tg.themeParams.text_color || '#eee');

// === НАВИГАЦИЯ ===
const screens = ['puppies', 'create-post', 'ai', 'analytics', 'autopost', 'avito'];

function navigate(screenName) {
    // Скрываем главный экран
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('stats-bar').style.display = 'none';
    document.getElementById('puppies-preview').style.display = 'none';

    // Скрываем все экраны
    screens.forEach(s => {
        const el = document.getElementById('screen-' + s);
        if (el) el.style.display = 'none';
    });

    // Показываем нужный экран
    const screen = document.getElementById('screen-' + screenName);
    if (screen) {
        screen.style.display = 'block';
        window.scrollTo(0, 0);
    }

    // Загружаем данные для экрана
    if (screenName === 'puppies') loadPuppies();
    if (screenName === 'avito') loadAvitoPuppies();

    // Haptic feedback
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function goHome() {
    // Скрываем все экраны
    screens.forEach(s => {
        const el = document.getElementById('screen-' + s);
        if (el) el.style.display = 'none';
    });

    // Показываем главный экран
    document.getElementById('main-menu').style.display = '';
    document.getElementById('stats-bar').style.display = '';
    document.getElementById('puppies-preview').style.display = '';
    window.scrollTo(0, 0);

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// === ОТПРАВКА КОМАНД БОТУ ===
function sendCommand(command, data) {
    const payload = { command: command, data: data || {} };
    tg.sendData(JSON.stringify(payload));
    
    // Показываем уведомление
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Отправлено!',
            message: 'Команда отправлена боту. Перейдите в чат.',
            buttons: [{type: 'ok'}]
        });
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function sendPuppyCommand(command, puppyId) {
    sendCommand(command, { puppy_id: puppyId });
}

// === ЗАГРУЗКА ДАННЫХ ===

// Демо-данные (будут заменены на реальные из бота)
const demoPuppies = [
    { id: 1, name: 'Тедди', breed: 'мальтипу', gender: 'мальчик', color: 'абрикосовый', price: 60000, emoji: '🧸' },
    { id: 2, name: 'Бусинка', breed: 'чихуахуа', gender: 'девочка', color: 'кремовый', price: 45000, emoji: '🐕' },
    { id: 3, name: 'Коко', breed: 'той-пудель', gender: 'девочка', color: 'шоколадный', price: 55000, emoji: '🐩' },
];

function loadPuppiesPreview() {
    const list = document.getElementById('puppies-list');
    
    if (demoPuppies.length === 0) {
        list.innerHTML = '<div class="loading">Нет щенков в продаже</div>';
        return;
    }

    list.innerHTML = demoPuppies.map(p => {
        const genderEmoji = p.gender === 'мальчик' ? '♂️' : '♀️';
        const priceStr = p.price ? p.price.toLocaleString('ru') + ' ₽' : '';
        return `
            <div class="puppy-card" onclick="sendPuppyCommand('view_puppy', ${p.id})">
                <div class="puppy-avatar">${p.emoji}</div>
                <div class="puppy-info">
                    <div class="puppy-name">${genderEmoji} ${p.name}</div>
                    <div class="puppy-details">${p.breed} • ${p.color}</div>
                </div>
                <div class="puppy-price">${priceStr}</div>
            </div>
        `;
    }).join('');

    // Обновляем статистику
    document.getElementById('stat-sale').textContent = demoPuppies.length;
}

function loadPuppies() {
    const list = document.getElementById('puppies-full-list');
    list.innerHTML = demoPuppies.map(p => {
        const genderEmoji = p.gender === 'мальчик' ? '♂️' : '♀️';
        const priceStr = p.price ? p.price.toLocaleString('ru') + ' ₽' : '';
        return `
            <div class="puppy-card">
                <div class="puppy-avatar">${p.emoji}</div>
                <div class="puppy-info">
                    <div class="puppy-name">${genderEmoji} ${p.name}</div>
                    <div class="puppy-details">${p.breed} • ${p.color}</div>
                </div>
                <div class="puppy-price">${priceStr}</div>
            </div>
            <div style="display:flex; gap:8px; margin: -4px 0 12px 0;">
                <button class="btn btn-primary" style="flex:1; padding:10px; font-size:13px;" 
                    onclick="sendPuppyCommand('create_post', ${p.id})">📝 Пост</button>
                <button class="btn btn-primary" style="flex:1; padding:10px; font-size:13px;" 
                    onclick="sendPuppyCommand('avito', ${p.id})">📦 Авито</button>
                <button class="btn" style="flex:1; padding:10px; font-size:13px; background:rgba(76,175,80,0.2); color:#4CAF50;" 
                    onclick="sendPuppyCommand('mark_sold', ${p.id})">✅ Продан</button>
            </div>
        `;
    }).join('');
}

function loadAvitoPuppies() {
    const list = document.getElementById('avito-puppies-list');
    list.innerHTML = demoPuppies.map(p => {
        const genderEmoji = p.gender === 'мальчик' ? '♂️' : '♀️';
        return `
            <div class="option-card" onclick="sendPuppyCommand('avito', ${p.id})">
                <span class="option-icon">${p.emoji}</span>
                <span class="option-text">${genderEmoji} ${p.name} (${p.breed})</span>
            </div>
        `;
    }).join('');
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    loadPuppiesPreview();
    
    // Демо-данные статистики
    document.getElementById('stat-sold').textContent = '5';
    document.getElementById('stat-queue').textContent = '3';
});
