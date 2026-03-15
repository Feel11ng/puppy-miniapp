/* =============================================
   PUPPY MINIAPP - app.js
   Telegram Mini App для управления питомником
   ============================================= */

// === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
let tg = null;
try {
    tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) {
        tg.expand();
        tg.ready();
    }
} catch (e) {
    console.log("Telegram WebApp не доступен:", e);
}

// === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
let currentTab = "puppies";
let puppies = [];
let groqApiKey = "";

// === ЗАГРУЗКА ДАННЫХ ===
function loadData() {
    try {
        const saved = localStorage.getItem("puppies_data");
        if (saved) {
            puppies = JSON.parse(saved);
        } else {
            puppies = [];
        }
    } catch (e) {
        puppies = [];
    }
    groqApiKey = localStorage.getItem("groq_api_key") || "";
}

function saveData() {
    localStorage.setItem("puppies_data", JSON.stringify(puppies));
    if (groqApiKey) {
        localStorage.setItem("groq_api_key", groqApiKey);
    }
}

// === ГЕНЕРАЦИЯ ID ===
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// === ПЕРЕКЛЮЧЕНИЕ ТАБОВ ===
function switchTab(tabName) {
    currentTab = tabName;
    
    // Обновляем активный таб
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (tab.getAttribute("data-tab") === tabName) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    }
    
    // Рендерим контент
    renderContent();
}

// === РЕНДЕР КОНТЕНТА ===
function renderContent() {
    var content = document.getElementById("content");
    if (!content) return;
    
    switch (currentTab) {
        case "puppies":
            renderPuppies(content);
            break;
        case "posts":
            renderPosts(content);
            break;
        case "ai":
            renderAI(content);
            break;
        default:
            renderPuppies(content);
    }
}

// === РЕНДЕР СПИСКА ЩЕНКОВ ===
function renderPuppies(container) {
    var html = "";
    
    // Статистика
    var available = 0;
    var reserved = 0;
    var sold = 0;
    for (var i = 0; i < puppies.length; i++) {
        var s = puppies[i].status;
        if (s === "available") available++;
        else if (s === "reserved") reserved++;
        else if (s === "sold") sold++;
    }
    
    html += '<div class="stats-row">';
    html += '<div class="stat-card"><div class="stat-number">' + available + '</div><div class="stat-label">Свободны</div></div>';
    html += '<div class="stat-card"><div class="stat-number">' + reserved + '</div><div class="stat-label">Бронь</div></div>';
    html += '<div class="stat-card"><div class="stat-number">' + sold + '</div><div class="stat-label">Проданы</div></div>';
    html += '</div>';
    
    // Кнопка добавления
    html += '<button class="btn btn-primary" style="margin-bottom: 16px" onclick="showAddPuppyForm()">➕ Добавить щенка</button>';
    
    if (puppies.length === 0) {
        html += '<div class="empty-state">';
        html += '<div class="emoji">🐾</div>';
        html += '<p>Пока нет щенков.<br>Добавьте первого!</p>';
        html += '</div>';
    } else {
        for (var i = 0; i < puppies.length; i++) {
            html += renderPuppyCard(puppies[i], i);
        }
    }
    
    container.innerHTML = html;
}

