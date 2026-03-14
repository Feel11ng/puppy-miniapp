const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();

const GROQ_KEY = localStorage.getItem("groq_key") || "";
const KENNEL = "Vip_chihua";
const CITY = "Краснодар";
const CONTACT = "+792846066669";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// === ДАННЫЕ В LOCALSTORAGE ===
function loadPuppies(){return JSON.parse(localStorage.getItem("puppies")||"[]");}
function savePuppies(p){localStorage.setItem("puppies",JSON.stringify(p));}
function loadHistory(){return JSON.parse(localStorage.getItem("post_history")||"[]");}
function saveHistory(h){localStorage.setItem("post_history",JSON.stringify(h));}

let puppies=loadPuppies(), currentPuppy=null, currentStyle="sale", currentBreed="", currentGender="", currentFilter="all";

// === AI ЧЕРЕЗ GROQ НАПРЯМУЮ ===
async function aiGenerate(prompt) {
    const key = localStorage.getItem("groq_key");
    if(!key || key.length < 10) {
        showToast("Введите Groq API ключ","error");
        checkGroqKey();
        return null;
    }
    // Пробуем Groq напрямую
    try {
        const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: {"Content-Type":"application/json","Authorization":"Bearer "+key},
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {role:"system",content:"Ты SMM-менеджер питомника мелких пород собак. Питомник: "+KENNEL+", город: "+CITY+". Породы: чихуахуа, той-пудель, мальтипу. Документы: ветпаспорт, прививки. Пиши на русском. Не пиши заголовки типа Заголовок: или Текст:. Пиши готовый текст."},
                    {role:"user",content:prompt}
                ],
                max_tokens: 1000, temperature: 0.8
            })
        });
        const data = await res.json();
        if(data.choices) return data.choices[0].message.content;
    } catch(e) { console.log("Groq недоступен, использую шаблоны"); }
    
    // Фоллбек — генерируем из шаблонов
    return generateFromTemplates(prompt);
}

