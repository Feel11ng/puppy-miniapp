/* === PUPPYHUB MINI APP v5 — Full UX Upgrade === */
// Telegram
var tg=null;
try{if(window.Telegram&&window.Telegram.WebApp){tg=window.Telegram.WebApp;tg.expand();tg.ready();}}catch(e){}

function haptic(kind){
    try{
        if(!tg||!tg.HapticFeedback)return;
        if(kind==="error")tg.HapticFeedback.notificationOccurred("error");
        else if(kind==="success")tg.HapticFeedback.notificationOccurred("success");
        else if(kind==="warn")tg.HapticFeedback.notificationOccurred("warning");
        else tg.HapticFeedback.impactOccurred("medium");
    }catch(e){}
}

function lightenHex(hex,mix){
    hex=String(hex||"#818cf8").replace("#","");
    if(hex.length!==6)return"#c084fc";
    var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);
    r=Math.round(r+(255-r)*mix);g=Math.round(g+(255-g)*mix);b=Math.round(b+(255-b)*mix);
    return"#"+[r,g,b].map(function(x){return("0"+x.toString(16)).slice(-2);}).join("");
}

function applyCustomAccentFromStorage(){
    try{
        var en=localStorage.getItem("ph_accent_custom")==="1";
        var hx=localStorage.getItem("ph_accent_hex")||"#818cf8";
        if(en&&/^#[0-9A-Fa-f]{6}$/.test(hx)){
            document.documentElement.style.setProperty("--accent",hx);
            document.documentElement.style.setProperty("--accent-end",lightenHex(hx,0.38));
        }else{
            document.documentElement.style.removeProperty("--accent");
            document.documentElement.style.removeProperty("--accent-end");
        }
    }catch(e){}
}

function applyFontScaleFromStorage(){
    try{
        var s=localStorage.getItem("ph_font_scale")||"normal";
        if(s!=="compact"&&s!=="large")s="normal";
        document.documentElement.setAttribute("data-font-scale",s);
    }catch(e){document.documentElement.setAttribute("data-font-scale","normal");}
}

/** Палитры: id = data-theme, цвета шапки TG под фон */
var PH_THEMES=[
{id:"midnight-indigo",label:"Полночь",tg:"#07060d",tgBg:"#07060d",g:"linear-gradient(135deg,#6366f1,#c084fc)"},
{id:"royal-gold",label:"Золото",tg:"#0c0a08",tgBg:"#0c0a08",g:"linear-gradient(135deg,#d4af37,#f0d78c)"},
{id:"rose-noir",label:"Роза",tg:"#0a0809",tgBg:"#0a0809",g:"linear-gradient(135deg,#e879a9,#f9a8d4)"},
{id:"emerald-luxe",label:"Изумруд",tg:"#050f0c",tgBg:"#050f0c",g:"linear-gradient(135deg,#34d399,#6ee7b7)"},
{id:"sapphire-night",label:"Сапфир",tg:"#050a14",tgBg:"#050a14",g:"linear-gradient(135deg,#60a5fa,#38bdf8)"},
{id:"wine-velvet",label:"Бордо",tg:"#10060a",tgBg:"#10060a",g:"linear-gradient(135deg,#e11d48,#fb7185)"},
{id:"noir-chrome",label:"Нуар",tg:"#050505",tgBg:"#050505",g:"linear-gradient(135deg,#e5e7eb,#71717a)"},
{id:"sunset-boutique",label:"Закат",tg:"#110d0a",tgBg:"#110d0a",g:"linear-gradient(135deg,#fb923c,#fbbf24)"},
{id:"lilac-muse",label:"Лиловый",tg:"#0c0a12",tgBg:"#0c0a12",g:"linear-gradient(135deg,#a78bfa,#e879f9)"},
{id:"teal-coral",label:"Лагуна",tg:"#061214",tgBg:"#061214",g:"linear-gradient(135deg,#2dd4bf,#fb7185)"},
{id:"graphite-rose",label:"Графит",tg:"#0a0a0c",tgBg:"#0a0a0c",g:"linear-gradient(135deg,#f472b6,#fb7185)"},
{id:"arctic-platinum",label:"Платина",tg:"#ece8e3",tgBg:"#ece8e3",g:"linear-gradient(135deg,#4f46e5,#7c3aed)"}
];

function getCurrentThemeId(){
    var t=document.documentElement.getAttribute("data-theme");
    if(t)return t;
    try{return localStorage.getItem("ph_theme")||"midnight-indigo";}catch(e){return"midnight-indigo";}
}

function applyTheme(id){
    var th=null;
    for(var i=0;i<PH_THEMES.length;i++){if(PH_THEMES[i].id===id){th=PH_THEMES[i];break;}}
    if(!th)th=PH_THEMES[0];
    id=th.id;
    document.documentElement.setAttribute("data-theme",id);
    try{localStorage.setItem("ph_theme",id);}catch(e){}
    if(tg){
        try{
            tg.setHeaderColor(th.tg);
            tg.setBackgroundColor(th.tgBg);
        }catch(e){}
    }
    applyCustomAccentFromStorage();
}

function syncThemeSwatches(selectedId){
    var root=document.getElementById("modal-body");
    if(!root)return;
    var sw=root.querySelectorAll(".theme-swatch");
    for(var k=0;k<sw.length;k++){
        sw[k].classList.toggle("selected",sw[k].getAttribute("data-arg")===selectedId);
    }
}

// State
var currentTab="puppies";
var puppies=[];
var groqKey="";
var pendingPost="";
var lastPrompt="";
var lastTitle="";
var uiSearch="";
var uiFilterStatus="all";
var uiFilterBreed="all";
var uiSort="new";
var aiHistory=[];
var swipeStartX=0;
var swipeCard=null;
var pendingMedia=[];
var pendingPuppyIdx=-1;

