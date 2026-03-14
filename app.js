const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
const API = "https://97f05b448b891eda-107-161-168-242.serveousercontent.com";

async function api(endpoint, method, body) {
    try {
        const opts = {method: method||"GET", headers:{"Content-Type":"application/json"}, mode:"cors"};
        if(body) opts.body = JSON.stringify(body);
        const res = await fetch(API+endpoint, opts);
        return await res.json();
    } catch(e) { showToast("Ошибка связи","error"); return {success:false,error:e.message}; }
}

let puppies=[], currentPuppy=null, currentStyle="sale", currentBreed="", currentGender="", currentFilter="all", swipeIndex=0;

function showScreen(n) {
    document.querySelectorAll("[id^=screen-]").forEach(el=>el.classList.add("hidden"));
    document.getElementById("screen-"+n).classList.remove("hidden");
    window.scrollTo({top:0,behavior:'smooth'});
    if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    if(n==="home") loadHome();
    if(n==="puppies") loadPuppiesList();
    if(n==="new-post") loadPostPuppies();
    if(n==="avito") loadAvitoPuppies();
    if(n==="analytics") loadAnalytics();
    if(n==="ai") resetAI();
    if(n==="history") loadHistory();
}

function showToast(text, type) {
    const t=document.createElement("div"); t.className="toast "+(type||""); t.textContent=text;
    document.body.appendChild(t); setTimeout(()=>t.remove(),2500);
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type==="error"?"error":"success");
}

function breedClass(b){return({"чихуахуа":"breed-chihua","той-пудель":"breed-poodle","мальтипу":"breed-maltipoo"})[b]||"breed-default"}
function breedEmoji(b){return({"чихуахуа":"🐕","той-пудель":"🐩","мальтипу":"🧸"})[b]||"🐶"}

async function loadHome() {
    try { const d=await api("/api/puppies"); if(Array.isArray(d)) puppies=d; } catch(e){}
    const sale=puppies.filter(p=>p.status==="for_sale"||p.status==="sale");
    const sold=puppies.filter(p=>p.status==="sold");
    document.getElementById("stat-sale").textContent=sale.length;
    document.getElementById("stat-sold").textContent=sold.length;
    document.getElementById("stat-posts").textContent="—";

    // Свайп-карусель
    const track=document.getElementById("swipe-track");
    const dots=document.getElementById("swipe-dots");
    if(sale.length>0) {
        track.innerHTML=sale.map(p=>{
            const g=p.gender==="мальчик"?"♂️":"♀️";
            const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"";
            return '<div class="swipe-card" onclick="showPuppyDetail('+p.id+')">'+
                '<div style="display:flex;align-items:center;gap:12px">'+
                '<div class="puppy-avatar '+breedClass(p.breed)+'">'+breedEmoji(p.breed)+'</div>'+
                '<div><div class="puppy-name">'+g+' '+p.name+'</div>'+
                '<div class="puppy-details">'+p.breed+(p.color?' • '+p.color:'')+'</div></div>'+
                '<div style="margin-left:auto" class="puppy-price">'+price+'</div></div></div>';
        }).join("");
        dots.innerHTML=sale.map((_,i)=>'<div class="swipe-dot'+(i===0?' active':'')+'"></div>').join("");
        setupSwipe();
    } else { track.innerHTML=''; dots.innerHTML=''; }

    const list=document.getElementById("home-puppies-list");
    list.innerHTML=sale.length===0?'<p style="color:var(--hint);text-align:center;padding:20px">Нет щенков</p>':'';
}

function setupSwipe() {
    const track=document.getElementById("swipe-track");
    let startX=0,dx=0;
    track.addEventListener("touchstart",e=>{startX=e.touches[0].clientX;});
    track.addEventListener("touchmove",e=>{dx=e.touches[0].clientX-startX;track.style.transform="translateX(calc(-"+swipeIndex+"*87% + "+dx+"px))";});
    track.addEventListener("touchend",()=>{
        const cards=track.children.length;
        if(dx<-50&&swipeIndex<cards-1) swipeIndex++;
        if(dx>50&&swipeIndex>0) swipeIndex--;
        track.style.transform="translateX(-"+swipeIndex+"*87%)";
        dx=0;
        document.querySelectorAll(".swipe-dot").forEach((d,i)=>d.classList.toggle("active",i===swipeIndex));
    });
}