// === РЕНДЕР КАРТОЧКИ ЩЕНКА ===
function renderPuppyCard(puppy, index) {
    var statusBadge = "";
    var statusClass = "";
    if (puppy.status === "available") {
        statusBadge = "Свободен";
        statusClass = "badge-available";
    } else if (puppy.status === "reserved") {
        statusBadge = "Бронь";
        statusClass = "badge-reserved";
    } else {
        statusBadge = "Продан";
        statusClass = "badge-sold";
    }
    
    var genderEmoji = puppy.gender === "male" ? "♂️" : "♀️";
    var breedEmoji = "🐶";
    if (puppy.breed === "chihuahua") breedEmoji = "🐕";
    else if (puppy.breed === "toypoodle") breedEmoji = "🐩";
    else if (puppy.breed === "maltipoo") breedEmoji = "🧸";
    
    var breedName = getBreedName(puppy.breed);
    
    var card = '<div class="card" onclick="showPuppyDetail(' + index + ')">';
    card += '<div class="puppy-card-row">';
    card += '<div class="puppy-photo">' + breedEmoji + '</div>';
    card += '<div class="puppy-card-info">';
    card += '<div class="card-header">';
    card += '<div>';
    card += '<div class="card-title">' + escapeHtml(puppy.name) + ' ' + genderEmoji + '</div>';
    card += '<div class="card-subtitle">' + breedName + '</div>';
    card += '</div>';
    card += '<span class="badge ' + statusClass + '">' + statusBadge + '</span>';
    card += '</div>';
    
    var details = [];
    if (puppy.age) details.push(puppy.age);
    if (puppy.color) details.push(puppy.color);
    if (puppy.price) details.push(formatPrice(puppy.price) + " ₽");
    
    if (details.length > 0) {
        card += '<div class="card-body" style="font-size:12px;color:var(--text-secondary)">' + escapeHtml(details.join(" • ")) + '</div>';
    }
    
    card += '</div></div></div>';
    return card;
}

// === ДЕТАЛИ ЩЕНКА ===
function showPuppyDetail(index) {
    var puppy = puppies[index];
    if (!puppy) return;
    
    var genderText = puppy.gender === "male" ? "Мальчик ♂️" : "Девочка ♀️";
    var breedName = getBreedName(puppy.breed);
    
    var html = "";
    html += '<div class="form-group"><span class="form-label">Порода</span><div>' + escapeHtml(breedName) + '</div></div>';
    html += '<div class="form-group"><span class="form-label">Пол</span><div>' + genderText + '</div></div>';
    
    if (puppy.age) {
        html += '<div class="form-group"><span class="form-label">Возраст</span><div>' + escapeHtml(puppy.age) + '</div></div>';
    }
    if (puppy.color) {
        html += '<div class="form-group"><span class="form-label">Окрас</span><div>' + escapeHtml(puppy.color) + '</div></div>';
    }
    if (puppy.price) {
        html += '<div class="form-group"><span class="form-label">Цена</span><div>' + formatPrice(puppy.price) + ' ₽</div></div>';
    }
    if (puppy.description) {
        html += '<div class="form-group"><span class="form-label">Описание</span><div>' + escapeHtml(puppy.description) + '</div></div>';
    }
    
    html += '<div class="card-actions">';
    html += '<button class="btn btn-small btn-secondary" onclick="editPuppy(' + index + ')">✏️ Редактировать</button>';
    html += '<button class="btn btn-small btn-warning" onclick="generatePostForPuppy(' + index + ')">📝 Пост</button>';
    html += '<button class="btn btn-small btn-danger" onclick="deletePuppy(' + index + ')">🗑 Удалить</button>';
    html += '</div>';
    
    showModal(escapeHtml(puppy.name), html);
}

// === ФОРМА ДОБАВЛЕНИЯ ЩЕНКА ===
function showAddPuppyForm() {
    var html = buildPuppyForm(null, -1);
    showModal("Новый щенок", html);
}

function editPuppy(index) {
    var puppy = puppies[index];
    if (!puppy) return;
    var html = buildPuppyForm(puppy, index);
    showModal("Редактировать", html);
}