// === DATA ===
function loadData(){
    try{var s=localStorage.getItem("ph_puppies");puppies=s?JSON.parse(s):[];}catch(e){puppies=[];}
    try{groqKey=localStorage.getItem("ph_groq")||"";}catch(e){groqKey="";}
    try{aiHistory=JSON.parse(localStorage.getItem("ph_ai_history")||"[]");}catch(e){aiHistory=[];}
}
function saveAIHistory(){
    try{localStorage.setItem("ph_ai_history",JSON.stringify(aiHistory.slice(0,30)));}catch(e){}
}
function saveData(){
    localStorage.setItem("ph_puppies",JSON.stringify(puppies));
    try{if(groqKey)localStorage.setItem("ph_groq",groqKey);else localStorage.removeItem("ph_groq");}catch(e){}
}

function loadDrafts(){
    try{return JSON.parse(localStorage.getItem("ph_drafts")||"[]");}catch(e){return [];}
}
function saveDrafts(arr){
    try{localStorage.setItem("ph_drafts",JSON.stringify(arr||[]));}catch(e){}
}
function addDraftRecord(title,text){
    var d=loadDrafts();
    d.unshift({id:genId(),title:title||"Черновик",text:text||"",at:new Date().toISOString()});
    saveDrafts(d);
}
function genId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,6);}

// === TOAST ===
function toast(msg,type){
    var c=document.getElementById("toast-container");if(!c)return;
    var tc=type||"info";
    if(tc==="ok"||tc==="success"){haptic("success");tc="ok";}
    else if(tc==="err"||tc==="error"){haptic("error");tc="err";}
    else if(tc==="warn")haptic("warn");
    else haptic("light");
    var t=document.createElement("div");t.className="toast toast-"+tc;
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
    el.classList.remove("tab-enter");
    void el.offsetWidth;
    el.classList.add("tab-enter");
    if(currentTab==="puppies")renderPuppies(el);
    else if(currentTab==="posts")renderPosts(el);
    else if(currentTab==="ai")renderAI(el);
}

// === PUPPIES LIST ===
function getFilteredPuppyIndices(){
    var q=(uiSearch||"").toLowerCase().trim();
    var st=uiFilterStatus,br=uiFilterBreed,so=uiSort;
    var idxs=[];
    for(var i=0;i<puppies.length;i++){
        var p=puppies[i];
        if(q&&(String(p.name||"").toLowerCase().indexOf(q)<0))continue;
        if(st!=="all"&&p.status!==st)continue;
        if(br!=="all"&&p.breed!==br)continue;
        idxs.push(i);
    }
    idxs.sort(function(ai,bi){
        var pa=puppies[ai],pb=puppies[bi];
        if(so==="name")return String(pa.name||"").localeCompare(String(pb.name||""),"ru");
        if(so==="price-asc")return(parseInt(pa.price,10)||0)-(parseInt(pb.price,10)||0);
        if(so==="price-desc")return(parseInt(pb.price,10)||0)-(parseInt(pa.price,10)||0);
        return String(pb.created||"").localeCompare(String(pa.created||""));
    });
    return idxs;
}

function wirePuppyFilters(){
    var se=document.getElementById("puppy-search");
    if(se){se.value=uiSearch;se.oninput=function(){uiSearch=se.value;renderContent();};}
    var fs=document.getElementById("flt-status");
    if(fs){fs.value=uiFilterStatus;fs.onchange=function(){uiFilterStatus=fs.value;renderContent();};}
    var fb=document.getElementById("flt-breed");
    if(fb){fb.value=uiFilterBreed;fb.onchange=function(){uiFilterBreed=fb.value;renderContent();};}
    var fo=document.getElementById("flt-sort");
    if(fo){fo.value=uiSort;fo.onchange=function(){uiSort=fo.value;renderContent();};}
}

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
    if(puppies.length>0){
        h+='<div class="puppy-toolbar">';
        h+='<div class="puppy-toolbar-row">';
        h+='<div class="fg" style="margin-bottom:0"><label class="fl">Поиск по кличке</label>';
        h+='<input type="search" class="fi puppy-search" id="puppy-search" placeholder="Начните вводить имя..." autocomplete="off"></div>';
        h+='<div class="puppy-filters">';
        h+='<div class="fg" style="margin-bottom:0"><label class="fl">Статус</label>';
        h+='<select class="fs" id="flt-status">';
        h+='<option value="all">Все</option><option value="available">Свободен</option><option value="reserved">Бронь</option><option value="sold">Продан</option></select></div>';
        h+='<div class="fg" style="margin-bottom:0"><label class="fl">Порода</label>';
        h+='<select class="fs" id="flt-breed">';
        h+='<option value="all">Все</option><option value="chihuahua">Чихуахуа</option><option value="toypoodle">Той-пудель</option><option value="maltipoo">Мальтипу</option><option value="other">Другая</option></select></div>';
        h+='<div class="fg" style="margin-bottom:0"><label class="fl">Сортировка</label>';
        h+='<select class="fs" id="flt-sort">';
        h+='<option value="new">Сначала новые</option><option value="name">По имени</option><option value="price-asc">Цена ↑</option><option value="price-desc">Цена ↓</option></select></div>';
        h+='</div></div></div>';
    }
    if(puppies.length===0){
        h+='<div class="empty"><div class="empty-icon">&#x1F436;</div>';
        h+='<p>Пока нет щенков<br>Нажмите + чтобы добавить первого!</p></div>';
    }else{
        var ids=getFilteredPuppyIndices();
        if(ids.length===0){
            h+='<div class="empty"><div class="empty-icon">&#x1F50D;</div><p>Никого не нашли — сбросьте фильтры</p></div>';
        }else for(var j=0;j<ids.length;j++)h+=puppyCard(puppies[ids[j]],ids[j]);
    }
    el.innerHTML=h;
    wirePuppyFilters();
}

