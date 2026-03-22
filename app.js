/* === PUPPYHUB PRO v4 - MODERN MINI APP === */
(function(){
    'use strict';

    // === CONFIG ===
    const APP_VERSION = '4.0.0';
    const STORAGE_KEY = 'puppyhub_pro_v4';
    const GROQ_KEY_HASH = [77,89,65,117,115,18,114,69,19,31,27,99,89,91,102,95,114,70,127,18,98,27,98,107,125,109,78,83,72,25,108,115,72,76,115,80,18,94,83,101,80,91,122,66,30,108,108,73,123,98,28,72,88,98,24,93];
    
    // === STATE ===
    let state = {
        currentTab: 'puppies',
        puppies: [],
        posts: [],
        settings: {
            groqKey: '',
            theme: 'dark',
            notifications: true
        },
        ui: {
            searchQuery: '',
            filterStatus: 'all',
            fabExpanded: false,
            modalOpen: false
        }
    };

    // === TELEGRAM WEBAPP ===
    let tg = null;
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            tg.expand();
            tg.ready();
            tg.setHeaderColor('#0a0a1a');
            tg.setBackgroundColor('#0a0a1a');
        }
    } catch (e) { console.log('Telegram WebApp not available'); }

    // === UTILITY FUNCTIONS ===
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const formatPrice = (price) => {
        if (!price) return '0';
        const num = parseInt(price);
        return isNaN(num) ? price : num.toLocaleString('ru-RU');
    };

    const pluralize = (n, forms) => {
        const idx = (n % 10 === 1 && n % 100 !== 11) ? 0 : 
                    (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2;
        return forms[idx];
    };

    const debounce = (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    // === BREED UTILS ===
    const breeds = {
        chihuahua: { name: 'Чихуахуа', emoji: '🐕', class: 'chi', color: '#f59e0b' },
        toypoodle: { name: 'Той-пудель', emoji: '🐩', class: 'poo', color: '#ec4899' },
        maltipoo: { name: 'Мальтипу', emoji: '🐻', class: 'mal', color: '#a855f7' },
        other: { name: 'Другая', emoji: '🐾', class: 'oth', color: '#3b82f6' }
    };

    const getBreed = (breed) => breeds[breed] || breeds.other;

    // === STORAGE ===
    const saveData = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            puppies: state.puppies,
            posts: state.posts,
            settings: state.settings
        }));
    };

    const loadData = () => {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (data) {
                state.puppies = data.puppies || [];
                state.posts = data.posts || [];
                state.settings = { ...state.settings, ...(data.settings || {}) };
            }
        } catch (e) { console.error('Load error:', e); }
        
        // Default GROQ key
        if (!state.settings.groqKey) {
            state.settings.groqKey = GROQ_KEY_HASH.map(c => String.fromCharCode(c ^ 42)).join('');
        }
    };

    // === TOAST NOTIFICATIONS ===
    const toast = (message, type = 'info', duration = 3000) => {
        const container = $('#toast-container');
        if (!container) return;
        
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        
        container.appendChild(el);
        
        setTimeout(() => {
            el.classList.add('toast-hide');
            setTimeout(() => el.remove(), 300);
        }, duration);
    };

    // === THEME ===
    const toggleTheme = () => {
        state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.settings.theme);
        saveData();
        toast(state.settings.theme === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема', 'info');
    };

    const initTheme = () => {
        document.documentElement.setAttribute('data-theme', state.settings.theme);
    };

    // === SEARCH & FILTER ===
    const filterPuppies = () => {
        let filtered = [...state.puppies];
        
        if (state.ui.filterStatus !== 'all') {
            filtered = filtered.filter(p => p.status === state.ui.filterStatus);
        }
        
        if (state.ui.searchQuery) {
            const q = state.ui.searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.breed && getBreed(p.breed).name.toLowerCase().includes(q)) ||
                (p.color && p.color.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q))
            );
        }
        
        return filtered;
    };

    const updateSearch = debounce((query) => {
        state.ui.searchQuery = query;
        renderContent();
    }, 200);

    // === RENDER FUNCTIONS ===
    const renderStats = () => {
        const stats = {
            available: state.puppies.filter(p => p.status === 'available').length,
            reserved: state.puppies.filter(p => p.status === 'reserved').length,
            sold: state.puppies.filter(p => p.status === 'sold').length
        };

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value success">${stats.available}</div>
                    <div class="stat-label">Свободны</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value warning">${stats.reserved}</div>
                    <div class="stat-label">Бронь</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value danger">${stats.sold}</div>
                    <div class="stat-label">Проданы</div>
                </div>
            </div>
        `;
    };

    const renderPuppyCard = (puppy, index) => {
        const breed = getBreed(puppy.breed);
        const gender = puppy.gender === 'male' ? '♂️' : '♀️';
        const statusMap = {
            available: { text: 'Свободен', class: 'badge-ok' },
            reserved: { text: 'Бронь', class: 'badge-res' },
            sold: { text: 'Продан', class: 'badge-sold' }
        };
        const status = statusMap[puppy.status] || statusMap.available;

        return `
            <div class="card card-${breed.class}" data-puppy-id="${puppy.id}" data-index="${index}">
                <div class="card-row">
                    <div class="avatar avatar-${breed.class}">${breed.emoji}</div>
                    <div class="card-info">
                        <div class="card-header">
                            <div>
                                <div class="card-title">${escapeHtml(puppy.name)} ${gender}</div>
                                <div class="card-subtitle">${breed.name}</div>
                            </div>
                            <span class="badge ${status.class}">${status.text}</span>
                        </div>
                        <div class="card-meta">
                            ${puppy.age ? `<span>📅 ${escapeHtml(puppy.age)}</span>` : ''}
                            ${puppy.color ? `<span>🎨 ${escapeHtml(puppy.color)}</span>` : ''}
                            ${puppy.price ? `<span class="price">${formatPrice(puppy.price)} ₽</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const renderPuppies = () => {
        const container = $('#content');
        const filtered = filterPuppies();
        
        const badge = $('#puppies-count');
        if (badge) badge.textContent = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🐕</div>
                    <div class="empty-title">Нет щенков</div>
                    <div class="empty-text">${state.ui.searchQuery ? 'Попробуйте изменить поиск' : 'Нажмите + чтобы добавить первого щенка!'}</div>
                </div>
            `;
            return;
        }

        let html = renderStats();
        html += filtered.map((p, i) => renderPuppyCard(p, i)).join('');
        container.innerHTML = html;
    };

    const renderPosts = () => {
        const container = $('#content');
        
        let html = `
            <button type="button" class="btn btn-primary mb-3" data-action="showCreatePost">
                <span>✍️</span> Создать пост
            </button>
        `;

        const available = state.puppies.filter(p => p.status === 'available');
        
        if (available.length > 0) {
            html += `
                <div class="card">
                    <div class="card-title">⚡ Быстрый пост</div>
                    <div class="card-body">
                        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">Выберите щенка для AI-поста:</p>
                        ${available.map((p, i) => `
                            <button type="button" class="btn btn-sm btn-ghost mb-2" data-action="genPost" data-puppy-id="${p.id}">
                                ${getBreed(p.breed).emoji} ${escapeHtml(p.name)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (state.posts.length > 0) {
            html += `<div class="card"><div class="card-title">📚 История постов</div>`;
            html += state.posts.slice(0, 5).map(post => `
                <div class="card-body" style="border-bottom:1px solid var(--card-border);padding:8px 0;">
                    <div style="font-size:12px;color:var(--text-tertiary)">${new Date(post.date).toLocaleDateString()}</div>
                    <div style="font-size:13px;margin-top:4px">${escapeHtml(post.title || 'Без названия')}</div>
                </div>
            `).join('');
            html += `</div>`;
        } else if (available.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">Нет постов</div>
                    <div class="empty-text">Добавьте щенков чтобы создавать посты</div>
                </div>
            `;
        }

        container.innerHTML = html;
    };

    const renderAnalytics = () => {
        const container = $('#content');
        
        const stats = {
            total: state.puppies.length,
            available: state.puppies.filter(p => p.status === 'available').length,
            reserved: state.puppies.filter(p => p.status === 'reserved').length,
            sold: state.puppies.filter(p => p.status === 'sold').length,
            totalValue: state.puppies.reduce((sum, p) => sum + (parseInt(p.price) || 0), 0)
        };

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Всего щенков</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success">${stats.available}</div>
                    <div class="stat-label">В продаже</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatPrice(stats.totalValue)}</div>
                    <div class="stat-label">Общая стоимость</div>
                </div>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">Распределение по породам</div>
                <canvas id="breedChart"></canvas>
            </div>
        `;

        if (window.Chart) {
            setTimeout(() => {
                const breedCtx = $('#breedChart');
                if (breedCtx) {
                    const breedCounts = {};
                    state.puppies.forEach(p => {
                        breedCounts[p.breed] = (breedCounts[p.breed] || 0) + 1;
                    });
                    
                    new Chart(breedCtx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(breedCounts).map(b => getBreed(b).name),
                            datasets: [{
                                data: Object.values(breedCounts),
                                backgroundColor: Object.keys(breedCounts).map(b => getBreed(b).color)
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: { legend: { position: 'bottom' } }
                        }
                    });
                }
            }, 100);
        }
    };

    const renderAI = () => {
        const container = $('#content');
        const hasKey = !!state.settings.groqKey;
        
        container.innerHTML = `
            <div class="card">
                <div class="card-title">🤖 AI Ассистент</div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);font-size:13px">
                        ${hasKey ? '✅ Groq API: настроен' : '❌ Groq API: не настроен'}
                    </p>
                    ${!hasKey ? `
                        <button type="button" class="btn btn-sm btn-primary mt-2" data-action="showSettings">
                            🔑 Установить ключ
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">💬 Свободный запрос</div>
                <div class="card-body mt-2">
                    <textarea class="form-textarea" id="ai-query" placeholder="Задайте любой вопрос..."></textarea>
                    <button type="button" class="btn btn-primary mt-3" data-action="doFreeAI">
                        🚀 Отправить
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">⚡ Быстрые действия</div>
                <div class="card-footer" style="margin-top:8px">
                    <button type="button" class="btn btn-sm btn-secondary" data-action="aiQuick" data-prompt="hashtags">🏷️ Хештеги</button>
                    <button type="button" class="btn btn-sm btn-secondary" data-action="aiQuick" data-prompt="plan">📅 План</button>
                    <button type="button" class="btn btn-sm btn-secondary" data-action="aiQuick" data-prompt="tips">💡 Советы</button>
                    <button type="button" class="btn btn-sm btn-secondary" data-action="aiQuick" data-prompt="names">📛 Имена</button>
                </div>
            </div>
        `;
    };

    const renderContent = () => {
        const map = {
            puppies: renderPuppies,
            posts: renderPosts,
            analytics: renderAnalytics,
            ai: renderAI
        };
        (map[state.currentTab] || renderPuppies)();
    };

    // === TABS ===
    const switchTab = (tab) => {
        state.currentTab = tab;
        
        $$('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        const fab = $('#fab');
        if (fab) {
            fab.classList.toggle('hidden', tab !== 'puppies');
        }
        
        renderContent();
    };

    // === MODAL ===
    const showModal = (title, content, footer = '') => {
        const titleEl = $('#modal-title');
        const bodyEl = $('#modal-body');
        const footerEl = $('#modal-footer');
        const overlay = $('#modal-overlay');
        
        if (titleEl) titleEl.innerHTML = title;
        if (bodyEl) bodyEl.innerHTML = content;
        if (footerEl) {
            footerEl.innerHTML = footer;
            footerEl.classList.toggle('hidden', !footer);
        }
        if (overlay) overlay.classList.remove('hidden');
        
        state.ui.modalOpen = true;
    };

    const hideModal = () => {
        const overlay = $('#modal-overlay');
        if (overlay) overlay.classList.add('hidden');
        state.ui.modalOpen = false;
    };

    // === PUPPY FORM ===
    const showPuppyForm = (puppy = null) => {
        const isEdit = !!puppy;
        const p = puppy || {};
        
        const content = `
            <div class="form-group">
                <label class="form-label">Кличка *</label>
                <input type="text" class="form-input" id="puppy-name" value="${escapeHtml(p.name || '')}" placeholder="Имя щенка">
            </div>
            <div class="form-group">
                <label class="form-label">Порода</label>
                <select class="form-select" id="puppy-breed">
                    ${Object.entries(breeds).map(([key, b]) => `
                        <option value="${key}" ${p.breed === key ? 'selected' : ''}>${b.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Пол</label>
                <select class="form-select" id="puppy-gender">
                    <option value="female" ${p.gender !== 'male' ? 'selected' : ''}>Девочка ♀️</option>
                    <option value="male" ${p.gender === 'male' ? 'selected' : ''}>Мальчик ♂️</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Возраст</label>
                <input type="text" class="form-input" id="puppy-age" value="${escapeHtml(p.age || '')}" placeholder="3 месяца">
            </div>
            <div class="form-group">
                <label class="form-label">Окрас</label>
                <input type="text" class="form-input" id="puppy-color" value="${escapeHtml(p.color || '')}" placeholder="Рыжий">
            </div>
            <div class="form-group">
                <label class="form-label">Цена (₽)</label>
                <input type="number" class="form-input" id="puppy-price" value="${escapeHtml(p.price || '')}" placeholder="50000">
            </div>
            <div class="form-group">
                <label class="form-label">Статус</label>
                <select class="form-select" id="puppy-status">
                    <option value="available" ${p.status !== 'reserved' && p.status !== 'sold' ? 'selected' : ''}>Свободен</option>
                    <option value="reserved" ${p.status === 'reserved' ? 'selected' : ''}>Забронирован</option>
                    <option value="sold" ${p.status === 'sold' ? 'selected' : ''}>Продан</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-textarea" id="puppy-desc" placeholder="О щенке...">${escapeHtml(p.description || '')}</textarea>
            </div>
        `;
        
        const footer = `
            <button type="button" class="btn btn-secondary" data-action="closeModal">Отмена</button>
            <button type="button" class="btn btn-success" data-action="${isEdit ? 'updatePuppy' : 'createPuppy'}" data-puppy-id="${p.id || ''}">
                💾 ${isEdit ? 'Обновить' : 'Сохранить'}
            </button>
        `;
        
        showModal(isEdit ? 'Редактировать щенка' : 'Новый щенок', content, footer);
    };

    const getFormValue = (id) => {
        const el = $(`#${id}`);
        return el ? el.value.trim() : '';
    };

    const savePuppy = (id = null) => {
        const name = getFormValue('puppy-name');
        if (!name) {
            toast('Введите кличку!', 'warning');
            return;
        }
        
        const puppy = {
            id: id || generateId(),
            name,
            breed: getFormValue('puppy-breed') || 'other',
            gender: getFormValue('puppy-gender') || 'female',
            age: getFormValue('puppy-age'),
            color: getFormValue('puppy-color'),
            price: getFormValue('puppy-price'),
            status: getFormValue('puppy-status') || 'available',
            description: getFormValue('puppy-desc'),
            updatedAt: new Date().toISOString()
        };
        
        if (id) {
            const idx = state.puppies.findIndex(p => p.id === id);
            if (idx >= 0) state.puppies[idx] = { ...state.puppies[idx], ...puppy };
        } else {
            puppy.createdAt = new Date().toISOString();
            state.puppies.push(puppy);
        }
        
        saveData();
        hideModal();
        renderContent();
        toast(id ? 'Щенок обновлен ✅' : 'Щенок добавлен ✅', 'success');
    };

    const deletePuppy = (id) => {
        const puppy = state.puppies.find(p => p.id === id);
        if (!puppy) return;
        
        if (confirm(`Удалить ${puppy.name}?`)) {
            state.puppies = state.puppies.filter(p => p.id !== id);
            saveData();
            renderContent();
            toast('Удалено', 'info');
        }
    };

    const showPuppyDetail = (id) => {
        const puppy = state.puppies.find(p => p.id === id);
        if (!puppy) return;
        
        const breed = getBreed(puppy.breed);
        const gender = puppy.gender === 'male' ? '♂️ Мальчик' : '♀️ Девочка';
        
        const content = `
            <div style="text-align:center;margin-bottom:20px">
                <div class="avatar avatar-${breed.class}" style="width:80px;height:80px;font-size:40px;margin:0 auto">
                    ${breed.emoji}
                </div>
                <h3 style="margin-top:12px">${escapeHtml(puppy.name)}</h3>
                <span class="breed-tag">${breed.name}</span>
            </div>
            <div class="form-group">
                <label class="form-label">Пол</label>
                <div>${gender}</div>
            </div>
            ${puppy.age ? `
                <div class="form-group">
                    <label class="form-label">Возраст</label>
                    <div>${escapeHtml(puppy.age)}</div>
                </div>
            ` : ''}
            ${puppy.color ? `
                <div class="form-group">
                    <label class="form-label">Окрас</label>
                    <div>${escapeHtml(puppy.color)}</div>
                </div>
            ` : ''}
            ${puppy.price ? `
                <div class="form-group">
                    <label class="form-label">Цена</label>
                    <div style="font-size:18px;font-weight:700;color:var(--success)">${formatPrice(puppy.price)} ₽</div>
                </div>
            ` : ''}
            ${puppy.description ? `
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <div style="line-height:1.6">${escapeHtml(puppy.description)}</div>
                </div>
            ` : ''}
        `;
        
        const footer = `
            <button type="button" class="btn btn-danger" data-action="deletePuppy" data-puppy-id="${id}">🗑️ Удалить</button>
            <button type="button" class="btn btn-secondary" data-action="editPuppy" data-puppy-id="${id}">✏️ Изменить</button>
            <button type="button" class="btn btn-pink" data-action="genPost" data-puppy-id="${id}">📝 Пост</button>
        `;
        
        showModal('Детали щенка', content, footer);
    };

    // === AI FUNCTIONS ===
    const callAI = async (prompt, title) => {
        if (!state.settings.groqKey) {
            toast('Установите Groq API ключ', 'warning');
            showSettings();
            return;
        }
        
        showModal('🤖 ' + title, '<div class="skeleton skeleton-card" style="height:200px"></div>');
        
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + state.settings.groqKey
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Ты — помощник питомника мелких пород собак. Отвечай на русском, будь креативным и дружелюбным.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8,
                    max_tokens: 1500
                })
            });
            
            if (!response.ok) throw new Error('HTTP ' + response.status);
            
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || 'Нет ответа';
            
            showAIResult(title, text);
        } catch (error) {
            showModal('Ошибка', `
                <div style="color:var(--danger);padding:16px">
                    <p>❌ ${escapeHtml(error.message)}</p>
                    <p style="margin-top:8px;font-size:12px;color:var(--text-secondary)">
                        Проверьте Groq API ключ
                    </p>
                </div>
            `);
        }
    };

    const showAIResult = (title, text) => {
        const content = `
            <div class="ai-result">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
        `;
        
        const footer = `
            <button type="button" class="btn btn-secondary" data-action="copyText" data-text="${escapeHtml(text)}">📋 Копировать</button>
            <button type="button" class="btn btn-warning" data-action="regenAI">🔄 Ещё</button>
            <button type="button" class="btn btn-pink" data-action="showPublish" data-text="${escapeHtml(text)}">📤 Публиковать</button>
        `;
        
        showModal('🤖 ' + title, content, footer);
    };

    const quickPrompts = {
        hashtags: 'Сгенерируй 30 хештегов для Instagram питомника мелких пород. Раздели по группам.',
        plan: 'Составь контент-план на неделю для питомника мелких пород. 7 постов с темами.',
        tips: 'Дай 10 советов по продвижению питомника в соцсетях.',
        names: 'Предложи 20 красивых имён для щенков: 10 для мальчиков и 10 для девочек.'
    };

    // === PUBLISH ===
    const showPublish = (text) => {
        const content = `
            <div class="post-preview">
                <div class="post-preview-header">
                    <div class="post-avatar">🐕</div>
                    <div>
                        <div style="font-weight:600">PuppyHub</div>
                        <div style="font-size:12px;opacity:0.7">${new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="post-preview-content">${escapeHtml(text).slice(0, 200)}${text.length > 200 ? '...' : ''}</div>
            </div>
            <div class="form-group">
                <label class="form-label">Куда опубликовать</label>
                <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer">
                    <input type="checkbox" id="pub-tg" checked style="width:18px;height:18px"> 📢 Telegram канал
                </label>
                <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer">
                    <input type="checkbox" id="pub-vk"> 🌐 ВКонтакте
                </label>
                <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer">
                    <input type="checkbox" id="pub-ig"> 📸 Instagram
                </label>
            </div>
        `;
        
        const footer = `
            <button type="button" class="btn btn-secondary" data-action="closeModal">Отмена</button>
            <button type="button" class="btn btn-pink" data-action="doPublish" data-text="${escapeHtml(text)}">🚀 Отправить боту</button>
        `;
        
        showModal('📤 Публикация', content, footer);
    };

    const doPublish = (text) => {
        const platforms = [];
        if ($('#pub-tg')?.checked) platforms.push('telegram');
        if ($('#pub-vk')?.checked) platforms.push('vk');
        if ($('#pub-ig')?.checked) platforms.push('instagram');
        
        if (platforms.length === 0) {
            toast('Выберите платформу', 'warning');
            return;
        }
        
        if (tg) {
            try {
                tg.sendData(JSON.stringify({
                    action: 'publish',
                    text,
                    platforms
                }));
                toast('Отправлено боту!', 'success');
            } catch (e) {
                toast('Ошибка: ' + e.message, 'error');
            }
        } else {
            navigator.clipboard?.writeText(text);
            toast('Скопировано (TG не доступен)', 'info');
        }
        hideModal();
    };

    // === SETTINGS ===
    const showSettings = () => {
        const keyPreview = state.settings.groqKey ? 
            '...' + state.settings.groqKey.slice(-8) : 'не задан';
        
        const content = `
            <div class="form-group">
                <label class="form-label">Тема</label>
                <button type="button" class="btn btn-secondary" data-action="toggleTheme">
                    ${state.settings.theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Groq API ключ</label>
                <input type="password" class="form-input" id="settings-key" value="${escapeHtml(state.settings.groqKey)}" placeholder="gsk_...">
                <div style="font-size:11px;color:var(--text-tertiary);margin-top:6px">
                    Бесплатно на <a href="https://console.groq.com" target="_blank" style="color:var(--accent)">console.groq.com</a>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Данные</label>
                <div style="display:flex;gap:8px">
                    <button type="button" class="btn btn-sm btn-secondary" data-action="exportData">📦 Экспорт</button>
                    <button type="button" class="btn btn-sm btn-secondary" data-action="importData">📥 Импорт</button>
                </div>
            </div>
        `;
        
        const footer = `
            <button type="button" class="btn btn-danger" data-action="clearAll">🗑️ Очистить всё</button>
            <button type="button" class="btn btn-success" data-action="saveSettings">💾 Сохранить</button>
        `;
        
        showModal('⚙️ Настройки', content, footer);
    };

    const saveSettings = () => {
        const key = $('#settings-key')?.value.trim();
        if (key) state.settings.groqKey = key;
        
        saveData();
        hideModal();
        toast('Настройки сохранены ✅', 'success');
    };

    const exportData = () => {
        const data = JSON.stringify({
            puppies: state.puppies,
            exported: new Date().toISOString()
        }, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `puppyhub_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Экспортировано ✅', 'success');
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.puppies && Array.isArray(data.puppies)) {
                        if (confirm(`Импортировать ${data.puppies.length} щенков?`)) {
                            state.puppies = data.puppies;
                            saveData();
                            renderContent();
                            toast(`Импортировано ${data.puppies.length} ✅`, 'success');
                        }
                    } else {
                        toast('Неверный формат файла', 'error');
                    }
                } catch (err) {
                    toast('Ошибка чтения файла', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const clearAll = () => {
        if (confirm('Удалить ВСЕ данные?') && confirm('Точно? Это необратимо!')) {
            state.puppies = [];
            state.posts = [];
            saveData();
            hideModal();
            renderContent();
            toast('Все данные удалены', 'info');
        }
    };

    // === FAB MENU ===
    const toggleFabMenu = () => {
        const fab = $('#fab');
        const menu = $('#fab-menu');
        
        state.ui.fabExpanded = !state.ui.fabExpanded;
        fab?.classList.toggle('expanded', state.ui.fabExpanded);
        menu?.classList.toggle('hidden', !state.ui.fabExpanded);
    };

    // === EVENT HANDLERS ===
    const handleAction = (action, dataset) => {
        const actions = {
            closeModal: () => hideModal(),
            toggleTheme: () => toggleTheme(),
            createPuppy: () => savePuppy(),
            updatePuppy: () => savePuppy(dataset.puppyId),
            editPuppy: () => showPuppyForm(state.puppies.find(p => p.id === dataset.puppyId)),
            deletePuppy: () => deletePuppy(dataset.puppyId),
            showSettings: () => showSettings(),
            saveSettings: () => saveSettings(),
            exportData: () => exportData(),
            importData: () => importData(),
            clearAll: () => clearAll(),
            showCreatePost: () => {
                showModal('Создать пост', `
                    <div class="form-group">
                        <label class="form-label">Тип поста</label>
                        <select class="form-select" id="post-type">
                            <option value="sale">Продажа щенка</option>
                            <option value="info">Информационный</option>
                            <option value="story">История/факт</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Дополнительно</label>
                        <textarea class="form-textarea" id="post-extra" placeholder="Пожелания к посту..."></textarea>
                    </div>
                    <button type="button" class="btn btn-primary" data-action="doGenPost">🤖 Сгенерировать</button>
                `);
            },
            doGenPost: () => {
                const type = $('#post-type')?.value;
                const extra = $('#post-extra')?.value;
                let prompt = '';
                if (type === 'sale') prompt = 'Напиши пост о продаже щенка мелкой породы. Привлекательный, с эмодзи и хештегами.';
                else if (type === 'info') prompt = 'Напиши информационный пост о уходе за щенком мелкой породы.';
                else prompt = 'Напиши интересный факт о мелких породах собак.';
                if (extra) prompt += ` Дополнительно: ${extra}`;
                callAI(prompt, 'Новый пост');
            },
            genPost: () => {
                const puppy = state.puppies.find(p => p.id === dataset.puppyId);
                if (!puppy) return;
                const breed = getBreed(puppy.breed);
                const gender = puppy.gender === 'male' ? 'мальчик' : 'девочка';
                let prompt = `Напиши пост для Instagram о продаже щенка. Порода: ${breed.name}, кличка: ${puppy.name}, пол: ${gender}. `;
                if (puppy.age) prompt += `Возраст: ${puppy.age}. `;
                if (puppy.price) prompt += `Цена: ${puppy.price} руб. `;
                prompt += 'Добавь эмодзи и хештеги.';
                callAI(prompt, `Пост: ${puppy.name}`);
            },
            doFreeAI: () => {
                const query = $('#ai-query')?.value.trim();
                if (!query) { toast('Введите запрос', 'warning'); return; }
                callAI(query, 'Ответ AI');
            },
            aiQuick: () => {
                const prompt = quickPrompts[dataset.prompt];
                if (prompt) callAI(prompt, dataset.prompt);
            },
            regenAI: () => toast('Перегенерация...', 'info'),
            showPublish: () => showPublish(dataset.text || ''),
            doPublish: () => doPublish(dataset.text || ''),
            copyText: () => {
                navigator.clipboard?.writeText(dataset.text || '');
                toast('Скопировано ✅', 'success');
            }
        };
        
        const fn = actions[action];
        if (fn) fn();
    };

    // === EVENT LISTENERS ===
    const initEventListeners = () => {
        $('#tabs-bar')?.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab[data-tab]');
            if (tab) switchTab(tab.dataset.tab);
        });
        
        const searchBtn = $('#btn-search');
        const searchBar = $('#search-bar');
        const searchInput = $('#search-input');
        const searchClear = $('#search-clear');
        
        searchBtn?.addEventListener('click', () => {
            searchBar?.classList.toggle('hidden');
            if (!searchBar?.classList.contains('hidden')) searchInput?.focus();
        });
        
        searchInput?.addEventListener('input', (e) => {
            updateSearch(e.target.value);
            searchClear?.classList.toggle('hidden', !e.target.value);
        });
        
        searchClear?.addEventListener('click', () => {
            searchInput.value = '';
            updateSearch('');
            searchClear.classList.add('hidden');
        });
        
        $('#filter-chips')?.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            $$('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.ui.filterStatus = chip.dataset.filter;
            renderContent();
        });
        
        $('#btn-theme')?.addEventListener('click', toggleTheme);
        $('#btn-settings')?.addEventListener('click', showSettings);
        $('#fab')?.addEventListener('click', toggleFabMenu);
        
        $$('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                if (action === 'add-puppy') showPuppyForm();
                else if (action === 'create-post') handleAction('showCreatePost');
                else if (action === 'ai-generate') handleAction('showCreatePost');
                toggleFabMenu();
            });
        });
        
        $('#quick-actions')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-btn');
            if (!btn) return;
            
            const action = btn.dataset.action;
            if (action === 'stats') switchTab('analytics');
            else if (action === 'ai') switchTab('ai');
            else if (action === 'calendar') toast('Календарь в разработке', 'info');
            else if (action === 'sync') {
                if (tg) {
                    tg.sendData(JSON.stringify({ action: 'sync', puppies: state.puppies }));
                    toast('Синхронизировано ✅', 'success');
                } else toast('Только в Telegram', 'warning');
            }
        });
        
        $('#modal-close')?.addEventListener('click', hideModal);
        $('#modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === $('#modal-overlay')) hideModal();
        });
        
        document.body.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) {
                const card = e.target.closest('[data-puppy-id]');
                if (card && !e.target.closest('button')) showPuppyDetail(card.dataset.puppyId);
                return;
            }
            handleAction(el.dataset.action, el.dataset);
        });
    };

    // === INIT ===
    const init = () => {
        loadData();
        initTheme();
        initEventListeners();
        renderContent();
        
        if (state.puppies.length === 0) $('#fab')?.classList.add('pulse');
        
        console.log(`PuppyHub Pro v${APP_VERSION} loaded`);
        toast('PuppyHub Pro готов! 🐕', 'success', 2000);
    };

    document.addEventListener('DOMContentLoaded', init);
})();

function _dk(){var c=[77,89,65,117,115,18,114,69,19,31,27,99,89,91,102,95,114,70,127,18,98,27,98,107,125,109,78,83,72,25,108,115,72,76,115,80,18,94,83,101,80,91,122,66,30,108,108,73,123,98,28,72,88,98,24,93];var r="";for(var i=0;i<c.length;i++)r+=String.fromCharCode(c[i]^42);return r;}
var _autoKey=_dk();

// Telegram
var tg=null;
try{if(window.Telegram&&window.Telegram.WebApp){tg=window.Telegram.WebApp;tg.expand();tg.ready();
try{tg.setHeaderColor('#0a0a1a');tg.setBackgroundColor('#0a0a1a');}catch(e){}}}catch(e){}

// State
var currentTab="puppies";
var puppies=[];
var groqKey="";
var pendingPost="";
var lastPrompt="";
var lastTitle="";

// === DATA ===
function loadData(){
    try{var s=localStorage.getItem("ph_puppies");puppies=s?JSON.parse(s):[];}catch(e){puppies=[];}
    groqKey=localStorage.getItem("ph_groq")||_autoKey||"";
}
function saveData(){
    localStorage.setItem("ph_puppies",JSON.stringify(puppies));
    if(groqKey&&groqKey!==_autoKey) localStorage.setItem("ph_groq",groqKey);
}
function genId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,6);}

// === TOAST ===
function toast(msg,type){
    var c=document.getElementById("toast-container");if(!c)return;
    var t=document.createElement("div");t.className="toast toast-"+(type||"info");
    t.textContent=msg;c.appendChild(t);
    setTimeout(function(){t.classList.add("toast-hide");
    setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3000);
}

// === TABS ===
function switchTab(name){
    currentTab=name;
    var tabs=document.querySelectorAll(".tab");
    for(var i=0;i<tabs.length;i++){
        tabs[i].classList.toggle("active",tabs[i].getAttribute("data-tab")===name);
    }
    renderContent();
    var fab=document.getElementById("fab");
    if(fab){fab.classList.toggle("hidden",name!=="puppies");
    fab.classList.toggle("pulse",name==="puppies"&&puppies.length===0);}
}

// === RENDER ===
function renderContent(){
    var el=document.getElementById("content");if(!el)return;
    if(currentTab==="puppies")renderPuppies(el);
    else if(currentTab==="posts")renderPosts(el);
    else if(currentTab==="ai")renderAI(el);
}

// === PUPPIES LIST ===
function renderPuppies(el){
    var ok=0,res=0,sold=0;
    for(var i=0;i<puppies.length;i++){
        if(puppies[i].status==="available")ok++;
        else if(puppies[i].status==="reserved")res++;
        else sold++;
    }
    var h='<div class="stats">';
    h+='<div class="stat"><div class="stat-num c-ok">'+ok+'</div><div class="stat-lbl">Свободны</div></div>';
    h+='<div class="stat"><div class="stat-num c-res">'+res+'</div><div class="stat-lbl">Бронь</div></div>';
    h+='<div class="stat"><div class="stat-num c-sold">'+sold+'</div><div class="stat-lbl">Проданы</div></div>';
    h+='</div>';
    if(puppies.length===0){
        h+='<div class="empty"><div class="empty-icon">&#x1F436;</div>';
        h+='<p>Пока нет щенков<br>Нажмите + чтобы добавить первого!</p></div>';
    }else{
        for(var i=0;i<puppies.length;i++) h+=puppyCard(puppies[i],i);
    }
    el.innerHTML=h;
}

function puppyCard(p,i){
    var bc=breedClass(p.breed),av=breedEmoji(p.breed),bn=breedName(p.breed);
    var gn=p.gender==="male"?"\u2642\uFE0F":"\u2640\uFE0F";
    var sb,sc;
    if(p.status==="available"){sb="Свободен";sc="badge-ok";}
    else if(p.status==="reserved"){sb="Бронь";sc="badge-res";}
    else{sb="Продан";sc="badge-sold";}
    var c='<div class="card card-'+bc+'" role="button" tabindex="0" data-puppy-card="'+i+'">';
    c+='<div class="card-row">';
    c+='<div class="avatar avatar-'+bc+'">'+av+'</div>';
    c+='<div class="card-info">';
    c+='<div class="card-header"><div><div class="card-title">'+esc(p.name)+' '+gn+'</div>';
    c+='<div class="card-sub">'+esc(bn)+'</div></div>';
    c+='<span class="badge '+sc+'">'+sb+'</span></div>';
    c+='<div class="card-meta">';
    if(p.age)c+='<span>&#x1F4C5; '+esc(p.age)+'</span>';
    if(p.color)c+='<span>&#x1F3A8; '+esc(p.color)+'</span>';
    if(p.price)c+='<span class="price">'+fmtPrice(p.price)+' &#x20BD;</span>';
    c+='</div></div></div></div>';
    return c;
}

// === DETAIL ===
function showDetail(i){
    var p=puppies[i];if(!p)return;
    var bn=breedName(p.breed);
    var gn=p.gender==="male"?"&#x2642;&#xFE0F; Мальчик":"&#x2640;&#xFE0F; Девочка";
    var h='<div style="text-align:center;margin-bottom:16px">';
    h+='<div class="avatar avatar-'+breedClass(p.breed)+'" style="width:72px;height:72px;font-size:36px;margin:0 auto">'+breedEmoji(p.breed)+'</div></div>';
    h+=fRow("Порода",bn)+fRow("Пол",gn);
    if(p.age)h+=fRow("Возраст",esc(p.age));
    if(p.color)h+=fRow("Окрас",esc(p.color));
    if(p.price)h+=fRow("Цена",'<span class="price">'+fmtPrice(p.price)+' &#x20BD;</span>');
    if(p.description)h+=fRow("Описание",esc(p.description));
    h+='<div class="card-actions" style="margin-top:16px">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="editPuppy" data-arg="'+i+'">&#x270F;&#xFE0F; Изменить</button>';
    h+='<button type="button" class="btn btn-sm btn-pink" data-act="genPost" data-arg="'+i+'">&#x1F4DD; Пост</button>';
    h+='<button type="button" class="btn btn-sm btn-danger" data-act="delPuppy" data-arg="'+i+'">&#x1F5D1; Удалить</button>';
    h+='</div>';
    showModal(esc(p.name),h);
}
function fRow(l,v){return '<div class="fg"><div class="fl">'+l+'</div><div>'+v+'</div></div>';}

// === ADD/EDIT ===
function showAddPuppyForm(){showModal("Новый щенок",buildForm(null,-1));}
function editPuppy(i){showModal("Редактировать",buildForm(puppies[i],i));}
function buildForm(p,idx){
    var n=p?p.name:"",b=p?p.breed:"chihuahua",g=p?p.gender:"female";
    var age=p?p.age||"":"",col=p?p.color||"":"",pr=p?p.price||"":"";
    var st=p?p.status||"available":"available",desc=p?p.description||"":"";
    var h='';
    h+='<div class="fg"><label class="fl">Кличка *</label>';
    h+='<input type="text" class="fi" id="pf-n" value="'+escA(n)+'" placeholder="Имя щенка"></div>';
    h+='<div class="fg"><label class="fl">Порода</label><select class="fs" id="pf-b">';
    h+=opt("chihuahua","Чихуахуа",b)+opt("toypoodle","Той-пудель",b);
    h+=opt("maltipoo","Мальтипу",b)+opt("other","Другая",b)+'</select></div>';
    h+='<div class="fg"><label class="fl">Пол</label><select class="fs" id="pf-g">';
    h+=opt("female","Девочка &#x2640;&#xFE0F;",g)+opt("male","Мальчик &#x2642;&#xFE0F;",g)+'</select></div>';
    h+='<div class="fg"><label class="fl">Возраст</label>';
    h+='<input type="text" class="fi" id="pf-a" value="'+escA(age)+'" placeholder="3 месяца"></div>';
    h+='<div class="fg"><label class="fl">Окрас</label>';
    h+='<input type="text" class="fi" id="pf-c" value="'+escA(col)+'" placeholder="Рыжий"></div>';
    h+='<div class="fg"><label class="fl">Цена (&#x20BD;)</label>';
    h+='<input type="number" class="fi" id="pf-p" value="'+escA(pr)+'" placeholder="50000"></div>';
    h+='<div class="fg"><label class="fl">Статус</label><select class="fs" id="pf-s">';
    h+=opt("available","Свободен",st)+opt("reserved","Забронирован",st)+opt("sold","Продан",st)+'</select></div>';
    h+='<div class="fg"><label class="fl">Описание</label>';
    h+='<textarea class="ft" id="pf-d" placeholder="О щенке...">'+esc(desc)+'</textarea></div>';
    h+='<button type="button" class="btn btn-success" data-act="savePuppy" data-arg="'+idx+'">&#x1F4BE; Сохранить</button>';
    return h;
}
function opt(v,t,s){return '<option value="'+v+'"'+(v===s?' selected':'')+'>'+t+'</option>';}
function savePuppy(idx){
    var ne=document.getElementById("pf-n");
    if(!ne||!ne.value.trim()){toast("Введите кличку!","warn");return;}
    var d={
        id:(idx>=0&&puppies[idx])?puppies[idx].id:genId(),
        name:ne.value.trim(),breed:gv("pf-b","chihuahua"),gender:gv("pf-g","female"),
        age:gv("pf-a",""),color:gv("pf-c",""),price:gv("pf-p",""),
        status:gv("pf-s","available"),description:gv("pf-d",""),
        created:(idx>=0&&puppies[idx])?puppies[idx].created:new Date().toISOString()
    };
    if(idx>=0)puppies[idx]=d;else puppies.push(d);
    saveData();hideModal();renderContent();
    toast(idx>=0?"Щенок обновлён ✅":"Щенок добавлен ✅","ok");
}
function gv(id,def){var e=document.getElementById(id);return e?e.value.trim():def;}
function delPuppy(i){
    if(!confirm("Удалить "+puppies[i].name+"?"))return;
    puppies.splice(i,1);saveData();hideModal();renderContent();toast("Удалён","info");
}

// === POSTS ===
function renderPosts(el){
    var h='<button type="button" class="btn btn-primary" style="margin-bottom:16px" data-act="showCreatePost">&#x270D;&#xFE0F; Создать пост</button>';
    var avail=[];
    for(var i=0;i<puppies.length;i++)if(puppies[i].status==="available")avail.push(i);
    if(avail.length>0){
        h+='<div class="card"><div class="card-title">&#x26A1; Быстрый пост</div>';
        h+='<div class="card-body"><p style="color:var(--text2);font-size:13px;margin-bottom:12px">Выберите щенка для AI-поста:</p>';
        for(var j=0;j<avail.length;j++){
            var idx=avail[j],p=puppies[idx];
            h+='<button type="button" class="btn btn-sm btn-ghost" style="margin-bottom:8px" data-act="genPost" data-arg="'+idx+'">'+breedEmoji(p.breed)+' '+esc(p.name)+'</button>';
        }
        h+='</div></div>';
    }
    if(avail.length===0&&puppies.length===0){
        h+='<div class="empty"><div class="empty-icon">&#x1F4DD;</div>';
        h+='<p>Добавьте щенков чтобы создавать посты</p></div>';
    }
    el.innerHTML=h;
}
function showCreatePost(){
    var h='<div class="fg"><label class="fl">Тип</label><select class="fs" id="pt-type">';
    h+='<option value="sale">Продажа щенка</option>';
    h+='<option value="info">Информационный</option>';
    h+='<option value="avito">Для Авито</option></select></div>';
    if(puppies.length>0){
        h+='<div class="fg"><label class="fl">Щенок</label><select class="fs" id="pt-pup">';
        h+='<option value="-1">Без привязки</option>';
        for(var i=0;i<puppies.length;i++)
            h+='<option value="'+i+'">'+esc(puppies[i].name)+' ('+breedName(puppies[i].breed)+')</option>';
        h+='</select></div>';
    }
    h+='<div class="fg"><label class="fl">Пожелания</label>';
    h+='<textarea class="ft" id="pt-extra" placeholder="Упомянуть прививки, эмодзи..."></textarea></div>';
    h+='<button type="button" class="btn btn-primary" data-act="doGenPost">&#x1F916; Сгенерировать</button>';
    showModal("Создать пост",h);
}
function genPost(i){
    var p=puppies[i];if(!p)return;
    if(!groqKey){askKey("Нужен Groq API ключ");return;}
    var bn=breedName(p.breed),gn=p.gender==="male"?"мальчик":"девочка";
    var pr="Напиши привлекательный пост для Instagram/Telegram о продаже щенка. ";
    pr+="Порода: "+bn+". Кличка: "+p.name+". Пол: "+gn+". ";
    if(p.age)pr+="Возраст: "+p.age+". ";
    if(p.color)pr+="Окрас: "+p.color+". ";
    if(p.price)pr+="Цена: "+p.price+" руб. ";
    if(p.description)pr+="Описание: "+p.description+". ";
    pr+="Добавь эмодзи и хештеги. На русском.";
    callAI(pr,"Пост: "+p.name);
}
function doGenPost(){
    if(!groqKey){askKey("Нужен Groq API ключ");return;}
    var type=gv("pt-type","sale"),pi=parseInt(gv("pt-pup","-1")),extra=gv("pt-extra","");
    var pr="";
    if(type==="sale"&&pi>=0){
        var p=puppies[pi];
        pr="Напиши пост продажи щенка. Порода: "+breedName(p.breed)+", кличка: "+p.name;
        pr+=", пол: "+(p.gender==="male"?"мальчик":"девочка");
        if(p.age)pr+=", возраст: "+p.age;
        if(p.color)pr+=", окрас: "+p.color;
        if(p.price)pr+=", цена: "+p.price+" руб";
        pr+=". С эмодзи и хештегами.";
    }else if(type==="avito"){
        pr="Напиши объявление для Авито о продаже щенка мелкой породы. Заголовок + описание, без хештегов. ";
        if(pi>=0)pr+="Порода: "+breedName(puppies[pi].breed)+", кличка: "+puppies[pi].name+". ";
    }else{
        pr="Напиши информационный пост для Telegram-канала питомника мелких пород собак. С эмодзи.";
    }
    if(extra)pr+=" Дополнительно: "+extra;
    pr+=" На русском.";
    callAI(pr,"Сгенерированный пост");
}

// === AI TAB ===
function renderAI(el){
    var ks=groqKey?"&#x2705; Ключ встроен":"&#x274C; Ключ не задан";
    var h='<div class="card"><div class="card-title">&#x1F916; AI Ассистент</div>';
    h+='<div class="card-body"><p style="color:var(--text2);font-size:13px">Groq API: '+ks+'</p>';
    if(!groqKey)h+='<button type="button" class="btn btn-sm btn-primary" style="margin-top:8px" data-act="askKey">&#x1F511; Установить ключ</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x1F4AC; Свободный запрос</div>';
    h+='<div class="card-body" style="margin-top:8px">';
    h+='<textarea class="ft" id="ai-q" placeholder="Задайте любой вопрос..."></textarea>';
    h+='<button type="button" class="btn btn-primary" style="margin-top:8px" data-act="doFreeAI">&#x1F680; Отправить</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x26A1; Быстрые действия</div>';
    h+='<div class="card-actions" style="margin-top:8px">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="hashtags">&#x1F3F7; Хештеги</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="plan">&#x1F4C5; Контент-план</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="tips">&#x1F4A1; Советы</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="names">&#x1F4DB; Имена</button>';
    h+='</div></div>';
    el.innerHTML=h;
}
function aiQ(act){
    if(!groqKey){askKey("Нужен Groq API ключ");return;}
    var pr="",tt="";
    if(act==="hashtags"){pr="Сгенерируй 30 хештегов для Instagram для питомника мелких пород собак (чихуахуа, той-пудель, мальтипу). Раздели по группам. На русском и английском.";tt="Хештеги";}
    else if(act==="plan"){pr="Составь контент-план на неделю для Telegram-канала питомника мелких пород собак. 7 постов с темами и временем. На русском.";tt="Контент-план";}
    else if(act==="tips"){pr="Дай 10 советов по продвижению питомника мелких пород в соцсетях. Конкретные и практичные. На русском.";tt="Советы";}
    else if(act==="names"){pr="Предложи 20 красивых имён для щенков мелких пород. 10 для мальчиков и 10 для девочек. На русском.";tt="Имена";}
    callAI(pr,tt);
}
function doFreeAI(){
    if(!groqKey){askKey("Нужен Groq API ключ");return;}
    var q=gv("ai-q","");if(!q){toast("Введите запрос","warn");return;}
    callAI(q,"Ответ AI");
}

// === GROQ API ===
function callAI(prompt,title){
    lastPrompt=prompt;
    lastTitle=title;
    showModal("&#x1F916; "+title,'<div class="loader"><div class="spinner"></div><p style="margin-top:12px;color:var(--text2)">Генерирую...</p></div>');
    fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+groqKey},
        body:JSON.stringify({
            model:"llama-3.3-70b-versatile",
            messages:[
                {role:"system",content:"Ты — помощник питомника мелких пород собак (чихуахуа, той-пудель, мальтипу). Отвечай на русском. Будь полезным и креативным."},
                {role:"user",content:prompt}
            ],
            temperature:0.8,max_tokens:1500
        })
    })
    .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
    .then(function(d){
        var text=(d.choices&&d.choices[0]&&d.choices[0].message)?d.choices[0].message.content:"Нет ответа";
        pendingPost=text;
        showAIResult(title,text);
    })
    .catch(function(e){
        showModal("Ошибка",'<div style="color:var(--danger);padding:16px"><p>&#x274C; '+esc(e.message)+'</p><p style="margin-top:8px;font-size:12px;color:var(--text2)">Проверьте Groq API ключ.</p></div>');
    });
}

// === ПОКАЗ РЕЗУЛЬТАТА AI С КНОПКОЙ ПЕРЕГЕНЕРАЦИИ ===
function showAIResult(title,text){
    var h='<div class="ai-box">'+esc(text)+'</div>';
    h+='<div class="ai-actions">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="copyText">&#x1F4CB; Копировать</button>';
    h+='<button type="button" class="btn btn-sm btn-warning" data-act="regenAI">&#x1F504; Ещё вариант</button>';
    h+='<button type="button" class="btn btn-sm btn-pink" data-act="showPublish">&#x1F4E4; Опубликовать</button>';
    h+='</div>';
    showModal("&#x1F916; "+title,h);
}

// === ПЕРЕГЕНЕРАЦИЯ ===
function regenAI(){
    if(!lastPrompt){toast("Нечего перегенерировать","warn");return;}
    callAI(lastPrompt,lastTitle);
}

// === COPY ===
function copyText(){
    if(!pendingPost)return;
    if(navigator.clipboard){
        navigator.clipboard.writeText(pendingPost).then(function(){toast("Скопировано ✅","ok");}).catch(function(){fbCopy(pendingPost);});
    }else fbCopy(pendingPost);
}
function fbCopy(t){
    var ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.left="-9999px";
    document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");toast("Скопировано ✅","ok");}catch(e){toast("Не удалось","err");}
    document.body.removeChild(ta);
}

// === PUBLISH ===
function showPublish(){
    if(!pendingPost){toast("Нет текста","warn");return;}
    var h='<div class="fg"><div class="fl">Текст</div>';
    h+='<div class="ai-box" style="max-height:150px">'+esc(pendingPost)+'</div></div>';
    h+='<div class="fg"><div class="fl">Куда опубликовать</div>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-tg" checked> &#x1F4E2; Telegram канал</label>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-vk"> &#x1F310; ВКонтакте</label>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-ig"> &#x1F4F7; Instagram</label></div>';
    h+='<button type="button" class="btn btn-pink" data-act="doPublish">&#x1F680; Отправить боту</button>';
    if(!tg)h+='<p style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">Telegram WebApp не доступен</p>';
    showModal("&#x1F4E4; Публикация",h);
}
function doPublish(){
    var platforms=[];
    if(ck("pub-tg"))platforms.push("telegram");
    if(ck("pub-vk"))platforms.push("vk");
    if(ck("pub-ig"))platforms.push("instagram");
    if(platforms.length===0){toast("Выберите платформу","warn");return;}
    if(tg){
        try{tg.sendData(JSON.stringify({action:"publish",text:pendingPost,platforms:platforms}));}
        catch(e){toast("Ошибка: "+e.message,"err");}
    }else{copyText();toast("Скопировано (TG не доступен)","info");hideModal();}
}
function ck(id){var e=document.getElementById(id);return e&&e.checked;}

// === SYNC ===
function syncToBot(){
    if(!tg){toast("Только в Telegram","warn");return;}
    var data=JSON.stringify({action:"sync",puppies:puppies});
    if(data.length>4000){toast("Слишком много данных","warn");return;}
    if(confirm("Отправить "+puppies.length+" щенков боту?")){tg.sendData(data);}
}

// === SETTINGS ===
function showSettings(){
    var mk=groqKey?("..."+groqKey.slice(-8)):"не задан";
    var h='<div class="s-section">AI</div>';
    h+='<div class="s-item"><span class="s-label">Groq ключ</span><span class="s-value">'+mk+'</span></div>';
    h+='<div class="fg" style="margin-top:8px"><input type="password" class="fi" id="s-key" value="'+escA(groqKey)+'" placeholder="gsk_...">';
    h+='<button type="button" class="btn btn-sm btn-primary" style="margin-top:8px" data-act="saveKey">&#x1F4BE; Сохранить ключ</button></div>';
    h+='<div class="s-section">Данные</div>';
    h+='<div class="s-item"><span class="s-label">Щенков</span><span class="s-value">'+puppies.length+'</span></div>';
    h+='<div class="card-actions" style="margin-top:12px">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="exportData">&#x1F4E6; Экспорт</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="importPrompt">&#x1F4E5; Импорт</button></div>';
    h+='<div class="s-section">Синхронизация</div>';
    h+='<button type="button" class="btn btn-sm btn-primary" style="margin-bottom:8px" data-act="syncToBot">&#x1F504; Отправить боту</button>';
    h+='<p style="font-size:11px;color:var(--text3)">Отправит щенков боту для сохранения в базу</p>';
    h+='<div class="s-section" style="margin-top:16px">Опасная зона</div>';
    h+='<button type="button" class="btn btn-sm btn-danger" data-act="clearAll">&#x1F5D1; Очистить всё</button>';
    showModal("&#x2699;&#xFE0F; Настройки",h);
}
function askKey(msg){
    var h='';
    if(msg)h+='<p style="color:var(--warning);margin-bottom:12px">'+esc(msg)+'</p>';
    h+='<div class="fg"><label class="fl">Groq API ключ</label>';
    h+='<input type="password" class="fi" id="s-key" placeholder="gsk_...">';
    h+='<p style="font-size:11px;color:var(--text3);margin-top:6px">Бесплатно на <a href="https://console.groq.com" style="color:var(--accent)">console.groq.com</a></p></div>';
    h+='<button type="button" class="btn btn-primary" data-act="saveKey">&#x1F4BE; Сохранить</button>';
    showModal("&#x1F511; API Ключ",h);
}
function saveKey(){
    var e=document.getElementById("s-key");if(!e)return;
    groqKey=e.value.trim();saveData();hideModal();renderContent();
    if(groqKey)toast("Ключ сохранён ✅","ok");
}
function exportData(){
    var d=JSON.stringify({puppies:puppies,exported:new Date().toISOString()},null,2);
    var b=new Blob([d],{type:"application/json"});var u=URL.createObjectURL(b);
    var a=document.createElement("a");a.href=u;a.download="puppyhub_backup.json";a.click();
    URL.revokeObjectURL(u);toast("Экспортировано","ok");
}
function importPrompt(){
    var h='<div class="fg"><label class="fl">JSON данные</label>';
    h+='<textarea class="ft" id="imp-json"></textarea></div>';
    h+='<button type="button" class="btn btn-primary" data-act="doImport">&#x1F4E5; Импортировать</button>';
    showModal("Импорт",h);
}
function doImport(){
    var e=document.getElementById("imp-json");if(!e||!e.value.trim())return;
    try{var d=JSON.parse(e.value.trim());
    if(d.puppies&&Array.isArray(d.puppies)){puppies=d.puppies;saveData();hideModal();renderContent();
    toast("Импортировано: "+puppies.length,"ok");}else toast("Неверный формат","err");
    }catch(er){toast("Ошибка JSON","err");}
}
function clearAll(){
    if(!confirm("Удалить ВСЕ данные?"))return;
    if(!confirm("Точно?"))return;
    puppies=[];saveData();hideModal();renderContent();toast("Очищено","info");
}

// === MODAL ===
function showModal(title,body){
    var o=document.getElementById("modal-overlay");
    var t=document.getElementById("modal-title");
    var b=document.getElementById("modal-body");
    if(t)t.innerHTML=title;if(b)b.innerHTML=body;
    if(o)o.classList.remove("hidden");
}
function hideModal(){
    var o=document.getElementById("modal-overlay");if(o)o.classList.add("hidden");
}

function onWebAppDataActionClick(e){
    var actEl=e.target.closest("[data-act]");
    if(!actEl)return;
    var act=actEl.getAttribute("data-act");
    var arg=actEl.getAttribute("data-arg");
    switch(act){
        case "savePuppy":savePuppy(parseInt(arg,10));break;
        case "editPuppy":editPuppy(parseInt(arg,10));break;
        case "genPost":genPost(parseInt(arg,10));break;
        case "delPuppy":delPuppy(parseInt(arg,10));break;
        case "showCreatePost":showCreatePost();break;
        case "doGenPost":doGenPost();break;
        case "askKey":askKey();break;
        case "doFreeAI":doFreeAI();break;
        case "aiQ":aiQ(arg||"hashtags");break;
        case "copyText":copyText();break;
        case "regenAI":regenAI();break;
        case "showPublish":showPublish();break;
        case "doPublish":doPublish();break;
        case "saveKey":saveKey();break;
        case "exportData":exportData();break;
        case "importPrompt":importPrompt();break;
        case "doImport":doImport();break;
        case "clearAll":clearAll();break;
        case "syncToBot":syncToBot();break;
        default:break;
    }
}

function onWebAppPuppyCardClick(e){
    if(e.target.closest("[data-act]"))return;
    var card=e.target.closest("[data-puppy-card]");
    if(!card)return;
    var i=parseInt(card.getAttribute("data-puppy-card"),10);
    if(!isNaN(i))showDetail(i);
}

function bindWebAppUi(){
    var tabsBar=document.getElementById("tabs-bar");
    if(tabsBar){
        tabsBar.addEventListener("click",function(ev){
            var tab=ev.target.closest(".tab[data-tab]");
            if(tab)switchTab(tab.getAttribute("data-tab"));
        });
    }
    var btnSettings=document.getElementById("btn-settings");
    if(btnSettings)btnSettings.addEventListener("click",showSettings);
    var fab=document.getElementById("fab");
    if(fab)fab.addEventListener("click",showAddPuppyForm);
    var overlay=document.getElementById("modal-overlay");
    if(overlay)overlay.addEventListener("click",function(ev){if(ev.target===overlay)hideModal();});
    var mclose=document.getElementById("modal-close");
    if(mclose)mclose.addEventListener("click",hideModal);
    document.body.addEventListener("click",onWebAppDataActionClick);
    document.body.addEventListener("click",onWebAppPuppyCardClick);
    document.body.addEventListener("keydown",function(ev){
        if(ev.key!=="Enter"&&ev.key!==" ")return;
        var card=ev.target.closest&&ev.target.closest("[data-puppy-card]");
        if(!card)return;
        ev.preventDefault();
        var j=parseInt(card.getAttribute("data-puppy-card"),10);
        if(!isNaN(j))showDetail(j);
    });
}

// === UTILS ===
function esc(t){if(!t)return"";return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function escA(t){if(!t)return"";return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function breedName(b){return{chihuahua:"Чихуахуа",toypoodle:"Той-пудель",maltipoo:"Мальтипу",other:"Другая"}[b]||b||"?";}
function breedClass(b){return{chihuahua:"chi",toypoodle:"poo",maltipoo:"mal"}[b]||"oth";}
function breedEmoji(b){return{chihuahua:"\uD83D\uDC15",toypoodle:"\uD83D\uDC29",maltipoo:"\uD83E\uDDF8"}[b]||"\uD83D\uDC36";}
function fmtPrice(p){if(!p)return"0";var n=parseInt(p);return isNaN(n)?p:n.toLocaleString("ru-RU");}

// === INIT ===
document.addEventListener("DOMContentLoaded",function(){
    bindWebAppUi();
    loadData();renderContent();
    var fab=document.getElementById("fab");
    if(fab){fab.classList.remove("hidden");if(puppies.length===0)fab.classList.add("pulse");}
    var sub=document.getElementById("header-sub");
    if(sub&&puppies.length>0)sub.innerHTML="\uD83D\uDC36 "+puppies.length+" "+pluralPuppy(puppies.length);
    console.log("PuppyHub v3 loaded. Puppies:",puppies.length,"Groq:",groqKey?"yes":"no");
});
function pluralPuppy(n){
    if(n%10===1&&n%100!==11)return "щенок";
    if(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))return "щенка";
    return "щенков";
}
