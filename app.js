const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://97f05b448b891eda-107-161-168-242.serveousercontent.com";

async function api(endpoint, method, body) {
    try {
        const opts = {
            method: method || "GET",
            headers: {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(API + endpoint, opts);
        return await res.json();
    } catch(e) {
        showToast("Ошибка связи с сервером");
        return {success: false, error: e.message};
    }
}

let puppies = [];
let currentPuppy = null;
let currentStyle = "sale";
let currentBreed = "";
let currentGender = "";

function showScreen(name) {
    document.querySelectorAll("[id^=screen-]").forEach(el => el.classList.add("hidden"));
    document.getElementById("screen-" + name).classList.remove("hidden");
    window.scrollTo(0, 0);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    if (name === "home") loadHome();
    if (name === "puppies") loadPuppiesList();
    if (name === "new-post") loadPostPuppies();
    if (name === "avito") loadAvitoPuppies();
    if (name === "analytics") loadAnalytics();
    if (name === "ai") resetAI();
}

function showToast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

async function loadHome() {
    try {
        const data = await api("/api/puppies", "GET");
        if (Array.isArray(data)) puppies = data;
    } catch(e) {}
    const sale = puppies.filter(p => p.status === "for_sale" || p.status === "sale");
    const sold = puppies.filter(p => p.status === "sold");
    document.getElementById("stat-sale").textContent = sale.length;
    document.getElementById("stat-sold").textContent = sold.length;
    const list = document.getElementById("home-puppies-list");
    if (sale.length === 0) {
        list.innerHTML = '<p style="color:var(--hint);text-align:center;padding:20px">Нет щенков. Нажмите 🐶 → ➕</p>';
        return;
    }
    list.innerHTML = sale.map(p => puppyCardHTML(p)).join("");
}

function puppyCardHTML(p) {
    const emoji = {"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"}[p.breed] || "🐶";
    const g = p.gender === "мальчик" ? "♂️" : "♀️";
    const price = p.price ? Number(p.price).toLocaleString("ru") + " ₽" : "";
    return '<div class="puppy-card" onclick="showPuppyDetail(' + p.id + ')"><div class="puppy-avatar">' + emoji + '</div><div class="puppy-info"><div class="puppy-name">' + g + " " + p.name + '</div><div class="puppy-details">' + p.breed + (p.color ? " • " + p.color : "") + '</div></div><div class="puppy-price">' + price + '</div></div>';
}

async function loadPuppiesList() {
    const data = await api("/api/puppies", "GET");
    if (Array.isArray(data)) puppies = data;
    const list = document.getElementById("puppies-list");
    if (puppies.length === 0) {
        list.innerHTML = '<p style="color:var(--hint);text-align:center;padding:20px">Пусто</p>';
        return;
    }
    list.innerHTML = puppies.map(p => {
        const st = p.status === "sold" ? ' <span style="color:#f44336">(продан)</span>' : "";
        return puppyCardHTML(p).replace(p.name, p.name + st);
    }).join("");
}

function selectBreed(btn, breed) {
    document.querySelectorAll(".breed-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentBreed = breed;
}

function selectGender(btn, gender) {
    document.querySelectorAll(".gender-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentGender = gender;
}

async function savePuppy() {
    const name = document.getElementById("puppy-name").value.trim();
    if (!name || !currentBreed || !currentGender) { showToast("Заполните породу, кличку и пол"); return; }
    const res = await api("/api/puppies", "POST", {
        name: name, breed: currentBreed, gender: currentGender,
        birth_date: document.getElementById("puppy-birth").value,
        color: document.getElementById("puppy-color").value.trim(),
        expected_weight: document.getElementById("puppy-weight").value.trim(),
        price: document.getElementById("puppy-price").value || null,
        description: document.getElementById("puppy-desc").value.trim()
    });
    if (res.success) {
        showToast("✅ Щенок добавлен!");
        document.getElementById("puppy-name").value = "";
        document.getElementById("puppy-birth").value = "";
        document.getElementById("puppy-color").value = "";
        document.getElementById("puppy-weight").value = "";
        document.getElementById("puppy-price").value = "";
        document.getElementById("puppy-desc").value = "";
        currentBreed = ""; currentGender = "";
        document.querySelectorAll(".breed-btn,.gender-btn").forEach(b => b.classList.remove("active"));
        showScreen("puppies");
    } else { showToast("Ошибка: " + (res.error || "")); }
}

function showPuppyDetail(id) {
    const p = puppies.find(x => x.id === id);
    if (!p) return;
    currentPuppy = p;
    const g = p.gender === "мальчик" ? "♂️" : "♀️";
    const emoji = {"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"}[p.breed] || "🐶";
    const price = p.price ? Number(p.price).toLocaleString("ru") + " ₽" : "не указана";
    const isSale = p.status === "for_sale" || p.status === "sale";
    document.getElementById("puppy-detail-content").innerHTML =
        '<div style="text-align:center;font-size:48px;margin:10px 0">' + emoji + '</div>' +
        '<h2 style="text-align:center;margin-bottom:16px">' + g + " " + p.name + '</h2>' +
        '<div class="detail-row"><span class="detail-label">Порода</span><span>' + p.breed + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Пол</span><span>' + p.gender + '</span></div>' +
        (p.birth_date ? '<div class="detail-row"><span class="detail-label">Д.р.</span><span>' + p.birth_date + '</span></div>' : '') +
        (p.color ? '<div class="detail-row"><span class="detail-label">Окрас</span><span>' + p.color + '</span></div>' : '') +
        (p.expected_weight ? '<div class="detail-row"><span class="detail-label">Вес</span><span>' + p.expected_weight + '</span></div>' : '') +
        '<div class="detail-row"><span class="detail-label">Цена</span><span style="color:var(--btn);font-weight:700">' + price + '</span></div>' +
        (p.description ? '<div class="detail-row"><span class="detail-label">Описание</span><span>' + p.description + '</span></div>' : '') +
        '<div class="detail-row"><span class="detail-label">Статус</span><span>' + (isSale?"🟢 В продаже":"🔴 Продан") + '</span></div>' +
        '<div class="detail-actions">' +
        '<button class="btn btn-primary" onclick="createPostForPuppy(' + p.id + ')">📝 Пост</button>' +
        '<button class="btn btn-secondary" onclick="createAvitoForPuppy(' + p.id + ')">📦 Авито</button>' +
        (isSale ? '<button class="btn btn-success" onclick="markSold(' + p.id + ')">✅ Продан</button>' : '') +
        '<button class="btn btn-danger" onclick="deletePuppy(' + p.id + ')">🗑</button></div>';
    showScreen("puppy-detail");
}

async function markSold(id) {
    await api("/api/puppies/" + id + "/sold", "POST");
    showToast("✅ Продан!");
    showScreen("puppies");
}

async function deletePuppy(id) {
    if (!confirm("Удалить?")) return;
    await api("/api/puppies/" + id, "DELETE");
    showToast("🗑 Удалён");
    showScreen("puppies");
}

function loadPostPuppies() {
    showPostStep(1);
    const sale = puppies.filter(p => p.status === "for_sale" || p.status === "sale");
    document.getElementById("post-puppies-list").innerHTML = sale.map(p => {
        const emoji = {"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"}[p.breed]||"🐶";
        return '<div class="option-card" onclick="selectPostPuppy(' + p.id + ')"><span class="option-icon">' + emoji + '</span><div><div class="option-text">' + p.name + '</div><div class="option-desc">' + p.breed + '</div></div></div>';
    }).join("") || '<p style="color:var(--hint);padding:20px;text-align:center">Нет щенков</p>';
}

function selectPostPuppy(id) { currentPuppy = puppies.find(x => x.id === id); showPostStep(2); }
function startFreePost() { currentPuppy = null; showPostStep(2); }
function createPostForPuppy(id) { currentPuppy = puppies.find(x => x.id === id); showScreen("new-post"); showPostStep(2); }

function showPostStep(step) {
    [1,2,3].forEach(s => document.getElementById("post-step-"+s).classList.add("hidden"));
    document.getElementById("post-result").classList.add("hidden");
    document.getElementById("post-loading").classList.add("hidden");
    document.getElementById("post-step-"+step).classList.remove("hidden");
}

function selectStyle(btn, style) {
    document.querySelectorAll(".style-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStyle = style;
}

async function generatePostText() {
    document.getElementById("post-step-2").classList.add("hidden");
    document.getElementById("post-loading").classList.remove("hidden");
    document.getElementById("loading-text").textContent = "🤖 AI генерирует текст...";
    const prompt = document.getElementById("post-prompt").value;
    let res;
    if (currentPuppy) {
        res = await api("/api/ai/puppy_description", "POST", {puppy_id: currentPuppy.id, style: currentStyle, prompt: prompt});
    } else {
        res = await api("/api/ai/content_idea", "POST", {type: "useful"});
    }
    document.getElementById("post-loading").classList.add("hidden");
    if (res.success && res.text) {
        document.getElementById("post-text").value = res.text;
        showPostStep(3);
    } else { showToast("Ошибка AI"); showPostStep(2); }
}

async function regeneratePost() { await generatePostText(); }

async function publishPost() {
    const text = document.getElementById("post-text").value;
    const platforms = [];
    if (document.getElementById("pl-instagram").checked) platforms.push("instagram");
    if (document.getElementById("pl-vk").checked) platforms.push("vk");
    if (document.getElementById("pl-telegram").checked) platforms.push("telegram");
    if (platforms.length === 0) { showToast("Выберите соцсеть"); return; }
    document.getElementById("post-step-3").classList.add("hidden");
    document.getElementById("post-loading").classList.remove("hidden");
    document.getElementById("loading-text").textContent = "📤 Публикую...";
    const res = await api("/api/publish", "POST", {text: text, platforms: platforms, puppy_id: currentPuppy ? currentPuppy.id : null});
    document.getElementById("post-loading").classList.add("hidden");
    if (res.success && res.results) {
        const names = {instagram:"📸 Instagram", vk:"📘 ВКонтакте", telegram:"✈️ Telegram"};
        let html = '<h3 style="margin-bottom:12px">📊 Результат</h3>';
        for (const [pl, r] of Object.entries(res.results)) {
            html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>' + (names[pl]||pl) + '</span><span style="color:' + (r.success?"#4caf50":"#f44336") + '">' + (r.success?"✅":"❌ "+(r.error||"")) + '</span></div>';
        }
        document.getElementById("publish-result").innerHTML = html;
        document.getElementById("post-result").classList.remove("hidden");
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    } else { showToast("Ошибка"); showPostStep(3); }
}

function loadAvitoPuppies() {
    document.getElementById("avito-result").classList.add("hidden");
    document.getElementById("avito-loading").classList.add("hidden");
    const sale = puppies.filter(p => p.status === "for_sale" || p.status === "sale");
    document.getElementById("avito-puppies-list").innerHTML = sale.map(p => {
        const emoji = {"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"}[p.breed]||"🐶";
        return '<div class="option-card" onclick="generateAvito(' + p.id + ')"><span class="option-icon">' + emoji + '</span><div><div class="option-text">' + p.name + '</div><div class="option-desc">' + p.breed + '</div></div></div>';
    }).join("") || '<p style="color:var(--hint);text-align:center;padding:20px">Нет щенков</p>';
}

function createAvitoForPuppy(id) { showScreen("avito"); setTimeout(() => generateAvito(id), 300); }

async function generateAvito(id) {
    currentPuppy = puppies.find(x => x.id === id);
    document.getElementById("avito-loading").classList.remove("hidden");
    document.getElementById("avito-result").classList.add("hidden");
    const res = await api("/api/ai/avito", "POST", {puppy_id: id});
    document.getElementById("avito-loading").classList.add("hidden");
    if (res.success && res.text) {
        document.getElementById("avito-text").value = res.text;
        document.getElementById("avito-result").classList.remove("hidden");
    } else { showToast("Ошибка"); }
}

async function regenerateAvito() { if (currentPuppy) await generateAvito(currentPuppy.id); }

function copyAvito() {
    navigator.clipboard.writeText(document.getElementById("avito-text").value).then(() => showToast("📋 Скопировано!"));
}

function resetAI() {
    document.getElementById("ai-result").classList.add("hidden");
    document.getElementById("ai-loading").classList.add("hidden");
}

async function aiAction(type) {
    document.getElementById("ai-loading").classList.remove("hidden");
    document.getElementById("ai-result").classList.add("hidden");
    const endpoints = {
        idea: ["/api/ai/content_idea", {type: "useful"}],
        reels: ["/api/ai/reels_idea", {}],
        hashtags: ["/api/ai/hashtags", {breed: "чихуахуа"}],
        plan: ["/api/ai/weekly_plan", {}]
    };
    const [ep, body] = endpoints[type] || ["/api/ai/content_idea", {}];
    const res = await api(ep, "POST", body);
    document.getElementById("ai-loading").classList.add("hidden");
    if (res.success && res.text) {
        document.getElementById("ai-result-text").textContent = res.text;
        document.getElementById("ai-result").classList.remove("hidden");
    } else { showToast("Ошибка AI"); }
}

async function loadAnalytics() {
    document.getElementById("analytics-content").innerHTML = '<div class="loader"></div><p class="loading-text">Собираю данные...</p>';
    const res = await api("/api/analytics", "GET");
    let ig = "—", vk = "—", tgt = "—", total = 0, igP = "";
    if (res.instagram && res.instagram.success) { ig = res.instagram.count.toLocaleString("ru"); total += res.instagram.count; igP = " • " + (res.instagram.posts||0) + " постов"; }
    if (res.vk && res.vk.success) { vk = res.vk.count.toLocaleString("ru"); total += res.vk.count; }
    if (res.telegram && res.telegram.success) { tgt = res.telegram.count.toLocaleString("ru"); total += res.telegram.count; }
    const sale = res.puppies ? res.puppies.for_sale : "—";
    const sold = res.puppies ? res.puppies.sold : "—";
    document.getElementById("analytics-content").innerHTML =
        '<div class="analytics-card ig"><span style="font-size:24px">📸</span><span class="analytics-platform">Instagram' + igP + '</span><span class="analytics-count">' + ig + '</span></div>' +
        '<div class="analytics-card vk"><span style="font-size:24px">📘</span><span class="analytics-platform">ВКонтакте</span><span class="analytics-count">' + vk + '</span></div>' +
        '<div class="analytics-card tg"><span style="font-size:24px">✈️</span><span class="analytics-platform">Telegram</span><span class="analytics-count">' + tgt + '</span></div>' +
        '<div class="total-box"><span>📊 Всего</span><span class="total-count">' + total.toLocaleString("ru") + '</span></div>' +
        '<button class="btn btn-secondary btn-full" onclick="loadAnalytics()">🔄 Обновить</button>';
}

showScreen("home");