function buildPuppyForm(puppy, index) {
    var name = puppy ? puppy.name : "";
    var breed = puppy ? puppy.breed : "chihuahua";
    var gender = puppy ? puppy.gender : "female";
    var age = puppy ? (puppy.age || "") : "";
    var color = puppy ? (puppy.color || "") : "";
    var price = puppy ? (puppy.price || "") : "";
    var status = puppy ? (puppy.status || "available") : "available";
    var description = puppy ? (puppy.description || "") : "";
    
    var html = '<div id="puppy-form">';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Кличка *</label>';
    html += '<input type="text" class="form-input" id="pf-name" value="' + escapeAttr(name) + '" placeholder="Имя щенка">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Порода</label>';
    html += '<select class="form-select" id="pf-breed">';
    html += '<option value="chihuahua"' + (breed === "chihuahua" ? " selected" : "") + '>Чихуахуа</option>';
    html += '<option value="toypoodle"' + (breed === "toypoodle" ? " selected" : "") + '>Той-пудель</option>';
    html += '<option value="maltipoo"' + (breed === "maltipoo" ? " selected" : "") + '>Мальтипу</option>';
    html += '<option value="other"' + (breed === "other" ? " selected" : "") + '>Другая</option>';
    html += '</select>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Пол</label>';
    html += '<select class="form-select" id="pf-gender">';
    html += '<option value="female"' + (gender === "female" ? " selected" : "") + '>Девочка ♀️</option>';
    html += '<option value="male"' + (gender === "male" ? " selected" : "") + '>Мальчик ♂️</option>';
    html += '</select>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Возраст</label>';
    html += '<input type="text" class="form-input" id="pf-age" value="' + escapeAttr(age) + '" placeholder="Например: 3 месяца">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Окрас</label>';
    html += '<input type="text" class="form-input" id="pf-color" value="' + escapeAttr(color) + '" placeholder="Например: рыжий">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Цена (₽)</label>';
    html += '<input type="number" class="form-input" id="pf-price" value="' + escapeAttr(price) + '" placeholder="Например: 50000">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Статус</label>';
    html += '<select class="form-select" id="pf-status">';
    html += '<option value="available"' + (status === "available" ? " selected" : "") + '>Свободен</option>';
    html += '<option value="reserved"' + (status === "reserved" ? " selected" : "") + '>Забронирован</option>';
    html += '<option value="sold"' + (status === "sold" ? " selected" : "") + '>Продан</option>';
    html += '</select>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Описание</label>';
    html += '<textarea class="form-textarea" id="pf-desc" placeholder="Описание щенка...">' + escapeHtml(description) + '</textarea>';
    html += '</div>';
    
    html += '<button class="btn btn-success" onclick="savePuppy(' + index + ')">💾 Сохранить</button>';
    html += '</div>';
    
    return html;
}

// === СОХРАНЕНИЕ ЩЕНКА ===
function savePuppy(index) {
    var nameEl = document.getElementById("pf-name");
    var breedEl = document.getElementById("pf-breed");
    var genderEl = document.getElementById("pf-gender");
    var ageEl = document.getElementById("pf-age");
    var colorEl = document.getElementById("pf-color");
    var priceEl = document.getElementById("pf-price");
    var statusEl = document.getElementById("pf-status");
    var descEl = document.getElementById("pf-desc");
    
    if (!nameEl || !nameEl.value.trim()) {
        alert("Введите кличку щенка!");
        return;
    }
    
    var data = {
        id: (index >= 0 && puppies[index]) ? puppies[index].id : generateId(),
        name: nameEl.value.trim(),
        breed: breedEl ? breedEl.value : "chihuahua",
        gender: genderEl ? genderEl.value : "female",
        age: ageEl ? ageEl.value.trim() : "",
        color: colorEl ? colorEl.value.trim() : "",
        price: priceEl ? priceEl.value.trim() : "",
        status: statusEl ? statusEl.value : "available",
        description: descEl ? descEl.value.trim() : "",
        created: (index >= 0 && puppies[index]) ? puppies[index].created : new Date().toISOString()
    };
    
    if (index >= 0) {
        puppies[index] = data;
    } else {
        puppies.push(data);
    }
    
    saveData();
    hideModal();
    renderContent();
}

// === УДАЛЕНИЕ ЩЕНКА ===
function deletePuppy(index) {
    if (!confirm("Удалить щенка " + puppies[index].name + "?")) return;
    puppies.splice(index, 1);
    saveData();
    hideModal();
    renderContent();
}

// === РЕНДЕР ПОСТОВ ===
function renderPosts(container) {
    var html = "";
    
    html += '<button class="btn btn-primary" style="margin-bottom:16px" onclick="showCreatePost()">✍️ Создать пост</button>';
    
    if (puppies.length === 0) {
        html += '<div class="empty-state">';
        html += '<div class="emoji">📝</div>';
        html += '<p>Сначала добавьте щенков,<br>чтобы создавать посты</p>';
        html += '</div>';
    } else {
        html += '<div class="card">';
        html += '<div class="card-title">Быстрый пост</div>';
        html += '<div class="card-body" style="margin-top:8px">';
        html += '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">Выберите щенка для генерации поста через AI:</p>';
        
        for (var i = 0; i < puppies.length; i++) {
            if (puppies[i].status === "available") {
                var breedName = getBreedName(puppies[i].breed);
                html += '<button class="btn btn-small btn-secondary" style="margin-bottom:8px" ';
                html += 'onclick="generatePostForPuppy(' + i + ')">';
                html += '📝 ' + escapeHtml(puppies[i].name) + ' (' + escapeHtml(breedName) + ')';
                html += '</button>';
            }
        }
        
        html += '</div></div>';
    }
    
    container.innerHTML = html;
}

