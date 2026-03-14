const tg=window.Telegram.WebApp;tg.ready();tg.expand();
const KENNEL="Vip_chihua",CITY="Краснодар",CONTACT="+792846066669";
const GROQ="https://api.groq.com/openai/v1/chat/completions";

let P=JSON.parse(localStorage.getItem("pp")||"[]"),cur=null,cB="",cG="",cS="sale",cF="all";

function sP(){localStorage.setItem("pp",JSON.stringify(P));}
function H(){return JSON.parse(localStorage.getItem("hist")||"[]");}
function sH(h){localStorage.setItem("hist",JSON.stringify(h));}
function gK(){return localStorage.getItem("gk")||"";}

function toast(t){const e=document.createElement("div");e.className="toast";e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2500);}
function bE(b){return({"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"})[b]||"🐶";}
function bC(b){return({"чихуахуа":"c1","той-пудель":"c2","мальтипу":"c3"})[b]||"c1";}

// === AI ===
async function AI(prompt){
    const k=gK();
    if(!k){toast("Введите API ключ в настройках");askKey();return null;}
    try{
        const r=await fetch(GROQ,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+k},
            body:JSON.stringify({model:"llama-3.3-70b-versatile",max_tokens:1000,temperature:0.8,
                messages:[{role:"system",content:"Ты SMM-менеджер питомника "+KENNEL+" ("+CITY+"). Породы: чихуахуа, той-пудель, мальтипу. Документы: ветпаспорт, прививки. Пиши на русском. НЕ пиши заголовки Заголовок: Текст: Хештеги: — просто готовый текст. Минимум 100 слов."},
                    {role:"user",content:prompt}]})});
        const d=await r.json();
        if(d.choices)return d.choices[0].message.content;
        if(d.error){toast("AI: "+d.error.message);return null;}
        return null;
    }catch(e){toast("Ошибка AI: "+e.message);return null;}
}

function askKey(){
    const k=prompt("Введите Groq API ключ\n\nПолучить бесплатно:\nconsole.groq.com/keys\n\nКлюч начинается с gsk_");
    if(k&&k.startsWith("gsk_")){localStorage.setItem("gk",k);toast("✅ Ключ сохранён!");return true;}
    if(k)toast("Ключ должен начинаться с gsk_");
    return false;
}
function resetKey(){localStorage.removeItem("gk");askKey();}
function clearData(){if(confirm("Удалить все данные?")){localStorage.clear();toast("Очищено");go("home");}}
function exportData(){const d=JSON.stringify({puppies:P,history:H()},null,2);navigator.clipboard.writeText(d).then(()=>toast("📋 Скопировано"));}