function puppyCardHTML(p,showBadge) {
    const g=p.gender==="мальчик"?"♂️":"♀️";
    const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"";
    const badge=showBadge&&p.status==="for_sale"?'<div class="puppy-badge">В продаже</div>':'';
    const soldBadge=p.status==="sold"?'<div class="puppy-badge" style="background:rgba(244,67,54,0.8)">Продан</div>':'';
    return '<div class="puppy-card" onclick="showPuppyDetail('+p.id+')">'+
        '<div class="puppy-avatar '+breedClass(p.breed)+'">'+breedEmoji(p.breed)+'</div>'+
        '<div class="puppy-info"><div class="puppy-name">'+g+' '+p.name+'</div>'+
        '<div class="puppy-details">'+p.breed+(p.color?' • '+p.color:'')+'</div></div>'+
        '<div class="puppy-price">'+price+'</div>'+badge+soldBadge+'</div>';
}

async function loadPuppiesList() {
    const d=await api("/api/puppies"); if(Array.isArray(d)) puppies=d;
    filterPuppies();
}

function filterPuppies() {
    const search=(document.getElementById("puppy-search")?.value||"").toLowerCase();
    let filtered=puppies;
    if(currentFilter==="sold") filtered=filtered.filter(p=>p.status==="sold");
    else if(currentFilter!=="all") filtered=filtered.filter(p=>p.breed===currentFilter);
    if(search) filtered=filtered.filter(p=>p.name.toLowerCase().includes(search));
    
    document.getElementById("puppies-list").innerHTML=filtered.length?
        filtered.map(p=>puppyCardHTML(p,true)).join(""):
        '<p style="color:var(--hint);text-align:center;padding:20px">Ничего не найдено</p>';
}

function setFilter(btn, filter) {
    document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active"); currentFilter=filter; filterPuppies();
}

