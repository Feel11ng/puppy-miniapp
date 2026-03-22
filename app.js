/* === PUPPYHUB MINI APP v3 === */
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
    var c='<div class="card card-'+bc+'" onclick="showDetail('+i+')">';
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
    h+='<button class="btn btn-sm btn-secondary" onclick="editPuppy('+i+')">&#x270F;&#xFE0F; Изменить</button>';
    h+='<button class="btn btn-sm btn-pink" onclick="genPost('+i+')">&#x1F4DD; Пост</button>';
    h+='<button class="btn btn-sm btn-danger" onclick="delPuppy('+i+')">&#x1F5D1; Удалить</button>';
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
    h+='<button class="btn btn-success" onclick="savePuppy('+idx+')">&#x1F4BE; Сохранить</button>';
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
    var h='<button class="btn btn-primary" style="margin-bottom:16px" onclick="showCreatePost()">&#x270D;&#xFE0F; Создать пост</button>';
    var avail=[];
    for(var i=0;i<puppies.length;i++)if(puppies[i].status==="available")avail.push(i);
    if(avail.length>0){
        h+='<div class="card"><div class="card-title">&#x26A1; Быстрый пост</div>';
        h+='<div class="card-body"><p style="color:var(--text2);font-size:13px;margin-bottom:12px">Выберите щенка для AI-поста:</p>';
        for(var j=0;j<avail.length;j++){
            var idx=avail[j],p=puppies[idx];
            h+='<button class="btn btn-sm btn-ghost" style="margin-bottom:8px" onclick="genPost('+idx+')">'+breedEmoji(p.breed)+' '+esc(p.name)+'</button>';
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
    h+='<button class="btn btn-primary" onclick="doGenPost()">&#x1F916; Сгенерировать</button>';
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
    if(!groqKey)h+='<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="askKey()">&#x1F511; Установить ключ</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x1F4AC; Свободный запрос</div>';
    h+='<div class="card-body" style="margin-top:8px">';
    h+='<textarea class="ft" id="ai-q" placeholder="Задайте любой вопрос..."></textarea>';
    h+='<button class="btn btn-primary" style="margin-top:8px" onclick="doFreeAI()">&#x1F680; Отправить</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x26A1; Быстрые действия</div>';
    h+='<div class="card-actions" style="margin-top:8px">';
    h+='<button class="btn btn-sm btn-secondary" onclick="aiQ('hashtags')">&#x1F3F7; Хештеги</button>';
    h+='<button class="btn btn-sm btn-secondary" onclick="aiQ('plan')">&#x1F4C5; Контент-план</button>';
    h+='<button class="btn btn-sm btn-secondary" onclick="aiQ('tips')">&#x1F4A1; Советы</button>';
    h+='<button class="btn btn-sm btn-secondary" onclick="aiQ('names')">&#x1F4DB; Имена</button>';
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
    h+='<button class="btn btn-sm btn-secondary" onclick="copyText()">&#x1F4CB; Копировать</button>';
    h+='<button class="btn btn-sm btn-warning" onclick="regenAI()">&#x1F504; Ещё вариант</button>';
    h+='<button class="btn btn-sm btn-pink" onclick="showPublish()">&#x1F4E4; Опубликовать</button>';
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
    h+='<button class="btn btn-pink" onclick="doPublish()">&#x1F680; Отправить боту</button>';
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
    h+='<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="saveKey()">&#x1F4BE; Сохранить ключ</button></div>';
    h+='<div class="s-section">Данные</div>';
    h+='<div class="s-item"><span class="s-label">Щенков</span><span class="s-value">'+puppies.length+'</span></div>';
    h+='<div class="card-actions" style="margin-top:12px">';
    h+='<button class="btn btn-sm btn-secondary" onclick="exportData()">&#x1F4E6; Экспорт</button>';
    h+='<button class="btn btn-sm btn-secondary" onclick="importPrompt()">&#x1F4E5; Импорт</button></div>';
    h+='<div class="s-section">Синхронизация</div>';
    h+='<button class="btn btn-sm btn-primary" style="margin-bottom:8px" onclick="syncToBot()">&#x1F504; Отправить боту</button>';
    h+='<p style="font-size:11px;color:var(--text3)">Отправит щенков боту для сохранения в базу</p>';
    h+='<div class="s-section" style="margin-top:16px">Опасная зона</div>';
    h+='<button class="btn btn-sm btn-danger" onclick="clearAll()">&#x1F5D1; Очистить всё</button>';
    showModal("&#x2699;&#xFE0F; Настройки",h);
}
function askKey(msg){
    var h='';
    if(msg)h+='<p style="color:var(--warning);margin-bottom:12px">'+esc(msg)+'</p>';
    h+='<div class="fg"><label class="fl">Groq API ключ</label>';
    h+='<input type="password" class="fi" id="s-key" placeholder="gsk_...">';
    h+='<p style="font-size:11px;color:var(--text3);margin-top:6px">Бесплатно на <a href="https://console.groq.com" style="color:var(--accent)">console.groq.com</a></p></div>';
    h+='<button class="btn btn-primary" onclick="saveKey()">&#x1F4BE; Сохранить</button>';
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
    h+='<button class="btn btn-primary" onclick="doImport()">&#x1F4E5; Импортировать</button>';
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
function closeModal(e){if(e.target===e.currentTarget)hideModal();}

// === UTILS ===
function esc(t){if(!t)return"";return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function escA(t){if(!t)return"";return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function breedName(b){return{chihuahua:"Чихуахуа",toypoodle:"Той-пудель",maltipoo:"Мальтипу",other:"Другая"}[b]||b||"?";}
function breedClass(b){return{chihuahua:"chi",toypoodle:"poo",maltipoo:"mal"}[b]||"oth";}
function breedEmoji(b){return{chihuahua:"\uD83D\uDC15",toypoodle:"\uD83D\uDC29",maltipoo:"\uD83E\uDDF8"}[b]||"\uD83D\uDC36";}
function fmtPrice(p){if(!p)return"0";var n=parseInt(p);return isNaN(n)?p:n.toLocaleString("ru-RU");}

// === INIT ===
document.addEventListener("DOMContentLoaded",function(){
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