// === НАВИГАЦИЯ ===
function go(n){
    document.querySelectorAll("[id^=screen-]").forEach(e=>e.classList.add("hidden"));
    document.getElementById("screen-"+n).classList.remove("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
    if(tg.HapticFeedback)tg.HapticFeedback.impactOccurred("light");
    if(n==="home")loadHome();
    if(n==="puppies")loadPL();
    if(n==="post")loadPP();
    if(n==="avito")loadAV();
    if(n==="history")loadHist();
    if(n==="ai"){document.getElementById("ai-res").classList.add("hidden");document.getElementById("ai-load").classList.add("hidden");document.getElementById("ai-input").classList.add("hidden");}
}

// === HOME ===
function loadHome(){
    P=JSON.parse(localStorage.getItem("pp")||"[]");
    const s=P.filter(p=>p.st!=="sold"),d=P.filter(p=>p.st==="sold");
    document.getElementById("stats").innerHTML='<div class="st"><span class="sn">'+s.length+'</span><span class="sl">В продаже</span></div><div class="st"><span class="sn">'+d.length+'</span><span class="sl">Продано</span></div><div class="st"><span class="sn">'+H().length+'</span><span class="sl">Постов</span></div>';
    document.getElementById("home-list").innerHTML=s.length?s.map(p=>pCard(p)).join(""):'<p style="color:var(--hn);text-align:center;padding:20px">Нет щенков. Нажмите 🐶 → ➕</p>';
}

function pCard(p){
    const g=p.g==="мальчик"?"♂️":"♀️",pr=p.pr?Number(p.pr).toLocaleString("ru")+" ₽":"";
    return'<div class="pc" onclick="showD(''+p.id+'')"><div class="pa '+bC(p.b)+'">'+bE(p.b)+'</div><div class="pi"><div class="pn">'+g+" "+p.n+'</div><div class="pd">'+p.b+(p.c?" • "+p.c:"")+'</div></div><div class="pp">'+pr+'</div></div>';
}

// === СПИСОК ЩЕНКОВ ===
function loadPL(){P=JSON.parse(localStorage.getItem("pp")||"[]");filterP("");}
function filterP(q){
    q=q.toLowerCase();let f=P;
    if(cF==="sold")f=f.filter(p=>p.st==="sold");
    else if(cF!=="all")f=f.filter(p=>p.b===cF);
    if(q)f=f.filter(p=>p.n.toLowerCase().includes(q));
    document.getElementById("plist").innerHTML=f.length?f.map(p=>pCard(p)).join(""):'<p style="color:var(--hn);text-align:center;padding:20px">Не найдено</p>';
}
function setF(btn,f){document.querySelectorAll(".chip").forEach(c=>c.classList.remove("on"));btn.classList.add("on");cF=f;filterP(document.querySelector(".sinput")?.value||"");}

// === ДОБАВИТЬ ЩЕНКА ===
function SB(b,v){document.querySelectorAll(".bsel .sbtn").forEach(x=>x.classList.remove("on"));b.classList.add("on");cB=v;}
function SG(b,v){var btns=b.parentElement.querySelectorAll(".sbtn");btns.forEach(x=>x.classList.remove("on"));b.classList.add("on");cG=v;}
function SS(b,v){var btns=b.parentElement.querySelectorAll(".sbtn");btns.forEach(x=>x.classList.remove("on"));b.classList.add("on");cS=v;}

function saveP(){
    const n=document.getElementById("f-name").value.trim();
    if(!n||!cB||!cG){toast("Заполните породу, кличку и пол");return;}
    P.push({id:Date.now()+"",n:n,b:cB,g:cG,bd:document.getElementById("f-birth").value,
        c:document.getElementById("f-color").value.trim(),w:document.getElementById("f-weight").value.trim(),
        pr:document.getElementById("f-price").value||null,d:document.getElementById("f-desc").value.trim(),st:"sale"});
    sP();toast("✅ Добавлен!");
    ["f-name","f-birth","f-color","f-weight","f-price","f-desc"].forEach(id=>document.getElementById(id).value="");
    cB="";cG="";document.querySelectorAll(".bsel .sbtn").forEach(b=>b.classList.remove("on"));
    try{tg.sendData(JSON.stringify({action:"sync_puppy",puppy:P[P.length-1]}));}catch(e){}
    go("puppies");
}

// === КАРТОЧКА ===
function showD(id){
    const p=P.find(x=>x.id==id);if(!p)return;cur=p;
    const g=p.g==="мальчик"?"♂️":"♀️",pr=p.pr?Number(p.pr).toLocaleString("ru")+" ₽":"—",ok=p.st!=="sold";
    document.getElementById("detail").innerHTML=
        '<div style="text-align:center;font-size:48px;margin:10px 0">'+bE(p.b)+'</div>'+
        '<h2 style="text-align:center;margin-bottom:16px">'+g+" "+p.n+'</h2>'+
        '<div class="dr"><span class="dl">Порода</span><span class="dv">'+p.b+'</span></div>'+
        '<div class="dr"><span class="dl">Пол</span><span class="dv">'+p.g+'</span></div>'+
        (p.bd?'<div class="dr"><span class="dl">Д.р.</span><span class="dv">'+p.bd+'</span></div>':'')+
        (p.c?'<div class="dr"><span class="dl">Окрас</span><span class="dv">'+p.c+'</span></div>':'')+
        (p.w?'<div class="dr"><span class="dl">Вес</span><span class="dv">'+p.w+'</span></div>':'')+
        '<div class="dr"><span class="dl">Цена</span><span class="dv" style="color:var(--bt)">'+pr+'</span></div>'+
        (p.d?'<div class="dr"><span class="dl">Описание</span><span class="dv">'+p.d+'</span></div>':'')+
        '<div class="dr"><span class="dl">Статус</span><span class="dv">'+(ok?"🟢 В продаже":"🔴 Продан")+'</span></div>'+
        '<div class="da">'+
        '<button class="btn" onclick="mkPost(''+p.id+'')">📝</button>'+
        '<button class="btn2" onclick="mkAv(''+p.id+'')">📦</button>'+
        (ok?'<button class="btn2" style="color:#4caf50" onclick="sell(''+p.id+'')">✅</button>':'')+
        '<button class="btn2" style="color:#f44" onclick="delP(''+p.id+'')">🗑</button></div>';
    go("detail");
}
function sell(id){const p=P.find(x=>x.id==id);if(p){p.st="sold";sP();}toast("✅ Продан!");go("puppies");}
function delP(id){if(!confirm("Удалить?"))return;P=P.filter(x=>x.id!=id);sP();toast("Удалён");go("puppies");}

// === ПОСТ ===
function loadPP(){showPS(1);
    const s=P.filter(p=>p.st!=="sold");
    document.getElementById("post-plist").innerHTML=s.map(p=>
        '<div class="oc" onclick="selPP(''+p.id+'')"><span class="oi">'+bE(p.b)+'</span><span>'+p.n+" — "+p.b+'</span></div>'
    ).join("")||'<p class="hint" style="text-align:center">Нет щенков</p>';
}
function selPP(id){cur=P.find(x=>x.id==id);showPS(2);}
function startFree(){cur=null;showPS(2);}
function mkPost(id){cur=P.find(x=>x.id==id);go("post");showPS(2);}
function showPS(n){[1,2,3].forEach(i=>document.getElementById("ps"+i).classList.add("hidden"));
    document.getElementById("ps-load").classList.add("hidden");document.getElementById("ps-done").classList.add("hidden");
    document.getElementById("ps"+n).classList.remove("hidden");}

async function genPost(){
    showPS(0);document.getElementById("ps-load").classList.remove("hidden");
    document.getElementById("lt").textContent="🤖 AI генерирует текст...";
    const ex=document.getElementById("post-prompt").value;
    const stMap={"sale":"Продающий: подчеркни преимущества, цену, контакт. Вызови желание купить.",
        "emotional":"Эмоциональный: милый, трогательный. Вызови умиление.",
        "info":"Информативный: факты, характеристики, без лишних эмоций."};
    let pr;
    if(cur){
        pr="Напиши пост для Instagram/VK о щенке.\n"+
            "Кличка: "+cur.n+", порода: "+cur.b+", пол: "+cur.g+
            (cur.c?", окрас: "+cur.c:"")+(cur.pr?", цена: "+cur.pr+" руб":"")+
            (cur.d?". "+cur.d:"")+". Ветпаспорт, привит.\n"+
            (stMap[cS]||stMap.sale)+"\n"+
            "Напиши ПОЛНЫЙ текст поста (минимум 150 слов) с эмодзи. В конце 15-20 хештегов."+
            (ex?"\nДополнительно: "+ex:"");
    }else{
        pr="Напиши полезный пост для соцсетей питомника (чихуахуа, той-пудель, мальтипу). "+
            "Минимум 150 слов с эмодзи. В конце хештеги."+(ex?" Тема: "+ex:"");
    }
    const t=await AI(pr);
    document.getElementById("ps-load").classList.add("hidden");
    if(t&&t.length>30){document.getElementById("post-text").value=t;showPS(3);}
    else{toast("Попробуйте ещё раз");showPS(2);}
}

function pubPost(){
    const t=document.getElementById("post-text").value,pl=[];
    if(document.getElementById("c-ig").checked)pl.push("instagram");
    if(document.getElementById("c-vk").checked)pl.push("vk");
    if(document.getElementById("c-tg").checked)pl.push("telegram");
    if(!pl.length){toast("Выберите соцсеть");return;}
    try{tg.sendData(JSON.stringify({action:"publish",text:t,platforms:pl}));}catch(e){}
    const h=H();h.unshift({t:t.substring(0,100),p:pl,d:new Date().toISOString()});if(h.length>50)h.length=50;sH(h);
    const names={"instagram":"📸 Instagram","vk":"📘 ВКонтакте","telegram":"✈️ Telegram"};
    document.getElementById("pub-res").innerHTML='<h3 style="margin-bottom:12px">📤 Отправлено!</h3>'+
        pl.map(p=>'<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd)"><span>'+(names[p]||p)+'</span><span style="color:#4caf50">✅</span></div>').join("")+
        '<p style="color:var(--hn);font-size:13px;margin-top:10px">Бот опубликует пост. Проверьте чат.</p>';
    [1,2,3].forEach(i=>document.getElementById("ps"+i).classList.add("hidden"));
    document.getElementById("ps-load").classList.add("hidden");
    document.getElementById("ps-done").classList.remove("hidden");
    toast("📤 Отправлено боту!");
}

// === АВИТО ===
function loadAV(){document.getElementById("av-res").classList.add("hidden");document.getElementById("av-load").classList.add("hidden");
    const s=P.filter(p=>p.st!=="sold");
    document.getElementById("av-list").innerHTML=s.map(p=>
        '<div class="oc" onclick="genAv(''+p.id+'')"><span class="oi">'+bE(p.b)+'</span><span>'+p.n+'</span></div>'
    ).join("")||'<p class="hint" style="text-align:center">Нет щенков</p>';}
function mkAv(id){go("avito");setTimeout(()=>genAv(id),300);}

async function genAv(id){
    cur=P.find(x=>x.id==id);if(!cur)return;
    document.getElementById("av-load").classList.remove("hidden");document.getElementById("av-res").classList.add("hidden");
    const p=cur;
    const pr="Напиши подробное объявление для Авито.\n"+
        "Щенок: "+p.n+", "+p.b+", "+p.g+(p.c?", "+p.c:"")+(p.pr?", "+p.pr+" руб":"")+(p.d?". "+p.d:"")+
        ". Ветпаспорт, привит. Город: "+CITY+
        "\nБЕЗ эмодзи. Деловой стиль. Заголовок + описание (мин 150 слов). Ключевые слова для поиска.";
    const t=await AI(pr);
    document.getElementById("av-load").classList.add("hidden");
    if(t){document.getElementById("av-text").value=t;document.getElementById("av-res").classList.remove("hidden");}
}
function regenAv(){if(cur)genAv(cur.id);}
function copyAv(){navigator.clipboard.writeText(document.getElementById("av-text").value).then(()=>toast("📋 Скопировано!"));}

// === AI ===
function hideAI(){document.getElementById("ai-res").classList.add("hidden");}
async function aiDo(type){
    if(type==="client"){document.getElementById("ai-input").classList.remove("hidden");return;}
    document.getElementById("ai-load").classList.remove("hidden");document.getElementById("ai-res").classList.add("hidden");document.getElementById("ai-input").classList.add("hidden");
    const prompts={
        idea:"Придумай идею для поста питомника мелких пород. Напиши готовый текст (мин 100 слов) с эмодзи и хештегами.",
        reels:"Придумай сценарий для короткого видео Reels о собаках мелких пород. Опиши по секундам.",
        hashtags:"Подбери 30 хештегов для питомника мелких пород. 10 популярных, 10 средних, 10 узких. На русском и английском.",
        plan:"Контент-план на неделю для питомника (чихуахуа, той-пудель, мальтипу). 1-2 поста в день с указанием времени и темы."
    };
    const t=await AI(prompts[type]);
    document.getElementById("ai-load").classList.add("hidden");
    if(t){document.getElementById("ai-text").textContent=t;document.getElementById("ai-res").classList.remove("hidden");}
}
async function aiClient(){
    const q=document.getElementById("ai-prompt").value;if(!q){toast("Напишите вопрос");return;}
    document.getElementById("ai-load").classList.remove("hidden");document.getElementById("ai-input").classList.add("hidden");
    const info=P.filter(p=>p.st!=="sold").map(p=>p.n+", "+p.b+", "+(p.pr||"?")+" руб").join("; ");
    const t=await AI("Клиент спросил: "+q+"\n\nДоступные щенки: "+(info||"нет")+"\nНапиши вежливый ответ с информацией.");
    document.getElementById("ai-load").classList.add("hidden");
    if(t){document.getElementById("ai-text").textContent=t;document.getElementById("ai-res").classList.remove("hidden");}
}

// === ИСТОРИЯ ===
function loadHist(){
    const h=H();
    document.getElementById("hist").innerHTML=h.length?h.map(x=>{
        const d=new Date(x.d);
        return'<div class="hi"><div class="hd">'+d.toLocaleDateString("ru")+" "+d.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"})+'</div><div class="ht">'+x.t+'</div><div class="hp">'+
            (x.p||[]).map(p=>'<span class="hb '+(p==="instagram"?"ig":p==="vk"?"vk":"tg")+'">'+(p==="instagram"?"IG":p==="vk"?"VK":"TG")+'</span>').join("")+'</div></div>';
    }).join(""):'<p class="hint" style="text-align:center;padding:30px">Нет публикаций</p>';
}

// === INIT ===
if(!gK())setTimeout(askKey,500);
go("home");