function puppyCard(p,i){
    var bc=breedClass(p.breed),av=breedEmoji(p.breed),bn=breedName(p.breed);
    var gn=p.gender==="male"?"\u2642\uFE0F":"\u2640\uFE0F";
    var sb,sc;
    if(p.status==="available"){sb="Свободен";sc="badge-ok";}
    else if(p.status==="reserved"){sb="Бронь";sc="badge-res";}
    else{sb="Продан";sc="badge-sold";}
    var hasPhoto=p.photos&&p.photos.length>0;
    var c='<div class="card card-'+bc+' swipe-card" role="button" tabindex="0" data-puppy-card="'+i+'">';
    c+='<div class="swipe-actions-left"><span>&#x2705; Бронь</span></div>';
    c+='<div class="swipe-actions-right"><span>&#x1F5D1; Удалить</span></div>';
    c+='<div class="card-inner">';
    c+='<div class="card-row">';
    if(hasPhoto){
        c+='<div class="avatar-photo" style="background-image:url('+escA(p.photos[0])+')"></div>';
    }else{
        c+='<div class="avatar avatar-'+bc+'">'+av+'</div>';
    }
    c+='<div class="card-info">';
    c+='<div class="card-header"><div><div class="card-title">'+esc(p.name)+' '+gn+'</div>';
    c+='<div class="card-sub">'+esc(bn)+'</div></div>';
    c+='<span class="badge '+sc+'">'+sb+'</span></div>';
    c+='<div class="card-meta">';
    if(p.age)c+='<span>&#x1F4C5; '+esc(p.age)+'</span>';
    if(p.color)c+='<span>&#x1F3A8; '+esc(p.color)+'</span>';
    if(p.price)c+='<span class="price">'+fmtPrice(p.price)+' &#x20BD;</span>';
    c+='</div></div></div></div></div>';
    return c;
}

// === DETAIL ===
function showDetail(i){
    var p=puppies[i];if(!p)return;
    haptic("light");
    var bn=breedName(p.breed);
    var gn=p.gender==="male"?"&#x2642;&#xFE0F; Мальчик":"&#x2640;&#xFE0F; Девочка";
    var h='';
    if(p.photos&&p.photos.length>0){
        h+='<div class="photo-carousel" id="carousel-'+i+'">';
        for(var pi=0;pi<p.photos.length;pi++){
            h+='<img class="carousel-img" src="'+escA(p.photos[pi])+'" alt="'+escA(p.name)+'">';
        }
        h+='</div>';
        if(p.photos.length>1)h+='<div class="carousel-dots" id="dots-'+i+'">';
        if(p.photos.length>1){for(var di=0;di<p.photos.length;di++)h+='<span class="dot'+(di===0?" active":"")+'"></span>';h+='</div>';}
    }else{
        h+='<div style="text-align:center;margin-bottom:16px">';
        h+='<div class="avatar avatar-'+breedClass(p.breed)+'" style="width:72px;height:72px;font-size:36px;margin:0 auto">'+breedEmoji(p.breed)+'</div></div>';
    }
    h+='<div class="detail-status-row">';
    h+='<button type="button" class="btn btn-sm '+(p.status==="available"?"btn-success":"btn-secondary")+'" data-act="setStatus" data-arg="'+i+':available">Свободен</button>';
    h+='<button type="button" class="btn btn-sm '+(p.status==="reserved"?"btn-warning":"btn-secondary")+'" data-act="setStatus" data-arg="'+i+':reserved">Бронь</button>';
    h+='<button type="button" class="btn btn-sm '+(p.status==="sold"?"btn-danger":"btn-secondary")+'" data-act="setStatus" data-arg="'+i+':sold">Продан</button>';
    h+='</div>';
    h+=fRow("Порода",bn)+fRow("Пол",gn);
    if(p.age)h+=fRow("Возраст",esc(p.age));
    if(p.color)h+=fRow("Окрас",esc(p.color));
    if(p.price)h+=fRow("Цена",'<span class="price">'+fmtPrice(p.price)+' &#x20BD;</span>');
    if(p.description)h+=fRow("Описание",esc(p.description));
    if(p.parents)h+=fRow("Родители",esc(p.parents));
    if(p.documents)h+=fRow("Документы",esc(p.documents));
    if(p.vaccinationDate||p.vaccination_date)h+=fRow("Прививки / дата",esc(p.vaccinationDate||p.vaccination_date));
    h+='<div class="card-actions" style="margin-top:16px">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="editPuppy" data-arg="'+i+'">&#x270F;&#xFE0F; Изменить</button>';
    h+='<button type="button" class="btn btn-sm btn-pink" data-act="genPost" data-arg="'+i+'">&#x1F4DD; Пост</button>';
    h+='<button type="button" class="btn btn-sm btn-danger" data-act="delPuppy" data-arg="'+i+'">&#x1F5D1; Удалить</button>';
    h+='</div>';
    showModal(esc(p.name),h);
    if(p.photos&&p.photos.length>1)initCarousel(i,p.photos.length);
}
function fRow(l,v){return '<div class="fg"><div class="fl">'+l+'</div><div>'+v+'</div></div>';}