// === СОЗДАНИЕ ПОСТА ===
function showCreatePost() {
    var html = "";
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Тип поста</label>';
    html += '<select class="form-select" id="post-type">';
    html += '<option value="sale">Продажа щенка</option>';
    html += '<option value="info">Информационный</option>';
    html += '<option value="avito">Текст для Авито</option>';
    html += '</select>';
    html += '</div>';
    
    if (puppies.length > 0) {
        html += '<div class="form-group">';
        html += '<label class="form-label">Щенок</label>';
        html += '<select class="form-select" id="post-puppy">';
        html += '<option value="-1">Без привязки к щенку</option>';
        for (var i = 0; i < puppies.length; i++) {
            html += '<option value="' + i + '">' + escapeHtml(puppies[i].name) + ' (' + getBreedName(puppies[i].breed) + ')</option>';
        }
        html += '</select>';
        html += '</div>';
    }
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Дополнительные пожелания</label>';
    html += '<textarea class="form-textarea" id="post-extra" placeholder="Например: упомянуть прививки, добавить эмодзи..."></textarea>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="doGeneratePost()">🤖 Сгенерировать через AI</button>';
    
    showModal("Создать пост", html);
}

// === ГЕНЕРАЦИЯ ПОСТА ДЛЯ ЩЕНКА ===
function generatePostForPuppy(index) {
    var puppy = puppies[index];
    if (!puppy) return;
    
    if (!groqApiKey) {
        showSettingsForKey("Для генерации постов нужен Groq API ключ");
        return;
    }
    
    var breedName = getBreedName(puppy.breed);
    var genderText = puppy.gender === "male" ? "мальчик" : "девочка";
    
    var prompt = "Напиши привлекательный пост для Instagram/Telegram о продаже щенка. ";
    prompt += "Порода: " + breedName + ". ";
    prompt += "Кличка: " + puppy.name + ". ";
    prompt += "Пол: " + genderText + ". ";
    if (puppy.age) prompt += "Возраст: " + puppy.age + ". ";
    if (puppy.color) prompt += "Окрас: " + puppy.color + ". ";
    if (puppy.price) prompt += "Цена: " + puppy.price + " руб. ";
    if (puppy.description) prompt += "Описание: " + puppy.description + ". ";
    prompt += "Добавь эмодзи и хештеги. Пост на русском языке.";
    
    callGroqAI(prompt, "Пост: " + puppy.name);
}

// === ГЕНЕРАЦИЯ ПОСТА (из формы) ===
function doGeneratePost() {
    if (!groqApiKey) {
        showSettingsForKey("Для генерации нужен Groq API ключ");
        return;
    }
    
    var typeEl = document.getElementById("post-type");
    var puppyEl = document.getElementById("post-puppy");
    var extraEl = document.getElementById("post-extra");
    
    var postType = typeEl ? typeEl.value : "sale";
    var puppyIndex = puppyEl ? parseInt(puppyEl.value) : -1;
    var extra = extraEl ? extraEl.value.trim() : "";
    
    var prompt = "";
    
    if (postType === "sale" && puppyIndex >= 0) {
        var p = puppies[puppyIndex];
        prompt = "Напиши пост для продажи щенка. Порода: " + getBreedName(p.breed);
        prompt += ", кличка: " + p.name;
        prompt += ", пол: " + (p.gender === "male" ? "мальчик" : "девочка");
        if (p.age) prompt += ", возраст: " + p.age;
        if (p.color) prompt += ", окрас: " + p.color;
        if (p.price) prompt += ", цена: " + p.price + " руб";
        prompt += ". Добавь эмодзи и хештеги.";
    } else if (postType === "avito") {
        prompt = "Напиши текст объявления для Авито о продаже щенка мелкой породы. ";
        prompt += "Формат Авито: заголовок, описание, без хештегов. ";
        if (puppyIndex >= 0) {
            var p2 = puppies[puppyIndex];
            prompt += "Порода: " + getBreedName(p2.breed) + ", кличка: " + p2.name + ". ";
        }
    } else if (postType === "info") {
        prompt = "Напиши информационный пост для Telegram-канала питомника мелких пород собак. ";
        prompt += "Тема: уход за щенком или интересный факт о породе. С эмодзи.";
    } else {
        prompt = "Напиши пост для соцсетей питомника мелких пород собак. С эмодзи и хештегами.";
    }
    
    if (extra) {
        prompt += " Дополнительно: " + extra;
    }
    
    prompt += " Пиши на русском языке.";
    
    callGroqAI(prompt, "Сгенерированный пост");
}