function selectBreed(b,breed){document.querySelectorAll(".breed-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentBreed=breed;}
function selectGender(b,gender){document.querySelectorAll(".gender-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentGender=gender;}

async function savePuppy() {
    const name=document.getElementById("puppy-name").value.trim();
    if(!name||!currentBreed||!currentGender){showToast("Заполните породу, кличку и пол","error");return;}
    const res=await api("/api/puppies","POST",{name,breed:currentBreed,gender:currentGender,
        birth_date:document.getElementById("puppy-birth").value,color:document.getElementById("puppy-color").value.trim(),
        expected_weight:document.getElementById("puppy-weight").value.trim(),price:document.getElementById("puppy-price").value||null,
        description:document.getElementById("puppy-desc").value.trim()});
    if(res.success){showToast("✅ Щенок добавлен!","success");
        ["puppy-name","puppy-birth","puppy-color","puppy-weight","puppy-price","puppy-desc"].forEach(id=>document.getElementById(id).value="");
        currentBreed="";currentGender="";document.querySelectorAll(".breed-btn,.gender-btn").forEach(b=>b.classList.remove("active"));showScreen("puppies");
    } else showToast("Ошибка","error");
}

function showPuppyDetail(id) {
    const p=puppies.find(x=>x.id===id); if(!p) return; currentPuppy=p;
    const g=p.gender==="мальчик"?"♂️":"♀️";
    const price=p.price?Number(p.price).toLocaleString("ru")+" ₽":"не указана";
    const isSale=p.status==="for_sale"||p.status==="sale";
    document.getElementById("puppy-detail-content").innerHTML=
        '<div class="detail-header"><div class="detail-avatar">'+breedEmoji(p.breed)+'</div>'+
        '<div class="detail-name">'+g+' '+p.name+'</div></div>'+
        '<div class="detail-row"><span class="detail-label">Порода</span><span class="detail-value">'+p.breed+'</span></div>'+
        '<div class="detail-row"><span class="detail-label">Пол</span><span class="detail-value">'+p.gender+'</span></div>'+
        (p.birth_date?'<div class="detail-row"><span class="detail-label">Д.р.</span><span class="detail-value">'+p.birth_date+'</span></div>':'')+
        (p.color?'<div class="detail-row"><span class="detail-label">Окрас</span><span class="detail-value">'+p.color+'</span></div>':'')+
        (p.expected_weight?'<div class="detail-row"><span class="detail-label">Вес</span><span class="detail-value">'+p.expected_weight+'</span></div>':'')+
        '<div class="detail-row"><span class="detail-label">Цена</span><span class="detail-value" style="color:var(--btn);font-weight:800">'+price+'</span></div>'+
        (p.description?'<div class="detail-row"><span class="detail-label">Описание</span><span class="detail-value">'+p.description+'</span></div>':'')+
        '<div class="detail-row"><span class="detail-label">Статус</span><span class="detail-value">'+(isSale?'🟢 В продаже':'🔴 Продан')+'</span></div>'+
        '<div class="detail-actions">'+
        '<button class="btn btn-primary" onclick="createPostForPuppy('+p.id+')">📝</button>'+
        '<button class="btn btn-secondary" onclick="createAvitoForPuppy('+p.id+')">📦</button>'+
        (isSale?'<button class="btn btn-success" onclick="markSold('+p.id+')">✅</button>':'')+
        '<button class="btn btn-danger" onclick="deletePuppy('+p.id+')">🗑</button></div>';
    showScreen("puppy-detail");
}

async function markSold(id){await api("/api/puppies/"+id+"/sold","POST");showToast("✅ Продан!","success");showScreen("puppies");}
async function deletePuppy(id){if(!confirm("Удалить?")){return;}await api("/api/puppies/"+id,"DELETE");showToast("Удалён");showScreen("puppies");}

function loadPostPuppies(){showPostStep(1);
    const sale=puppies.filter(p=>p.status==="for_sale"||p.status==="sale");
    document.getElementById("post-puppies-list").innerHTML=sale.map(p=>
        '<div class="option-card" onclick="selectPostPuppy('+p.id+')"><span class="option-icon">'+breedEmoji(p.breed)+'</span><div><div class="option-text">'+p.name+'</div><div class="option-desc">'+p.breed+'</div></div></div>'
    ).join("")||'<p class="form-hint" style="text-align:center">Нет щенков</p>';
}
function selectPostPuppy(id){currentPuppy=puppies.find(x=>x.id===id);showPostStep(2);}
function startFreePost(){currentPuppy=null;showPostStep(2);}
function createPostForPuppy(id){currentPuppy=puppies.find(x=>x.id===id);showScreen("new-post");showPostStep(2);}
function showPostStep(s){[1,2,3].forEach(i=>document.getElementById("post-step-"+i).classList.add("hidden"));
    document.getElementById("post-result").classList.add("hidden");document.getElementById("post-loading").classList.add("hidden");
    document.getElementById("post-step-"+s).classList.remove("hidden");}
function selectStyle(b,s){document.querySelectorAll(".style-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentStyle=s;}

async function generatePostText(){
    document.getElementById("post-step-2").classList.add("hidden");
    document.getElementById("post-loading").classList.remove("hidden");
    document.getElementById("loading-text").textContent="🤖 AI генерирует...";
    const prompt=document.getElementById("post-prompt").value;
    let res;
    if(currentPuppy) res=await api("/api/ai/puppy_description","POST",{puppy_id:currentPuppy.id,style:currentStyle,prompt});
    else res=await api("/api/ai/content_idea","POST",{type:"useful"});
    document.getElementById("post-loading").classList.add("hidden");
    if(res.success&&res.text){document.getElementById("post-text").value=res.text;showPostStep(3);}
    else{showToast("Ошибка AI","error");showPostStep(2);}
}
async function regeneratePost(){await generatePostText();}

function showPreview(){
    const text=document.getElementById("post-text").value;
    const area=document.getElementById("post-preview-area");
    area.innerHTML='<div class="post-preview">'+
        '<div class="preview-header"><div class="preview-avatar"></div><div><div class="preview-name">VIP Чихуахуа</div><div class="preview-platform">Превью поста</div></div></div>'+
        '<div class="preview-text">'+text.substring(0,300)+(text.length>300?'...':'')+'</div>'+
        '<div class="preview-footer"><span>❤️ 0</span><span>💬 0</span><span>📤 0</span></div></div>';
}

async function publishPost(){
    const text=document.getElementById("post-text").value;const pls=[];
    if(document.getElementById("pl-instagram").checked) pls.push("instagram");
    if(document.getElementById("pl-vk").checked) pls.push("vk");
    if(document.getElementById("pl-telegram").checked) pls.push("telegram");
    if(!pls.length){showToast("Выберите соцсеть","error");return;}
    document.getElementById("post-step-3").classList.add("hidden");
    document.getElementById("post-loading").classList.remove("hidden");
    document.getElementById("loading-text").textContent="📤 Публикую...";
    const res=await api("/api/publish","POST",{text,platforms:pls,puppy_id:currentPuppy?currentPuppy.id:null});
    document.getElementById("post-loading").classList.add("hidden");
    if(res.success&&res.results){
        const names={instagram:"📸 Instagram",vk:"📘 ВКонтакте",telegram:"✈️ Telegram"};
        let h='<h3 style="margin-bottom:14px">📊 Результат</h3>';
        for(const[pl,r] of Object.entries(res.results)){
            h+='<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)"><span>'+
                (names[pl]||pl)+'</span><span style="color:'+(r.success?'#4caf50':'#f44336')+';font-weight:700">'+(r.success?'✅ Опубликовано':'❌ '+( r.error||''))+'</span></div>';
        }
        document.getElementById("publish-result").innerHTML=h;document.getElementById("post-result").classList.remove("hidden");
        showToast("Опубликовано!","success");
        // Сохраняем в историю
        const hist=JSON.parse(localStorage.getItem("post_history")||"[]");
        hist.unshift({text:text.substring(0,100),platforms:pls,date:new Date().toISOString(),results:res.results});
        if(hist.length>50) hist.length=50;
        localStorage.setItem("post_history",JSON.stringify(hist));
    } else{showToast("Ошибка","error");showPostStep(3);}
}

function loadAvitoPuppies(){document.getElementById("avito-result").classList.add("hidden");document.getElementById("avito-loading").classList.add("hidden");
    const sale=puppies.filter(p=>p.status==="for_sale"||p.status==="sale");
    document.getElementById("avito-puppies-list").innerHTML=sale.map(p=>
        '<div class="option-card" onclick="generateAvito('+p.id+')"><span class="option-icon">'+breedEmoji(p.breed)+'</span><div><div class="option-text">'+p.name+'</div><div class="option-desc">'+p.breed+'</div></div></div>'
    ).join("")||'<p class="form-hint" style="text-align:center">Нет щенков</p>';}
function createAvitoForPuppy(id){showScreen("avito");setTimeout(()=>generateAvito(id),300);}
async function generateAvito(id){currentPuppy=puppies.find(x=>x.id===id);
    document.getElementById("avito-loading").classList.remove("hidden");document.getElementById("avito-result").classList.add("hidden");
    const res=await api("/api/ai/avito","POST",{puppy_id:id});
    document.getElementById("avito-loading").classList.add("hidden");
    if(res.success&&res.text){document.getElementById("avito-text").value=res.text;document.getElementById("avito-result").classList.remove("hidden");}
    else showToast("Ошибка","error");}
async function regenerateAvito(){if(currentPuppy) await generateAvito(currentPuppy.id);}
function copyAvito(){navigator.clipboard.writeText(document.getElementById("avito-text").value).then(()=>showToast("📋 Скопировано!","success"));}

function resetAI(){document.getElementById("ai-result").classList.add("hidden");document.getElementById("ai-loading").classList.add("hidden");}
async function aiAction(type){document.getElementById("ai-loading").classList.remove("hidden");document.getElementById("ai-result").classList.add("hidden");
    const eps={idea:["/api/ai/content_idea",{type:"useful"}],reels:["/api/ai/reels_idea",{}],hashtags:["/api/ai/hashtags",{breed:"чихуахуа"}],plan:["/api/ai/weekly_plan",{}]};
    const[ep,body]=eps[type]||eps.idea;const res=await api(ep,"POST",body);
    document.getElementById("ai-loading").classList.add("hidden");
    if(res.success&&res.text){document.getElementById("ai-result-text").textContent=res.text;document.getElementById("ai-result").classList.remove("hidden");}
    else showToast("Ошибка","error");}

async function loadAnalytics(){
    document.getElementById("analytics-content").innerHTML='<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    const res=await api("/api/analytics");
    let ig="—",vk="—",tgt="—",total=0,igP="";
    if(res.instagram?.success){ig=res.instagram.count.toLocaleString("ru");total+=res.instagram.count;igP=res.instagram.posts||0;}
    if(res.vk?.success){vk=res.vk.count.toLocaleString("ru");total+=res.vk.count;}
    if(res.telegram?.success){tgt=res.telegram.count.toLocaleString("ru");total+=res.telegram.count;}
    const maxCount=Math.max(res.instagram?.count||0,res.vk?.count||0,res.telegram?.count||0,1);
    document.getElementById("analytics-content").innerHTML=
        '<div class="analytics-card ig"><span class="analytics-icon">📸</span><div style="flex:1"><div class="analytics-platform">Instagram</div>'+
        '<div class="progress-bar"><div class="progress-fill" style="width:'+(((res.instagram?.count||0)/maxCount)*100)+'%;background:linear-gradient(90deg,#E4405F,#F56040)"></div></div></div>'+
        '<span class="analytics-count ig-color">'+ig+'</span></div>'+
        '<div class="analytics-card vk"><span class="analytics-icon">📘</span><div style="flex:1"><div class="analytics-platform">ВКонтакте</div>'+
        '<div class="progress-bar"><div class="progress-fill" style="width:'+(((res.vk?.count||0)/maxCount)*100)+'%;background:linear-gradient(90deg,#4A76A8,#5181B8)"></div></div></div>'+
        '<span class="analytics-count vk-color">'+vk+'</span></div>'+
        '<div class="analytics-card tg"><span class="analytics-icon">✈️</span><div style="flex:1"><div class="analytics-platform">Telegram</div>'+
        '<div class="progress-bar"><div class="progress-fill" style="width:'+(((res.telegram?.count||0)/maxCount)*100)+'%;background:linear-gradient(90deg,#26A5E4,#0088CC)"></div></div></div>'+
        '<span class="analytics-count tg-color">'+tgt+'</span></div>'+
        '<div class="total-box"><span>📊 Всего аудитория</span><span class="total-count">'+total.toLocaleString("ru")+'</span></div>'+
        '<button class="btn btn-secondary btn-full" onclick="loadAnalytics()">🔄 Обновить</button>';
}

function loadHistory(){
    const hist=JSON.parse(localStorage.getItem("post_history")||"[]");
    const list=document.getElementById("history-list");
    if(!hist.length){list.innerHTML='<p class="form-hint" style="text-align:center;padding:30px">Пока нет публикаций</p>';return;}
    list.innerHTML=hist.map(h=>{
        const d=new Date(h.date);
        const dateStr=d.toLocaleDateString("ru")+" "+d.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
        const badges=(h.platforms||[]).map(p=>
            '<span class="history-badge '+(p==="instagram"?"ig":p==="vk"?"vk":"tg")+'">'+
            (p==="instagram"?"IG":p==="vk"?"VK":"TG")+'</span>').join("");
        return '<div class="history-item"><div class="history-date">'+dateStr+'</div>'+
            '<div class="history-text">'+h.text+'</div>'+
            '<div class="history-platforms">'+badges+'</div></div>';
    }).join("");
}

showScreen("home");