// === ADD/EDIT ===
function showAddPuppyForm(){showModal("Новый щенок",buildForm(null,-1));}
function editPuppy(i){showModal("Редактировать",buildForm(puppies[i],i));}
function buildForm(p,idx){
    var n=p?p.name:"",b=p?p.breed:"chihuahua",g=p?p.gender:"female";
    var age=p?p.age||"":"",col=p?p.color||"":"",pr=p?p.price||"":"";
    var st=p?p.status||"available":"available",desc=p?p.description||"":"";
    var par=p?p.parents||"":"",doc=p?p.documents||"":"",vac=p?p.vaccinationDate||p.vaccination_date||"":"";
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
    h+='<div class="fg"><label class="fl">Родители</label>';
    h+='<input type="text" class="fi" id="pf-par" value="'+escA(par)+'" placeholder="Отец / мать, титулы"></div>';
    h+='<div class="fg"><label class="fl">Документы</label>';
    h+='<input type="text" class="fi" id="pf-doc" value="'+escA(doc)+'" placeholder="РКФ, ветпаспорт, чип..."></div>';
    h+='<div class="fg"><label class="fl">Дата вакцинации / прививки</label>';
    h+='<input type="text" class="fi" id="pf-vac" value="'+escA(vac)+'" placeholder="например 15.01.2025 или щенячьи"></div>';
    h+='<div class="fg"><label class="fl">Описание</label>';
    h+='<textarea class="ft" id="pf-d" placeholder="О щенке...">'+esc(desc)+'</textarea></div>';
    h+='<div class="fg"><label class="fl">Фото щенка</label>';
    if(p&&p.photos&&p.photos.length>0){
        h+='<div class="photo-thumbs" id="pf-thumbs">';
        for(var ti=0;ti<p.photos.length;ti++){
            h+='<div class="photo-thumb"><img src="'+escA(p.photos[ti])+'"><button type="button" class="thumb-del" data-act="removePhoto" data-arg="'+idx+':'+ti+'">&times;</button></div>';
        }
        h+='</div>';
    }
    h+='<input type="file" id="pf-photos" accept="image/*" multiple class="fi" style="padding:10px">';
    h+='<p style="font-size:11px;color:var(--text3);margin-top:4px">До 5 фото, макс 800KB каждое (сжимается автоматически)</p></div>';
    h+='<button type="button" class="btn btn-success" data-act="savePuppy" data-arg="'+idx+'">&#x1F4BE; Сохранить</button>';
    return h;
}
function opt(v,t,s){return '<option value="'+v+'"'+(v===s?' selected':'')+'>'+t+'</option>';}
function compressImage(file,maxW,maxKB){
    maxW=maxW||600;maxKB=maxKB||800;
    return new Promise(function(resolve){
        var reader=new FileReader();
        reader.onload=function(ev){
            var img=new Image();
            img.onload=function(){
                var w=img.width,h=img.height;
                if(w>maxW){h=Math.round(h*(maxW/w));w=maxW;}
                var canvas=document.createElement("canvas");
                canvas.width=w;canvas.height=h;
                var ctx=canvas.getContext("2d");
                ctx.drawImage(img,0,0,w,h);
                var q=0.82;
                var dataUrl=canvas.toDataURL("image/jpeg",q);
                while(dataUrl.length>maxKB*1370&&q>0.3){q-=0.1;dataUrl=canvas.toDataURL("image/jpeg",q);}
                resolve(dataUrl);
            };
            img.onerror=function(){resolve(null);};
            img.src=ev.target.result;
        };
        reader.onerror=function(){resolve(null);};
        reader.readAsDataURL(file);
    });
}
function savePuppy(idx){
    var ne=document.getElementById("pf-n");
    if(!ne||!ne.value.trim()){toast("Введите кличку!","warn");return;}
    var fileInput=document.getElementById("pf-photos");
    var files=fileInput&&fileInput.files?Array.from(fileInput.files):[];
    if(files.length>5)files=files.slice(0,5);
    var existingPhotos=(idx>=0&&puppies[idx]&&puppies[idx].photos)?puppies[idx].photos.slice():[];
    function doSave(newPhotos){
        var allPhotos=existingPhotos.concat(newPhotos||[]).slice(0,5);
        var d={
            id:(idx>=0&&puppies[idx])?puppies[idx].id:genId(),
            name:ne.value.trim(),breed:gv("pf-b","chihuahua"),gender:gv("pf-g","female"),
            age:gv("pf-a",""),color:gv("pf-c",""),price:gv("pf-p",""),
            status:gv("pf-s","available"),description:gv("pf-d",""),
            parents:gv("pf-par",""),documents:gv("pf-doc",""),
            vaccinationDate:gv("pf-vac",""),
            photos:allPhotos,
            created:(idx>=0&&puppies[idx])?puppies[idx].created:new Date().toISOString()
        };
        if(idx>=0)puppies[idx]=d;else puppies.push(d);
        saveData();hideModal();renderContent();
        toast(idx>=0?"Щенок обновлён ✅":"Щенок добавлен ✅","ok");
    }
    if(files.length===0){doSave([]);return;}
    toast("Сжимаю фото...","info");
    Promise.all(files.map(function(f){return compressImage(f);}))
    .then(function(results){doSave(results.filter(Boolean));})
    .catch(function(){doSave([]);});
}
function gv(id,def){var e=document.getElementById(id);return e?e.value.trim():def;}
function delPuppy(i){
    if(!confirm("Удалить "+puppies[i].name+"?"))return;
    puppies.splice(i,1);saveData();hideModal();renderContent();toast("Удалён","info");
}