// === РЕНДЕР AI ВКЛАДКИ ===
function renderAI(container) {
    var html = "";
    
    var keyStatus = groqApiKey ? "✅ Ключ установлен" : "❌ Ключ не задан";
    
    html += '<div class="card">';
    html += '<div class="card-title">🤖 AI Ассистент</div>';
    html += '<div class="card-body" style="margin-top:8px">';
    html += '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">Groq API: ' + keyStatus + '</p>';
    if (!groqApiKey) {
        html += '<button class="btn btn-small btn-primary" style="margin-bottom:12px" onclick="showSettingsForKey()">🔑 Установить ключ</button>';
    }
    html += '</div></div>';
    
    html += '<div class="card">';
    html += '<div class="card-title">💬 Свободный запрос</div>';
    html += '<div class="card-body" style="margin-top:8px">';
    html += '<textarea class="form-textarea" id="ai-free-prompt" placeholder="Задайте любой вопрос AI..."></textarea>';
    html += '<button class="btn btn-primary" style="margin-top:8px" onclick="doFreeAI()">🚀 Отправить</button>';
    html += '</div></div>';
    
    html += '<div class="card">';
    html += '<div class="card-title">⚡ Быстрые действия</div>';
    html += '<div class="card-actions" style="margin-top:8px">';
    html += '<button class="btn btn-small btn-secondary" onclick="aiQuick(\'hashtags\')">🏷 Хештеги</button>';
    html += '<button class="btn btn-small btn-secondary" onclick="aiQuick(\'contentplan\')">📅 Контент-план</button>';
    html += '<button class="btn btn-small btn-secondary" onclick="aiQuick(\'tips\')">💡 Советы</button>';
    html += '<button class="btn btn-small btn-secondary" onclick="aiQuick(\'names\')">📛 Имена</button>';
    html += '</div></div>';
    
    html += '<div id="ai-result-container"></div>';
    
    container.innerHTML = html;
}

// === БЫСТРЫЕ AI ДЕЙСТВИЯ ===
function aiQuick(action) {
    if (!groqApiKey) {
        showSettingsForKey("Нужен Groq API ключ");
        return;
    }
    
    var prompt = "";
    var title = "";
    
    switch (action) {
        case "hashtags":
            prompt = "Сгенерируй 30 хештегов для Instagram для питомника мелких пород собак (чихуахуа, той-пудель, мальтипу). Раздели на группы: общие, по породам, продажа. На русском и английском.";
            title = "Хештеги";
            break;
        case "contentplan":
            prompt = "Составь контент-план на неделю для Telegram-канала питомника мелких пород собак. 7 постов с темами, типами контента и лучшим временем публикации. На русском.";
            title = "Контент-план";
            break;
        case "tips":
            prompt = "Дай 10 советов по продвижению питомника мелких пород собак в социальных сетях. Практичные и конкретные советы. На русском.";
            title = "Советы по продвижению";
            break;
        case "names":
            prompt = "Предложи 20 красивых имён для щенков мелких пород. 10 для мальчиков и 10 для девочек. Модные, милые, подходящие для чихуахуа, той-пуделя, мальтипу. На русском.";
            title = "Имена для щенков";
            break;
    }
    
    callGroqAI(prompt, title);
}