function generateFromTemplates(prompt) {
    const p = prompt.toLowerCase();
    const puppy = currentPuppy;
    
    if(puppy && (p.includes("пост") || p.includes("описание") || p.includes("щенк") || p.includes("instagram") || p.includes("продаж"))) {
        const g = puppy.gender === "мальчик" ? "мальчик" : "девочка";
        const templates = [
            "🐾 Знакомьтесь — " + puppy.name + "!\n\nОчаровательный " + g + " породы " + puppy.breed + (puppy.color ? ", окрас " + puppy.color : "") + " ищет любящую семью! 🏠\n\n" + (puppy.price ? "💰 " + Number(puppy.price).toLocaleString("ru") + " ₽\n" : "") + "✅ Ветпаспорт\n✅ Привит по возрасту\n✅ Приучен к пелёнке\n\nПишите в директ! 📩\n\n#" + puppy.breed.replace("-","") + " #щенки #питомник #" + CITY.toLowerCase(),
            "💕 " + puppy.name + " — маленькое чудо!\n\nЭтот " + g + " породы " + puppy.breed + " покорит ваше сердце с первого взгляда! " + (puppy.color ? "Нежный " + puppy.color + " окрас. " : "") + (puppy.description || "Ласковый и игривый характер.") + "\n\n" + (puppy.price ? "💰 " + Number(puppy.price).toLocaleString("ru") + " ₽\n" : "") + "📄 Ветпаспорт, прививки\n📍 " + CITY + "\n📞 " + CONTACT + "\n\n#" + puppy.breed.replace("-","") + " #щенки #купитьщенка",
            "🌟 В нашем питомнике " + KENNEL + " есть особенный щенок!\n\n" + puppy.name + " — " + g + " " + puppy.breed + (puppy.color ? " " + puppy.color + " окраса" : "") + ". " + (puppy.description || "Здоровый, активный, приучен к пелёнке.") + "\n\n" + (puppy.price ? "Цена: " + Number(puppy.price).toLocaleString("ru") + " ₽\n" : "") + "Документы: ветпаспорт ✅\n\nЗаписывайтесь на просмотр!\n\n#" + puppy.breed.replace("-","") + " #щенки #питомник #собаки"
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    if(p.includes("авито")) {
        if(!puppy) return "Выберите щенка для объявления";
        return "Щенок " + puppy.breed + " " + puppy.gender + (puppy.color ? ", " + puppy.color : "") + "\n\n" +
            "Продаётся щенок породы " + puppy.breed + ".\n" +
            "Кличка: " + puppy.name + "\n" +
            "Пол: " + puppy.gender + "\n" +
            (puppy.color ? "Окрас: " + puppy.color + "\n" : "") +
            (puppy.price ? "Цена: " + Number(puppy.price).toLocaleString("ru") + " руб.\n" : "") +
            "\nВетеринарный паспорт, привит по возрасту.\nПриучен к пелёнке.\n\n" + CITY + "\nПишите, отвечу на вопросы.";
    }
    
    if(p.includes("хештег")) {
        return "#чихуахуа #chihuahua #тойпудель #мальтипу #maltipoo\n#щенки #собаки #питомник #puppy #dogs\n#купитьщенка #щенкивпродаже #мелкиепороды\n#собакимелкихпород #чихуахуалюбовь\n#пудельмини #собакадруг #питомниксобак\n#" + CITY.toLowerCase() + " #щенки" + CITY.toLowerCase();
    }
    
    if(p.includes("план") || p.includes("неделю")) {
        return "📅 Контент-план:\n\nПН 10:00 — Совет по уходу\nВТ 12:00 — Фото щенка (продажа)\nСР 18:00 — Reels: утро в питомнике\nЧТ 11:00 — Сравнение пород\nПТ 19:00 — Смешное видео\nСБ 13:00 — Отзыв покупателя\nВС 10:00 — Все щенки в продаже";
    }
    
    if(p.includes("reels") || p.includes("видео") || p.includes("сценарий")) {
        return "🎬 Идея для Reels:\n\nУтро в питомнике\n\n0-5 сек: Будильник, вы просыпаетесь\n5-15 сек: Щенки уже ждут завтрак\n15-25 сек: Кормление (милые кадры)\n25-35 сек: Игры и обнимашки\n35-45 сек: Все вместе на камеру\n\nМузыка: что-то тёплое и позитивное\nДлительность: 30-45 секунд";
    }
    
    const tips = [
        "🐾 5 вещей которые нужно купить перед появлением щенка:\n\n1️⃣ Лежанка подходящего размера\n2️⃣ Миски для воды и корма\n3️⃣ Корм супер-премиум класса\n4️⃣ Пелёнки одноразовые\n5️⃣ Игрушки и лакомства\n\nСохраняйте! 🔖\n\n#щенки #собаки #питомник",
        "🦷 Уход за зубами мелких пород:\n\n• Чистите зубы 2-3 раза в неделю\n• Используйте пасту для собак\n• Давайте дентальные лакомства\n• Осмотр у ветеринара каждые 6 мес\n\n#собаки #уходзасобакой #питомник",
        "🧥 Одежда для мелких пород — необходимость!\n\n☀️ Лето: лёгкая футболка от солнца\n🍂 Осень: дождевик + свитер\n❄️ Зима: тёплый комбинезон\n🌸 Весна: ветровка\n\nМелкие породы мёрзнут при +15°C и ниже!\n\n#чихуахуа #мальтипу #тойпудель"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// === ПУБЛИКАЦИЯ ЧЕРЕЗ БОТА ===
function publishViaBot(text, platforms) {
    try {
        tg.sendData(JSON.stringify({
            action: "publish",
            text: text,
            platforms: platforms,
            puppy_id: currentPuppy ? currentPuppy.id : null
        }));
        // Сохраняем в историю
        const hist = loadHistory();
        hist.unshift({text:text.substring(0,100),platforms,date:new Date().toISOString()});
        if(hist.length>50) hist.length=50;
        saveHistory(hist);
    } catch(e) { showToast("Ошибка отправки","error"); }
}

// === НАВИГАЦИЯ ===
function showScreen(n) {
    document.querySelectorAll("[id^=screen-]").forEach(el=>el.classList.add("hidden"));
    document.getElementById("screen-"+n).classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
    if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    if(n==="home") loadHome();
    if(n==="puppies") loadPuppiesList();
    if(n==="new-post") loadPostPuppies();
    if(n==="avito") loadAvitoPuppies();
    if(n==="ai") resetAI();
    if(n==="history") loadHistoryScreen();
}

function showToast(text,type){
    const t=document.createElement("div");t.className="toast "+(type||"");t.textContent=text;
    document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type==="error"?"error":"success");
}

function breedClass(b){return({"чихуахуа":"breed-chihua","той-пудель":"breed-poodle","мальтипу":"breed-maltipoo"})[b]||"breed-default";}
function breedEmoji(b){return({"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"})[b]||"🐶";}

// === ГЛАВНАЯ ===
function loadHome(){
    puppies=loadPuppies();
    const sale=puppies.filter(p=>p.status!=="sold");
    const sold=puppies.filter(p=>p.status==="sold");
    document.getElementById("stat-sale").textContent=sale.length;
    document.getElementById("stat-sold").textContent=sold.length;
    document.getElementById("stat-posts").textContent=loadHistory().length;

    const track=document.getElementById("swipe-track");
    const dots=document.getElementById("swipe-dots");
    if(sale.length>0){
        track.innerHTML=sale.map(p=>{
            const g=p.gender==="мальчик"?"♂️":"♀️";
            const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"";
            return '<div class="swipe-card" onclick="showPuppyDetail(\''+p.id+'\')">'+
                '<div style="display:flex;align-items:center;gap:12px">'+
                '<div class="puppy-avatar '+breedClass(p.breed)+'">'+breedEmoji(p.breed)+'</div>'+
                '<div><div class="puppy-name">'+g+' '+p.name+'</div>'+
                '<div class="puppy-details">'+p.breed+(p.color?' • '+p.color:'')+'</div></div>'+
                '<div style="margin-left:auto" class="puppy-price">'+price+'</div></div></div>';
        }).join("");
        dots.innerHTML=sale.map((_,i)=>'<div class="swipe-dot'+(i===0?' active':'')+'"></div>').join("");
    } else { track.innerHTML=""; dots.innerHTML=""; }
    document.getElementById("home-puppies-list").innerHTML=sale.length===0?'<p style="color:var(--hint);text-align:center;padding:20px">Нет щенков. Нажмите 🐶 → ➕</p>':"";
}

function puppyCardHTML(p){
    const g=p.gender==="мальчик"?"♂️":"♀️";
    const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"";
    const badge=p.status==="sold"?'<div class="puppy-badge" style="background:rgba(244,67,54,0.8)">Продан</div>':'<div class="puppy-badge">В продаже</div>';
    return '<div class="puppy-card" onclick="showPuppyDetail(\''+p.id+'\')">'+
        '<div class="puppy-avatar '+breedClass(p.breed)+'">'+breedEmoji(p.breed)+'</div>'+
        '<div class="puppy-info"><div class="puppy-name">'+g+' '+p.name+'</div>'+
        '<div class="puppy-details">'+p.breed+(p.color?' • '+p.color:'')+'</div></div>'+
        '<div class="puppy-price">'+price+'</div>'+badge+'</div>';
}

// === ЩЕНКИ ===
function loadPuppiesList(){puppies=loadPuppies();filterPuppies();}

function filterPuppies(){
    const search=(document.getElementById("puppy-search")?.value||"").toLowerCase();
    let f=puppies;
    if(currentFilter==="sold") f=f.filter(p=>p.status==="sold");
    else if(currentFilter!=="all") f=f.filter(p=>p.breed===currentFilter);
    if(search) f=f.filter(p=>p.name.toLowerCase().includes(search));
    document.getElementById("puppies-list").innerHTML=f.length?f.map(p=>puppyCardHTML(p)).join(""):'<p style="color:var(--hint);text-align:center;padding:20px">Не найдено</p>';
}

function setFilter(btn,filter){
    document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");currentFilter=filter;filterPuppies();
}

function selectBreed(b,breed){document.querySelectorAll(".breed-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentBreed=breed;}
function selectGender(b,gender){document.querySelectorAll(".gender-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentGender=gender;}

function savePuppy(){
    const name=document.getElementById("puppy-name").value.trim();
    if(!name||!currentBreed||!currentGender){showToast("Заполните породу, кличку и пол","error");return;}
    const p={id:Date.now().toString(),name,breed:currentBreed,gender:currentGender,
        birth_date:document.getElementById("puppy-birth").value,
        color:document.getElementById("puppy-color").value.trim(),
        expected_weight:document.getElementById("puppy-weight").value.trim(),
        price:document.getElementById("puppy-price").value||null,
        description:document.getElementById("puppy-desc").value.trim(),
        status:"for_sale",created:new Date().toISOString()};
    puppies.push(p);savePuppies(puppies);
    showToast("✅ Щенок добавлен!","success");
    ["puppy-name","puppy-birth","puppy-color","puppy-weight","puppy-price","puppy-desc"].forEach(id=>document.getElementById(id).value="");
    currentBreed="";currentGender="";document.querySelectorAll(".breed-btn,.gender-btn").forEach(b=>b.classList.remove("active"));
    // Синхронизируем с ботом
    try{tg.sendData(JSON.stringify({action:"sync_puppy",puppy:p}));}catch(e){}
    showScreen("puppies");
}

function showPuppyDetail(id){
    const p=puppies.find(x=>x.id==id);if(!p)return;currentPuppy=p;
    const g=p.gender==="мальчик"?"♂️":"♀️";
    const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"не указана";
    const isSale=p.status!=="sold";
    document.getElementById("puppy-detail-content").innerHTML=
        '<div class="detail-header"><div class="detail-avatar">'+breedEmoji(p.breed)+'</div><div class="detail-name">'+g+' '+p.name+'</div></div>'+
        '<div class="detail-row"><span class="detail-label">Порода</span><span class="detail-value">'+p.breed+'</span></div>'+
        '<div class="detail-row"><span class="detail-label">Пол</span><span class="detail-value">'+p.gender+'</span></div>'+
        (p.birth_date?'<div class="detail-row"><span class="detail-label">Д.р.</span><span class="detail-value">'+p.birth_date+'</span></div>':'')+
        (p.color?'<div class="detail-row"><span class="detail-label">Окрас</span><span class="detail-value">'+p.color+'</span></div>':'')+
        (p.expected_weight?'<div class="detail-row"><span class="detail-label">Вес</span><span class="detail-value">'+p.expected_weight+'</span></div>':'')+
        '<div class="detail-row"><span class="detail-label">Цена</span><span class="detail-value" style="color:var(--btn);font-weight:800">'+price+'</span></div>'+
        (p.description?'<div class="detail-row"><span class="detail-label">Описание</span><span class="detail-value">'+p.description+'</span></div>':'')+
        '<div class="detail-row"><span class="detail-label">Статус</span><span class="detail-value">'+(isSale?'🟢 В продаже':'🔴 Продан')+'</span></div>'+
        '<div class="detail-actions">'+
        '<button class="btn btn-primary" onclick="createPostForPuppy(\''+p.id+'\')">📝</button>'+
        '<button class="btn btn-secondary" onclick="createAvitoForPuppy(\''+p.id+'\')">📦</button>'+
        (isSale?'<button class="btn btn-success" onclick="markSold(\''+p.id+'\')">✅</button>':'')+
        '<button class="btn btn-danger" onclick="deletePuppy(\''+p.id+'\')">🗑</button></div>';
    showScreen("puppy-detail");
}

function markSold(id){const p=puppies.find(x=>x.id==id);if(p){p.status="sold";savePuppies(puppies);}showToast("✅ Продан!","success");showScreen("puppies");}
function deletePuppy(id){if(!confirm("Удалить?"))return;puppies=puppies.filter(x=>x.id!=id);savePuppies(puppies);showToast("Удалён");showScreen("puppies");}

// === СОЗДАТЬ ПОСТ ===
function loadPostPuppies(){showPostStep(1);
    const sale=puppies.filter(p=>p.status!=="sold");
    document.getElementById("post-puppies-list").innerHTML=sale.map(p=>
        '<div class="option-card" onclick="selectPostPuppy(\''+p.id+'\')"><span class="option-icon">'+breedEmoji(p.breed)+'</span><div><div class="option-text">'+p.name+'</div><div class="option-desc">'+p.breed+'</div></div></div>'
    ).join("")||'<p class="form-hint" style="text-align:center">Нет щенков</p>';
}
function selectPostPuppy(id){currentPuppy=puppies.find(x=>x.id==id);showPostStep(2);}
function startFreePost(){currentPuppy=null;showPostStep(2);}
function createPostForPuppy(id){currentPuppy=puppies.find(x=>x.id==id);showScreen("new-post");showPostStep(2);}
function showPostStep(s){[1,2,3].forEach(i=>document.getElementById("post-step-"+i).classList.add("hidden"));
    document.getElementById("post-result").classList.add("hidden");document.getElementById("post-loading").classList.add("hidden");
    document.getElementById("post-step-"+s).classList.remove("hidden");}
function selectStyle(b,s){document.querySelectorAll(".style-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentStyle=s;}

async function generatePostText(){
    document.getElementById("post-step-2").classList.add("hidden");
    document.getElementById("post-loading").classList.remove("hidden");
    document.getElementById("loading-text").textContent="🤖 AI генерирует текст...";
    const prompt_extra=document.getElementById("post-prompt").value;
    
    const styles={"sale":"Продающий стиль: подчеркни преимущества, вызови желание купить. Укажи цену, документы, контакт.",
        "emotional":"Эмоциональный стиль: милый, трогательный текст. Вызови умиление и желание взять щенка.",
        "informative":"Информативный стиль: чёткие факты и характеристики без лишних эмоций."};
    const styleDesc=styles[currentStyle]||styles.sale;
    
    let prompt;
    if(currentPuppy){
        const p=currentPuppy;
        prompt="Напиши пост для Instagram/VK/Telegram о продаже щенка.\n\n"+
            "Данные щенка:\n"+
            "- Кличка: "+p.name+"\n"+
            "- Порода: "+p.breed+"\n"+
            "- Пол: "+p.gender+"\n"+
            (p.birth_date?"- Дата рождения: "+p.birth_date+"\n":"")+
            (p.color?"- Окрас: "+p.color+"\n":"")+
            (p.expected_weight?"- Вес: "+p.expected_weight+"\n":"")+
            (p.price?"- Цена: "+p.price+" руб\n":"")+
            "- Документы: ветпаспорт, привит по возрасту\n"+
            (p.description?"- Описание: "+p.description+"\n":"")+
            "\n"+styleDesc+"\n\n"+
            "ВАЖНО: Напиши ПОЛНЫЙ текст поста (минимум 100 слов) с эмодзи. "+
            "В конце добавь 15-20 хештегов. "+
            "НЕ пиши слова Заголовок:, Текст:, Хештеги: — просто готовый пост."+
            (prompt_extra?"\n\nДополнительно: "+prompt_extra:"");
    } else {
        prompt="Напиши полезный пост для соцсетей питомника мелких пород собак.\n\n"+
            "Питомник: "+KENNEL+", город: "+CITY+"\n"+
            "Породы: чихуахуа, той-пудель, мальтипу\n\n"+
            "Напиши ПОЛНЫЙ текст (минимум 100 слов) с эмодзи. "+
            "Тема: советы по уходу, интересные факты о породах, или полезная информация для владельцев. "+
            "В конце добавь 15-20 хештегов. "+
            "НЕ пиши Заголовок:, Текст: — просто готовый пост."+
            (prompt_extra?"\n\nТема: "+prompt_extra:"");
    }
    
    console.log("PROMPT:", prompt);
    const text=await aiGenerate(prompt);
    console.log("AI RESULT:", text);
    document.getElementById("post-loading").classList.add("hidden");
    if(text && text.length > 20){
        document.getElementById("post-text").value=text;
        showPostStep(3);
    } else {
        showToast("AI вернул пустой ответ, попробуйте ещё","error");
        showPostStep(2);
    }
}
async function regeneratePost(){await generatePostText();}

function showPreview(){
    const text=document.getElementById("post-text").value;
    document.getElementById("post-preview-area").innerHTML=
        '<div class="post-preview"><div class="preview-header"><div class="preview-avatar"></div><div><div class="preview-name">'+KENNEL+'</div><div class="preview-platform">Превью</div></div></div>'+
        '<div class="preview-text">'+text.substring(0,300)+(text.length>300?"...":"")+'</div>'+
        '<div class="preview-footer"><span>❤️ 0</span><span>💬 0</span><span>📤 0</span></div></div>';
}

function publishPost(){
    const text=document.getElementById("post-text").value;const pls=[];
    if(document.getElementById("pl-instagram").checked)pls.push("instagram");
    if(document.getElementById("pl-vk").checked)pls.push("vk");
    if(document.getElementById("pl-telegram").checked)pls.push("telegram");
    if(!pls.length){showToast("Выберите соцсеть","error");return;}
    publishViaBot(text,pls);
    showToast("📤 Отправлено боту! Проверьте чат.","success");
    document.getElementById("post-step-3").classList.add("hidden");
    document.getElementById("publish-result").innerHTML=
        '<h3 style="margin-bottom:14px">📤 Отправлено боту!</h3>'+
        '<div style="margin:10px 0">'+pls.map(function(p){var n={"instagram":"📸 Instagram","vk":"📘 ВКонтакте","telegram":"✈️ Telegram"};return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>'+(n[p]||p)+'</span><span style="color:#4caf50">📤 Отправлено</span></div>';}).join("")+'</div>'+
        '<p style="color:var(--hint);font-size:13px">Откройте чат с ботом — он подтвердит публикацию</p>';
    document.getElementById("post-result").classList.remove("hidden");
}

// === АВИТО ===
function loadAvitoPuppies(){document.getElementById("avito-result").classList.add("hidden");document.getElementById("avito-loading").classList.add("hidden");
    const sale=puppies.filter(p=>p.status!=="sold");
    document.getElementById("avito-puppies-list").innerHTML=sale.map(p=>
        '<div class="option-card" onclick="generateAvito(\''+p.id+'\')"><span class="option-icon">'+breedEmoji(p.breed)+'</span><div><div class="option-text">'+p.name+'</div><div class="option-desc">'+p.breed+'</div></div></div>'
    ).join("")||'<p class="form-hint" style="text-align:center">Нет щенков</p>';}
function createAvitoForPuppy(id){showScreen("avito");setTimeout(()=>generateAvito(id),300);}

async function generateAvito(id){
    currentPuppy=puppies.find(x=>x.id==id);if(!currentPuppy)return;
    document.getElementById("avito-loading").classList.remove("hidden");document.getElementById("avito-result").classList.add("hidden");
    const p=currentPuppy;
    const prompt="Напиши подробное объявление для сайта Авито о продаже щенка.\n\n"+
        "Данные:\n"+
        "- Кличка: "+p.name+"\n- Порода: "+p.breed+"\n- Пол: "+p.gender+"\n"+
        (p.birth_date?"- Дата рождения: "+p.birth_date+"\n":"")+
        (p.color?"- Окрас: "+p.color+"\n":"")+
        (p.expected_weight?"- Вес: "+p.expected_weight+"\n":"")+
        (p.price?"- Цена: "+p.price+" руб\n":"")+
        (p.description?"- "+p.description+"\n":"")+
        "- Документы: ветпаспорт, привит\n"+
        "- Город: "+CITY+"\n\n"+
        "Правила: НЕ используй эмодзи. Деловой стиль. Подробное описание породы. "+
        "Напиши ЗАГОЛОВОК (одна строка) потом ОПИСАНИЕ (минимум 150 слов). "+
        "Укажи преимущества породы. Ключевые слова для поиска.";
    const text=await aiGenerate(prompt);
    document.getElementById("avito-loading").classList.add("hidden");
    if(text){document.getElementById("avito-text").value=text;document.getElementById("avito-result").classList.remove("hidden");}
}
async function regenerateAvito(){if(currentPuppy)await generateAvito(currentPuppy.id);}
function copyAvito(){navigator.clipboard.writeText(document.getElementById("avito-text").value).then(()=>showToast("📋 Скопировано!","success"));}

// === AI ===
function resetAI(){document.getElementById("ai-result").classList.add("hidden");document.getElementById("ai-loading").classList.add("hidden");}
async function aiAction(type){
    document.getElementById("ai-loading").classList.remove("hidden");document.getElementById("ai-result").classList.add("hidden");
    const prompts={idea:"Придумай идею для поста питомника (чихуахуа, той-пудель, мальтипу). Напиши готовый текст с хештегами.",
        reels:"Придумай идею для короткого видео Reels/клипы о собаках мелких пород. Опиши сценарий.",
        hashtags:"Подбери 30 хештегов для питомника мелких пород: 10 популярных, 10 средних, 10 узких.",
        plan:"Составь контент-план на неделю для питомника (чихуахуа, той-пудель, мальтипу). По 1-2 поста в день."};
    const text=await aiGenerate(prompts[type]||prompts.idea);
    document.getElementById("ai-loading").classList.add("hidden");
    if(text){document.getElementById("ai-result-text").textContent=text;document.getElementById("ai-result").classList.remove("hidden");}
}

// === ИСТОРИЯ ===
function loadHistoryScreen(){
    const hist=loadHistory();
    document.getElementById("history-list").innerHTML=hist.length?hist.map(h=>{
        const d=new Date(h.date);
        const badges=(h.platforms||[]).map(p=>'<span class="history-badge '+(p==="instagram"?"ig":p==="vk"?"vk":"tg")+'">'+(p==="instagram"?"IG":p==="vk"?"VK":"TG")+'</span>').join("");
        return '<div class="history-item"><div class="history-date">'+d.toLocaleDateString("ru")+" "+d.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"})+'</div>'+
            '<div class="history-text">'+h.text+'</div><div class="history-platforms">'+badges+'</div></div>';
    }).join(""):'<p class="form-hint" style="text-align:center;padding:30px">Нет публикаций</p>';
}


function checkGroqKey() {
    if (!localStorage.getItem("groq_key")) {
        const key = prompt("Введите Groq API ключ\n\nПолучить бесплатно: console.groq.com/keys\nКлюч начинается с gsk_");
        if (key && key.startsWith("gsk_")) {
            localStorage.setItem("groq_key", key);
            showToast("✅ Ключ сохранён!","success");
            location.reload();
        } else if(key) {
            showToast("Ключ должен начинаться с gsk_","error");
        }
    }
}
setTimeout(checkGroqKey, 1000);

showScreen("home");

function resetGroqKey(){
    localStorage.removeItem("groq_key");
    showToast("Ключ удалён","success");
    setTimeout(checkGroqKey, 500);
}