// === POSTS ===
function renderPosts(el){
    var drafts=loadDrafts();
    var h="";
    if(drafts.length>0){
        h+='<div class="card"><div class="card-title">&#x1F4C1; Черновики ('+drafts.length+')</div><div class="card-body">';
        for(var di=0;di<drafts.length;di++){
            var dr=drafts[di];
            h+='<div style="display:flex;gap:8px;align-items:stretch;margin-bottom:10px">';
            h+='<button type="button" class="draft-card" style="flex:1;text-align:left" data-act="openDraft" data-arg="'+esc(dr.id)+'">';
            h+='<div class="draft-card-title">'+esc(dr.title||"Черновик")+'</div>';
            h+='<div class="draft-card-preview">'+esc(String(dr.text||"").substring(0,140))+'</div></button>';
            h+='<button type="button" class="btn btn-sm btn-danger" style="width:auto;min-width:48px;align-self:stretch" data-act="delDraft" data-arg="'+esc(dr.id)+'">&#x1F5D1;</button>';
            h+='</div>';
        }
        h+='</div></div>';
    }
    h+='<button type="button" class="btn btn-primary" style="margin-bottom:16px" data-act="showCreatePost">&#x270D;&#xFE0F; Создать пост</button>';
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
    pendingMedia=[];
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
    h+='<div class="fg"><label class="fl">&#x1F4F7; Фото / видео к посту</label>';
    var puppiesWithPhotos=[];
    for(var i=0;i<puppies.length;i++){
        if(puppies[i].photos&&puppies[i].photos.length>0)puppiesWithPhotos.push(i);
    }
    if(puppiesWithPhotos.length>0){
        h+='<p style="font-size:12px;color:var(--text2);margin-bottom:8px">Фото щенка:</p>';
        h+='<div class="media-puppy-select">';
        for(var j=0;j<puppiesWithPhotos.length;j++){
            var pi=puppiesWithPhotos[j],pp=puppies[pi];
            h+='<button type="button" class="media-puppy-btn" data-act="selectPuppyMedia" data-arg="'+pi+'">';
            h+='<img src="'+escA(pp.photos[0])+'" class="media-puppy-thumb">';
            h+='<span>'+esc(pp.name)+'</span></button>';
        }
        h+='</div>';
    }
    h+='<div id="media-preview" class="media-preview-row"></div>';
    h+='<input type="file" id="pub-media" accept="image/*,video/*" multiple class="fi" style="padding:10px;margin-top:8px">';
    h+='<p style="font-size:11px;color:var(--text3);margin-top:4px">Прикрепите медиа — они будут отправлены боту при публикации</p></div>';
    h+='<div class="fg"><label class="fl">Пожелания</label>';
    h+='<textarea class="ft" id="pt-extra" placeholder="Упомянуть прививки, эмодзи..."></textarea></div>';
    h+='<button type="button" class="btn btn-primary" data-act="doGenPost">&#x1F916; Сгенерировать</button>';
    showModal("Создать пост",h);
    var fileInput=document.getElementById("pub-media");
    if(fileInput)fileInput.addEventListener("change",onPubMediaChange);
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
    if(p.parents)pr+="Родители: "+p.parents+". ";
    if(p.documents)pr+="Документы: "+p.documents+". ";
    if(p.vaccinationDate||p.vaccination_date)pr+="Прививки/дата: "+(p.vaccinationDate||p.vaccination_date)+". ";
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
        if(p.parents)pr+=", родители: "+p.parents;
        if(p.documents)pr+=", документы: "+p.documents;
        if(p.vaccinationDate||p.vaccination_date)pr+=", прививки: "+(p.vaccinationDate||p.vaccination_date);
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
var POST_TEMPLATES=[
    {id:"sale",label:"Продажа",icon:"&#x1F4B0;",prompt:"Напиши привлекательный пост для Instagram/Telegram о продаже щенка мелкой породы. С эмодзи и хештегами. На русском."},
    {id:"story",label:"Stories",icon:"&#x1F4F1;",prompt:"Напиши короткий текст для Instagram Stories о питомнике мелких пород. Максимум 3 строки, эмодзи, призыв к действию. На русском."},
    {id:"reels",label:"Reels",icon:"&#x1F3AC;",prompt:"Напиши описание для Instagram Reels видео про щенков мелких пород. Короткое, цепляющее, с хештегами. На русском."},
    {id:"educational",label:"Полезный",icon:"&#x1F4DA;",prompt:"Напиши познавательный пост для Telegram-канала питомника о уходе за щенками мелких пород. Полезные советы, эмодзи. На русском."},
    {id:"welcome",label:"Приветствие",icon:"&#x1F44B;",prompt:"Напиши приветственный пост для нового подписчика канала питомника мелких пород. Тёплый, дружелюбный, с эмодзи. На русском."},
    {id:"holiday",label:"Праздничный",icon:"&#x1F389;",prompt:"Напиши праздничный пост для канала питомника. Поздравление с ближайшим праздником, тёплые слова, фото-призыв. На русском."}
];
function renderAI(el){
    var ks=groqKey?"&#x2705; Ключ сохранён":"&#x274C; Ключ не задан — укажите в настройках";
    var h='<div class="card"><div class="card-title">&#x1F916; AI Ассистент</div>';
    h+='<div class="card-body"><p style="color:var(--text2);font-size:13px">Groq API: '+ks+'</p>';
    if(!groqKey)h+='<button type="button" class="btn btn-sm btn-primary" style="margin-top:8px" data-act="askKey">&#x1F511; Установить ключ</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x1F4AC; Свободный запрос</div>';
    h+='<div class="card-body" style="margin-top:8px">';
    h+='<textarea class="ft" id="ai-q" placeholder="Задайте любой вопрос..."></textarea>';
    h+='<button type="button" class="btn btn-primary" style="margin-top:8px" data-act="doFreeAI">&#x1F680; Отправить</button>';
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x1F4CB; Шаблоны постов</div>';
    h+='<div class="card-actions" style="margin-top:8px">';
    for(var ti=0;ti<POST_TEMPLATES.length;ti++){
        var tmpl=POST_TEMPLATES[ti];
        h+='<button type="button" class="btn btn-sm btn-ghost" data-act="useTemplate" data-arg="'+tmpl.id+'">'+tmpl.icon+' '+esc(tmpl.label)+'</button>';
    }
    h+='</div></div>';
    h+='<div class="card"><div class="card-title">&#x26A1; Быстрые действия</div>';
    h+='<div class="card-actions" style="margin-top:8px">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="hashtags">&#x1F3F7; Хештеги</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="plan">&#x1F4C5; Контент-план</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="tips">&#x1F4A1; Советы</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="aiQ" data-arg="names">&#x1F4DB; Имена</button>';
    h+='</div></div>';
    if(aiHistory.length>0){
        h+='<div class="card"><div class="card-title">&#x1F4DC; История генераций ('+aiHistory.length+')</div>';
        h+='<div class="card-body">';
        var showCount=Math.min(aiHistory.length,10);
        for(var hi=0;hi<showCount;hi++){
            var ah=aiHistory[hi];
            h+='<button type="button" class="draft-card" data-act="openAIHistory" data-arg="'+hi+'">';
            h+='<div class="draft-card-title">'+esc(ah.title||"")+'</div>';
            h+='<div class="draft-card-preview">'+esc(String(ah.text||"").substring(0,100))+'</div></button>';
        }
        if(aiHistory.length>10)h+='<p style="font-size:11px;color:var(--text3);margin-top:8px">...и ещё '+(aiHistory.length-10)+'</p>';
        h+='<button type="button" class="btn btn-sm btn-danger" style="margin-top:10px" data-act="clearAIHistory">&#x1F5D1; Очистить историю</button>';
        h+='</div></div>';
    }
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
function skeletonHTML(){
    var h='<div class="skeleton-wrap">';
    h+='<div class="skeleton-line w100"></div>';
    h+='<div class="skeleton-line w80"></div>';
    h+='<div class="skeleton-line w90"></div>';
    h+='<div class="skeleton-line w60"></div>';
    h+='<div class="skeleton-line w100"></div>';
    h+='<div class="skeleton-line w70"></div>';
    h+='<p style="margin-top:14px;color:var(--text3);font-size:12px;text-align:center">Генерирую текст...</p></div>';
    return h;
}
function callAI(prompt,title){
    lastPrompt=prompt;
    lastTitle=title;
    showModal("&#x1F916; "+title,skeletonHTML());
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
        aiHistory.unshift({id:genId(),title:title,text:text,at:new Date().toISOString()});
        saveAIHistory();
        showAIResult(title,text);
    })
    .catch(function(e){
        haptic("error");
        showModal("Ошибка",'<div style="color:var(--danger);padding:16px"><p>&#x274C; '+esc(e.message)+'</p><p style="margin-top:8px;font-size:12px;color:var(--text2)">Проверьте Groq API ключ.</p></div>');
    });
}