// === СВОБОДНЫЙ AI ЗАПРОС ===
function doFreeAI() {
    if (!groqApiKey) {
        showSettingsForKey("Нужен Groq API ключ");
        return;
    }
    
    var promptEl = document.getElementById("ai-free-prompt");
    if (!promptEl || !promptEl.value.trim()) {
        alert("Введите запрос!");
        return;
    }
    
    callGroqAI(promptEl.value.trim(), "Ответ AI");
}

// === ВЫЗОВ GROQ API ===
function callGroqAI(prompt, resultTitle) {
    // Показываем лоадер
    showModal("🤖 " + resultTitle, '<div class="loader"><div class="spinner"></div><p style="margin-top:12px">Генерирую...</p></div>');
    
    var requestBody = JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: "Ты — помощник питомника мелких пород собак (чихуахуа, той-пудель, мальтипу). Отвечай на русском языке. Будь полезным, конкретным и креативным."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 1500
    });
    
    fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + groqApiKey
        },
        body: requestBody
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        var text = "Нет ответа";
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            text = data.choices[0].message.content;
        }
        
        var resultHtml = '<div class="ai-result">' + escapeHtml(text) + '</div>';
        resultHtml += '<div class="card-actions" style="margin-top:12px">';
        resultHtml += '<button class="btn btn-small btn-secondary" onclick="copyToClipboard()">📋 Копировать</button>';
        resultHtml += '<button class="btn btn-small btn-success" onclick="sendToBot()">📤 Отправить боту</button>';
        resultHtml += '</div>';
        resultHtml += '<input type="hidden" id="ai-result-text" value="' + escapeAttr(text) + '">';
        
        showModal("🤖 " + resultTitle, resultHtml);
    })
    .catch(function(error) {
        var errHtml = '<div style="color:var(--accent);padding:16px">';
        errHtml += '<p>❌ Ошибка: ' + escapeHtml(error.message) + '</p>';
        errHtml += '<p style="margin-top:8px;font-size:12px;color:var(--text-secondary)">Проверьте Groq API ключ в настройках.</p>';
        errHtml += '</div>';
        showModal("Ошибка", errHtml);
    });
}

// === КОПИРОВАНИЕ В БУФЕР ===
function copyToClipboard() {
    var textEl = document.getElementById("ai-result-text");
    if (!textEl) return;
    
    var text = textEl.value;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            alert("Скопировано!");
        }).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        alert("Скопировано!");
    } catch (e) {
        alert("Не удалось скопировать");
    }
    document.body.removeChild(ta);
}

// === ОТПРАВКА БОТУ ===
function sendToBot() {
    var textEl = document.getElementById("ai-result-text");
    if (!textEl) return;
    
    if (tg) {
        try {
            var sendData = JSON.stringify({
                action: "publish_post",
                text: textEl.value
            });
            tg.sendData(sendData);
        } catch (e) {
            alert("Ошибка отправки: " + e.message);
        }
    } else {
        alert("Telegram WebApp не доступен.\nТекст скопирован в буфер.");
        copyToClipboard();
    }
}

// === НАСТРОЙКИ ===
function showSettings() {
    var maskedKey = groqApiKey ? ("..." + groqApiKey.slice(-8)) : "не задан";
    var puppyCount = puppies.length;
    
    var html = "";
    
    html += '<div class="settings-item">';
    html += '<span class="settings-label">Groq API ключ</span>';
    html += '<span class="settings-value">' + maskedKey + '</span>';
    html += '</div>';
    
    html += '<div class="form-group" style="margin-top:8px">';
    html += '<input type="password" class="form-input" id="settings-groq-key" placeholder="Вставьте ключ Groq API" value="' + escapeAttr(groqApiKey) + '">';
    html += '<button class="btn btn-small btn-primary" style="margin-top:8px" onclick="saveGroqKey()">💾 Сохранить ключ</button>';
    html += '</div>';
    
    html += '<div class="settings-item">';
    html += '<span class="settings-label">Щенков в базе</span>';
    html += '<span class="settings-value">' + puppyCount + '</span>';
    html += '</div>';
    
    html += '<div style="margin-top:16px">';
    html += '<button class="btn btn-small btn-secondary" style="margin-bottom:8px" onclick="exportData()">📦 Экспорт данных</button>';
    html += '<button class="btn btn-small btn-secondary" style="margin-bottom:8px" onclick="importDataPrompt()">📥 Импорт данных</button>';
    html += '<button class="btn btn-small btn-danger" onclick="clearAllData()">🗑 Очистить всё</button>';
    html += '</div>';
    
    showModal("⚙️ Настройки", html);
}