// === ПОКАЗ РЕЗУЛЬТАТА AI С КНОПКОЙ ПЕРЕГЕНЕРАЦИИ ===
function showAIResult(title,text){
    pendingPost=text;
    lastTitle=title;
    var h='<div class="ai-box">'+esc(text)+'</div>';
    h+='<div class="ai-actions">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="copyText">&#x1F4CB; Копировать</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="saveDraftFromAI">&#x1F4BE; В черновики</button>';
    h+='<button type="button" class="btn btn-sm btn-warning" data-act="regenAI">&#x1F504; Ещё вариант</button>';
    h+='<button type="button" class="btn btn-sm btn-pink" data-act="showPublish">&#x1F4E4; Опубликовать</button>';
    h+='</div>';
    showModal("&#x1F916; "+title,h);
}

function openDraftById(did){
    var d=loadDrafts();
    for(var i=0;i<d.length;i++){
        if(String(d[i].id)===String(did)){
            pendingPost=d[i].text||"";
            lastTitle=d[i].title||"Черновик";
            lastPrompt="";
            showAIResult(lastTitle,pendingPost);
            return;
        }
    }
    toast("Черновик не найден","warn");
}

function deleteDraftById(did){
    saveDrafts(loadDrafts().filter(function(x){return String(x.id)!==String(did);}));
    renderContent();
    toast("Удалено","info");
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
    pendingMedia=[];
    var h='<div class="fg"><div class="fl">Текст</div>';
    h+='<div class="ai-box" style="max-height:120px">'+esc(pendingPost)+'</div></div>';
    h+='<div class="fg"><div class="fl">&#x1F4F7; Медиа к посту</div>';
    var puppiesWithPhotos=[];
    for(var i=0;i<puppies.length;i++){
        if(puppies[i].photos&&puppies[i].photos.length>0)puppiesWithPhotos.push(i);
    }
    if(puppiesWithPhotos.length>0){
        h+='<p style="font-size:12px;color:var(--text2);margin-bottom:8px">Выбрать фото щенка:</p>';
        h+='<div class="media-puppy-select">';
        for(var j=0;j<puppiesWithPhotos.length;j++){
            var pi=puppiesWithPhotos[j],pp=puppies[pi];
            h+='<button type="button" class="media-puppy-btn" data-act="selectPuppyMedia" data-arg="'+pi+'">';
            h+='<img src="'+escA(pp.photos[0])+'" class="media-puppy-thumb">';
            h+='<span>'+esc(pp.name)+'</span></button>';
        }
        h+='</div>';
    }
    h+='<div id="media-preview" class="media-preview-row"></div>';
    h+='<input type="file" id="pub-media" accept="image/*,video/*" multiple class="fi" style="padding:10px;margin-top:8px">';
    h+='<p style="font-size:11px;color:var(--text3);margin-top:4px">Добавьте фото/видео для публикации</p></div>';
    h+='<div class="fg"><div class="fl">Куда опубликовать</div>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-tg" checked> &#x1F4E2; Telegram канал</label>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-vk"> &#x1F310; ВКонтакте</label>';
    h+='<label class="cb-label"><input type="checkbox" id="pub-ig"> &#x1F4F7; Instagram</label></div>';
    h+='<button type="button" class="btn btn-pink" data-act="doPublish">&#x1F680; Отправить боту</button>';
    if(!tg)h+='<p style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">Telegram WebApp не доступен</p>';
    showModal("&#x1F4E4; Публикация",h);
    var fileInput=document.getElementById("pub-media");
    if(fileInput)fileInput.addEventListener("change",onPubMediaChange);
}
function onPubMediaChange(){
    var fileInput=document.getElementById("pub-media");
    if(!fileInput||!fileInput.files)return;
    var files=Array.from(fileInput.files).slice(0,5);
    toast("Обработка "+files.length+" файлов...","info");
    Promise.all(files.map(function(f){
        if(f.type.startsWith("video/")){
            return new Promise(function(res){res({type:"video",name:f.name,size:f.size});});
        }
        return compressImage(f,800,600).then(function(d){return d?{type:"photo",data:d}:null;});
    })).then(function(results){
        pendingMedia=pendingMedia.concat(results.filter(Boolean)).slice(0,5);
        renderMediaPreview();
    });
}
function selectPuppyMedia(idx){
    var p=puppies[idx];
    if(!p||!p.photos||p.photos.length===0)return;
    pendingPuppyIdx=idx;
    for(var i=0;i<p.photos.length&&pendingMedia.length<5;i++){
        pendingMedia.push({type:"photo",data:p.photos[i],fromPuppy:true});
    }
    renderMediaPreview();
    haptic("success");
    toast("Добавлено "+p.photos.length+" фото "+p.name,"ok");
}
function renderMediaPreview(){
    var el=document.getElementById("media-preview");
    if(!el)return;
    if(pendingMedia.length===0){el.innerHTML="";return;}
    var h='';
    for(var i=0;i<pendingMedia.length;i++){
        var m=pendingMedia[i];
        if(m.type==="photo"&&m.data){
            h+='<div class="media-thumb"><img src="'+escA(m.data)+'">';
            h+='<button type="button" class="thumb-del" data-act="removeMediaItem" data-arg="'+i+'">&times;</button></div>';
        }else if(m.type==="video"){
            h+='<div class="media-thumb media-thumb-video"><span>&#x1F3AC;</span><span style="font-size:10px">'+esc(m.name||"video")+'</span>';
            h+='<button type="button" class="thumb-del" data-act="removeMediaItem" data-arg="'+i+'">&times;</button></div>';
        }
    }
    h+='<p style="font-size:11px;color:var(--text2);margin-top:6px;width:100%">'+pendingMedia.length+' медиа прикреплено</p>';
    el.innerHTML=h;
}
function removeMediaItem(idx){
    pendingMedia.splice(idx,1);
    renderMediaPreview();
}
function doPublish(){
    var platforms=[];
    if(ck("pub-tg"))platforms.push("telegram");
    if(ck("pub-vk"))platforms.push("vk");
    if(ck("pub-ig"))platforms.push("instagram");
    if(platforms.length===0){toast("Выберите платформу","warn");return;}
    var hasMedia=pendingMedia.length>0;
    var photoData=[];
    for(var i=0;i<pendingMedia.length;i++){
        if(pendingMedia[i].type==="photo"&&pendingMedia[i].data)photoData.push(pendingMedia[i].data);
    }
    var hasVideo=pendingMedia.some(function(m){return m.type==="video";});
    if(tg){
        try{
            var payload={action:"publish",text:pendingPost,platforms:platforms,has_media:hasMedia,media_count:pendingMedia.length,has_video:hasVideo};
            if(photoData.length>0){
                var totalSize=JSON.stringify(payload).length;
                var photoFits=photoData[0]&&(totalSize+photoData[0].length<3800);
                if(photoFits){
                    payload.photo_base64=photoData[0];
                }else{
                    payload.wait_for_media=true;
                    payload.media_count=pendingMedia.length;
                }
            }else if(hasVideo){
                payload.wait_for_media=true;
            }
            tg.sendData(JSON.stringify(payload));
        }catch(e){
            if(e.message&&e.message.indexOf("too long")>=0){
                try{
                    tg.sendData(JSON.stringify({action:"publish",text:pendingPost,platforms:platforms,wait_for_media:true,media_count:pendingMedia.length}));
                }catch(e2){toast("Ошибка: "+e2.message,"err");}
            }else{toast("Ошибка: "+e.message,"err");}
        }
    }else{
        copyText();
        toast("Скопировано (TG не доступен)","info");
        hideModal();
    }
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
    var cur=getCurrentThemeId();
    var h='<div class="s-section">Оформление</div>';
    h+='<p style="font-size:12px;color:var(--text3);margin-bottom:10px;font-weight:500">12 премиальных палитр — мгновенное переключение</p>';
    h+='<div class="theme-grid">';
    for(var ti=0;ti<PH_THEMES.length;ti++){
        var th=PH_THEMES[ti];
        var sel=th.id===cur?" selected":"";
        h+='<button type="button" class="theme-swatch'+sel+'" data-act="setTheme" data-arg="'+th.id+'" style="--swatch-g:'+th.g+'" title="'+esc(th.label)+'"><span class="theme-swatch-inner"></span><span class="theme-swatch-label">'+esc(th.label)+'</span></button>';
    }
    h+='</div>';
    h+='<div class="s-section">Шрифт</div>';
    h+='<p style="font-size:12px;color:var(--text3);margin-bottom:8px">Размер текста в приложении</p>';
    h+='<div class="font-scale-row">';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="setFontScale" data-arg="compact">Компакт</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="setFontScale" data-arg="normal">Обычный</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" data-act="setFontScale" data-arg="large">Крупный</button></div>';
    h+='<div class="s-section">Свой акцент</div>';
    h+='<p style="font-size:12px;color:var(--text3);margin-bottom:8px">Поверх выбранной темы (кнопки, акценты)</p>';
    var cac="";
    try{cac=localStorage.getItem("ph_accent_custom")==="1";}catch(e){}
    var chx="#818cf8";
    try{chx=localStorage.getItem("ph_accent_hex")||chx;}catch(e){}
    if(!/^#[0-9A-Fa-f]{6}$/.test(chx))chx="#818cf8";
    h+='<div class="accent-row"><label class="cb-label" style="border:none;padding:8px 0"><input type="checkbox" id="accent-en" '+(cac?"checked":"")+'> Включить</label>';
    h+='<input type="color" id="accent-col" value="'+escA(chx)+'"></div>';
    h+='<button type="button" class="btn btn-sm btn-primary" style="margin-top:8px" data-act="applyAccentSettings">Применить акцент</button>';
    h+='<button type="button" class="btn btn-sm btn-secondary" style="margin-top:8px" data-act="resetCustomAccent">Сбросить (только тема)</button>';
    h+='<div class="s-section">AI</div>';
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
    groqKey=e.value.trim();
    try{if(!groqKey)localStorage.removeItem("ph_groq");}catch(x){}
    saveData();hideModal();renderContent();
    if(groqKey)toast("Ключ сохранён ✅","ok");
    else toast("Ключ очищен","info");
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
        case "setTheme":
            applyTheme(arg);
            syncThemeSwatches(arg);
            toast("Тема применена ✨","ok");
            break;
        case "setFontScale":
            try{localStorage.setItem("ph_font_scale",arg||"normal");}catch(e){}
            applyFontScaleFromStorage();
            toast("Размер текста обновлён","ok");
            break;
        case "applyAccentSettings":
            var en=document.getElementById("accent-en");
            var col=document.getElementById("accent-col");
            try{
                if(col&&/^#[0-9A-Fa-f]{6}$/.test(col.value))localStorage.setItem("ph_accent_hex",col.value);
                if(en)localStorage.setItem("ph_accent_custom",en.checked?"1":"0");
            }catch(e){}
            applyCustomAccentFromStorage();
            toast("Акцент обновлён","ok");
            break;
        case "resetCustomAccent":
            try{localStorage.removeItem("ph_accent_custom");localStorage.removeItem("ph_accent_hex");}catch(e){}
            applyCustomAccentFromStorage();
            toast("Сброшено","ok");
            break;
        case "saveDraftFromAI":
            if(!pendingPost){toast("Нет текста","warn");break;}
            addDraftRecord(lastTitle||"Пост",pendingPost);
            toast("В черновиках","ok");
            break;
        case "openDraft":openDraftById(arg);break;
        case "delDraft":
            if(confirm("Удалить черновик?"))deleteDraftById(arg);
            break;
        case "removePhoto":
            var rp=String(arg||"").split(":");
            if(rp.length===2)removePhoto(parseInt(rp[0],10),parseInt(rp[1],10));
            break;
        case "setStatus":
            var sp=String(arg||"").split(":");
            if(sp.length===2)setStatus(parseInt(sp[0],10),sp[1]);
            break;
        case "useTemplate":
            if(!groqKey){askKey("Нужен Groq API ключ");break;}
            for(var ti=0;ti<POST_TEMPLATES.length;ti++){
                if(POST_TEMPLATES[ti].id===arg){callAI(POST_TEMPLATES[ti].prompt,POST_TEMPLATES[ti].label);break;}
            }
            break;
        case "openAIHistory":
            var ahi=parseInt(arg,10);
            if(!isNaN(ahi)&&aiHistory[ahi]){
                pendingPost=aiHistory[ahi].text||"";
                lastTitle=aiHistory[ahi].title||"";
                lastPrompt="";
                showAIResult(lastTitle,pendingPost);
            }
            break;
        case "clearAIHistory":
            if(confirm("Очистить всю историю AI?")){
                aiHistory=[];saveAIHistory();renderContent();toast("История очищена","info");
            }
            break;
        case "selectPuppyMedia":selectPuppyMedia(parseInt(arg,10));break;
        case "removeMediaItem":removeMediaItem(parseInt(arg,10));break;
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

// === CAROUSEL ===
function initCarousel(puppyIdx,count){
    setTimeout(function(){
        var el=document.getElementById("carousel-"+puppyIdx);
        if(!el)return;
        el.addEventListener("scroll",function(){
            var dots=document.getElementById("dots-"+puppyIdx);
            if(!dots)return;
            var scrollLeft=el.scrollLeft,w=el.offsetWidth;
            var idx=Math.round(scrollLeft/w);
            var dd=dots.querySelectorAll(".dot");
            for(var k=0;k<dd.length;k++)dd[k].classList.toggle("active",k===idx);
        });
    },100);
}

// === SWIPE ACTIONS ===
function initSwipe(){
    document.addEventListener("touchstart",function(e){
        var card=e.target.closest(".swipe-card");
        if(!card)return;
        swipeStartX=e.touches[0].clientX;
        swipeCard=card;
    },{passive:true});
    document.addEventListener("touchmove",function(e){
        if(!swipeCard)return;
        var dx=e.touches[0].clientX-swipeStartX;
        var inner=swipeCard.querySelector(".card-inner");
        if(!inner)return;
        if(Math.abs(dx)>10){
            inner.style.transform="translateX("+Math.max(-80,Math.min(80,dx))+"px)";
            inner.style.transition="none";
        }
    },{passive:true});
    document.addEventListener("touchend",function(e){
        if(!swipeCard)return;
        var inner=swipeCard.querySelector(".card-inner");
        if(!inner){swipeCard=null;return;}
        var dx=parseInt(inner.style.transform.replace(/[^-\d]/g,""))||0;
        inner.style.transition="transform .3s ease";
        inner.style.transform="translateX(0)";
        var idx=parseInt(swipeCard.getAttribute("data-puppy-card"),10);
        if(dx>60&&!isNaN(idx)){
            haptic("success");
            if(puppies[idx]){
                puppies[idx].status=puppies[idx].status==="reserved"?"available":"reserved";
                saveData();renderContent();
                toast(puppies[idx].status==="reserved"?"Забронирован":"Снята бронь","ok");
            }
        }else if(dx<-60&&!isNaN(idx)){
            haptic("warn");
            if(puppies[idx]&&confirm("Удалить "+puppies[idx].name+"?")){
                puppies.splice(idx,1);saveData();renderContent();toast("Удалён","info");
            }
        }
        swipeCard=null;
    },{passive:true});
}

// === PHOTO HELPERS ===
function removePhoto(idx,photoIdx){
    if(!puppies[idx])return;
    if(!puppies[idx].photos)return;
    puppies[idx].photos.splice(photoIdx,1);
    saveData();
    editPuppy(idx);
    toast("Фото удалено","info");
}

// === STATUS QUICK CHANGE ===
function setStatus(idx,status){
    if(!puppies[idx])return;
    puppies[idx].status=status;
    saveData();
    haptic("success");
    showDetail(idx);
    renderContent();
    toast("Статус обновлён","ok");
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
    applyFontScaleFromStorage();
    try{
        var saved=localStorage.getItem("ph_theme")||"midnight-indigo";
        applyTheme(saved);
    }catch(e){applyTheme("midnight-indigo");}
    applyCustomAccentFromStorage();
    bindWebAppUi();
    initSwipe();
    loadData();renderContent();
    var fab=document.getElementById("fab");
    if(fab){fab.classList.remove("hidden");if(puppies.length===0)fab.classList.add("pulse");}
    var sub=document.getElementById("header-sub");
    if(sub&&puppies.length>0)sub.innerHTML="\uD83D\uDC36 "+puppies.length+" "+pluralPuppy(puppies.length);
    console.log("PuppyHub v5 loaded. Puppies:",puppies.length,"Groq:",groqKey?"yes":"no");
});
function pluralPuppy(n){
    if(n%10===1&&n%100!==11)return "щенок";
    if(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))return "щенка";
    return "щенков";
}