function showSettingsForKey(message) {
    var html = "";
    if (message) {
        html += '<p style="color:var(--warning);margin-bottom:12px">' + escapeHtml(message) + '</p>';
    }
    html += '<div class="form-group">';
    html += '<label class="form-label">Groq API ключ</label>';
    html += '<input type="password" class="form-input" id="settings-groq-key" placeholder="gsk_..." value="">';
    html += '<p style="font-size:11px;color:var(--text-secondary);margin-top:6px">Получите бесплатно на <a href="https://console.groq.com" style="color:var(--accent)">console.groq.com</a></p>';
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="saveGroqKey()">💾 Сохранить</button>';
    
    showModal("🔑 API Ключ", html);
}

function saveGroqKey() {
    var keyEl = document.getElementById("settings-groq-key");
    if (!keyEl) return;
    
    groqApiKey = keyEl.value.trim();
    saveData();
    hideModal();
    renderContent();
    
    if (groqApiKey) {
        alert("Ключ сохранён!");
    }
}

// === ЭКСПОРТ / ИМПОРТ ===
function exportData() {
    var data = JSON.stringify({
        puppies: puppies,
        exported: new Date().toISOString()
    }, null, 2);
    
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "puppies_backup.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importDataPrompt() {
    var html = '';
    html += '<div class="form-group">';
    html += '<label class="form-label">Вставьте JSON данные:</label>';
    html += '<textarea class="form-textarea" id="import-json" placeholder=\'{"puppies": [...]}\'></textarea>';
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="doImport()">📥 Импортировать</button>';
    
    showModal("Импорт данных", html);
}

function doImport() {
    var jsonEl = document.getElementById("import-json");
    if (!jsonEl || !jsonEl.value.trim()) return;
    
    try {
        var data = JSON.parse(jsonEl.value.trim());
        if (data.puppies && Array.isArray(data.puppies)) {
            puppies = data.puppies;
            saveData();
            hideModal();
            renderContent();
            alert("Импортировано " + puppies.length + " щенков!");
        } else {
            alert("Неверный формат данных");
        }
    } catch (e) {
        alert("Ошибка JSON: " + e.message);
    }
}

function clearAllData() {
    if (!confirm("Удалить ВСЕ данные? Это нельзя отменить!")) return;
    if (!confirm("Вы уверены? Все щенки будут удалены!")) return;
    
    puppies = [];
    saveData();
    hideModal();
    renderContent();
}

// === МОДАЛЬНОЕ ОКНО ===
function showModal(title, bodyHtml) {
    var overlay = document.getElementById("modal-overlay");
    var titleEl = document.getElementById("modal-title");
    var bodyEl = document.getElementById("modal-body");
    
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (overlay) overlay.classList.remove("hidden");
}

function hideModal() {
    var overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.classList.add("hidden");
}

function closeModal(event) {
    if (event.target === event.currentTarget) {
        hideModal();
    }
}

// === УТИЛИТЫ ===
function escapeHtml(text) {
    if (!text) return "";
    var str = String(text);
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(text) {
    if (!text) return "";
    var str = String(text);
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function getBreedName(breed) {
    var breeds = {
        "chihuahua": "Чихуахуа",
        "toypoodle": "Той-пудель",
        "maltipoo": "Мальтипу",
        "other": "Другая порода"
    };
    return breeds[breed] || breed || "Не указана";
}

function formatPrice(price) {
    if (!price) return "0";
    var num = parseInt(price);
    if (isNaN(num)) return price;
    return num.toLocaleString("ru-RU");
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener("DOMContentLoaded", function() {
    loadData();
    renderContent();
    console.log("Puppy MiniApp loaded. Puppies:", puppies.length);
});
