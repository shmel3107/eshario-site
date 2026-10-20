// ==UserScript==
// @name         ESHArio
// @namespace    https://eshario.com/ios
// @updateURL    https://eshario.com/downloads/mobile/eshario-ios-loader.user.js
// @downloadURL  https://eshario.com/downloads/mobile/eshario-ios-loader.user.js
// @version      2.0.3.124
// @description  ESHArio for the EA FC Web App on the phone, iPhone and Android (MFIN-124, loader)
// @match        https://www.ea.com/*
// @match        https://eshario.com/mobile-login*
// @inject-into  content
// @run-at       document-start
// @noframes
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.xmlHttpRequest
// @grant        GM.info
// @connect      api.eshario.com
// @connect      api.eshario.app
// @connect      prices.eshario.com
// @connect      r2.fut.gg
// @connect      www.fut.gg
// @connect      files.eshario.com
// @connect      eshario.com
// @connect      eshario.app
// ==/UserScript==
// ESHArio MFIN-124, loader: page code comes from the server, signature checked by src/loader/code.js
(function(){'use strict';
var HOST_CONFIG={"manifest":{"version":"2.0.3"},"bundle":{},"loginUrls":["https://eshario.com/mobile-login"],"sign":"MFIN-124","words":{"accountTitle":"Аккаунт ESHArio"}};
// --- mobile/host/host.js ---
// ХОСТ ESHArio НА iPHONE (кирпич MOBILE-IOS-1, дорога И2).
//
// ЧТО ЭТО. На ПК страницу ESHArio обслуживают два файла папки расширения:
// `content/content.js` (мост в изолированном мире вкладки) и
// `background/worker.js` с `loader/doors.js` (фон: сеть, аккаунт, двери). На
// iPhone расширения нет, есть юзерскрипт Safari в изолированном мире. Этот файл
// НЕ переписывает их логику: сборка `mobile/build/ios.mjs` кладёт в юзерскрипт
// эти три файла ядра байт в байт, а здесь живёт только то, чего им не хватает:
// `chrome.*` поверх четырёх вызовов менеджера (`GM.getValue`, `GM.setValue`,
// `GM.xmlHttpRequest`, `GM.info`). Копии логики нет, и разойтись с ПК нечему
// (сцена-близнец сверяет файлы в склейке с `src/` побайтно).
//
// ЧТО ЗДЕСЬ РЕШАЕТСЯ САМО, И ПОЧЕМУ:
//  1. СЕТЬ ОДНОЙ ТОЧКОЙ. Любой `fetch` фона и дверей идёт сюда, и сюда пускаются
//     только шесть узлов брифа (раздел 2 п.2). Замер 03.10: ни Userscripts, ни
//     Stay не держат `@connect`, значит держит этот список. К EA отсюда не
//     уходит ни одного запроса: `www.ea.com` в списке нет.
//  2. ДВА МИРА `chrome`, КАК В БРАУЗЕРЕ. Фон (`bg`) слышит `runtime.sendMessage`
//     моста, мост (`tab`) слышит только свои события. Один общий список
//     слушателей отдал бы мосту чужие письма.
//  3. ЗАКРЫТАЯ СТОРОНА ПО ПОСТРОЕНИЮ (бриф раздел 2 п.3). Мост просит фон
//     только по открытому списку; прочее отказом `mobile-closed`. Двери тоже
//     по открытому списку. Счётчики `budget.*` и замки `locks.write` (бриф
//     MOBILE-FINAL-1, С3 и С4) идут воркеру как есть, но только от
//     вкладки-хозяина; вторая вкладка получает `counter-unavailable` (снайп и
//     решатели стоят) и отказ замков `owner-elsewhere`.
//  4. СЕССИЯ И ПАРОЛЬ НЕ ВЫХОДЯТ ИЗ ЭТОГО МИРА. Вход живёт только на нашей
//     странице входа (режим `login`); на странице EA вход и выход фону не
//     передаются вовсе. Мост EA, как на ПК, видит лишь подписанный снимок права.
//
// Классический текст без импортов: сборка кладёт его в юзерскрипт как есть,
// сцены исполняют его в `node:vm`.
var esharioHost=(function(){'use strict';

// Тот же путь вебапа, что у `content.js` и `doors.js` (сверяет сцена-близнец).
var WEBAPP_RE=/^https:\/\/www\.ea\.com\/(?:[^?#]*\/)?ultimate-team\/web-app/;
var EA_RE=/^https:\/\/www\.ea\.com\//;
// Шесть узлов брифа, точные имена, только https. Порт и поддомены не пускаются.
var NET_HOSTS=['api.eshario.com','api.eshario.app','prices.eshario.com','r2.fut.gg','www.fut.gg','files.eshario.com','eshario.com','eshario.app'];
var RUNTIME_ID='eshario-ios';
var BASE='eshario-ios:/';
var ACCOUNT_PAGE='account/popup.html';
var CLOSED='mobile-closed';
// Что мост может спросить у фона. Остальное (код с сервера, отчёты, перенос
// настроек, обновление архива) на телефоне закрыто: отказ, и мост отвечает
// странице своим прежним словом отказа.
var WORKER_OPEN=['price.fetch','cards.base','account.status','account.open'];
var BUDGET=['budget.reserve','budget.spend','budget.release','budget.rest','budget.state'];
var DOORS_OPEN=['net.fetch','store.get','store.set','store.remove','store.keys','code.status'];
// Ключи кода в памяти виртуальные: код страницы едет в самом юзерскрипте, и
// записать поверх него из страницы нельзя ничем.
var CODE_NS='code.';
var GONE='';
// Потолок ответа сети: тот же, что у загрузчика кода ядра на файл кода (180 с).
var FETCH_CAP_MS=180000;
// МЯГКИЕ УЗЛЫ: FUT.GG (замер 13.10 на iPhone брата). Первые запросы менеджера
// к FUT.GG после загрузки страницы молчат: в одной загрузке 5 из 5 за две
// минуты, в другой первый из одиннадцати; ни `onload`, ни `onerror`. Страница
// того же телефона доставала узел за 79 мс, узлы eshario отвечали. Мост ждёт
// каждый такой запрос 5 с, три вопроса о манифесте подряд это 15 с «подготовки»
// перед сборкой SBC. Цены FUT.GG у ядра есть и на зеркале владельца, поэтому
// молчащий мягкий узел получает отказ сети через 3,5 с, а запросы к нему в
// следующие 20 с (повторы того же вопроса) отказываются сразу, без сети.
// Дольше узел не отдыхает: следующие запросы у него отвечают.
var SOFT_HOSTS=['r2.fut.gg','www.fut.gg'];
var SOFT_SILENT_MS=3500;
var SOFT_REST_MS=20000;
// Сколько последних запросов к мягким узлам помнит знак на корне.
var SOFT_LOG=8;
// Подписанный файл кода едет байтами: подпись считается по байтам, а не по
// тексту, перекодированному менеджером (этап 5, загрузчик кода ядра).
var CODE_FILE_RE=/\/page-bundle\.js$/;
// Тонкая сборка (этап 5): двери загрузчика кода ядра к воркеру.
var THIN_OPEN=['code.boot','code.focus'];
// После «Войти» в шапке хост смотрит, не появилась ли сессия, раз в 2,5 с до
// десяти минут (бриф раздел 2 п.4), и будит страницу событием `focus`: по нему
// точка входа и так перечитывает право (`page-entry.js`, слушатель `focus`).
var WATCH_EVERY_MS=2500;
var WATCH_FOR_MS=600000;
// Просьба моста `account.open` после нажатия, открывшего окно само: за это время
// она считается тем же нажатием.
var TAP_FRESH_MS=5000;
var TAP_LOGIN='eshario-account-login';
var TAP_LOGOUT='eshario-account-logout';
// ОДИН ХОЗЯИН АВТОМАТИКИ НА УСТРОЙСТВО (бриф MOBILE-FINAL-1, С4). На ПК воркер
// один на браузер; здесь юзерскрипт поднимает свой воркер в каждой вкладке, а
// воркер держит счёт дня в памяти и пишет его целиком (`worker.js`, `ownerLoad`,
// `ownerSave`): две вкладки затирали бы счёт друг друга. Поэтому счётчики и
// замки (`budget.*`, `locks.write`) воркеру передаёт только вкладка-хозяин.
// Запись хозяина в хранилище менеджера: id вкладки и отметка времени, пульс
// раз в 5 с, просрочена через 20 с (вкладку в фоне iOS усыпляет). Захват
// подтверждается повторным чтением: побеждает последний писавший.
var OWNER_KEY='host:owner';
var OWNER_BEAT_MS=5000;
var OWNER_STALE_MS=20000;
var OWNER_SETTLE_MS=400;
// ПИНГ ВМЕСТО ПУЛЬСА ЗАПИСЬЮ (Firefox и Violentmonkey, замер 17.10 на A03).
// Violentmonkey держит все значения скрипта одним объектом и на каждую запись
// сохраняет его целиком (7,2 МБ с кодом тонкой сборки). Пульс записью раз в
// 5 с давал 12 таких сохранений в минуту; главный процесс Firefox не убирал их
// без сборки мусора, рос на 5 МБ/с, и система выгружала браузер через
// 10..20 минут. Поэтому под Firefox хозяин пишет свою запись один раз, при
// захвате, а живость доказывает ответом: вкладка, увидевшая чужую запись,
// пишет пинг, хозяин на своём пульсе (только чтение) видит пинг и пишет
// ответ. Нет ответа за `OWNER_PING_WAIT_MS`: хозяин мёртв, место берётся
// прежним захватом. Ответ годится `OWNER_PONG_FRESH_MS`, потом пинг заново.
// В простое одной вкладки записей нет вовсе. Safari (iPhone) живёт прежним
// пульсом: усыплённая вкладка iOS ответить не может.
var OWNER_PING_KEY='host:ping';
var OWNER_PONG_KEY='host:pong';
var OWNER_PING_WAIT_MS=12000;
var OWNER_PONG_FRESH_MS=60000;
var OWNER_ELSEWHERE='owner-elsewhere';
var BUDGET_CLOSED={ok:false,granted:0,reason:'counter-unavailable',state:null};

function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value))}
function noEvent(){return{addListener:function(){},removeListener:function(){},hasListener:function(){return false}}}

/** Узел из шести, https, без имени, пароля и порта. */
function allowedUrl(value){if(typeof value!=='string'||value===''||value.length>4096)return false;
var url;
try{url=new URL(value)}catch(err){return false}
return url.protocol==='https:'&&url.username===''&&url.password===''&&url.port===''&&NET_HOSTS.indexOf(url.hostname)>=0}

function create(env){var GM=env.GM,win=env.window,doc=env.document,config=env.config||{};
// `here` подаёт только стенд сцен и браузерный стенд (страница `file:`); склейка
// выпуска его не передаёт (сцена-близнец сверяет строку вызова).
var here=String(typeof env.here==='string'?env.here:win.location&&win.location.href||'');
var loginUrls=Array.isArray(config.loginUrls)?config.loginUrls:[];
var mode=EA_RE.test(here)?'webapp':loginUrls.some(function(one){return typeof one==='string'&&one!==''&&here.indexOf(one)===0})?'login':'idle';
var manifest=passport(config.manifest);
var bundle=plain(config.bundle)?config.bundle:{};
// Тонкая сборка: кода в склейке нет, его ставит загрузчик ядра (`loader/code.js`
// байт в байт) с сервера по подписи; ключи `code.*` живут в хранилище менеджера.
var thin=!(typeof bundle.text==='string'&&bundle.text!=='');
// Менеджер под Firefox (Violentmonkey): окно песочницы в обёртке Xray. Он
// хранит все значения скрипта одним объектом и сохраняет его целиком на каждую
// запись (замер 17.10 на A03), поэтому под ним хост пишет в хранилище мало.
var xrayManager=(function(){try{var raw=win.wrappedJSObject;return raw!==null&&typeof raw==='object'}catch(err){return false}})();
var later=typeof env.setTimeout==='function'?env.setTimeout:win.setTimeout.bind(win);
// До какого мига мягкий узел не спрашивается и сколько раз он молчал (знак на корне: прибор и поддержка).
// Знак `data-eshario-soft`: счёт молчаний и отказов без сети, за ним последние
// запросы «узел миллисекунды исход» (исходы: ok, err, silent, skip и late, то
// есть ответ пришёл уже после срока стражи: запрос опоздал, а не потерялся).
var softRest={},softStats={silent:0,skipped:0},softLog=[];
function softNote(host,ms,result){softLog.push(host.split('.')[0]+' '+ms+' '+result);
if(softLog.length>SOFT_LOG)softLog.shift();
try{doc.documentElement.setAttribute('data-eshario-soft','s'+softStats.silent+' k'+softStats.skipped+' | '+softLog.join(' | '))}catch(err){}}

// --- память: chrome.storage поверх GM ---------------------------------------
//
// Ключ и значение как у `chrome.storage.local` (бриф раздел 2 п.2), значение
// строкой JSON: один вид хранения у обоих менеджеров. Удаления в четырёх
// вызовах нет, поэтому удалённый ключ это пустая строка (JSON её не даёт).
var changed={local:[],sync:[]};
var onChanged={addListener:function(fn){if(typeof fn==='function'){changed.local.push(fn)}},removeListener:function(){},hasListener:function(){return false}};

function virtualCode(key){if(key!=='code.current'||typeof bundle.text!=='string'||bundle.text==='')return undefined;
return{meta:{version:bundle.version||null,sha256:bundle.sha256||null},text:bundle.text}}

// Замер для живого листа: чтения дольше 500 мс (имя ключа и миллисекунды,
// без значения) атрибутом корня `data-eshario-slow`, последние десять.
var slow=[];
function slowRead(key,ms){if(ms<500)return;
slow.push(key+':'+ms);
if(slow.length>10)slow.shift();
try{doc.documentElement.setAttribute('data-eshario-slow',slow.join(' '))}catch(err){}}

// Память кода (тонкая сборка): код весит 4,4 МБ, и Stay читает его 7..9 с на
// каждое чтение, а за одну загрузку его спрашивают около десяти раз (мост,
// проверка загрузчика, состояние), и менеджер ставит их в одну очередь (замер
// 04.10: `code.state` ждал 26 с). Ключ `code.*` читается с диска один раз за
// жизнь страницы; запись этой вкладки обновляет память сразу.
var codeMemo={};
// КОД ТОЛЬКО В ПАМЯТИ СТРАНИЦЫ ПОД FIREFOX (буква Fable «а», 17.10). Код
// тонкой сборки весит 5,7 МБ, и в хранилище Violentmonkey каждая запись любого
// ключа сохраняла бы его заново. Под Firefox `code.current` живёт в `codeMemo`
// этой страницы и в менеджер не пишется: загрузчик берёт код с сервера на
// каждом заходе, повторные заходы идут из кэша браузера (ETag, max-age).
// Сервер недоступен: заход без кода, следующий пробует снова. Ключ, который
// оставили прежние сборки, снимается одной записью при старте страницы.
var CODE_PAGE_ONLY='code.current';
var codePageOnly=xrayManager&&thin;
// ПРЕЖНИЙ КОД ТОЛЬКО В ПАМЯТИ СТРАНИЦЫ НА ОБОИХ ТЕЛЕФОНАХ (находка людей 3,
// решение 18.10 «слоем», Fable 20.10: «2.0.4 начни с него»). Загрузчик ядра
// при обновлении сдвигает прежний код в `code.previous`: в Userscripts это
// вторые 5,8 МБ рядом с `code.current`, и на iPhone брата (iOS 16.7) чтения
// хранилища шли по 5 с. Откат на прежний код остаётся в пределах захода; после
// перезагрузки прежнего кода нет, загрузчик идёт к серверу, как на первом
// заходе. Копия, оставленная прежними сборками, снимается при старте.
var CODE_PREVIOUS='code.previous';
var CODE_MEMO_ONLY=[CODE_PAGE_ONLY,CODE_PREVIOUS];
function pageOnly(area,key){return area==='local'&&thin&&(key===CODE_PREVIOUS||codePageOnly&&key===CODE_PAGE_ONLY)}
// КЭШ ТОЖЕ ТОЛЬКО В ПАМЯТИ СТРАНИЦЫ ПОД FIREFOX (буква владельца «А», 18.10,
// условия Fable 02:09). Каждая запись любого ключа (счёт дня пишется на каждый
// поиск снайпа) сохраняет у Violentmonkey весь объект значений, и 3/4 его
// занимали данные без денег, которые страница берёт заново сама: колонки и
// каталог Галереи, прошлый файл цен, каталог карт осколками. Метка засева
// каталога живёт вместе с осколками: метка без каталога значила бы «база уже
// усвоена» про пустой каталог, а без метки воркер отдаёт тело базы сразу.
// Записи денег и места (счёт дня, счётчики, хозяин, замки, настройки, вход)
// остаются в хранилище менеджера. Safari не задет: там ключи прежние.
var PAGE_CACHE_KEYS=['door.gallery.columns','door.gallery.catalog','door.prices.lastFile','cards.seed'];
var PAGE_CACHE_PREFIX='catalog.v1.';
var cachePageOnly=xrayManager;
var pageMemo={};
function cacheOnly(area,key){return cachePageOnly&&area==='local'&&typeof key==='string'&&(PAGE_CACHE_KEYS.indexOf(key)>=0||key.indexOf(PAGE_CACHE_PREFIX)===0)}
// МОСТ ЖДЁТ КОД ЭТОГО ЗАХОДА. Мост ядра (`content.js`) читает код один раз, при
// старте, а код, легший позже, отдаёт следующему заходу строкой «код загружен,
// обновите страницу». Код только в памяти страницы до следующего захода не
// доживает, поэтому под Firefox склейка запускает мост, когда первая проверка
// загрузчика этого захода кончилась: код лёг, загрузчик записал отказ или
// нужен новый загрузчик, или вышел срок `CODE_WAIT_MS` (тогда мост покажет
// свою строку ожидания, как без кода).
var CODE_WAIT_MS=45000;
var codeWaiter=null;
function whenCode(fn){var done=false;
function go(){if(done)return;
done=true;
codeWaiter=null;
try{fn()}catch(err){}}
if(!codePageOnly||mode!=='webapp'){go();return}
codeWaiter=go;
later(go,CODE_WAIT_MS)}
function codeTold(key,value){if(codeWaiter===null)return;
var settled=key===CODE_PAGE_ONLY?value!==undefined:key==='code.needsLoader'?!!value:key==='code.state'&&plain(value)&&typeof value.lastError==='string'&&value.lastError!=='';
if(settled)codeWaiter()}
function readOne(area,key){if(pageOnly(area,key))return(codeMemo[key]||Promise.resolve(undefined)).then(clone);
if(cacheOnly(area,key))return Promise.resolve(Object.prototype.hasOwnProperty.call(pageMemo,key)?clone(pageMemo[key]):undefined);
if(key.indexOf(CODE_NS)===0&&!thin)return Promise.resolve(area==='local'?virtualCode(key):undefined);
if(key.indexOf(CODE_NS)===0&&area==='local'){if(!Object.prototype.hasOwnProperty.call(codeMemo,key))codeMemo[key]=readDisk(area,key);
return codeMemo[key].then(clone)}
return readDisk(area,key)}
function readDisk(area,key){var started=Date.now();
return Promise.resolve(GM.getValue(area+':'+key,GONE)).then(function(raw){slowRead(key,Date.now()-started);
if(typeof raw!=='string'||raw===GONE)return undefined;
try{return JSON.parse(raw)}catch(err){return undefined}})}

function keysOf(asked){if(asked===null||asked===undefined)return{keys:[],defaults:{}};
if(typeof asked==='string')return{keys:[asked],defaults:{}};
if(Array.isArray(asked))return{keys:asked.filter(function(k){return typeof k==='string'}),defaults:{}};
if(plain(asked))return{keys:Object.keys(asked),defaults:asked};
return{keys:[],defaults:{}}}

function storageArea(area){
// `get(null)` (все ключи) честно пустой. Список ключей отдаёт `getKeys`
// (`GM.listValues`, только имена, без значений): его зовёт дверь `store.keys`
// (`loader/doors.js` спрашивает `getKeys` раньше `get(null)`), а дверь с
// выгрузки 15.10 нужна журналу активности ядра (`features/activity-log.js`).
// Удаление честное (`GM.deleteValue`), иначе снятые ключи жили бы в списке.
function get(asked){var want=keysOf(asked);
return Promise.all(want.keys.map(function(key){return readOne(area,key)})).then(function(values){var out={};
for(var i=0;i<want.keys.length;i+=1){var value=values[i];
if(value===undefined&&Object.prototype.hasOwnProperty.call(want.defaults,want.keys[i]))value=want.defaults[want.keys[i]];
if(value!==undefined)out[want.keys[i]]=clone(value)}
return out})}
function set(payload){if(!plain(payload))return Promise.reject(new Error('bad-payload'));
var keys=Object.keys(payload).filter(function(key){return thin||key.indexOf(CODE_NS)!==0});
var texts;
try{texts=keys.map(function(key){return JSON.stringify(payload[key])})}catch(err){return Promise.reject(err)}
keys.forEach(function(key,i){if(area==='local'&&key.indexOf(CODE_NS)===0)codeMemo[key]=Promise.resolve(texts[i]===undefined?undefined:JSON.parse(texts[i]));
if(cacheOnly(area,key)){if(texts[i]===undefined)delete pageMemo[key];else pageMemo[key]=JSON.parse(texts[i])}});
return Promise.all(keys.map(function(key,i){if(pageOnly(area,key)||cacheOnly(area,key))return null;
return texts[i]===undefined?dropKey(area+':'+key):GM.setValue(area+':'+key,texts[i])})).then(function(){tell(area,keys,payload);
if(area==='local')keys.forEach(function(key){codeTold(key,payload[key])})})}
function remove(asked){var keys=keysOf(asked).keys.filter(function(key){return thin||key.indexOf(CODE_NS)!==0});
keys.forEach(function(key){if(area==='local'&&key.indexOf(CODE_NS)===0)codeMemo[key]=Promise.resolve(undefined);
if(cacheOnly(area,key))delete pageMemo[key]});
return Promise.all(keys.map(function(key){return pageOnly(area,key)||cacheOnly(area,key)?null:dropKey(area+':'+key)})).then(function(){tell(area,keys,null)})}
function getKeys(){if(typeof GM.listValues!=='function')return Promise.resolve([]);
var head=area+':';
return Promise.resolve(GM.listValues()).then(function(list){return(Array.isArray(list)?list:[]).filter(function(key){return typeof key==='string'&&key.indexOf(head)===0}).map(function(key){return key.slice(head.length)}).filter(function(key){return(thin||key.indexOf(CODE_NS)!==0)&&!pageOnly(area,key)&&!cacheOnly(area,key)})},function(){return[]}).then(function(keys){if(area==='local'&&cachePageOnly)keys=keys.concat(Object.keys(pageMemo));
var held=CODE_MEMO_ONLY.filter(function(key){return pageOnly(area,key)&&!!codeMemo[key]});
return Promise.all(held.map(function(key){return codeMemo[key].then(function(value){return value===undefined?null:key},function(){return null})})).then(function(more){return keys.concat(more.filter(Boolean))})})}
return{get:get,set:set,remove:remove,getKeys:getKeys}}

/** При старте снимаются ключи, что живут только в памяти страницы: прежний код при любой сборке (полная его не читает), под Firefox код и кэш. */
function dropStoredCode(){if(typeof GM.listValues!=='function')return;
try{Promise.resolve(GM.listValues()).then(function(list){if(!Array.isArray(list))return;
return Promise.all(list.filter(function(full){return typeof full==='string'&&(full==='local:'+CODE_PREVIOUS||xrayManager&&full==='local:'+CODE_PAGE_ONLY||full.indexOf('local:')===0&&cacheOnly('local',full.slice(6)))}).map(dropKey))}).then(null,function(){})}catch(err){}}

// Снятие ключа: менеджер без `deleteValue` получает прежнюю метку «пусто».
function dropKey(full){return typeof GM.deleteValue==='function'?GM.deleteValue(full):GM.setValue(full,GONE)}

/** Известие `onChanged`, как Chrome: своей вкладке тоже, после записи. */
function tell(area,keys,payload){if(keys.length===0||area!=='local')return;
var changes={};
keys.forEach(function(key){changes[key]=payload===null?{oldValue:null}:{newValue:clone(payload[key])}});
later(function(){changed.local.slice().forEach(function(fn){try{fn(changes,area)}catch(err){}})},0)}

var storage={local:storageArea('local'),sync:storageArea('sync'),onChanged:onChanged};
dropStoredCode();

// --- сеть одной точкой --------------------------------------------------------

function headersOf(raw){var out={};
if(!raw)return out;
if(typeof raw.forEach==='function'&&!Array.isArray(raw)&&!plain(raw)){raw.forEach(function(value,name){out[name]=String(value)});
return out}
if(Array.isArray(raw)){raw.forEach(function(pair){if(Array.isArray(pair)&&pair.length===2)out[String(pair[0])]=String(pair[1])});
return out}
Object.keys(raw).forEach(function(name){out[name]=String(raw[name])});
return out}

function parseHeaders(text){var out={};
String(text||'').split(/\r?\n/).forEach(function(line){var at=line.indexOf(':');
if(at<=0)return;
var name=line.slice(0,at).trim().toLowerCase(),value=line.slice(at+1).trim();
out[name]=out[name]===undefined?value:out[name]+', '+value});
return out}

function failure(name,message){var err=new Error(message);
err.name=name;
return err}

function bufferOf(value){try{return Object.prototype.toString.call(value)==='[object ArrayBuffer]'?value:null}catch(err){return null}}
function responseOf(raw,url,asked){var buf=bufferOf(raw.response);
var text=buf!==null?null:typeof raw.responseText==='string'?raw.responseText:typeof raw.response==='string'?raw.response:'';
function textNow(){if(text===null)text=new TextDecoder('utf-8').decode(buf);
return text}
var heads=parseHeaders(raw.responseHeaders);
var status=Number(raw.status)||0;
return{ok:status>=200&&status<300,status:status,statusText:String(raw.statusText||''),url:url,redirected:url!==asked,
headers:{get:function(name){var v=heads[String(name).toLowerCase()];return v===undefined?null:v},
has:function(name){return heads[String(name).toLowerCase()]!==undefined},
forEach:function(fn){Object.keys(heads).forEach(function(name){fn(heads[name],name)})}},
text:function(){return Promise.resolve().then(textNow)},
json:function(){return Promise.resolve().then(function(){return JSON.parse(textNow())})},
arrayBuffer:function(){return Promise.resolve().then(function(){return buf!==null?buf.slice(0):new TextEncoder().encode(textNow()).buffer})}}}

/**
 * `fetch` фона и дверей. Чужой узел: отказ ДО сети тем же видом ошибки, что у
 * сетевого сбоя (`TypeError`), и фон отвечает странице своим словом `network`
 * или `outside-passport`. Переадресация за пределы шести: тоже отказ.
 */
function hostFetch(input,init){init=init||{};
var url=typeof input==='string'?input:input&&typeof input.url==='string'?input.url:String(input);
if(!allowedUrl(url))return Promise.reject(new TypeError('host: forbidden-url'));
var signal=init.signal;
if(signal&&signal.aborted)return Promise.reject(failure('AbortError','aborted'));
var soft='';
try{soft=new URL(url).hostname}catch(err){}
if(SOFT_HOSTS.indexOf(soft)<0)soft='';
if(soft!==''&&softRest[soft]>Date.now()){softStats.skipped+=1;
softNote(soft,0,'skip');
return Promise.reject(new TypeError('host: network'))}
var asked=Date.now();
return new Promise(function(resolve,reject){var settled=false,req=null,watch=null;
function calm(){if(watch!==null&&typeof win.clearTimeout==='function')win.clearTimeout(watch);
watch=null}
function fail(err){calm();
if(settled)return;
settled=true;
reject(err)}
var headers=headersOf(init.headers);
// СВЕРКА С СЕРВЕРОМ ПОД FIREFOX ИДЁТ ПРАВИЛАМИ КЭША БРАУЗЕРА (замер A03 18.10).
// Заголовок запроса `Cache-Control: no-cache` у Violentmonkey ведёт мимо кэша
// целиком: файл кода (1,5 МБ сжатым) приезжал телом на каждом заходе, хотя
// сервер отвечает 304 по ETag. Под Firefox код живёт только в памяти страницы
// (буква «а») и спрашивается каждый заход, поэтому `no-cache` загрузчика здесь
// без заголовка: браузер берёт файл из кэша в срок `max-age` сервера и потом
// сверяется (304). Адрес файла несёт номер версии, sha256 и подпись загрузчик
// проверяет всегда. `no-store` и `reload` мимо кэша, как прежде; Safari прежний.
var bypass=init.cache==='no-store'||init.cache==='reload'||(init.cache==='no-cache'&&!xrayManager);
if(bypass)headers['cache-control']='no-cache';
var details={method:String(init.method||'GET').toUpperCase(),url:url,headers:headers,anonymous:true,timeout:FETCH_CAP_MS,
onload:function(raw){if(settled){if(soft!=='')softNote(soft,Date.now()-asked,'late');
return}
var finalUrl=typeof raw.finalUrl==='string'&&raw.finalUrl!==''?raw.finalUrl:url;
if(!allowedUrl(finalUrl)){fail(new TypeError('host: redirect-outside'));return}
if(!(Number(raw.status)>0)){fail(new TypeError('host: network'));return}
calm();
if(soft!==''){delete softRest[soft];
softNote(soft,Date.now()-asked,'ok')}
settled=true;
resolve(responseOf(raw,finalUrl,url))},
onerror:function(){if(soft!=='')softNote(soft,Date.now()-asked,settled?'late-err':'err');
fail(new TypeError('host: network'))},
ontimeout:function(){fail(failure('TimeoutError','timeout'))},
onabort:function(){fail(failure('AbortError','aborted'))}};
if(init.body!==undefined&&init.body!==null)details.data=init.body;
try{if(CODE_FILE_RE.test(new URL(url).pathname))details.responseType='arraybuffer'}catch(err){}
try{req=GM.xmlHttpRequest(details)}catch(err){fail(new TypeError('host: network'));return}
if(soft!=='')watch=later(function(){watch=null;
if(settled)return;
softRest[soft]=Date.now()+SOFT_REST_MS;
softStats.silent+=1;
softNote(soft,Date.now()-asked,'silent');
try{if(req&&typeof req.abort==='function')req.abort()}catch(err){}
fail(new TypeError('host: network'))},SOFT_SILENT_MS);
if(signal&&typeof signal.addEventListener==='function')signal.addEventListener('abort',function(){try{if(req&&typeof req.abort==='function')req.abort()}catch(err){}
fail(failure('TimeoutError','timeout'))},{once:true})})}

// --- фон: chrome фона, слушатели, загрузчик для дверей -------------------------

var bgListeners=[];
var tabListeners=[];

/** Письмо фону, как Chrome: слушатель держит канал `true`, ответ один, копией. */
function askBackground(message,sender){var sent=clone(message);
return new Promise(function(resolve){var done=false,held=false;
function reply(value){if(done)return;
done=true;
resolve(clone(value))}
bgListeners.slice().forEach(function(fn){try{if(fn(sent,sender,reply)===true)held=true}catch(err){}});
if(!held&&!done)resolve(undefined)})}

function senderOf(){return{id:RUNTIME_ID,url:here,origin:originOf(here),frameId:0,tab:{id:1,url:here}}}
function originOf(value){try{return new URL(value).origin}catch(err){return ''}}

/**
 * Окно аккаунта. На ПК фон открывает страницу расширения `account/popup.html`;
 * здесь её роль играет наша страница входа (бриф раздел 2 п.4, дорога А), с тем
 * же вопросом `?ask=logout`. Safari может не дать окно без нажатия: тогда в
 * странице EA встаёт строка со ссылкой, и её нажимает сам человек.
 */
function openAccount(url){var target=accountTarget(url);
if(target===null)return Promise.reject(new Error('open-failed'));
watchSession();
// Окно уже открыто в такте нажатия (`tapOpen`): просьба моста пришла следом за
// тем же нажатием, второго окна и строки со ссылкой не нужно.
if(tapped!==null&&tapped.target===target&&Date.now()-tapped.at<TAP_FRESH_MS){tapped=null;
return Promise.resolve({id:2,url:target})}
var opened=null;
try{opened=win.open(target,'_blank')}catch(err){opened=null}
if(!opened)offerLink(target);
return Promise.resolve({id:2,url:target})}

/**
 * Вход и выход одним нажатием (бриф MOBILE-FINAL-1, этап 1). Код страницы на
 * телефоне (`src/features/mobile-fit.js`) в такте нажатия на «войти» или
 * «Выйти» шлёт событие документа без данных; хост открывает страницу входа
 * здесь же, пока Safari считает это нажатием. Не дал окна: строка со ссылкой,
 * как прежде. Событие несёт только вид окна; адрес хост берёт свой.
 */
var tapped=null;
function tapOpen(ask){var target=accountTarget(BASE+ACCOUNT_PAGE+(ask==='logout'?'?ask=logout':''));
if(target===null)return;
var opened=null;
try{opened=win.open(target,'_blank')}catch(err){opened=null}
tapped={target:target,at:Date.now()};
watchSession();
if(!opened)offerLink(target)}

function accountTarget(url){var login=loginUrls[0];
if(typeof login!=='string'||login==='')return null;
var page=BASE+ACCOUNT_PAGE;
if(typeof url!=='string'||url.indexOf(page)!==0)return null;
var rest=url.slice(page.length);
return login+(rest==='?ask=logout'?'?ask=logout':'')}

var linkNode=null;
function offerLink(target){try{if(linkNode&&linkNode.parentNode)linkNode.parentNode.removeChild(linkNode);
var box=doc.createElement('div');
box.setAttribute('data-eshario-host-link','1');
box.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:10px 12px;border-radius:10px;background:#131417;color:#EEF1F7;border:1px solid #3DD8FF;font:15px/1.3 -apple-system,system-ui,sans-serif';
var link=doc.createElement('a');
link.href=target;
link.target='_blank';
link.rel='noopener';
link.textContent=String(config.words&&config.words.accountTitle||'ESHArio');
link.style.cssText='flex:1;color:#3DD8FF;text-decoration:underline';
var close=doc.createElement('button');
close.type='button';
close.textContent='×';
close.style.cssText='background:none;border:0;color:#EEF1F7;font-size:20px';
function drop(){if(box.parentNode)box.parentNode.removeChild(box)}
link.addEventListener('click',function(){later(drop,0)});
close.addEventListener('click',drop);
box.appendChild(link);
box.appendChild(close);
(doc.body||doc.documentElement).appendChild(box);
linkNode=box}catch(err){}}

/** Смена сессии в соседней вкладке: страница перечитывает право по `focus`. */
var watchTimer=null,watchUntil=0,watchSeen=null;
function sessionRaw(){return Promise.resolve(GM.getValue('local:account.session',GONE)).then(function(raw){return typeof raw==='string'?raw:GONE},function(){return GONE})}
function watchSession(){watchUntil=Date.now()+WATCH_FOR_MS;
if(watchTimer!==null)return;
sessionRaw().then(function(raw){watchSeen=raw;
tick()})}
function tick(){watchTimer=later(function(){watchTimer=null;
sessionRaw().then(function(raw){if(watchSeen!==null&&raw!==watchSeen){watchSeen=raw;
wake()}
if(Date.now()<watchUntil)tick()})},WATCH_EVERY_MS)}
function wake(){try{win.dispatchEvent(new win.Event('focus'))}catch(err){}}

// Будильники на жизнь страницы: загрузчик кода ядра ставит часовой вопрос
// серверу и минутный, пока кода нет. Страница закрылась: будильники с ней.
var alarmList={},alarmListeners=[];
function alarmFire(name){var one=alarmList[name];
if(!one)return;
one.timer=null;
if(one.period>0){one.at=Date.now()+one.period;
one.timer=later(function(){alarmFire(name)},one.period)}
else delete alarmList[name];
alarmListeners.slice().forEach(function(fn){try{fn({name:name,scheduledTime:Date.now()})}catch(err){}})}
var alarms={create:function(name,info){if(typeof name!=='string'){info=name;name=''}
info=plain(info)?info:{};
var old=alarmList[name];
if(old&&old.timer!==null&&typeof win.clearTimeout==='function')win.clearTimeout(old.timer);
var delay=typeof info.when==='number'?Math.max(0,info.when-Date.now()):Math.max(0,Number(info.delayInMinutes)||Number(info.periodInMinutes)||0)*60000;
var one={at:Date.now()+delay,period:Math.max(0,Number(info.periodInMinutes)||0)*60000,timer:null};
alarmList[name]=one;
one.timer=later(function(){alarmFire(name)},delay);
return Promise.resolve()},
clear:function(name){var one=alarmList[name];
if(!one)return Promise.resolve(false);
if(one.timer!==null&&typeof win.clearTimeout==='function')win.clearTimeout(one.timer);
delete alarmList[name];
return Promise.resolve(true)},
get:function(name){var one=alarmList[name];
return Promise.resolve(one?{name:name,scheduledTime:one.at,periodInMinutes:one.period>0?one.period/60000:undefined}:undefined)},
getAll:function(){return Promise.resolve(Object.keys(alarmList).map(function(name){var one=alarmList[name];
return{name:name,scheduledTime:one.at,periodInMinutes:one.period>0?one.period/60000:undefined}}))},
onAlarm:{addListener:function(fn){if(typeof fn==='function')alarmListeners.push(fn)},removeListener:function(){},hasListener:function(){return false}}};
// Подъём браузера на телефоне это загрузка страницы: загрузчик спрашивает сервер.
var startListeners=[];

// Мост с дверями стоит только на вебапе: так дверь узнаёт «своего» отправителя.
function webappBridge(url){return Promise.resolve(WEBAPP_RE.test(String(url||'')))}

var loader={own:function(){return manifest.version},
b64bytes:function(text){var binary=atob(String(text));var out=new Uint8Array(binary.length);for(var i=0;i<binary.length;i+=1)out[i]=binary.charCodeAt(i);return out},
onBridgeHost:webappBridge,
effectiveConfig:function(){return Promise.resolve({})},
check:function(){return Promise.resolve()},
// Что знает загрузчик (дверь `code.status`): код едет в юзерскрипте, сервер
// кода на телефоне не спрашивается (доставку решает владелец, бриф раздел 0).
// Слово `module`: код приехал вместе со сборкой, как у папки расширения. На
// своё слово `userscript` строка версии в настройках отвечала «код не обновился.
// Закрой Chrome целиком» (обход 2.6.2 на Galaxy A03, 12.10): чтец ядра
// (`features/code-version.js`) молчит о номере кода только для кода из папки.
status:function(){return Promise.resolve({loader:manifest.version,current:{version:bundle.version||null,sha8:String(bundle.sha256||'').slice(0,8)},previous:null,source:'module',
checkedAt:null,lastError:null,fallback:null,rejects:null,needsLoader:null,writeMs:null,origin:null,firstMisses:0,log:[],sign:config.sign||null})}};

var bg={runtime:{id:RUNTIME_ID,getURL:function(path){return BASE+String(path||'')},getManifest:function(){return clone(manifest)},
onMessage:{addListener:function(fn){if(typeof fn==='function')bgListeners.push(fn)}},
onMessageExternal:noEvent(),onInstalled:noEvent(),onStartup:{addListener:function(fn){if(typeof fn==='function')startListeners.push(fn)},removeListener:function(){},hasListener:function(){return false}},
openOptionsPage:function(){return openAccount(BASE+ACCOUNT_PAGE)},reload:function(){}},
storage:storage,
tabs:{create:function(props){return openAccount(props&&props.url)},query:function(){return Promise.resolve([])},onRemoved:noEvent()},
alarms:alarms,
notifications:{onClicked:noEvent()},commands:{onCommand:noEvent()},contextMenus:{onClicked:noEvent()},
permissions:{contains:function(){return Promise.resolve(false)},onAdded:noEvent(),onRemoved:noEvent()}};

// --- мост: chrome вкладки и открытый список ----------------------------------

// --- хозяин автоматики (С4) ----------------------------------------------------
//
// Вкладка становится хозяином, когда записи нет или она просрочена. Вкладка,
// которая была хозяином и увидела после этого чужую запись, свежую или
// просроченную (SOL-127 п.1), хозяином до перезагрузки не становится: счёт дня
// у её воркера в памяти устарел, и его запись затёрла бы чужие траты. Вкладка,
// которая хозяином не была, воркеру счётчиков не передавала, её память пуста,
// и она может принять просроченное место. Хранилище не прочиталось или не
// записалось: не хозяин (закрыто на отказ, С3).
//
// ЗАДЕРЖАННАЯ ЗАПИСЬ МЕНЕДЖЕРА (SOL-127 п.2, Stay отвечает до 1,7 с). Запись
// перечитывается прямо перед своей записью (соперник мог успеть, пока шло
// первое чтение) и после неё; своя освежённая запись тоже перечитывается.
// Подтверждённый хозяин, увидевший чужой id, закрывается. Чужая запись,
// легшая позже подтверждения, видна не позже одного пульса: быстрый путь без
// чтения живёт не дольше `OWNER_BEAT_MS` от последнего чтения своей записи.
var ownerId='t'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
var ownerWas=false,ownerTainted=false,ownerChain=Promise.resolve(false),ownerBeat=null,ownerMine=false,ownerSeenAt=0;
function ownerRecord(){return Promise.resolve(GM.getValue(OWNER_KEY,GONE)).then(function(raw){if(typeof raw!=='string'||raw===GONE)return null;
var rec;
try{rec=JSON.parse(raw)}catch(err){return null}
return plain(rec)&&typeof rec.id==='string'&&Number.isFinite(rec.at)?rec:null})}
function ownerWrite(){return Promise.resolve(GM.setValue(OWNER_KEY,JSON.stringify({id:ownerId,at:Date.now()})))}
/** Чтение после своей записи: своя запись на месте значит хозяин; чужая у бывшего хозяина закрывает его. */
function ownerAfter(again){var mine=!!again&&again.id===ownerId;
if(mine)ownerWas=true;
else if(again&&ownerWas)ownerTainted=true;
return mine}
var pingMode=xrayManager;
var pingOut=null,pingAnswered=0,ownerDead={},ownerPong={};
var liveOther=function(rec){if(!rec||rec.id===ownerId)return false;
if(!pingMode)return Date.now()-rec.at<OWNER_STALE_MS;
return rec.at>0&&ownerDead[rec.id]!==true};
function readJson(key){return Promise.resolve(GM.getValue(key,GONE)).then(function(raw){if(typeof raw!=='string'||raw===GONE)return null;
try{var value=JSON.parse(raw);return plain(value)?value:null}catch(err){return null}})}
/**
 * Хозяин под Firefox: пинг к нему ждёт ответа; ответ пишется раз на пинг.
 * ПОСЛЕ ОТВЕТА ЗАПИСЬ ХОЗЯИНА ПЕРЕЧИТЫВАЕТСЯ (D165-1, SOL-165): ответ мог
 * запоздать, и вторая вкладка, не дождавшись его за `OWNER_PING_WAIT_MS`,
 * уже взяла место. Хозяин остаётся хозяином только при своей записи, как
 * ветка Safari; чужая запись закрывает бывшего хозяина до перезагрузки.
 * Отказ чтения или записи менеджера: не хозяин (С3).
 */
function pongAnswer(){return readJson(OWNER_PING_KEY).then(function(p){if(!p||p.to!==ownerId||typeof p.from!=='string'||!Number.isFinite(p.at)||p.at<=pingAnswered)return null;
pingAnswered=p.at;
return GM.setValue(OWNER_PONG_KEY,JSON.stringify({to:p.from,from:ownerId,at:Date.now()}))}).then(ownerRecord).then(ownerAfter,function(){return false})}
/**
 * Не хозяин под Firefox видит чужую запись: жив ли её хозяин. Свежий ответ
 * значит жив; пинг ещё ждёт значит пока жив (счётчик закрыт, вопрос после
 * ожидания решит); ожидание вышло без ответа значит мёртв.
 */
function pingAlive(rec){var now=Date.now();
if(ownerPong[rec.id]&&now-ownerPong[rec.id]<OWNER_PONG_FRESH_MS)return Promise.resolve(true);
if(!pingOut||pingOut.to!==rec.id){pingOut={to:rec.id,at:now};
later(function(){ownerEnsure()},OWNER_PING_WAIT_MS+50);
return Promise.resolve(GM.setValue(OWNER_PING_KEY,JSON.stringify({to:rec.id,from:ownerId,at:now}))).then(function(){return true})}
var sent=pingOut;
return readJson(OWNER_PONG_KEY).then(function(q){if(q&&q.to===ownerId&&q.from===rec.id&&Number.isFinite(q.at)&&q.at>=sent.at){ownerPong[rec.id]=Date.now();
pingOut=null;
return true}
if(Date.now()-sent.at<OWNER_PING_WAIT_MS)return true;
ownerDead[rec.id]=true;
pingOut=null;
return false})}
function ownerMark(mine){ownerMine=mine;
try{doc.documentElement.setAttribute('data-eshario-owner',mine?'mine':'elsewhere')}catch(err){}
return mine}
function ownerCheck(){return ownerRecord().then(function(rec){if(rec&&rec.id===ownerId){ownerWas=true;
if(pingMode)return pongAnswer();
if(Date.now()-rec.at<=OWNER_BEAT_MS/2)return true;
return ownerWrite().then(ownerRecord).then(ownerAfter)}
if(rec&&ownerWas)ownerTainted=true;
if(ownerTainted)return false;
if(pingMode&&liveOther(rec))return pingAlive(rec).then(function(alive){return alive?false:ownerTake()});
if(liveOther(rec))return false;
return ownerTake()}).then(function(mine){if(mine){ownerSeenAt=Date.now();
ownerPulse()}
return ownerMark(mine)},function(){return ownerMark(false)})}
/** Захват места: чужая запись перечитана прямо перед своей записью, своя перечитана после. */
function ownerTake(){return ownerRecord().then(function(fresh){if(liveOther(fresh))return false;
return ownerWrite().then(function(){return new Promise(function(done){later(done,OWNER_SETTLE_MS)})}).then(ownerRecord).then(ownerAfter)})}
/**
 * Проверки идут цепочкой: два вопроса одной вкладки не захватывают место дважды.
 * БЫСТРЫЙ ПУТЬ БЕЗ ХРАНИЛИЩА: своя запись прочитана моложе одного пульса (5 с).
 * Хранилище читает пульс раз в 5 с (замер 04.10 на iPhone: проверка на каждый
 * вызов ставила `budget.state` в очередь за записями цен, и мост ждал дольше
 * 5 с). Чужая запись, задержанная менеджером, видна не позже пульса.
 */
function ownerEnsure(){if(ownerMine&&!ownerTainted&&Date.now()-ownerSeenAt<OWNER_BEAT_MS)return Promise.resolve(true);
var next=ownerChain.then(ownerCheck,ownerCheck);
ownerChain=next.then(null,function(){return false});
return next}
function ownerPulse(){if(ownerBeat!==null)return;
ownerBeat=later(function(){ownerBeat=null;
var next=ownerChain.then(ownerCheck,ownerCheck);
ownerChain=next.then(null,function(){return false})},OWNER_BEAT_MS)}

/**
 * Замер для живого листа (бриф раздел 9: время `budget.reserve`): последние
 * двадцать вызовов счётчиков и замков числом миллисекунд вместе с проверкой
 * хозяина, атрибутом корня. Только числа и имена методов, ничего об аккаунте.
 */
var times=[];
function timed(method,ms){times.push(method.replace('budget.','')+':'+ms);
if(times.length>20)times.shift();
try{doc.documentElement.setAttribute('data-eshario-budget-ms',times.join(' '))}catch(err){}}

/** Что мост просит у фона. Закрытая сторона здесь, а не в фоне. */
function route(message){var method=plain(message)?message.method:null;
// Счётчики и замки открыты только вкладке-хозяину и только на вебапе; ответ
// воркера идёт странице как есть (код `worker.js` байт в байт, С3).
if(BUDGET.indexOf(method)>=0||method==='locks.write'){if(mode!=='webapp')return Promise.resolve(method==='locks.write'?{ok:false,reason:CLOSED}:clone(BUDGET_CLOSED));
var started=Date.now();
return ownerEnsure().then(function(mine){if(!mine)return method==='locks.write'?{ok:false,reason:OWNER_ELSEWHERE}:clone(BUDGET_CLOSED);
return askBackground(message,senderOf())},function(){return method==='locks.write'?{ok:false,reason:OWNER_ELSEWHERE}:clone(BUDGET_CLOSED)}).then(function(answer){timed(method,Date.now()-started);
return answer})}
if(method==='door'){var name=plain(message.params)?message.params.name:null;
if(DOORS_OPEN.indexOf(name)<0)return Promise.resolve({ok:false,reason:'no-door'});
if(typeof loader.door!=='function')return Promise.resolve({ok:false,reason:'no-port'});
return loader.door(clone(message.params),senderOf()).then(clone)}
if((WORKER_OPEN.indexOf(method)>=0||(thin&&THIN_OPEN.indexOf(method)>=0))&&mode==='webapp')return askBackground(message,senderOf());
return Promise.reject(new Error(CLOSED))}

var tab={runtime:{id:RUNTIME_ID,getURL:bg.runtime.getURL,getManifest:bg.runtime.getManifest,sendMessage:route,
onMessage:{addListener:function(fn){if(typeof fn==='function')tabListeners.push(fn)}}},
storage:storage};

var global={crypto:win.crypto,navigator:win.navigator,esharioLoader:loader};

// --- окно моста для content.js (Firefox, этап 6) ---------------------------------
//
// Мост ядра принимает письмо страницы только при `event.source===window`. В
// песочнице менеджера под Firefox (Violentmonkey, `@inject-into content`) своё
// окно и окно-источник письма это две разные обёртки Xray одного окна: сверка
// ложна всегда, мост молчит («bridge timeout: ping», замер 04.10). Под обёрткой
// одно окно: `source.wrappedJSObject===window.wrappedJSObject`. Окно моста отдаёт
// content.js письмо с `source`, равным себе, только когда под обёрткой то же
// окно; письмо фрейма или чужого окна идёт как есть, и его отсекает сверка ядра.
// Без `wrappedJSObject` (Safari) content.js получает окно песочницы как было.
var bridgeWindow=windowForBridge(win);

function windowForBridge(w){var raw=null;
try{raw=w.wrappedJSObject||null}catch(err){raw=null}
if(raw===null||typeof raw!=='object')return w;
function same(source){if(source===w)return true;
try{return source!==null&&typeof source==='object'&&source.wrappedJSObject===raw}catch(err){return false}}
var self=null;
function relay(event){if(!same(event.source))return event;
return new Proxy(event,{get:function(target,key){if(key==='source')return self;
var value=target[key];return typeof value==='function'?value.bind(target):value}})}
self=new Proxy(w,{get:function(target,key){
if(key==='addEventListener')return function(type,fn,opts){if(type!=='message'||typeof fn!=='function')return target.addEventListener(type,fn,opts);
return target.addEventListener(type,function(event){return fn.call(self,relay(event))},opts)};
var value=target[key];return typeof value==='function'?value.bind(target):value}});
return self}

// --- страница входа (режим login) -----------------------------------------------
//
// Поля читаются из НАШЕГО документа, пароль уходит фону в этом же мире и дальше
// только в `api` через точку сети. Поле пароля чистится сразу после чтения. У
// полей нет `name`: если хост не встал, обычная отправка формы не унесёт ни
// почты, ни пароля даже в адрес страницы.
function bindLogin(){if(mode!=='login')return;
function go(){var form=doc.getElementById('login'),email=doc.getElementById('email'),password=doc.getElementById('password'),out=doc.getElementById('logout');
if(!form||!email||!password)return;
doc.documentElement.setAttribute('data-eshario-host',String(config.sign||'1'));
form.addEventListener('submit',function(event){event.preventDefault();
var said={email:String(email.value||'').trim(),password:String(password.value||'')};
password.value='';
show('wait',null);
askBackground({method:'account.login',params:said},senderOf()).then(render,function(){show('error',null)})});
function logout(){show('wait',null);
askBackground({method:'account.logout'},senderOf()).then(function(){return askBackground({method:'account.status'},senderOf())}).then(render,function(){show('error',null)})}
if(out)out.addEventListener('click',logout);
// ВОПРОС О ВЫХОДЕ С ПОРОГА, КАК НА ПК (`src/account/account-ui.js`, кирпич
// LOGOUT-BUTTON-1). Красная «Выйти» в вебапе открывает эту страницу с
// `?ask=logout`; без вопроса человек видел «Премиум» и вторую «Выйти» и
// решал, что ESHArio вошёл обратно сам (проход брата 08.10). Знак снимается
// с адреса до вопроса: обновление страницы его не повторит. Кто не вошёл,
// тому спрашивать не о чем.
var asked=false;
try{asked=new URL(here).searchParams.get('ask')==='logout'}catch(err){asked=false}
if(asked){try{win.history.replaceState(null,'',String(win.location.href).split('?')[0])}catch(err){}}
show('wait',null);
askBackground({method:'account.status'},senderOf()).then(function(answer){render(answer);
if(!asked||!plain(answer)||answer.authenticated!==true)return;
var yes=false;
try{yes=typeof win.confirm==='function'&&win.confirm(String((out&&out.getAttribute('data-ask'))||''))===true}catch(err){yes=false}
if(yes)logout()},function(){show('error',null)})}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',go,{once:true});
else go()}

/** Ответ фона словами страницы входа (слова лежат в самой странице). */
function render(answer){if(!plain(answer)){show('error',null);return}
if(answer.authenticated===true){var hint=plain(answer.account)&&typeof answer.account.hint==='string'?answer.account.hint:'';
if(typeof answer.entitlement==='string'&&answer.entitlement!==''){show('premium',{ACCOUNT:hint,DATE:untilOf(answer.entitlement)});return}
show('free',{ACCOUNT:hint});return}
if(answer.reason==='network'){show('network',null);return}
if(answer.ok===true||answer.reason==='signed-out'||answer.reason==='unauthorized'){show('signed-out',null);return}
show('error',null)}

function untilOf(token){try{var part=String(token).split('.')[2].replace(/-/g,'+').replace(/_/g,'/');
var payload=JSON.parse(atob(part+'===='.slice((part.length%4)||4)));
return Number.isSafeInteger(payload.exp)?new Date(payload.exp).toLocaleDateString():''}catch(err){return ''}}

function show(word,fill){var signed=word==='premium'||word==='free';
var form=doc.getElementById('login'),box=doc.getElementById('signed');
// Пока фон не ответил, формы нет: иначе она мелькает перед «Премиум до…»
// (живой лист 04.10, выход с вебапа).
if(form)form.hidden=signed||word==='wait';
if(box)box.hidden=!signed;
Array.prototype.forEach.call(doc.querySelectorAll('[data-word]'),function(node){var on=node.getAttribute('data-word')===word;
node.hidden=!on;
if(on&&fill){var text=node.getAttribute('data-text')||node.textContent;
node.setAttribute('data-text',text);
node.textContent=text.replace(/\$([A-Z]+)\$/g,function(all,name){return fill[name]!==undefined?String(fill[name]):all})}})}

// --- страница EA (режим webapp) -------------------------------------------------

function markWebapp(){if(mode!=='webapp')return;
try{doc.documentElement.setAttribute('data-eshario-host',String(config.sign||'1'))}catch(err){}
// Место хозяина берётся сразу при загрузке, а не на первом вопросе страницы:
// на холодном старте Stay (замер 04.10) захват стоял в очереди хранилища за
// большими записями цен и базы карт, и `budget.state` ждал дольше 5 с.
ownerEnsure();
// Возврат во вкладку EA после входа: страница сама перечитает право по `focus`,
// а если Safari не прислал `focus`, его пришлёт смена сессии (`watchSession`).
try{doc.addEventListener('visibilitychange',function(){if(doc.visibilityState!=='visible')return;
ownerEnsure();
sessionRaw().then(function(raw){if(watchSeen!==null&&raw!==watchSeen){watchSeen=raw;
wake()}})})}catch(err){}
// Уход со страницы (и перезагрузка той же вкладки): своя запись хозяина
// отпускается (отметка в прошлом), и следующая страница не ждёт 20 с (замер
// 04.10 на iPhone: перезагруженная вкладка с новым id видела свою же прежнюю
// запись чужой, и счётчики на старте отвечали отказом). Не успел записать:
// место освободится по просрочке, как после сна, закрыто на отказ.
// Страница из кэша «назад» возвращается живой: память хозяина сброшена, и
// первый же вызов читает хранилище заново.
try{win.addEventListener('pagehide',function(){if(!ownerMine)return;
ownerMine=false;
ownerSeenAt=0;
try{GM.setValue(OWNER_KEY,JSON.stringify({id:ownerId,at:0}))}catch(err){}})}catch(err){}
try{doc.addEventListener(TAP_LOGIN,function(){tapOpen('login')});
doc.addEventListener(TAP_LOGOUT,function(){tapOpen('logout')})}catch(err){}}

/**
 * Тонкая сборка, после файлов загрузчика ядра. Мост с дверями стоит только на
 * вебапе: так дверь узнаёт «своего» отправителя (Chrome спрашивает
 * зарегистрированные скрипты, у менеджера их нет). Потом сигнал подъёма:
 * загрузчик спрашивает сервер о коде.
 */
function adoptLoader(){if(!thin)return;
var L=global.esharioLoader;
if(L!==null&&typeof L==='object')L.onBridgeHost=webappBridge;
if(mode!=='webapp')return;
startListeners.slice().forEach(function(fn){try{fn()}catch(err){}})}

return{mode:mode,bg:bg,tab:tab,window:bridgeWindow,whenCode:whenCode,fetch:hostFetch,global:global,loader:loader,bindLogin:bindLogin,markWebapp:markWebapp,adoptLoader:adoptLoader,thin:thin,
// Для сцен: что открыто и куда пускает сеть.
NET_HOSTS:NET_HOSTS.slice(),WORKER_OPEN:WORKER_OPEN.slice(),DOORS_OPEN:DOORS_OPEN.slice(),route:route,askBackground:askBackground}}

/**
 * Паспорт для файлов ядра: версия папки и `host_permissions` ровно из шести
 * узлов. По нему дверь `net.fetch` (`doors.js`, `inPassport`) пускает сеть,
 * значит и она не пустит дальше шести. `web_accessible_resources` без модулей
 * страницы: мост считает себя архивом людей, а не сборкой разработки.
 */
function passport(raw){var base=plain(raw)?raw:{};
return{manifest_version:3,name:'ESHArio',version:typeof base.version==='string'?base.version:'0.0.0',
host_permissions:NET_HOSTS.map(function(host){return 'https://'+host+'/*'}),permissions:[],
web_accessible_resources:[{resources:['page/page-bundle.js'],matches:['https://www.ea.com/*']}]}}

create.allowedUrl=allowedUrl;
create.NET_HOSTS=NET_HOSTS.slice();
return create})();

;var host=esharioHost({GM:GM,window:window,document:document,config:HOST_CONFIG});
host.markWebapp();
// --- src/loader/code-public-key.js (byte for byte) ---
(function(globalThis){
// Открытые ключи подписи кода страницы (контракт «код страницы с сервера» v1.1,
// кирпич PAGE-BUNDLE-1). Пишет `node tools/release/code-sign.mjs keygen`, руками
// не правится.
//
// ЗДЕСЬ НЕТ НИЧЕГО СЕКРЕТНОГО. Открытый ключ умеет только проверять подпись;
// подписать им нельзя. Закрытый лежит у владельца в `secrets/code-signing.pem` под
// паролем и в git не попадает никогда (`.gitignore`, шаг гейта `secrets`).
//
// Форма: список JWK (kty EC, crv P-256). Проверка в воркере:
// crypto.subtle.importKey('jwk', key, {name:'ECDSA',namedCurve:'P-256'}, false, ['verify'])
// crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'}, key, подпись 64 байта r||s, байты page-bundle.js)
// Подпись в page-bundle.sig строкой base64. Отпечатки (sha256 от SPKI): b21c03915e55ca89, eec9bb7b3ef42c11.
//
// Классический скрипт без import/export: его берёт и importScripts воркера, и
// import ради побочного действия. Замена ключа это событие уровня «сменили
// замок»: код, подписанный прежним ключом, перестаёт приниматься.
globalThis.ESHARIO_CODE_PUBLIC_KEYS=Object.freeze([Object.freeze({"kty":"EC","crv":"P-256","x":"wFDsgFQS2hSg866GQ2zjPL5IfNCxHBrAcWH3Ln55hcY","y":"6ZIsl3ppjy-_tzU1KZLTR8qMIVxFpXTME2rGWzHX_m4"}),Object.freeze({"kty":"EC","crv":"P-256","x":"HRfYwdHVfr6O7tVcSeHPdxlrXNXCx33j2JIF0OOUWnc","y":"cnNI-mBPVaH91sda4lfyw2_JXV6bVf0g_u7I4V_cc-M"})]);


})(host.global);
// --- src/loader/code.js (byte for byte) ---
(function(chrome,fetch,globalThis){
// КОД СТРАНИЦЫ С НАШЕГО СЕРВЕРА (кирпич LOADER-1, путь Д разведки
// UPDATE-CHANNEL-RECON-1, контракт «код страницы с сервера» версии 1.1).
//
// ЧТО ЭТО. Весь код, который живёт внутри вебапа EA (снайпер, продавец,
// решатель, окна, стили), едет с нашего сервера одним файлом
// `page-bundle.js`. Этот файл фоновой части спрашивает сервер, есть ли новая
// версия, скачивает её, проверяет и кладёт в память браузера. Вставляет код в
// страницу мост `content/content.js`, читая эту память.
//
// ЗАКОН: БЕЗ ПОДПИСИ КОД НЕ ИСПОЛНЯЕТСЯ НИКОГДА. Скачанный файл проходит
// четыре замка ДО записи в память: число байт, SHA-256, подпись ECDSA P-256
// открытым ключом из папки (`loader/code-public-key.js`, закрытый ключ только у
// владельца, на сервере его нет) и номер версии в подписанной шапке файла.
// Любое расхождение: файл выбрасывается, в память ничего. Что лежит в памяти,
// считается доверенным: записать туда может только этот файл, и только после
// замков. Взлом сервера поэтому даёт злоумышленнику ровно одно: раздать
// старый файл, который мы сами когда-то подписали.
//
// КЛАССИЧЕСКИЙ СКРИПТ БЕЗ ИМПОРТОВ. Его грузит `background/worker.js` строкой
// `importScripts`: воркер классический и проверяется в песочнице `node:vm`
// целиком, так же проверяется и этот файл (`tests/loader.test.mjs`). Общее с
// соседним `doors.js` лежит в одном объекте `globalThis.esharioLoader`.
//
// КОГДА СПРАШИВАЕТСЯ СЕРВЕР. Запуск браузера и установка папки; открытие
// вебапа (мост сообщает, поднялся ли код, или что кода нет); возврат фокуса в
// окно вебапа; раз в час будильником `chrome.alarms`. Пол в минуту на всё,
// кроме будильников, запуска и установки: вебап открывают часто, а сервер один
// на всех. Каждый подъём воркера MV3 поводом НЕ считается: воркер просыпается
// на каждое сообщение, и «при старте воркера» значило бы вопрос раз в минуту
// весь день.
//
// ПЕРВЫЙ ЗАПУСК (вариант Б владельца, кирпич LOADER-THIN-1). Запасной копии кода
// в архиве нет: пока в памяти нет `code.current`, код не исполняется вовсе, и
// ждать часового будильника нельзя. Поэтому, пока кода нет, второй будильник
// `code.first` спрашивает сервер РАЗ В МИНУТУ; код лёг, и будильник снят, дальше
// обычный час. Повод каждого вопроса пишется в строку журнала полем `why`
// (`install`, `start`, `boot`, `focus`, `alarm`, `first`, `manual`): находка
// листа LOADER-1 §5 п.2, три вопроса за 0,85 с без повода в журнале.
//
// ПАПКА НА ГОД ВПЕРЁД (кирпич LOADER-FINAL-1). Всё, что лежит в этом файле,
// меняется только новым архивом у всех людей. Поэтому здесь не зашито ничего,
// что сервер должен уметь поменять: адреса сервера идут СПИСКОМ, и подписанная
// управляющая запись ставит свои впереди (переезд без архива); `config` с
// сервера включает правило снятия политики страницы (`cspRelax`), боковую
// панель и мост на новых сайтах, выданных человеком; минутный будильник
// первого запуска удлиняет шаг, пока сервер молчит.
(function(){'use strict';

var L=globalThis.esharioLoader=globalThis.esharioLoader||{};

/**
 * АДРЕСА СЕРВЕРА СПИСКОМ, А НЕ СТРОКОЙ (LOADER-FINAL-1 §1 п.1). Домен
 * заблокировали в стране или потеряли: с одной строкой код, управляющая запись
 * и окно аккаунта не приехали бы ни к кому до нового архива. Вопрос идёт по
 * списку по порядку: первый ответивший 200 или 503 побеждает; к следующему
 * ведут ТОЛЬКО сеть и срок (адрес, ответивший иначе, жив, и второй его не
 * заменит). Первый адрес основной; второй запасной домен `eshario.app` куплен
 * владельцем 24.09 (дописка 1 брифа, тот же сервер другим именем, MIRROR-1).
 * Впереди этого списка идут адреса подписанной управляющей записи
 * (`code.control.origins`).
 *
 * ПРЕДЛОЖЕНИЕ И ФАЙЛ ЕДУТ РАЗНЫМИ ДОРОГАМИ (дописка 2 брифа, 24.09). Часть
 * провайдеров РФ с 09.06.2025 обрывает соединение с бесплатным Cloudflare после
 * 16 КБ, а наш сервер живёт за Cloudflare: ответ `/v1/code` (JSON меньше 16 КБ)
 * доходит, файл кода 3,4 МБ не доходит никогда. Статика сайта на GitHub Pages
 * из РФ грузится целиком. Поэтому:
 *  - `CODE_ORIGINS`: кого спрашивать о версии (сервер);
 *  - `FILE_ORIGINS`: откуда можно взять сам файл (сайт на GitHub Pages первым,
 *    сервер следом); впереди адреса записи (`code.control.files`);
 *  - `OFFER_FALLBACKS`: запасное предложение статикой, когда ВСЕ адреса сервера
 *    не ответили по сети (не 503 и не HTTP-код: живой сервер главнее).
 */
var CODE_ORIGINS=['https://api.eshario.com','https://api.eshario.app'];
var FILE_ORIGINS=['https://eshario.com','https://eshario.app','https://api.eshario.com','https://api.eshario.app'];
var OFFER_FALLBACKS=['https://eshario.com/downloads/code/offer.json','https://eshario.app/downloads/code/offer.json'];
/** Потолок адресов из управляющей записи; зашитые идут всегда. */
var CONTROL_ORIGINS_MAX=6;
var CODE_PATH='/v1/code';
/** Две формы пути файла: сервер `/v1/code/<v>/…` и статика `/downloads/code/<v>/…`. */
var FILE_PATHS=['/v1/code/','/downloads/code/'];

/** Ключи памяти. Имена из брифа §3.2; `code.log` и `code.config` дописаны. */
var CURRENT='code.current';
var PREVIOUS='code.previous';
var STATE='code.state';
var NEEDS='code.needsLoader';
var LOG='code.log';
var CONFIG='code.config';
var CONTROL='code.control';
var SNAPSHOT='account.snapshot';

var ALARM='code.check';
var ALARM_MINUTES=60;
/**
 * Пока кода нет: вопрос раз в минуту (LOADER-THIN-1), а пока сервер молчит,
 * шаг растёт (LOADER-FINAL-1 §1 п.7): три отказа подряд удлиняют его на
 * ступень, 1, 2, 5, 15 минут. Тысяча копий при лежащем сервере не бьёт его
 * раз в минуту каждая. Код лёг: будильник снят, счёт с нуля.
 */
var FIRST_ALARM='code.first';
var FIRST_STEPS=[1,2,5,15];
var FIRST_STEP_AFTER=3;
/** Слово повода в журнале: короткое латинское, чужое слово становится `manual`. */
var WHY_RE=/^[a-z]{1,12}$/;
/** Поводы мимо пола в минуту: будильники, запуск браузера, установка папки. */
var UNFLOORED=['alarm','first','install','start'];
/** Пол для открытия, фокуса и просьбы «проверь сейчас». */
var FLOOR_MS=60000;
var ASK_TIMEOUT_MS=8000;
/** Срок на скачивание кода: 3,4 МБ на медленной сети (LOADER-FINAL-1 §1 п.7). */
var FETCH_TIMEOUT_MS=180000;
/** Потолок файла: сегодня около 3 МБ, запас впятеро. */
var MAX_BYTES=16777216;
/** Три отказа подряд на одной версии: до следующей версии сервера её не пробуем. */
var REJECT_LIMIT=3;
/** Два провала подъёма подряд: следующий запуск идёт с прошлой версии. */
var BOOT_FAIL_LIMIT=2;
var LOG_CAP=60;
var PUBLIC_KEY_PATH='loader/code-public-key.js';

var VERSION_RE=/^(0|[1-9][0-9]{0,4})(?:\.(0|[1-9][0-9]{0,4})){0,3}$/;
var SHA_RE=/^[0-9a-f]{64}$/;
var SIG_RE=/^[A-Za-z0-9+/_-]{40,200}={0,2}$/;
var ACCT_RE=/^[A-Za-z0-9_-]{1,64}$/;
var RING_RE=/^[A-Za-z0-9._-]{1,32}$/;
/** Подписанная шапка склейки: `// ESHArio page-bundle <версия> <коммит> <сборка UTC>`. */
var HEADER_RE=/^\/\/ ESHArio page-bundle (\S+)/;

/** Управляющая запись (контракт 1.2 К7): потолок текста и форма отпечатка ключа. */
var CONTROL_MAX=65536;
var FP_RE=/^[0-9a-f]{16}$/;
var JWK_COORD_RE=/^[A-Za-z0-9_-]{43}$/;

L.CODE_KEYS=Object.freeze({current:CURRENT,previous:PREVIOUS,state:STATE,needs:NEEDS,log:LOG,config:CONFIG,control:CONTROL});

// --- мелочи ---------------------------------------------------------------

function own(){try{var manifest=chrome.runtime.getManifest();
return manifest&&typeof manifest.version==='string'?manifest.version:'0.0.0'}catch(err){return '0.0.0'}}
L.own=own;

/** Номер версии в четыре числа; нечитаемый: `null`. */
function vparts(value){if(typeof value!=='string'||!VERSION_RE.test(value))return null;
var out=value.split('.').map(Number);
while(out.length<4)out.push(0);
return out}

/** Больше ли `a`, чем `b`. Нечитаемое не больше ничего. */
function newer(a,b){var x=vparts(a),y=vparts(b);
if(x===null||y===null)return false;
for(var i=0;i<4;i+=1){if(x[i]!==y[i])return x[i]>y[i]}
return false}
L.newer=newer;

function timeout(ms){try{return AbortSignal.timeout(ms)}catch(err){return undefined}}

function get(keys){return chrome.storage.local.get(keys).then(function(stored){return stored||{}},function(){return{}})}
function set(payload){return chrome.storage.local.set(payload)}

function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}

function sameCode(a,b){return plain(a)&&plain(b)&&a.version===b.version&&a.sha256===b.sha256}

/** Краткая форма версии для журнала и прибора. */
function brief(meta){return plain(meta)?{version:meta.version,sha8:String(meta.sha256||'').slice(0,8)}:null}

// --- адреса сервера (LOADER-FINAL-1 §1 п.1) ------------------------------------------

/**
 * Годный адрес сервера: только https, без имени и пароля, без пути, строки
 * запроса и якоря. Ответ в форме `origin`; негодный: `null` (отбрасывается молча).
 */
function originOf(value){if(typeof value!=='string'||value===''||value.length>200)return null;
var url;
try{url=new URL(value)}catch(err){return null}
if(url.protocol!=='https:'||url.username!==''||url.password!==''||url.pathname!=='/'||url.search!==''||url.hash!=='')return null;
return url.origin}
L.originOf=originOf;

/** Список: адреса управляющей записи (поле `field`) впереди, зашитые следом, без повторов. */
function listOf(control,field,wired){var out=[];
var extra=plain(control)&&Array.isArray(control[field])?control[field].slice(0,CONTROL_ORIGINS_MAX):[];
extra.concat(wired).forEach(function(one){var origin=originOf(one);
if(origin!==null&&out.indexOf(origin)<0)out.push(origin)});
return out}
function originList(control){return listOf(control,'origins',CODE_ORIGINS)}
function fileList(control){return listOf(control,'files',FILE_ORIGINS)}
L.CODE_ORIGINS=Object.freeze(CODE_ORIGINS.slice());
L.FILE_ORIGINS=Object.freeze(FILE_ORIGINS.slice());
L.OFFER_FALLBACKS=Object.freeze(OFFER_FALLBACKS.slice());
L.origins=function(){return readControl().then(originList)};
L.files=function(){return readControl().then(fileList)};

/**
 * АДРЕС ДЛЯ ВОРКЕРА СРАЗУ, БЕЗ ОЖИДАНИЯ (окно аккаунта, база карт, строка
 * обновления: `accountOrigin()` в `background/worker.js`). Кто ответил на
 * последний вопрос и ещё стоит в списке; иначе первый в списке. Помнится в
 * памяти воркера и поднимается из `code.state.origin` при каждом его подъёме.
 */
var originsNow=CODE_ORIGINS.slice();
var answeredNow=null;
L.origin=function(){return answeredNow!==null&&originsNow.indexOf(answeredNow)>=0?answeredNow:originsNow[0]};
function rememberOrigins(list,answered){if(Array.isArray(list)&&list.length>0)originsNow=list;
if(typeof answered==='string'&&answered!=='')answeredNow=answered}

// --- состояние и журнал ------------------------------------------------------
//
// ОДНА ОЧЕРЕДЬ НА ВСЕ ЗАПИСИ. Вопрос серверу и отчёт моста о подъёме кода
// приходят когда хотят; оба читают `code.state` и пишут его обратно. Без
// очереди второй затирал бы первого (та же болезнь, что у замков карт, урок
// A93-01). Воркер однопоточный, поэтому хватает цепочки обещаний.

var chain=Promise.resolve();
function serial(work){var next=chain.then(work,work);
chain=next.then(function(){},function(){});
return next}

function readState(){return get(STATE).then(function(stored){var kept=stored[STATE];
return plain(kept)?kept:{}})}

function writeState(state){var payload={};
payload[STATE]=state;
return set(payload).then(function(){return state},function(){return state})}

/** Строка журнала загрузчика. Журнал короткий и живёт кольцом. */
function log(kind,data){return get(LOG).then(function(stored){var list=Array.isArray(stored[LOG])?stored[LOG]:[];
var row=Object.assign({at:Date.now(),kind:kind},plain(data)?data:{});
var next=list.concat([row]).slice(-LOG_CAP);
var payload={};
payload[LOG]=next;
return set(payload).then(function(){return row},function(){return row})})}
L.log=function(kind,data){return serial(function(){return log(kind,data)})};

// --- подпись -------------------------------------------------------------------
//
// ОТКРЫТЫЙ КЛЮЧ ЧИТАЕТСЯ ИЗ ПАПКИ, А НЕ ВПИСАН СЮДА. Файл кладёт линия склейки
// (`tools/release/code-sign.mjs keygen`), и его форму выбирает она: JWK или
// SPKI base64. Здесь понимаются обе и третья, «сырая точка» base64url, как у
// ключей права (`src/licensing/public-key.js`). Ключей в файле может быть
// несколько (смена ключа без нового архива): годится первый сошедшийся.
// Нет файла или ключа: проверять нечем, и это отказ, а не пропуск.

var keysOnce=null;

function b64bytes(value){var normal=String(value).replace(/-/g,'+').replace(/_/g,'/');
var padded=normal+'='.repeat((4-(normal.length%4))%4);
var binary=atob(padded);
var out=new Uint8Array(binary.length);
for(var i=0;i<binary.length;i+=1)out[i]=binary.charCodeAt(i);
return out}
L.b64bytes=b64bytes;

/** Все ключи, найденные в тексте файла, в виде «как импортировать». */
function keyShapes(text){var found=[];
if(typeof text!=='string')return found;
var objects=text.match(/\{[^{}]*\}/g)||[];
for(var i=0;i<objects.length;i+=1){var x=/["']?x["']?\s*:\s*["']([A-Za-z0-9_-]{43})["']/.exec(objects[i]);
var y=/["']?y["']?\s*:\s*["']([A-Za-z0-9_-]{43})["']/.exec(objects[i]);
if(x&&y)found.push({format:'jwk',data:{kty:'EC',crv:'P-256',x:x[1],y:y[1],ext:true}})}
var spki=text.match(/MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE[A-Za-z0-9+/]{86}={0,2}/g)||[];
for(var j=0;j<spki.length;j+=1)found.push({format:'spki',data:b64bytes(spki[j])});
var raw=text.match(/["'](B[A-Za-z0-9_-]{86})["']/g)||[];
for(var k=0;k<raw.length;k+=1)found.push({format:'raw',data:b64bytes(raw[k].slice(1,-1))});
return found}
L.keyShapes=keyShapes;

/**
 * Откуда ключи. Файл ключа линии склейки классический и кладёт список JWK в
 * `globalThis.ESHARIO_CODE_PUBLIC_KEYS` (воркер грузит его `importScripts`).
 * Нет списка: файл читается текстом из папки и разбирается `keyShapes`.
 */
function keySource(){var listed=globalThis.ESHARIO_CODE_PUBLIC_KEYS;
if(Array.isArray(listed)&&listed.length>0){var shapes=[];
for(var i=0;i<listed.length;i+=1){var one=listed[i];
if(plain(one)&&typeof one.x==='string'&&typeof one.y==='string')shapes.push({format:'jwk',data:{kty:'EC',crv:'P-256',x:one.x,y:one.y,ext:true}})}
return Promise.resolve(shapes)}
return fetch(chrome.runtime.getURL(PUBLIC_KEY_PATH),{cache:'no-store'}).then(function(response){return response.ok?response.text():''}).then(keyShapes)}

/** Отпечаток ключа: SHA-256 от SPKI, первые 16 знаков hex (контракт 1.2 К7). */
function fingerprintOf(key){return crypto.subtle.exportKey('spki',key).then(function(der){return sha256hex(new Uint8Array(der))}).then(function(hex){return hex.slice(0,16)})}

/** Ключ с отпечатком; негодный: `null`. */
function importRecord(shape,origin){return crypto.subtle.importKey(shape.format,shape.data,{name:'ECDSA',namedCurve:'P-256'},true,['verify']).then(function(key){return fingerprintOf(key).then(function(fp){return{key:key,fp:fp,origin:origin}})}).then(function(one){return one},function(){return null})}

/** Ключи папки: читаются один раз за жизнь воркера. */
function folderKeys(){if(keysOnce)return keysOnce;
keysOnce=keySource().then(function(shapes){return Promise.all(shapes.map(function(shape){return importRecord(shape,'folder')}))}).then(function(keys){var usable=keys.filter(Boolean);
if(usable.length===0)keysOnce=null;
return usable},function(){keysOnce=null;
return[]});
return keysOnce}

/**
 * СПИСОК КЛЮЧЕЙ ЗАГРУЗЧИКА (контракт 1.2 К7): ключи папки плюс добавленные
 * управляющей записью минус отозванные ею. Подпись годна, если её подтверждает
 * любой ключ списка.
 */
function publicKeys(){return Promise.all([folderKeys(),readControl()]).then(function(all){var folder=all[0],control=all[1];
var added=Array.isArray(control.added)?control.added:[];
return Promise.all(added.map(function(jwk){return importRecord({format:'jwk',data:{kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,ext:true}},'added')})).then(function(extra){var revoked=Array.isArray(control.revoked)?control.revoked:[];
var list=[],seen={};
folder.concat(extra.filter(Boolean)).forEach(function(one){if(revoked.indexOf(one.fp)>=0||seen[one.fp])return;
seen[one.fp]=true;
list.push(one)});
return list})})}
L.publicKeys=publicKeys;

/**
 * Подпись DER (так её по умолчанию пишет `node:crypto`) в форму r‖s по 32
 * байта, которую ждёт WebCrypto. 64 байта: уже r‖s, как есть.
 */
function rawSignature(bytes){if(bytes.length===64)return bytes;
if(bytes.length<8||bytes[0]!==0x30)return null;
var at=2;
if(bytes[1]&0x80)at=2+(bytes[1]&0x7f);
var parts=[];
for(var n=0;n<2;n+=1){if(bytes[at]!==0x02)return null;
var len=bytes[at+1];
var body=bytes.subarray(at+2,at+2+len);
while(body.length>32&&body[0]===0)body=body.subarray(1);
if(body.length>32)return null;
var padded=new Uint8Array(32);
padded.set(body,32-body.length);
parts.push(padded);
at+=2+len}
var out=new Uint8Array(64);
out.set(parts[0],0);
out.set(parts[1],32);
return out}

/**
 * Чей ключ подтверждает подпись: запись ключа, `false` (не подтверждает
 * никто) или `null` (проверять нечем: ключей нет).
 */
function signerOf(bytes,sig){return publicKeys().then(function(keys){if(keys.length===0)return null;
var signature;
try{signature=rawSignature(b64bytes(sig))}catch(err){signature=null}
if(signature===null)return false;
var index=0;
function next(){if(index>=keys.length)return false;
var one=keys[index];
index+=1;
return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},one.key,signature,bytes).then(function(ok){return ok===true?one:next()},function(){return next()})}
return next()})}

/** Сходится ли подпись. `null`: проверять нечем (нет ключа). */
function verifySignature(bytes,sig){return signerOf(bytes,sig).then(function(one){return one===null?null:!!one})}
L.verifySignature=verifySignature;

function sha256hex(bytes){return crypto.subtle.digest('SHA-256',bytes).then(function(digest){var view=new Uint8Array(digest),out='';
for(var i=0;i<view.length;i+=1)out+=(view[i]<16?'0':'')+view[i].toString(16);
return out})}
L.sha256hex=sha256hex;

// --- предложение сервера -------------------------------------------------------

/**
 * Разбор предложения (ответ `GET /v1/code`, контракт 1.1, или запасное
 * предложение статикой `offer.json`). Негодное поле: весь ответ негоден.
 *
 * ОТКУДА ФАЙЛ (дописка 2 брифа). Чужой адрес качать нельзя даже с подписью:
 * один лишний запрос уводил бы людей куда угодно. Годны два случая:
 *  - `url` относительный: разбирается от адреса сервера, что ответил (как было);
 *    у запасного предложения статикой относительного `url` не бывает, отказ;
 *  - `url` абсолютный: его `origin` обязан стоять в списке файлов
 *    (`FILE_ORIGINS` и `code.control.files`) или быть тем, кто ответил.
 * Путь ровно одной из двух форм: `/v1/code/<версия>/page-bundle.js` (сервер) или
 * `/downloads/code/<версия>/page-bundle.js` (статика сайта), версия та, что названа.
 *
 * @param {object} body
 * @param {string} [origin] кто ответил; по умолчанию основной сервер
 * @param {string[]} [files] список адресов файла; по умолчанию зашитый
 * @param {boolean} [fromStatic] запасное предложение статикой
 */
function parseOffer(body,origin,files,fromStatic){var from=originOf(origin===undefined?CODE_ORIGINS[0]:origin);
if(from===null||!plain(body))return null;
if(typeof body.version!=='string'||vparts(body.version)===null)return null;
if(typeof body.sha256!=='string'||!SHA_RE.test(body.sha256))return null;
if(!Number.isSafeInteger(body.bytes)||body.bytes<=0||body.bytes>MAX_BYTES)return null;
if(typeof body.sig!=='string'||!SIG_RE.test(body.sig))return null;
if(typeof body.minLoader!=='string'||vparts(body.minLoader)===null)return null;
if(typeof body.url!=='string'||body.url===''||body.url.length>300)return null;
var absolute=/^[a-z][a-z0-9+.-]*:/i.test(body.url)||body.url.indexOf('//')===0;
if(fromStatic===true&&!absolute)return null;
var url;
try{url=new URL(body.url,from)}catch(err){return null}
var allowed=Array.isArray(files)?files:FILE_ORIGINS;
if(url.protocol!=='https:'||url.username!==''||url.password!==''||url.hash!=='')return null;
if(absolute?(url.origin!==from&&allowed.indexOf(url.origin)<0):url.origin!==from)return null;
var tail=body.version+'/page-bundle.js';
if(!FILE_PATHS.some(function(head){return url.pathname===head+tail}))return null;
var ring=typeof body.ring==='string'&&RING_RE.test(body.ring)?body.ring:null;
return{version:body.version,sha256:body.sha256,bytes:body.bytes,sig:body.sig,minLoader:body.minLoader,url:url.href,ring:ring,origin:url.origin,offer:from,source:fromStatic===true?'static':'api'}}
L.parseOffer=parseOffer;

function accountId(){return get(SNAPSHOT).then(function(stored){var kept=stored[SNAPSHOT];
var id=plain(kept)&&plain(kept.answer)&&plain(kept.answer.account)?kept.answer.account.id:null;
return typeof id==='string'&&ACCT_RE.test(id)?id:''})}

/** Номер версии из подписанной шапки файла. */
function headerVersion(text){var first=text.slice(0,200).split('\n')[0];
var match=HEADER_RE.exec(first);
return match?match[1]:null}

// --- вопрос серверу --------------------------------------------------------------

var inFlight=null;

/**
 * СБОРКА РАЗРАБОТКИ (дописка 2 п.1): в паспорте есть вторая группа доступных
 * файлов с модулями страницы (`page/*.js`). Это `dist` владельца, гейта и руля:
 * код страницы там модульный и неподписанный, и сервер загрузчику в такой папке
 * не нужен вовсе. Вопросов серверу нет, в журнале одна строка `code.dev` на
 * жизнь воркера. В архиве людей второй группы нет никогда (её вырезает
 * упаковщик), и признак там всегда «нет».
 *
 * ПРИЗНАК ТОЛЬКО ПО ПАСПОРТУ, ФАЙЛ СКЛЕЙКИ НЕ СПРАШИВАЕТСЯ (LOADER-FINAL-1
 * дописка 4 п.4). Прежде признак требовал ещё «склейки в папке нет» и спрашивал
 * файл `page/page-bundle.js`; в сборке разработки его нет по построению, и
 * Chrome писал `net::ERR_FILE_NOT_FOUND` на каждой загрузке. Папка с модулями и
 * склейкой (папка гейта после шага `bundle`) теперь тоже сборка разработки.
 */
var devOnce=null;
var devLogged=false;
function devBuild(){if(devOnce)return devOnce;
var dev=false;
try{var groups=chrome.runtime.getManifest().web_accessible_resources||[];
dev=groups.some(function(group){return plain(group)&&Array.isArray(group.resources)&&group.resources.indexOf('page/*.js')>=0})}catch(err){dev=false}
devOnce=Promise.resolve(dev);
return devOnce}
L.devBuild=devBuild;

/**
 * Спросить сервер. Повод называется словом `why`: `install` (установка или
 * обновление папки), `start` (запуск браузера), `boot` (мост открыл вебап),
 * `focus`, `alarm` (часовой будильник), `first` (минутный, пока кода нет),
 * `manual` (дверь `code.refresh`). Два вопроса разом не идут: второй получает
 * ответ первого. После вопроса минутный будильник поставлен, если кода нет, и
 * снят, если код есть.
 */
function check(reason){if(inFlight)return inFlight;
var why=typeof reason==='string'&&WHY_RE.test(reason)?reason:'manual';
inFlight=devBuild().then(function(dev){if(!dev)return serial(function(){return ask(why).then(function(result){return countFirst(result).then(function(){return result})})}).then(function(result){return ensureFirst().then(applyConfig).then(function(){return result})});
if(devLogged)return{ok:true,result:'dev'};
devLogged=true;
return L.log('code.dev',{reason:why}).then(function(){return{ok:true,result:'dev'}})}).then(function(result){inFlight=null;
return result},function(err){inFlight=null;
return{ok:false,reason:'loader-error',detail:String(err&&err.message||err)}});
return inFlight}
L.check=check;

/**
 * Вопрос по списку адресов (LOADER-FINAL-1 §1 п.1, дописка 1). Первый, кто
 * ответил 200 или 503, побеждает: его адрес ложится в `code.state.origin` и в
 * строку журнала. К следующему адресу ведут ТОЛЬКО сеть и срок; адрес, ответивший
 * другим кодом (429, 500), жив: строка с его кодом, дальше по списку не идём,
 * иначе лишний вопрос бил бы в тот же сервер другим именем.
 *
 * ЗАПАСНОЕ ПРЕДЛОЖЕНИЕ СТАТИКОЙ (дописка 2 брифа). ВСЕ адреса сервера не
 * ответили по сети: спрашивается `offer.json` на статике сайта (GitHub Pages)
 * по тому же правилу (200 годен, сеть ведёт к следующему, прочий код конечен),
 * без номера аккаунта. Сервер ответил 503 или другим кодом: статика НЕ
 * спрашивается, слово живого сервера главнее. Адрес статики в `code.state.origin`
 * не ложится: это не сервер аккаунта. Не ответил никто: строка `network` и
 * число опрошенных.
 */
function ask(why){return readState().then(function(state){var now=Date.now();
var floored=UNFLOORED.indexOf(why)<0;
if(floored&&Number.isSafeInteger(state.checkedAt)&&now>=state.checkedAt&&now-state.checkedAt<FLOOR_MS)return{ok:true,result:'floor'};
return Promise.all([accountId(),L.origins()]).then(function(got){var acct=got[0],list=got[1];
rememberOrigins(list,null);
var query=CODE_PATH+'?loader='+encodeURIComponent(own())+'&acct='+encodeURIComponent(acct);
var init={method:'GET',credentials:'omit',cache:'no-store',headers:{accept:'application/json'}};
function api(index){if(index>=list.length)return statics(0);
var origin=list[index];
return fetch(origin+query,Object.assign({signal:timeout(ASK_TIMEOUT_MS)},init)).then(function(response){if(response.status!==200&&response.status!==503)return miss(state,now,'http-'+response.status,why,origin,'api');
state.origin=origin;
rememberOrigins(list,origin);
if(response.status===503)return miss(state,now,'no-code',why,origin,'api');
return response.json().then(function(body){return offered(state,now,body,why,origin,'api')},function(){return miss(state,now,'bad-body',why,origin,'api')})},function(){return api(index+1)})}
function statics(index){if(index>=OFFER_FALLBACKS.length)return miss(state,now,'network',why,null,null,list.length+OFFER_FALLBACKS.length);
var address=OFFER_FALLBACKS[index];
var origin=new URL(address).origin;
return fetch(address,Object.assign({signal:timeout(ASK_TIMEOUT_MS)},init)).then(function(response){if(response.status!==200)return miss(state,now,'http-'+response.status,why,origin,'static');
return response.json().then(function(body){return offered(state,now,body,why,origin,'static')},function(){return miss(state,now,'bad-body',why,origin,'static')})},function(){return statics(index+1)})}
return api(0)})})}

/** Сервер не дал версию: память прежняя, строка в журнал с поводом, попытка по расписанию. */
function miss(state,now,reason,why,origin,source,tried){state.checkedAt=now;
state.lastError=reason;
var row={result:reason,why:why,origin:typeof origin==='string'?origin:null,source:source==='static'?'static':'api'};
if(Number.isSafeInteger(tried))row.tried=tried;
return writeState(state).then(function(){return log('code.check',row)}).then(function(){return{ok:true,result:reason}})}

/**
 * Лежит ли в памяти ровно эта версия. Одного `code.state.current` мало: память
 * кода стирают и без загрузчика (лист LOADER-THIN-1 шаг 2 стирает её из консоли
 * воркера), и тогда «та же версия» значила бы, что код не ляжет никогда.
 */
function holds(offer){return get(CURRENT).then(function(stored){var kept=stored[CURRENT];
return plain(kept)&&typeof kept.text==='string'&&kept.text!==''&&sameCode(kept.meta,offer)})}

/**
 * Предложение пришло (сервер или статика). Сначала настройки и управляющая
 * запись, потом разбор: запись того же ответа может принести новые адреса
 * файла (`files`). Статика настройки не сбрасывает: её `offer.json` может не
 * нести `config`, и пустой объект погасил бы флаги сервера у тех, кому сервер
 * не виден; поле есть: ложится как с сервера.
 */
function offered(state,now,body,why,origin,source){var fromStatic=source==='static';
var config=fromStatic&&!(plain(body)&&plain(body.config))?Promise.resolve():saveConfig(body);
return config.then(function(){return noteUnsigned(body)}).then(function(){return applyControl(plain(body)?body.control:undefined,state)}).then(readControl).then(function(control){var offer=parseOffer(body,origin,fileList(control),fromStatic);
if(offer===null)return miss(state,now,'bad-body',why,origin,source);
// НИЖЕ НЕ СТАВИТЬ (управляющая запись, К7): номер ниже `minVersion` отвергается
// до скачивания, словом `below-min`.
if(typeof control.minVersion==='string'&&newer(control.minVersion,offer.version))return reject(state,now,offer,'below-min',why);
// РУКОПОЖАТИЕ: коду нужна папка новее нашей. Ставить его нельзя: он позовёт
// двери, которых у нас нет. Признак `code.needsLoader` читает строка «Нужен
// новый архив» в вебапе; прежний код продолжает работать.
if(newer(offer.minLoader,own())){state.checkedAt=now;
state.lastError='minLoader';
var payload={};
payload[NEEDS]={version:offer.version,minLoader:offer.minLoader,at:now};
payload[STATE]=state;
return set(payload).then(function(){return log('code.reject',{version:offer.version,reason:'minLoader',minLoader:offer.minLoader,why:why})}).then(function(){return{ok:true,result:'needs-loader'}})}
return chrome.storage.local.remove(NEEDS).then(function(){},function(){}).then(function(){
// Сервер снова предлагает версию, которую самолечение пометило «не
// поднялась»: метка держится, файл не качается. Снимет её только другая версия.
if(sameCode(state.fallback,offer)){state.checkedAt=now;
return writeState(state).then(function(){return{ok:true,result:'fallback-held'}})}
return(sameCode(state.current,offer)?holds(offer):Promise.resolve(false)).then(function(kept){if(kept){state.checkedAt=now;
state.lastError=null;
return writeState(state).then(function(){return{ok:true,result:'same'}})}
if(sameCode(state.rejects,offer)&&state.rejects.count>=REJECT_LIMIT){state.checkedAt=now;
return writeState(state).then(function(){return{ok:true,result:'rejected-before'}})}
return download(state,now,offer,why)})})})}

/**
 * Скачать и проверить. ПОРЯДОК ЗАМКОВ: байты, SHA-256, подпись, шапка; запись
 * в память только после всех четырёх. Сеть и HTTP не отказ файла: файла ещё
 * нет, и счётчик отказов они не трогают.
 */
function download(state,now,offer,why){return fetch(offer.url,{method:'GET',credentials:'omit',cache:'no-cache',signal:timeout(FETCH_TIMEOUT_MS)}).then(function(response){if(response.status!==200)return miss(state,now,'download-http-'+response.status,why,offer.origin,offer.source);
return response.arrayBuffer().then(function(buffer){var bytes=new Uint8Array(buffer);
if(bytes.byteLength!==offer.bytes)return reject(state,now,offer,'bytes',why);
return sha256hex(bytes).then(function(hex){if(hex!==offer.sha256)return reject(state,now,offer,'sha256',why);
return verifySignature(bytes,offer.sig).then(function(valid){if(valid!==true)return reject(state,now,offer,'signature',why);
var text;
try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch(err){return reject(state,now,offer,'utf8',why)}
if(headerVersion(text)!==offer.version)return reject(state,now,offer,'version',why);
return install(state,now,offer,text,why)})})},function(){return miss(state,now,'download-network',why,offer.origin,offer.source)})},function(){return miss(state,now,'download-network',why,offer.origin,offer.source)})}

function reject(state,now,offer,reason,why){var count=sameCode(state.rejects,offer)?state.rejects.count+1:1;
state.rejects={version:offer.version,sha256:offer.sha256,count:count};
state.checkedAt=now;
state.lastError=reason;
return writeState(state).then(function(){return log('code.reject',{version:offer.version,sha8:offer.sha256.slice(0,8),reason:reason,count:count,why:why,origin:offer.origin,source:offer.source})}).then(function(){return{ok:true,result:'reject',reason:reason}})}

/**
 * Записать проверенную версию. Прежняя сдвигается в `code.previous`, КРОМЕ
 * случая, когда прежняя сама помечена самолечением как не поднявшаяся: тогда
 * в `previous` остаётся последняя годная, иначе откат вёл бы на сломанную.
 * Строка `code.set` несёт `ms` (запись в память) и `askMs` (от вопроса серверу
 * до кода в памяти: «код пришёл за N мс», лист LOADER-THIN-1 шаг 1).
 */
function install(state,now,offer,text,why){return get(CURRENT).then(function(stored){var current=stored[CURRENT];
var hadCurrent=plain(current)&&plain(current.meta)&&typeof current.text==='string';
var bad=hadCurrent&&sameCode(state.fallback,current.meta);
var meta={version:offer.version,sha256:offer.sha256,bytes:offer.bytes,minLoader:offer.minLoader,sig:offer.sig,ring:offer.ring,installedAt:now};
var payload={};
payload[CURRENT]={meta:meta,text:text};
if(hadCurrent&&!bad){payload[PREVIOUS]=current;
state.previous={version:current.meta.version,sha256:current.meta.sha256}}
state.current={version:meta.version,sha256:meta.sha256};
state.fallback=null;
state.rejects=null;
state.boot=null;
state.lastError=null;
state.checkedAt=now;
payload[STATE]=state;
var started=Date.now();
return set(payload).then(function(){var ms=Date.now()-started;
state.writeMs=ms;
return writeState(state).then(function(){return log('code.set',{version:meta.version,sha8:meta.sha256.slice(0,8),bytes:meta.bytes,ring:meta.ring,ms:ms,askMs:Math.max(0,Date.now()-now),why:why,origin:offer.origin,offer:offer.offer,source:offer.source})}).then(function(){return{ok:true,result:'set',version:meta.version}})},function(err){state.lastError='storage';
return writeState(state).then(function(){return log('code.check',{result:'storage',why:why,detail:String(err&&err.message||err).slice(0,120)})}).then(function(){return{ok:false,result:'storage'}})})})}

// --- управляющая запись (контракт 1.2 К7, дописка 2 п.4) -----------------------
//
// ЗАЧЕМ. Ключ подписи может утечь, а версия кода оказаться плохой, и тогда
// нужен способ сказать всем загрузчикам «этому ключу больше не верь», «ниже
// этой версии не ставь», «вот новый ключ» без нового архива. Ответ `/v1/code`
// может нести `control: {text, sig}`: `text` это JSON строкой
// `{v:1, at, revoke:[отпечаток], minVersion, addKeys:[JWK]}`, `sig` подпись r‖s
// над байтами `text` ключом из ТЕКУЩЕГО списка загрузчика. Сервер подписать её
// не может (ключа там нет), он только передаёт.
//
// ПРАВИЛА. Запись с `at` не новее сохранённой не применяется (молча: сервер
// шлёт её каждый час). Применённая лежит НАВСЕГДА (`code.control`): отозванные
// копятся, добавленные копятся, `minVersion` держится до следующей записи.
// Ключ, подписавший запись, сам себя отозвать не может: эта часть записи
// пропускается. Код в памяти ниже `minVersion` убирается сразу, мост возьмёт
// прошлую годную или копию папки.

function readControl(){return get(CONTROL).then(function(stored){var kept=stored[CONTROL];
return plain(kept)?kept:{}})}
L.readControl=readControl;

function parseControlText(text){var rec;
try{rec=JSON.parse(text)}catch(err){return null}
if(!plain(rec)||rec.v!==1||typeof rec.at!=='string'||!Number.isFinite(Date.parse(rec.at)))return null;
return{at:rec.at,atMs:Date.parse(rec.at),
revoke:Array.isArray(rec.revoke)?rec.revoke.filter(function(one){return typeof one==='string'&&FP_RE.test(one)}):[],
minVersion:typeof rec.minVersion==='string'&&vparts(rec.minVersion)!==null?rec.minVersion:null,
addKeys:Array.isArray(rec.addKeys)?rec.addKeys.filter(function(one){return plain(one)&&JWK_COORD_RE.test(String(one.x))&&JWK_COORD_RE.test(String(one.y))}).map(function(one){return{kty:'EC',crv:'P-256',x:one.x,y:one.y}}):[],
// Адреса сервера (LOADER-FINAL-1 §1 п.1): негодные отбрасываются молча; поля нет:
// `null`, прежний список держится; пустой список возвращает зашитые адреса.
origins:controlList(rec.origins),
// Адреса файла (дописка 2 брифа): то же правило, свой список.
files:controlList(rec.files),
// Флаги папки (дописка 4 п.1): только восемь имён; поля нет: `null`, прежний
// набор держится; поле есть: набор заменяется целиком.
config:plain(rec.config)?signedPart(rec.config):null}}

/** Список адресов записи: негодные молча вон; поля нет: `null`. */
function controlList(raw){return Array.isArray(raw)?raw.map(originOf).filter(function(one,i,all){return one!==null&&all.indexOf(one)===i}).slice(0,CONTROL_ORIGINS_MAX):null}

function applyControl(raw,state){if(raw===undefined||raw===null)return Promise.resolve(null);
if(!plain(raw)||typeof raw.text!=='string'||raw.text.length>CONTROL_MAX||typeof raw.sig!=='string'||!SIG_RE.test(raw.sig))return log('code.control',{result:'bad'}).then(function(){return null});
var rec=parseControlText(raw.text);
if(rec===null)return log('code.control',{result:'bad'}).then(function(){return null});
return readControl().then(function(kept){var keptMs=typeof kept.at==='string'?Date.parse(kept.at):NaN;
if(Number.isFinite(keptMs)&&rec.atMs<=keptMs)return null;
return signerOf(new TextEncoder().encode(raw.text),raw.sig).then(function(signer){if(!signer){if(kept.rejectedAt===rec.at)return null;
var marked=Object.assign({},kept,{rejectedAt:rec.at});
var payload={};
payload[CONTROL]=marked;
return set(payload).then(function(){return log('code.control',{result:'signature',at:rec.at})}).then(function(){return null})}
var revoked=Array.isArray(kept.revoked)?kept.revoked.slice():[];
rec.revoke.forEach(function(fp){if(fp!==signer.fp&&revoked.indexOf(fp)<0)revoked.push(fp)});
var added=Array.isArray(kept.added)?kept.added.slice():[];
rec.addKeys.forEach(function(jwk){if(!added.some(function(one){return one.x===jwk.x&&one.y===jwk.y}))added.push(jwk)});
var next={at:rec.at,revoked:revoked,added:added,minVersion:rec.minVersion!==null?rec.minVersion:(typeof kept.minVersion==='string'?kept.minVersion:null),signer:signer.fp,
origins:rec.origins!==null?rec.origins:(Array.isArray(kept.origins)?kept.origins:[]),
files:rec.files!==null?rec.files:(Array.isArray(kept.files)?kept.files:[]),
config:rec.config!==null?rec.config:(plain(kept.config)?kept.config:{})};
var payload={};
payload[CONTROL]=next;
return set(payload).then(function(){rememberOrigins(originList(next),null);
return log('code.control',{result:'applied',at:rec.at,signer:signer.fp,revoked:revoked.length,added:added.length,minVersion:next.minVersion,origins:next.origins.length,files:next.files.length,config:Object.keys(next.config),selfRevokeSkipped:rec.revoke.indexOf(signer.fp)>=0})}).then(function(){return dropBelowMin(next.minVersion,state)}).then(function(){return next})})})}

/** Код в памяти ниже `minVersion` убирается: ставить его больше нельзя. */
function dropBelowMin(min,state){if(typeof min!=='string')return Promise.resolve();
return get([CURRENT,PREVIOUS]).then(function(stored){var gone=[];
[[CURRENT,'current'],[PREVIOUS,'previous']].forEach(function(pair){var one=stored[pair[0]];
if(plain(one)&&plain(one.meta)&&newer(min,one.meta.version)){gone.push(pair[0]);
if(state)state[pair[1]]=null}});
if(gone.length===0)return;
return chrome.storage.local.remove(gone).then(function(){return log('code.below-min',{minVersion:min,removed:gone})})})}

// --- настройки с сервера (дописка 1, Д1.4) ------------------------------------
//
// Поле `config` ответа: любой JSON-объект, флаги и выключатели «погасить у всех
// за час без кода». Ответ 200 без поля значит пустой объект; ответ без 200
// память не трогает.

function saveConfig(body){var next=plain(body)&&plain(body.config)?body.config:{};
var text;
try{text=JSON.stringify(next)}catch(err){return Promise.resolve()}
if(text.length>65536)return Promise.resolve();
return get(CONFIG).then(function(stored){var before;
try{before=JSON.stringify(stored[CONFIG]===undefined?null:stored[CONFIG])}catch(err){before=null}
if(before===text)return;
var payload={};
payload[CONFIG]=next;
return set(payload).then(function(){},function(){})})}

L.config=function(){return get(CONFIG).then(function(stored){return plain(stored[CONFIG])?stored[CONFIG]:{}})};

/**
 * ФЛАГИ ПАПКИ ТОЛЬКО ПОД ПОДПИСЬЮ (LOADER-FINAL-1 дописка 4 п.1). Восемь флагов
 * меняют поведение самой папки: снять политику страницы вебапа (`cspRelax`),
 * объявить вебапом другой путь (`webapp`), поставить мост на выданные сайты
 * (`bridgeHosts`), кнопку права (`grantHosts`, `grantLabel`), панель
 * (`sidePanel`, `sidePanelUrl`) и момент вставки кода (`injectAt`). Открытое
 * поле `config` ответа сервера или статики мог бы подменить взломанный сервер,
 * поэтому эти восемь берутся ТОЛЬКО из подписанной управляющей записи (поле
 * `config` записи, `code.control.config`); в открытом поле они молча не
 * действуют, и журнал один раз за жизнь воркера называет их строкой
 * `config.unsigned`. Прочие поля открытого `config` (для кода страницы)
 * остаются как были.
 */
var SIGNED_FLAGS=['cspRelax','webapp','bridgeHosts','grantHosts','grantLabel','sidePanel','sidePanelUrl','injectAt'];
L.SIGNED_FLAGS=Object.freeze(SIGNED_FLAGS.slice());

/** Только восемь флагов записи. */
function signedPart(raw){var out={};
if(!plain(raw))return out;
SIGNED_FLAGS.forEach(function(key){if(Object.prototype.hasOwnProperty.call(raw,key))out[key]=raw[key]});
return out}

/** Открытый `config` без восьми флагов папки. */
function openPart(raw){var out={};
if(!plain(raw))return out;
Object.keys(raw).forEach(function(key){if(SIGNED_FLAGS.indexOf(key)<0)out[key]=raw[key]});
return out}

/** Что действует: открытое без восьми плюс восемь из подписанной записи. */
L.effectiveConfig=function(){return Promise.all([L.config(),readControl()]).then(function(all){return Object.assign(openPart(all[0]),plain(all[1].config)?signedPart(all[1].config):{})})};

/** Флаги папки в открытом поле: одна строка журнала за жизнь воркера на набор имён. */
var unsignedSeen='';
function noteUnsigned(body){var raw=plain(body)&&plain(body.config)?body.config:null;
if(raw===null)return Promise.resolve();
var names=SIGNED_FLAGS.filter(function(key){return Object.prototype.hasOwnProperty.call(raw,key)});
var said=names.join(',');
if(names.length===0||said===unsignedSeen)return Promise.resolve();
unsignedSeen=said;
return log('config.unsigned',{fields:names})}

// --- настройки с сервера в дело (LOADER-FINAL-1 §1 п.2, п.3в, п.6) -------------------
//
// Три выключателя папки решает сервер, а не архив: правило, снимающее политику
// страницы вебапа (`config.cspRelax`), боковая панель (`config.sidePanel`) и мост
// на сайтах, куда человек сам выдал право (`config.bridgeHosts`). Сверяются при
// подъёме воркера и после каждого вопроса серверу, по тому, что лежит в памяти
// (`code.config`). В сборке разработки не трогаются: сервер там не спрашивается.

/**
 * ПРАВИЛО «СНЯТЬ ПОЛИТИКУ СТРАНИЦЫ ВЕБАПА» (§1 п.3в). Код входит в страницу
 * текстом и живёт, пока EA пускает `'unsafe-inline'`. Ужесточит: сервер ставит
 * `cspRelax: true`, и загрузчик снимает заголовки политики ровно у документа
 * вебапа (`main_frame` `https://www.ea.com/…/ultimate-team/web-app…`), больше
 * нигде. Флаг ушёл: правило снято. Номер правила вне диапазона двери
 * `net.rules` (7000 по 7999): дверь его не видит и не снимает. Политику в
 * `<meta>` документа заголовок не снимает: на этот случай `nonce` в `intoPage`.
 */
var CSP_RULE_ID=8000;
var WEBAPP_DOC_FILTER='^https://www\\.ea\\.com/(?:[^?#]*/)?ultimate-team/web-app';
function cspRule(){return{id:CSP_RULE_ID,priority:1,
action:{type:'modifyHeaders',responseHeaders:[{header:'content-security-policy',operation:'remove'},{header:'content-security-policy-report-only',operation:'remove'}]},
condition:{regexFilter:WEBAPP_DOC_FILTER,requestDomains:['www.ea.com'],resourceTypes:['main_frame']}}}
L.CSP_RULE_ID=CSP_RULE_ID;

function applyCsp(config){var want=plain(config)&&config.cspRelax===true;
var dnr=chrome.declarativeNetRequest;
if(!dnr||typeof dnr.updateDynamicRules!=='function'||typeof dnr.getDynamicRules!=='function')return Promise.resolve(false);
return Promise.resolve(dnr.getDynamicRules()).then(function(rules){var has=(rules||[]).some(function(rule){return !!rule&&rule.id===CSP_RULE_ID});
if(want===has)return want;
var change=want?{removeRuleIds:[CSP_RULE_ID],addRules:[cspRule()]}:{removeRuleIds:[CSP_RULE_ID]};
return Promise.resolve(dnr.updateDynamicRules(change)).then(function(){return L.log('code.csp',{on:want})}).then(function(){return want})}).then(function(on){return on},function(){return false})}

/**
 * БОКОВАЯ ПАНЕЛЬ (§1 п.6). В паспорте её адреса нет: панель появляется в меню
 * Chrome только словом сервера (`config.sidePanel === true`), и у людей её НЕТ,
 * пока сервер не скажет. Внутри оболочка `account/panel.html` с рамкой сайта.
 */
var PANEL_PATH='account/panel.html';
L.PANEL_PATH=PANEL_PATH;
function applyPanel(config){var on=plain(config)&&config.sidePanel===true;
var panel=chrome.sidePanel;
if(!panel||typeof panel.setOptions!=='function')return Promise.resolve(false);
return Promise.resolve(panel.setOptions({path:PANEL_PATH,enabled:on})).then(function(){return on},function(){return false})}

/**
 * МОСТ НА НОВЫХ САЙТАХ (§1 п.2). Сайт вне паспорта: право даёт только человек
 * кнопкой оболочки окна аккаунта (`optional_host_permissions`, жест обязателен).
 * После этого фон ставит туда тот же мост `content/content.js`
 * (`registerContentScripts`), но только на адреса из `config.bridgeHosts`, на
 * которые право правда выдано: сверка на каждом вопросе серверу и при каждой
 * смене прав. Адрес пишется шаблоном `https://узел/*` или `https://*.узел/*`;
 * свои домены (EA и наш сайт) сюда не идут: там свои мосты паспорта. Прежние
 * двери моста (ключ, замки, настройки) на таком сайте закрыты (`content.js`),
 * открыты только проверка моста и общие двери с подписью.
 */
var BRIDGE_ID='eshario-bridge-granted';
var BRIDGE_MAX=20;
var BRIDGE_RE=/^https:\/\/(?:\*\.)?(?:[a-z0-9-]+\.)+[a-z]{2,63}\/\*$/;
L.BRIDGE_ID=BRIDGE_ID;

function bridgePattern(value){if(typeof value!=='string'||value.length>200)return null;
var pattern=value.toLowerCase();
if(!BRIDGE_RE.test(pattern))return null;
var host=pattern.slice(8,-2).replace(/^\*\./,'');
if(host==='ea.com'||/\.ea\.com$/.test(host))return null;
if(typeof L.isSiteFamily==='function'&&L.isSiteFamily('https://'+host+'/'))return null;
return pattern}
L.bridgePattern=bridgePattern;

/** Накрывает ли шаблон адрес: `https://узел/*` точно, `https://*.узел/*` узел и поддомены. */
function patternHas(pattern,value){var url;
try{url=new URL(value)}catch(err){return false}
if(url.protocol!=='https:'||url.username!==''||url.password!=='')return false;
var host=pattern.slice(8,-2);
if(host.indexOf('*.')===0){var base=host.slice(2);
return url.hostname===base||url.hostname.slice(-(base.length+1))==='.'+base}
return url.hostname===host}

/** Шаблоны моста, стоящие сейчас (что Chrome держит зарегистрированным). */
function bridgeHosts(){var scripting=chrome.scripting;
if(!scripting||typeof scripting.getRegisteredContentScripts!=='function')return Promise.resolve([]);
return Promise.resolve(scripting.getRegisteredContentScripts({ids:[BRIDGE_ID]})).then(function(list){return Array.isArray(list)&&list[0]&&Array.isArray(list[0].matches)?list[0].matches.slice():[]},function(){return[]})}
L.bridgeHosts=bridgeHosts;

/** Страница на сайте, куда фон поставил мост по выданному праву. */
function onBridgeHost(value){if(typeof value!=='string'||value.indexOf('https://')!==0)return Promise.resolve(false);
return bridgeHosts().then(function(list){return list.some(function(pattern){return patternHas(pattern,value)})})}
L.onBridgeHost=onBridgeHost;

function grantedOnly(patterns){var perms=chrome.permissions;
if(patterns.length===0||!perms||typeof perms.contains!=='function')return Promise.resolve([]);
return Promise.all(patterns.map(function(pattern){return Promise.resolve(perms.contains({origins:[pattern]})).then(function(yes){return yes===true?pattern:null},function(){return null})})).then(function(all){return all.filter(Boolean)})}

function applyBridge(config){var scripting=chrome.scripting;
if(!scripting||typeof scripting.registerContentScripts!=='function'||typeof scripting.getRegisteredContentScripts!=='function')return Promise.resolve([]);
var asked=plain(config)&&Array.isArray(config.bridgeHosts)?config.bridgeHosts:[];
var wanted=[];
asked.forEach(function(one){var pattern=bridgePattern(one);
if(pattern!==null&&wanted.indexOf(pattern)<0&&wanted.length<BRIDGE_MAX)wanted.push(pattern)});
return grantedOnly(wanted).then(function(granted){return bridgeHosts().then(function(have){var want=granted.slice().sort();
if(JSON.stringify(have.slice().sort())===JSON.stringify(want))return want;
var drop=have.length>0?Promise.resolve(scripting.unregisterContentScripts({ids:[BRIDGE_ID]})):Promise.resolve();
return drop.then(function(){if(want.length===0)return;
return scripting.registerContentScripts([{id:BRIDGE_ID,matches:want,js:['content/content.js'],runAt:'document_start',allFrames:false,persistAcrossSessions:true}])}).then(function(){return L.log('code.bridge',{hosts:want})}).then(function(){return want})})}).then(function(list){return list},function(){return[]})}

/** Всё сразу: правило политики, панель, мост на выданных сайтах. */
function applyConfig(){return devBuild().then(function(dev){if(dev)return null;
return L.effectiveConfig().then(function(config){return Promise.all([applyCsp(config),applyPanel(config),applyBridge(config)])})}).then(function(){},function(){})}
L.applyConfig=applyConfig;

L.needsLoader=function(){return get(NEEDS).then(function(stored){var kept=stored[NEEDS];
if(!plain(kept)||typeof kept.minLoader!=='string')return null;
// Папку уже обновили до нужной: признак ничего не значит.
return newer(kept.minLoader,own())?{version:kept.version,minLoader:kept.minLoader}:null})};

// --- отчёт моста о подъёме кода (самолечение, П5) --------------------------------

/**
 * Мост говорит, поднялся ли код на вкладке вебапа: `ok` и какой код он
 * вставил. Два провала подряд у кода из памяти: метка `fallback`, и следующий
 * запуск мост ведёт с `code.previous` (или с копии из папки). Метку снимает
 * новая версия сервера. Отчёт о чужой версии (память успела смениться) не
 * считается: он про код, которого уже нет.
 */
function boot(params,sender){var ok=!!(params&&params.ok===true);
var source=params&&typeof params.source==='string'?params.source:'';
var claimed={version:params&&params.version,sha256:params&&params.sha256};
return serial(function(){return readState().then(function(state){state.source=['server','previous','zip','module','none'].indexOf(source)>=0?source:null;
state.bootAt=Date.now();
// КОДА НЕТ (вариант Б): провала подъёма здесь нет, есть повод спросить сервер
// сейчас и держать минутный будильник. Строки `code.boot` не пишется: вопрос
// следом запишет свою строку с поводом `boot`.
if(source==='none')return writeState(state);
if(source!=='server'||!sameCode(state.current,claimed)){if(ok)return writeState(state);
return writeState(state).then(function(){return log('code.boot',{ok:false,source:source,version:typeof claimed.version==='string'?claimed.version:null})})}
if(ok){if(sameCode(state.boot,claimed))state.boot=null;
return writeState(state)}
var fails=(sameCode(state.boot,claimed)?state.boot.fails:0)+1;
state.boot={version:claimed.version,sha256:claimed.sha256,fails:fails};
var marked=fails>=BOOT_FAIL_LIMIT&&!sameCode(state.fallback,claimed);
if(marked)state.fallback={version:claimed.version,sha256:claimed.sha256};
return writeState(state).then(function(){return log('code.boot',{ok:false,source:source,version:claimed.version,fails:fails})}).then(function(){if(!marked)return;
return log('code.fallback',{version:claimed.version,to:plain(state.previous)?state.previous.version:'zip'})})})}).then(function(){
// Отчёт о подъёме и есть «вебап открыли»: повод спросить сервер. Ответ мосту
// вопроса не ждёт.
void check('boot');
// События, ждавшие вкладку (будильник без открытого вебапа), уходят первой
// вкладке, где код поднялся.
if(ok&&sender&&sender.tab&&typeof L.flushPending==='function')void L.flushPending(sender.tab.id);
return{ok:true}})}
L.boot=boot;

/** Что знает загрузчик: для прибора `__eshario.loader()` и двери `code.status`. */
L.status=function(){return Promise.all([readState(),get([LOG,NEEDS])]).then(function(all){var state=all[0],rest=all[1];
var needs=plain(rest[NEEDS])&&newer(rest[NEEDS].minLoader,own())?{version:rest[NEEDS].version,minLoader:rest[NEEDS].minLoader}:null;
return{loader:own(),current:brief(state.current),previous:brief(state.previous),source:typeof state.source==='string'?state.source:null,
checkedAt:Number.isSafeInteger(state.checkedAt)?state.checkedAt:null,lastError:typeof state.lastError==='string'?state.lastError:null,
fallback:brief(state.fallback),rejects:plain(state.rejects)?{version:state.rejects.version,count:state.rejects.count}:null,
needsLoader:needs,writeMs:Number.isSafeInteger(state.writeMs)?state.writeMs:null,
origin:typeof state.origin==='string'?state.origin:null,firstMisses:Number.isSafeInteger(state.firstMisses)?state.firstMisses:0,
log:Array.isArray(rest[LOG])?rest[LOG].slice(-20):[]}})};

// --- поводы спросить ---------------------------------------------------------------

/**
 * Часовой будильник ставится, только если его нет: `create` с тем же именем
 * ПЕРЕСТАВЛЯЕТ срок, и воркер, просыпающийся каждые несколько минут, не дал бы
 * ему прозвенеть никогда.
 */
function ensureAlarm(){try{return Promise.resolve(chrome.alarms.get(ALARM)).then(function(alarm){if(alarm)return;
return chrome.alarms.create(ALARM,{delayInMinutes:ALARM_MINUTES,periodInMinutes:ALARM_MINUTES})}).then(function(){},function(){})}catch(err){return Promise.resolve()}}
L.ensureAlarm=ensureAlarm;

/**
 * МИНУТНЫЙ БУДИЛЬНИК ПЕРВОГО ЗАПУСКА (LOADER-THIN-1). Кода в памяти нет:
 * будильник `code.first` стоит (ставится только если его нет или шаг сменился:
 * `create` с тем же именем переставляет срок, как у часового). Шаг растёт с
 * отказами подряд (`code.state.firstMisses`, LOADER-FINAL-1 §1 п.7): 1, 2, 5,
 * 15 минут. Код есть: будильник снят. Решает память `code.current`, а не
 * `code.state`: память кода стирают и в обход загрузчика. В сборке разработки
 * сервер не спрашивается, и будильника нет.
 */
function hasCode(kept){return plain(kept)&&plain(kept.meta)&&typeof kept.text==='string'&&kept.text!==''}

/** Шаг минутного будильника по числу отказов подряд: 1, 2, 5, 15 минут. */
function firstStep(misses){var n=Number.isSafeInteger(misses)&&misses>0?misses:0;
return FIRST_STEPS[Math.min(FIRST_STEPS.length-1,Math.floor(n/FIRST_STEP_AFTER))]}
L.firstStep=firstStep;

/**
 * Счёт отказов подряд, пока кода нет (LOADER-FINAL-1 §1 п.7): каждый вопрос
 * серверу, после которого кода в памяти всё ещё нет, плюс один; код лёг: ноль.
 * Пол в минуту вопросом не считается. Идёт в очереди записей, сразу за вопросом.
 */
function countFirst(result){var asked=plain(result)&&result.result!=='floor';
return get([CURRENT,STATE]).then(function(stored){var state=plain(stored[STATE])?stored[STATE]:{};
var misses=Number.isSafeInteger(state.firstMisses)?state.firstMisses:0;
var next=hasCode(stored[CURRENT])?0:(asked?misses+1:misses);
if(next===misses)return;
state.firstMisses=next;
return writeState(state)})}

function ensureFirst(){return devBuild().then(function(dev){return dev?null:get([CURRENT,STATE])}).then(function(stored){if(stored===null)return;
var missing=!hasCode(stored[CURRENT]);
var state=plain(stored[STATE])?stored[STATE]:{};
var step=firstStep(state.firstMisses);
return Promise.resolve(chrome.alarms.get(FIRST_ALARM)).then(function(alarm){if(missing&&(!alarm||alarm.periodInMinutes!==step))return chrome.alarms.create(FIRST_ALARM,{delayInMinutes:step,periodInMinutes:step});
if(!missing&&alarm)return chrome.alarms.clear(FIRST_ALARM)})}).then(function(){},function(){})}
L.ensureFirst=ensureFirst;

/**
 * ТЕКСТ В МИР СТРАНИЦЫ (лист LOADER-1 шаг 1, 24.09). Мост не может сам
 * исполнить текстовый `<script>`: Chrome судит его политикой изолированного
 * мира расширения, и код, прибор и жетон сборки разработки молча не
 * исполнялись. Мост отдаёт текст сюда, а фон кладёт его в мир страницы
 * `executeScript` с `world: 'MAIN'`, где действует политика страницы EA
 * (`'unsafe-inline'`). Зовёт только наш мост со страницы EA: вкладка, адрес
 * `*.ea.com`, свой id. Вставка идёт ровно в тот документ, что спросил
 * (`documentId`): страница, ушедшая на другой адрес, чужого кода не получит.
 * Узел, атрибуты и снятие узла те же, что делал мост (договор §2).
 */
var EA_PAGE_RE=/^https:\/\/(?:[a-z0-9-]+\.)*ea\.com\//;
var MAIN_PARTS=4;
var MAIN_ATTR_RE=/^eshario[A-Z][A-Za-z]{0,30}$/;

function mainParts(params){var parts=plain(params)&&Array.isArray(params.parts)?params.parts:null;
if(parts===null||parts.length===0||parts.length>MAIN_PARTS)return null;
var out=[];
for(var i=0;i<parts.length;i+=1){var one=parts[i];
if(!plain(one)||typeof one.text!=='string'||one.text==='')return null;
var attrs=null;
if(one.attrs!==null&&one.attrs!==undefined){if(!plain(one.attrs))return null;
attrs={};
var keys=Object.keys(one.attrs);
for(var k=0;k<keys.length;k+=1){var value=one.attrs[keys[k]];
if(!MAIN_ATTR_RE.test(keys[k])||typeof value!=='string'||value.length>300)return null;
attrs[keys[k]]=value}}
out.push({text:one.text,attrs:attrs})}
return out}

/**
 * Исполняется В МИРЕ СТРАНИЦЫ: без замыканий, всё только из доводов.
 *
 * NONCE (LOADER-FINAL-1 §1 п.3а). Сегодня политика EA пускает текст скрипта
 * (`'unsafe-inline'`). Если EA перейдёт на политику с `nonce`, текст без него
 * не исполнится у всех копий разом, до нового архива. Поэтому узел берёт
 * `nonce` у любого `<script nonce>` документа, если такой есть: Chrome прячет
 * значение атрибута, но отдаёт его свойством `nonce`. Нет такого узла: ничего.
 */
function intoPage(parts){var out={ran:0,injectMs:null,nonce:false};
var nonce='';
try{var seen=document.querySelector('script[nonce]');
if(seen)nonce=String(seen.nonce||seen.getAttribute('nonce')||'')}catch(e){}
for(var i=0;i<parts.length;i+=1){try{var node=document.createElement('script');
var attrs=parts[i].attrs;
if(attrs)for(var key in attrs)node.dataset[key]=attrs[key];
if(nonce!==''){node.nonce=nonce;
out.nonce=true}
node.textContent=parts[i].text;
var started=performance.now();
(document.head||document.documentElement).appendChild(node);
if(i===0)out.injectMs=Math.round(performance.now()-started);
node.remove();
out.ran+=1}catch(e){}}
return out}

function toMain(params,sender){var parts=mainParts(params);
if(parts===null)return Promise.resolve({ok:false,reason:'parts'});
var self='';
try{self=chrome.runtime.id}catch(err){}
var tab=sender&&sender.tab&&Number.isSafeInteger(sender.tab.id)?sender.tab.id:null;
var url=sender&&typeof sender.url==='string'?sender.url:'';
if(tab===null||(self&&sender.id!==self))return Promise.resolve({ok:false,reason:'sender'});
// Страница EA или сайт, куда человек сам выдал право и куда фон поставил мост
// (`config.bridgeHosts`, LOADER-FINAL-1 §1 п.2).
return(EA_PAGE_RE.test(url)?Promise.resolve(true):onBridgeHost(url)).then(function(ours){if(!ours)return{ok:false,reason:'sender'};
var target=typeof sender.documentId==='string'&&sender.documentId!==''?{tabId:tab,documentIds:[sender.documentId]}:{tabId:tab,frameIds:[Number.isSafeInteger(sender.frameId)?sender.frameId:0]};
var run;
try{run=chrome.scripting.executeScript({target:target,world:'MAIN',injectImmediately:true,func:intoPage,args:[parts]})}catch(err){run=Promise.reject(err)}
return Promise.resolve(run).then(function(results){var got=Array.isArray(results)&&results[0]&&plain(results[0].result)?results[0].result:null;
return{ok:true,ran:got&&Number.isSafeInteger(got.ran)?got.ran:null,injectMs:got&&Number.isSafeInteger(got.injectMs)?got.injectMs:null}},function(){return{ok:false,reason:'scripting'}})})}
L.intoPage=intoPage;

function onMessage(message,sender,sendResponse){if(!message||typeof message.method!=='string')return false;
var work=null;
if(message.method==='code.main')work=toMain(message.params,sender);
else if(message.method==='code.boot')work=boot(message.params,sender);
else if(message.method==='code.focus')work=check('focus').then(function(){return{ok:true}});
else if(message.method==='code.status')work=L.status();
else if(message.method==='door'&&typeof L.door==='function')work=L.door(message.params,sender);
if(work===null)return false;
work.then(sendResponse,function(){sendResponse({ok:false,reason:'loader-error'})});
return true}

try{chrome.runtime.onMessage.addListener(onMessage)}catch(err){}
try{chrome.alarms.onAlarm.addListener(function(alarm){if(alarm&&alarm.name===ALARM)void check('alarm');
if(alarm&&alarm.name===FIRST_ALARM)void check('first')})}catch(err){}
try{chrome.runtime.onStartup.addListener(function(){void check('start')})}catch(err){}
try{chrome.runtime.onInstalled.addListener(function(){void check('install')})}catch(err){}
void ensureAlarm();
// Подъём воркера не повод спросить сервер, но повод проверить, стоит ли
// минутный будильник: код могли стереть, пока воркер спал.
void ensureFirst();
// Адреса сервера для воркера сразу (`L.origin()`): список из управляющей записи и
// кто ответил последним; настройки сервера в дело (правило, панель, мост).
void Promise.all([readState(),readControl()]).then(function(all){rememberOrigins(originList(all[1]),typeof all[0].origin==='string'?all[0].origin:null)},function(){});
void applyConfig();
})()


})(host.bg,host.fetch,host.global);
// --- src/loader/doors.js (byte for byte) ---
(function(chrome,fetch,globalThis){
// ОБЩИЕ ДВЕРИ ФОНОВОЙ ЧАСТИ (кирпич LOADER-1, дописка 1 Д1.2, закон владельца
// 24.09 01:5x «делаем один раз максимально широким, без переустановки
// когда-либо»).
//
// ЗАЧЕМ. Код страницы едет с сервера, а фоновая часть лежит в папке и
// меняется только новым архивом. Значит всё, что код страницы может захотеть
// от браузера за год вперёд, обязано уже стоять здесь дверью, не привязанной
// к фиче: сеть, память, будильник, уведомление, буфер, загрузка файла,
// вкладки, переизбрание кода, звук, пункт меню, простой человека. Право в
// паспорте без двери пустое: код страницы живёт в мире страницы EA, и права
// расширения там не действуют.
//
// КАК ЗОВУТ. Код страницы: сообщение мосту `door` с именем двери, доводами и
// жетоном загрузки (мост пускает без жетона только прежние двери). Страница
// нашего сайта: тонкий мост `content/site.js` с тем же жетоном или прямой
// `chrome.runtime.sendMessage` по `externally_connectable` (Chrome сам
// называет адрес отправителя, и он обязан быть нашим сайтом). Окно аккаунта:
// напрямую, это страница самого расширения.
//
// ОТВЕТ ОДНОЙ ФОРМЫ: `{ok: true, value}` или `{ok: false, reason}`. Слово
// причины короткое и из кода, текст чужих ошибок режется.
//
// ГРАНИЦЫ, КОТОРЫЕ ДВЕРИ ДЕРЖАТ САМИ:
//  - сеть и вкладки только по адресам паспорта (`host_permissions`), и только
//    https; куки человека не уходят никуда (`credentials: 'omit'`): сегодняшний
//    код фона нигде их не шлёт, и двери не шлют тоже;
//  - память только в своём пространстве имён `door.`: ключи сессии
//    аккаунта, код страницы (`code.*`), замки и счётчики этой дверью не
//    читаются и не пишутся. Иначе дверь `store.set('code.current', …)` обошла
//    бы подпись, а `store.get('account.session')` отдала бы сессию странице EA;
//  - переизбрание кода только во вкладку вебапа.
//
// ДВЕРИ НА ГОД ВПЕРЁД (кирпич LOADER-FINAL-1 §1 п.2, п.3, п.5). Каждое новое право
// паспорта получило здесь дверь: `perm.contains` и `perm.request` (права про
// запас, `optional_*`), `net.rules.*` (`declarativeNetRequestWithHostAccess`),
// `tabs.capture` (кадр видимой вкладки), `power.*` (экран не гаснет),
// `scripting.run` (текст в вкладку паспорта), `sidepanel.*` (`sidePanel`),
// `nav.frames` (`webNavigation`); команды клавиш `eshario-1` по `eshario-3`
// приходят в вебап известием `door.command`, смена прав известием
// `door.permissions`. Сайт, куда человек сам выдал право, для сети и правил
// равен паспорту; вкладки, кадр и текст по-прежнему только паспорт.
(function(){'use strict';

var L=globalThis.esharioLoader=globalThis.esharioLoader||{};

var NS='door.';
var PENDING='door.pending';
var KEY_RE=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
var NAME_RE=/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
var WEBAPP_RE=/^https:\/\/www\.ea\.com\/(?:[^?#]*\/)?ultimate-team\/web-app/;
var DEFAULT_WEBAPP='https://www.ea.com/ea-sports-fc/ultimate-team/web-app/';
/**
 * ПЕРЕЕЗД ПУТИ ВЕБАПА (LOADER-FINAL-1 §1 п.5). Сверх зашитого пути вебапом
 * считается адрес, который начинается одной из строк `config.webapp` с сервера.
 * Строка обязана начинаться с `https://www.ea.com/` и нести путь хотя бы в
 * четыре знака: «весь сайт EA» вебапом не объявить. Та же сверка в `content.js`.
 */
var WEBAPP_PREFIX_RE=/^https:\/\/www\.ea\.com\/[^?#\s]{4,200}$/;
var WEBAPP_PREFIX_MAX=10;
/**
 * ДОМЕНЫ НАШЕГО САЙТА ОДНИМ СПИСКОМ (LOADER-FINAL-1 §1 п.1г). Тот же список
 * байт в байт стоит в `account/shell.js` (общего модуля нет: этот файл
 * классический, тот модуль); равенство держит сцена. Второй домен `eshario.app`
 * куплен владельцем 24.09 (дописка 1 брифа), паспорт несёт оба.
 */
var SITE_DOMAINS=['eshario.com','eshario.app'];
/**
 * САЙТ ЭТО ТОЛЬКО ТОЧНЫЕ УЗЛЫ (кирпич FRIEND-CODE-WINDOW-1, долг STATIC-HASH-1).
 * Поддомены больше не наши: на `files.eshario.com` лежит статика GitHub Pages,
 * и чужой HTML там не должен получать двери сайта. `SITE_DOMAINS` остаётся
 * «семьёй»: адрес семьи вне точных узлов не сайт и не доверенный вовсе (ни
 * двери сайта, ни двери паспорта, ни мост выданных сайтов). Паспорт прежний
 * (его адреса названы в политике), поэтому тонкий мост `content/site.js` на
 * поддомене молчит сам. Тот же список байт в байт стоит в `account/shell.js` и
 * `content/site.js`; равенство держит сцена.
 */
var SITE_HOSTS=['eshario.com','www.eshario.com','eshario.app','www.eshario.app'];
/** Номера правил двери `net.rules`: свой диапазон, не больше 50 разом. */
var RULE_MIN=7000;
var RULE_MAX=7999;
var RULES_CAP=50;
var CAPTURE_MAX=4194304;
var RUN_MAX=1048576;
var POWER_KEY='loader.power';
var COMMAND_RE=/^eshario-[1-3]$/;
var FETCH_DEFAULT_MS=15000;
var FETCH_MAX_MS=60000;
var BODY_MAX=1048576;
var RESPONSE_MAX=20971520;
var DOWNLOAD_MAX=20971520;
var AUDIO_MAX=2097152;
var STORE_VALUE_MAX=5242880;
var OFFSCREEN_URL='loader/offscreen.html';
var OFFSCREEN_TARGET='eshario-offscreen';
var METHODS=['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'];
var MENU_CONTEXTS=['page','selection','link','image'];

function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function no(reason){return{ok:false,reason:reason}}
function yes(value){return{ok:true,value:value===undefined?null:value}}
function word(err){var text=String(err&&err.message||err||'error');
return text.slice(0,160)}

// --- паспорт -------------------------------------------------------------------
//
// ИСТОЧНИК ПРАВДЫ О РАЗРЕШЁННЫХ АДРЕСАХ ОДИН: `host_permissions` своего
// манифеста. Список здесь не повторяется: второй экземпляр однажды разъехался
// бы с паспортом, и дверь пускала бы туда, куда Chrome не пустит, или наоборот.

var domainsOnce=null;
function passportDomains(){if(domainsOnce)return domainsOnce;
var out=[];
try{var list=chrome.runtime.getManifest().host_permissions||[];
for(var i=0;i<list.length;i+=1){var wild=/^https:\/\/\*\.([a-z0-9.-]+)\/\*$/.exec(list[i]);
if(wild){out.push({host:wild[1],sub:true});
continue}
var exact=/^https:\/\/([a-z0-9.-]+)\//.exec(list[i]);
if(exact)out.push({host:exact[1],sub:false})}}catch(err){}
domainsOnce=out;
return out}

/** Адрес из паспорта: https, без имени и пароля, узел паспорта или его поддомен. */
function inPassport(value){if(typeof value!=='string'||value===''||value.length>4096)return false;
var url;
try{url=new URL(value)}catch(err){return false}
if(url.protocol!=='https:'||url.username!==''||url.password!=='')return false;
var host=url.hostname;
var domains=passportDomains();
for(var i=0;i<domains.length;i+=1){var one=domains[i];
if(host===one.host)return true;
if(one.sub&&host.slice(-(one.host.length+1))==='.'+one.host)return true}
return false}
L.inPassport=inPassport;

/** Адрес нашего сайта: https, без имени и пароля, узел ровно из `SITE_HOSTS`. */
function isSite(value){try{var url=new URL(value);
if(url.protocol!=='https:'||url.username!==''||url.password!=='')return false;
return SITE_HOSTS.indexOf(url.hostname)>=0}catch(err){return false}}
L.isSite=isSite;
/** Узел семьи сайта (домен из `SITE_DOMAINS` или его поддомен), любой схемы. */
function isSiteFamily(value){try{var host=new URL(value).hostname;
return SITE_DOMAINS.some(function(domain){return host===domain||host.slice(-(domain.length+1))==='.'+domain})}catch(err){return false}}
L.isSiteFamily=isSiteFamily;
L.SITE_DOMAINS=Object.freeze(SITE_DOMAINS.slice());
L.SITE_HOSTS=Object.freeze(SITE_HOSTS.slice());

/** Строки начала адреса вебапа из настройки сервера, только годные. */
function webappPrefixes(config){var list=plain(config)&&Array.isArray(config.webapp)?config.webapp:[];
return list.filter(function(one){return typeof one==='string'&&WEBAPP_PREFIX_RE.test(one)}).slice(0,WEBAPP_PREFIX_MAX)}
L.webappPrefixes=webappPrefixes;

/** Вебап ли: зашитый путь или начало из `config.webapp` (сервер). */
function isWebapp(value,config){if(typeof value!=='string')return false;
if(WEBAPP_RE.test(value))return true;
return webappPrefixes(config).some(function(prefix){return value.indexOf(prefix)===0})}
L.isWebapp=isWebapp;

/** Своя ли это страница расширения (окно аккаунта, оболочка, панель). */
function extensionPage(sender){var self='';
try{self=chrome.runtime.id}catch(err){}
var url=sender&&typeof sender.url==='string'?sender.url:'';
return self!==''&&url.indexOf('chrome-extension://'+self+'/')===0&&(sender.id===undefined||sender.id===self)}

/**
 * Кто зовёт. Своя страница расширения (окно аккаунта, оболочка) или наш мост
 * на странице из паспорта, или на сайте, куда человек сам выдал право и куда
 * фон поставил мост (LOADER-FINAL-1 §1 п.2). Чужое расширение сюда не достаёт
 * вовсе: `onMessage` слышит только своё расширение, а чужие идут
 * `onMessageExternal`.
 */
function trusted(sender){if(!sender)return Promise.resolve(false);
var self='';
try{self=chrome.runtime.id}catch(err){}
if(sender.id!==undefined&&self&&sender.id!==self)return Promise.resolve(false);
var url=typeof sender.url==='string'?sender.url:'';
if(self&&url.indexOf('chrome-extension://'+self+'/')===0)return Promise.resolve(true);
// Семья сайта вне точных узлов не наша (FRIEND-CODE-WINDOW-1): паспорт держит
// `*.eshario.com` ради сети, но страница поддомена дверей не получает.
if(isSiteFamily(url)&&!isSite(url))return Promise.resolve(false);
if(inPassport(url))return Promise.resolve(true);
return typeof L.onBridgeHost==='function'?L.onBridgeHost(url):Promise.resolve(false)}

/**
 * Адрес, куда пускают сеть и правила: паспорт или сайт, на который человек
 * сам выдал право кнопкой оболочки (`optional_host_permissions`).
 */
function granted(value){if(inPassport(value))return Promise.resolve(true);
var url;
try{url=new URL(value)}catch(err){return Promise.resolve(false)}
if(url.protocol!=='https:'||url.username!==''||url.password!=='')return Promise.resolve(false);
var perms=chrome.permissions;
if(!perms||typeof perms.contains!=='function')return Promise.resolve(false);
return Promise.resolve(perms.contains({origins:[url.origin+'/*']})).then(function(yesDoc){return yesDoc===true},function(){return false})}
L.granted=granted;

// --- сеть ------------------------------------------------------------------------

function toBase64(bytes){var out='',chunk=32768;
for(var i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
return btoa(out)}

function fromBase64(value){return L.b64bytes(value)}

function netFetch(args){if(!plain(args)||typeof args.url!=='string')return Promise.resolve(no('bad-args'));
return granted(args.url).then(function(ok){return ok?fetchGranted(args):no('outside-passport')})}

function fetchGranted(args){var method=typeof args.method==='string'?args.method.toUpperCase():'GET';
if(METHODS.indexOf(method)<0)return Promise.resolve(no('bad-method'));
var headers={};
if(plain(args.headers)){var names=Object.keys(args.headers);
for(var i=0;i<names.length&&i<64;i+=1){var name=names[i],value=args.headers[name];
if(typeof value!=='string'||name.length>100||value.length>8192)continue;
if(/^(cookie|cookie2)$/i.test(name))continue;
headers[name]=value}}
var init={method:method,headers:headers,credentials:'omit',redirect:'follow',
cache:['default','no-store','reload','no-cache','force-cache'].indexOf(args.cache)>=0?args.cache:'no-store'};
if(typeof args.body==='string'){if(args.body.length>BODY_MAX)return Promise.resolve(no('body-too-big'));
init.body=args.body}else if(typeof args.bodyBase64==='string'){var raw;
try{raw=fromBase64(args.bodyBase64)}catch(err){return Promise.resolve(no('bad-body'))}
if(raw.length>BODY_MAX)return Promise.resolve(no('body-too-big'));
init.body=raw}
var ms=Number.isSafeInteger(args.timeoutMs)?Math.max(1000,Math.min(FETCH_MAX_MS,args.timeoutMs)):FETCH_DEFAULT_MS;
try{init.signal=AbortSignal.timeout(ms)}catch(err){}
return fetch(args.url,init).then(function(response){var finalUrl=typeof response.url==='string'&&response.url!==''?response.url:args.url;
return granted(finalUrl).then(function(inside){if(!inside)return no('redirect-outside');
var out={status:response.status,url:finalUrl,headers:{}};
try{response.headers.forEach(function(value,name){out.headers[name]=value})}catch(err){}
return response.arrayBuffer().then(function(buffer){if(buffer.byteLength>RESPONSE_MAX)return no('too-big');
var bytes=new Uint8Array(buffer);
if(args.as==='base64')out.bodyBase64=toBase64(bytes);
else out.body=new TextDecoder('utf-8').decode(bytes);
return yes(out)})})},function(err){return no(/abort|timeout/i.test(word(err))?'timeout':'network')})}

// --- память в своём пространстве имён ------------------------------------------------

function area(args){return plain(args)&&args.area==='sync'?chrome.storage.sync:chrome.storage.local}
function spaced(key){return typeof key==='string'&&KEY_RE.test(key)?NS+key:null}

function storeGet(args){if(!plain(args))return Promise.resolve(no('bad-args'));
var list=Array.isArray(args.keys)?args.keys:[args.key];
if(list.length===0||list.length>100)return Promise.resolve(no('bad-key'));
var keys=[];
for(var i=0;i<list.length;i+=1){var key=spaced(list[i]);
if(key===null)return Promise.resolve(no('bad-key'));
keys.push(key)}
return area(args).get(keys).then(function(stored){if(!Array.isArray(args.keys)){var one=stored&&stored[keys[0]];
return yes(one===undefined?null:one)}
var out={};
for(var j=0;j<keys.length;j+=1){var got=stored&&stored[keys[j]];
out[list[j]]=got===undefined?null:got}
return yes(out)},function(err){return no('storage')})}

function storeSet(args){if(!plain(args))return Promise.resolve(no('bad-args'));
var key=spaced(args.key);
if(key===null)return Promise.resolve(no('bad-key'));
var text;
try{text=JSON.stringify(args.value)}catch(err){return Promise.resolve(no('bad-value'))}
if(text===undefined)return Promise.resolve(no('bad-value'));
if(text.length>STORE_VALUE_MAX)return Promise.resolve(no('too-big'));
var payload={};
payload[key]=args.value;
return area(args).set(payload).then(function(){return yes(true)},function(err){return no(/quota/i.test(word(err))?'quota':'storage')})}

function storeRemove(args){if(!plain(args))return Promise.resolve(no('bad-args'));
var key=spaced(args.key);
if(key===null)return Promise.resolve(no('bad-key'));
return area(args).remove(key).then(function(){return yes(true)},function(){return no('storage')})}

function storeKeys(args){var store=area(args);
var listed=typeof store.getKeys==='function'?store.getKeys():store.get(null).then(function(all){return Object.keys(all||{})});
return Promise.resolve(listed).then(function(keys){return yes((keys||[]).filter(function(key){return key.indexOf(NS)===0&&key!==PENDING}).map(function(key){return key.slice(NS.length)}).sort())},function(){return no('storage')})}

// --- доставка события в открытую вкладку ------------------------------------------------

function webappTabs(){return Promise.all([chrome.tabs.query({url:['https://www.ea.com/*']}),L.effectiveConfig()]).then(function(all){return(all[0]||[]).filter(function(tab){return isWebapp(tab.url,all[1])})},function(){return[]})}

function sendEvent(tabId,name,payload){return chrome.tabs.sendMessage(tabId,{loaderEvent:name,payload:payload===undefined?null:payload}).then(function(){return true},function(){return false})}

/**
 * Событие во все вкладки вебапа. Вкладки нет: событие ждёт в памяти и уходит
 * первой вкладке, где код страницы поднимется; если настройка сервера велит
 * (`config.alarmOpensTab`), вкладка открывается сама.
 */
function deliver(name,payload,openTab){return webappTabs().then(function(tabs){if(tabs.length>0)return Promise.all(tabs.map(function(tab){return sendEvent(tab.id,name,payload)})).then(function(){return true});
return chrome.storage.local.get(PENDING).then(function(stored){var list=Array.isArray(stored&&stored[PENDING])?stored[PENDING]:[];
var payloadOut={};
payloadOut[PENDING]=list.concat([{name:name,payload:payload===undefined?null:payload,at:Date.now()}]).slice(-20);
return chrome.storage.local.set(payloadOut)}).then(function(){if(!openTab)return false;
return L.effectiveConfig().then(function(config){if(!plain(config)||config.alarmOpensTab!==true)return false;
var url=typeof config.webappUrl==='string'&&isWebapp(config.webappUrl,config)?config.webappUrl:DEFAULT_WEBAPP;
return chrome.tabs.create({url:url,active:false}).then(function(){return false},function(){return false})})})})}

/** Отложенные события: первой вкладке, где код поднялся. */
L.flushPending=function(tabId){if(!Number.isSafeInteger(tabId))return Promise.resolve(0);
return chrome.storage.local.get(PENDING).then(function(stored){var list=Array.isArray(stored&&stored[PENDING])?stored[PENDING]:[];
if(list.length===0)return 0;
return chrome.storage.local.remove(PENDING).then(function(){return Promise.all(list.map(function(one){return sendEvent(tabId,one.name,one.payload)}))}).then(function(){return list.length})},function(){return 0})};

// --- будильник ----------------------------------------------------------------------

function alarmSet(args){if(!plain(args)||typeof args.name!=='string'||!NAME_RE.test(args.name))return Promise.resolve(no('bad-name'));
var info={};
if(Number.isFinite(args.when))info.when=args.when;
else if(Number.isFinite(args.delayMs)&&args.delayMs>0)info.delayInMinutes=args.delayMs/60000;
else return Promise.resolve(no('bad-time'));
if(Number.isFinite(args.periodMs)&&args.periodMs>0)info.periodInMinutes=args.periodMs/60000;
return Promise.resolve(chrome.alarms.create(NS+args.name,info)).then(function(){return yes(true)},function(err){return no('alarm')})}

function alarmClear(args){if(!plain(args)||typeof args.name!=='string'||!NAME_RE.test(args.name))return Promise.resolve(no('bad-name'));
return Promise.resolve(chrome.alarms.clear(NS+args.name)).then(function(done){return yes(done===true)},function(){return no('alarm')})}

function alarmList(){return Promise.resolve(chrome.alarms.getAll()).then(function(all){return yes((all||[]).filter(function(one){return one.name.indexOf(NS)===0}).map(function(one){return{name:one.name.slice(NS.length),scheduledTime:one.scheduledTime,periodMs:Number.isFinite(one.periodInMinutes)?Math.round(one.periodInMinutes*60000):null}}))},function(){return no('alarm')})}

// --- уведомления ----------------------------------------------------------------------

function notifyShow(args){if(!plain(args)||typeof args.title!=='string'||typeof args.message!=='string')return Promise.resolve(no('bad-args'));
var id=typeof args.id==='string'&&NAME_RE.test(args.id)?args.id:'n'+Date.now();
var options={type:'basic',iconUrl:chrome.runtime.getURL('assets/icon128.png'),title:args.title.slice(0,100),message:args.message.slice(0,500),silent:args.silent===true};
return Promise.resolve(chrome.notifications.create(NS+id,options)).then(function(){return yes(id)},function(err){return no('notify')})}

function notifyClear(args){if(!plain(args)||typeof args.id!=='string'||!NAME_RE.test(args.id))return Promise.resolve(no('bad-name'));
return Promise.resolve(chrome.notifications.clear(NS+args.id)).then(function(done){return yes(done===true)},function(){return no('notify')})}

// --- закадровый документ: буфер и звук ------------------------------------------------------
//
// У фонового воркера нет ни DOM, ни буфера, ни звука. Chrome даёт для этого
// один закадровый документ на расширение (`chrome.offscreen`); он создаётся по
// первой просьбе и живёт, пока Chrome его не снимет.

function ensureOffscreen(){if(!chrome.offscreen||typeof chrome.offscreen.createDocument!=='function')return Promise.reject(new Error('no-offscreen'));
var has=typeof chrome.offscreen.hasDocument==='function'?Promise.resolve(chrome.offscreen.hasDocument()):Promise.resolve(false);
return has.then(function(yesDoc){if(yesDoc)return;
return chrome.offscreen.createDocument({url:OFFSCREEN_URL,reasons:['CLIPBOARD','AUDIO_PLAYBACK'],justification:'ESHArio: буфер обмена и звук по просьбе кода страницы'}).then(function(){},function(err){if(/single offscreen|only a single/i.test(word(err)))return;
throw err})})}

function offscreen(op,data){return ensureOffscreen().then(function(){return chrome.runtime.sendMessage({target:OFFSCREEN_TARGET,op:op,data:data})}).then(function(answer){return plain(answer)&&answer.ok===true?yes(answer.value):no(plain(answer)&&typeof answer.reason==='string'?answer.reason.slice(0,40):'offscreen')},function(err){return no(word(err)==='no-offscreen'?'no-offscreen':'offscreen')})}

function clipboardWrite(args){if(!plain(args)||typeof args.text!=='string'||args.text.length>BODY_MAX)return Promise.resolve(no('bad-args'));
return offscreen('clipboard.write',{text:args.text})}
function clipboardRead(){return offscreen('clipboard.read',null)}

function audioPlay(args){if(!plain(args)||typeof args.src!=='string')return Promise.resolve(no('bad-args'));
if(!/^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/.test(args.src)||args.src.length>AUDIO_MAX)return Promise.resolve(no('bad-src'));
var volume=Number.isFinite(args.volume)?Math.max(0,Math.min(1,args.volume)):1;
return offscreen('audio.play',{src:args.src,volume:volume})}

// --- загрузка файла -------------------------------------------------------------------------

function safeName(value){if(typeof value!=='string')return null;
var name=value.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/^[.\s]+/,'').slice(0,120);
return name===''?null:name}

function downloadData(filename,mime,base64){var name=safeName(filename);
if(name===null)return Promise.resolve(no('bad-name'));
var type=typeof mime==='string'&&/^[a-z]+\/[a-z0-9.+-]+$/i.test(mime)?mime:'application/octet-stream';
if(base64.length>DOWNLOAD_MAX*1.4)return Promise.resolve(no('too-big'));
return Promise.resolve(chrome.downloads.download({url:'data:'+type+';base64,'+base64,filename:name,conflictAction:'uniquify',saveAs:false})).then(function(id){return yes(id)},function(){return no('download')})}

function downloadText(args){if(!plain(args)||typeof args.text!=='string')return Promise.resolve(no('bad-args'));
var bytes=new TextEncoder().encode(args.text);
if(bytes.length>DOWNLOAD_MAX)return Promise.resolve(no('too-big'));
return downloadData(args.filename,typeof args.mime==='string'?args.mime:'text/plain',toBase64(bytes))}

function downloadBytes(args){if(!plain(args)||typeof args.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(args.base64))return Promise.resolve(no('bad-args'));
return downloadData(args.filename,args.mime,args.base64)}

// --- вкладки ---------------------------------------------------------------------------------

function tabOf(args,sender){var id=plain(args)&&Number.isSafeInteger(args.tabId)?args.tabId:(sender&&sender.tab&&Number.isSafeInteger(sender.tab.id)?sender.tab.id:null);
if(id===null)return Promise.resolve(null);
return chrome.tabs.get(id).then(function(tab){return tab||null},function(){return null})}

function tabsOpen(args){if(!plain(args)||!inPassport(args.url))return Promise.resolve(no('outside-passport'));
return chrome.tabs.create({url:args.url,active:args.active!==false}).then(function(tab){return yes({id:tab&&tab.id})},function(){return no('tabs')})}

function tabsFocus(args,sender){return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
return chrome.tabs.update(tab.id,{active:true}).then(function(){return chrome.windows&&chrome.windows.update?chrome.windows.update(tab.windowId,{focused:true}):null}).then(function(){return yes(true)},function(){return no('tabs')})})}

function tabsReload(args,sender){return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
return chrome.tabs.reload(tab.id).then(function(){return yes(true)},function(){return no('tabs')})})}

function tabsQuery(){return Promise.all([chrome.tabs.query({}),L.effectiveConfig()]).then(function(all){var config=all[1];
return yes((all[0]||[]).filter(function(tab){return inPassport(tab.url)}).map(function(tab){return{id:tab.id,url:tab.url,title:typeof tab.title==='string'?tab.title.slice(0,200):'',active:tab.active===true,windowId:tab.windowId,status:tab.status||null,webapp:isWebapp(tab.url,config)}}))},function(){return no('tabs')})}

/**
 * ПЕРЕИЗБРАНИЕ МОСТА И КОДА БЕЗ F5 (долг CS-REINJECT). Только вкладка вебапа.
 * Внимание: старый код страницы в этой вкладке продолжает жить (у него лишь
 * оборвался мост); второй экземпляр не должен дублировать экраны, и это
 * решает код страницы, который зовёт дверь. Сам загрузчик её не зовёт.
 */
function scriptingInject(args,sender){return Promise.all([tabOf(args,sender),L.effectiveConfig()]).then(function(all){var tab=all[0];
if(!tab||!isWebapp(tab.url,all[1]))return no('not-webapp');
return chrome.scripting.executeScript({target:{tabId:tab.id},files:['content/content.js']}).then(function(){return yes(true)},function(){return no('scripting')})})}

// --- пункт контекстного меню -----------------------------------------------------------------

function menuAdd(args){if(!plain(args)||typeof args.id!=='string'||!NAME_RE.test(args.id)||typeof args.title!=='string'||args.title==='')return Promise.resolve(no('bad-args'));
var contexts=Array.isArray(args.contexts)?args.contexts.filter(function(one){return MENU_CONTEXTS.indexOf(one)>=0}):['page'];
if(contexts.length===0)contexts=['page'];
return new Promise(function(resolve){try{chrome.contextMenus.create({id:NS+args.id,title:args.title.slice(0,100),contexts:contexts,documentUrlPatterns:['https://*.ea.com/*']},function(){var err=chrome.runtime.lastError;
resolve(err?no(/duplicate/i.test(word(err))?'duplicate':'menu'):yes(args.id))})}catch(err){resolve(no('menu'))}})}

function menuRemove(args){if(!plain(args)||typeof args.id!=='string'||!NAME_RE.test(args.id))return Promise.resolve(no('bad-name'));
return Promise.resolve(chrome.contextMenus.remove(NS+args.id)).then(function(){return yes(true)},function(){return no('menu')})}

// --- прочее ---------------------------------------------------------------------------------

function idleState(args){var seconds=plain(args)&&Number.isSafeInteger(args.seconds)?Math.max(15,Math.min(3600,args.seconds)):60;
return Promise.resolve(chrome.idle.queryState(seconds)).then(function(state){return yes(state)},function(){return no('idle')})}

function runtimeInfo(){try{var manifest=chrome.runtime.getManifest();
return Promise.resolve(yes({version:manifest.version,id:chrome.runtime.id,name:manifest.name,permissions:manifest.permissions||[],hostPermissions:manifest.host_permissions||[]}))}catch(err){return Promise.resolve(no('runtime'))}}

// --- права про запас (LOADER-FINAL-1 §1 п.2) --------------------------------------------
//
// В паспорте лежат `optional_host_permissions` (любой https сайт) и
// `optional_permissions` (`cookies`, `tabCapture`, `management`): Chrome их не
// выдаёт сам, выдаёт только человек нажатием. Код страницы может спросить,
// выдано ли (`perm.contains`); просить (`perm.request`) может только страница
// самого расширения: Chrome требует жест человека, а жест бывает только там
// (кнопка оболочки окна аккаунта, `account/shell.js`, зовёт Chrome сама). Из
// вебапа и с сайта просьба отвергается словом `extension-page-only`.

var PERM_LIST_MAX=20;

function permSet(args){if(!plain(args))return null;
var out={};
var origins=args.origins===undefined?[]:args.origins,permissions=args.permissions===undefined?[]:args.permissions;
if(!Array.isArray(origins)||!Array.isArray(permissions)||origins.length+permissions.length===0||origins.length>PERM_LIST_MAX||permissions.length>PERM_LIST_MAX)return null;
for(var i=0;i<origins.length;i+=1)if(typeof origins[i]!=='string'||!/^https:\/\/[^\s]{1,200}$/.test(origins[i]))return null;
for(var j=0;j<permissions.length;j+=1)if(typeof permissions[j]!=='string'||!/^[A-Za-z]{2,40}$/.test(permissions[j]))return null;
if(origins.length>0)out.origins=origins.slice();
if(permissions.length>0)out.permissions=permissions.slice();
return out}

function permContains(args){var set=permSet(args);
if(set===null)return Promise.resolve(no('bad-args'));
return Promise.resolve(chrome.permissions.contains(set)).then(function(has){return yes(has===true)},function(){return no('permissions')})}

function permRequest(args,sender){if(!extensionPage(sender))return Promise.resolve(no('extension-page-only'));
var set=permSet(args);
if(set===null)return Promise.resolve(no('bad-args'));
return Promise.resolve(chrome.permissions.request(set)).then(function(given){return yes(given===true)},function(err){return no(/gesture/i.test(word(err))?'gesture':'permissions')})}

// --- правила сети (LOADER-FINAL-1 §1 п.3б) ----------------------------------------------
//
// Динамические правила `declarativeNetRequest` по просьбе кода страницы: номера
// 7000 по 7999, не больше 50, только `block`, `allow` и `modifyHeaders` (запроса
// и ответа), и только для адресов паспорта и выданных прав: у правила обязан
// быть список `requestDomains`, и каждый узел в нём наш. `set` заменяет все
// правила двери разом, `clear` снимает их, `list` показывает. Правило
// загрузчика (`cspRelax`, номер 8000) дверь не видит и не трогает.

var RULE_TYPES=['block','allow','modifyHeaders'];
var HEADER_OPS=['set','remove','append'];
var RESOURCE_TYPES=['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','webtransport','webbundle','other'];
var HOST_RE=/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/;

function headerList(list){if(list===undefined)return[];
if(!Array.isArray(list)||list.length===0||list.length>20)return null;
var out=[];
for(var i=0;i<list.length;i+=1){var one=list[i];
if(!plain(one)||typeof one.header!=='string'||!/^[A-Za-z0-9-]{1,100}$/.test(one.header)||HEADER_OPS.indexOf(one.operation)<0)return null;
if(/^(?:cookie|cookie2|set-cookie)$/i.test(one.header))return null;
var row={header:one.header,operation:one.operation};
if(one.operation!=='remove'){if(typeof one.value!=='string'||one.value.length>2000)return null;
row.value=one.value}
out.push(row)}
return out}

/** Одно правило в годной форме, или слово причины. */
function ruleOf(raw){if(!plain(raw)||!Number.isSafeInteger(raw.id)||raw.id<RULE_MIN||raw.id>RULE_MAX)return 'bad-id';
var action=raw.action,condition=raw.condition;
if(!plain(action)||RULE_TYPES.indexOf(action.type)<0)return 'bad-action';
if(!plain(condition)||!Array.isArray(condition.requestDomains)||condition.requestDomains.length===0||condition.requestDomains.length>20)return 'no-domains';
var rule={id:raw.id,priority:Number.isSafeInteger(raw.priority)?Math.max(1,Math.min(100,raw.priority)):1,action:{type:action.type},condition:{requestDomains:[]}};
if(action.type==='modifyHeaders'){var req=headerList(action.requestHeaders),res=headerList(action.responseHeaders);
if(req===null||res===null||req.length+res.length===0)return 'bad-headers';
if(req.length>0)rule.action.requestHeaders=req;
if(res.length>0)rule.action.responseHeaders=res}
for(var i=0;i<condition.requestDomains.length;i+=1){var host=String(condition.requestDomains[i]).toLowerCase();
if(!HOST_RE.test(host))return 'bad-domain';
rule.condition.requestDomains.push(host)}
if(condition.urlFilter!==undefined){if(typeof condition.urlFilter!=='string'||condition.urlFilter===''||condition.urlFilter.length>500)return 'bad-filter';
rule.condition.urlFilter=condition.urlFilter}
if(condition.regexFilter!==undefined){if(typeof condition.regexFilter!=='string'||condition.regexFilter===''||condition.regexFilter.length>500||rule.condition.urlFilter!==undefined)return 'bad-filter';
rule.condition.regexFilter=condition.regexFilter}
if(condition.resourceTypes!==undefined){if(!Array.isArray(condition.resourceTypes)||condition.resourceTypes.length===0||condition.resourceTypes.some(function(one){return RESOURCE_TYPES.indexOf(one)<0}))return 'bad-types';
rule.condition.resourceTypes=condition.resourceTypes.slice()}
return rule}
L.ruleOf=ruleOf;

function doorRuleIds(){return Promise.resolve(chrome.declarativeNetRequest.getDynamicRules()).then(function(rules){return(rules||[]).filter(function(rule){return rule&&rule.id>=RULE_MIN&&rule.id<=RULE_MAX})})}

function rulesSet(args){if(!plain(args)||!Array.isArray(args.rules)||args.rules.length>RULES_CAP)return Promise.resolve(no('bad-args'));
var rules=[],ids={};
for(var i=0;i<args.rules.length;i+=1){var rule=ruleOf(args.rules[i]);
if(typeof rule==='string')return Promise.resolve(no(rule));
if(ids[rule.id])return Promise.resolve(no('bad-id'));
ids[rule.id]=true;
rules.push(rule)}
var hosts=[];
rules.forEach(function(rule){rule.condition.requestDomains.forEach(function(host){if(hosts.indexOf(host)<0)hosts.push(host)})});
return Promise.all(hosts.map(function(host){return granted('https://'+host+'/')})).then(function(all){if(all.some(function(ok){return !ok}))return no('outside-passport');
return doorRuleIds().then(function(existing){return Promise.resolve(chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:existing.map(function(rule){return rule.id}),addRules:rules})).then(function(){return yes(rules.length)})})}).then(function(v){return v},function(err){return no(word(err).slice(0,60)||'rules')})}

function rulesClear(){return doorRuleIds().then(function(existing){return Promise.resolve(chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:existing.map(function(rule){return rule.id})})).then(function(){return yes(existing.length)})}).then(function(v){return v},function(){return no('rules')})}

function rulesList(){return doorRuleIds().then(function(rules){return yes(rules)},function(){return no('rules')})}

// --- кадр видимой вкладки (LOADER-FINAL-1 §1 п.5) ---------------------------------------
//
// Для «Сообщить о проблеме» с кадром: снимок той вкладки паспорта, что видна в
// своём окне сейчас (`captureVisibleTab` снимает только видимую), jpeg,
// качество 40 по 90, ответ `data:image/jpeg…` не длиннее 4 МБ.

function tabsCapture(args,sender){var quality=plain(args)&&Number.isSafeInteger(args.quality)?Math.max(40,Math.min(90,args.quality)):70;
return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
if(tab.active!==true)return no('not-visible');
return Promise.resolve(chrome.tabs.captureVisibleTab(tab.windowId,{format:'jpeg',quality:quality})).then(function(dataUrl){if(typeof dataUrl!=='string'||dataUrl.indexOf('data:image/jpeg')!==0)return no('capture');
if(dataUrl.length>CAPTURE_MAX)return no('too-big');
return yes(dataUrl)},function(){return no('capture')})})}

// --- экран не гаснет (LOADER-FINAL-1 §1 п.5) ----------------------------------------------
//
// Пока идёт снайп, экран (`display`) или машина (`system`) не засыпают. Просьба
// снимается дверью `power.release` или сама, когда закрыта последняя вкладка
// вебапа (`tabs.onRemoved`): забытая просьба не держит машину без вебапа.

function powerKeep(args){var level=plain(args)&&args.level==='system'?'system':'display';
if(!chrome.power||typeof chrome.power.requestKeepAwake!=='function')return Promise.resolve(no('power'));
try{chrome.power.requestKeepAwake(level)}catch(err){return Promise.resolve(no('power'))}
var payload={};
payload[POWER_KEY]={level:level,at:Date.now()};
return chrome.storage.local.set(payload).then(function(){return yes(level)},function(){return yes(level)})}

function powerRelease(){if(!chrome.power||typeof chrome.power.releaseKeepAwake!=='function')return Promise.resolve(no('power'));
try{chrome.power.releaseKeepAwake()}catch(err){return Promise.resolve(no('power'))}
return chrome.storage.local.remove(POWER_KEY).then(function(){return yes(true)},function(){return yes(true)})}

/** Закрыли вкладку: если просьба держится, а вкладок вебапа больше нет, она снимается. */
function powerOnTabClosed(){return chrome.storage.local.get(POWER_KEY).then(function(stored){if(!stored||!stored[POWER_KEY])return false;
return webappTabs().then(function(tabs){if(tabs.length>0)return false;
return powerRelease().then(function(){return true})})},function(){return false})}
L.powerOnTabClosed=powerOnTabClosed;

// --- текст в вкладку паспорта (LOADER-FINAL-1 §1 п.5) -------------------------------------
//
// `world: 'MAIN'` (умолчание): текст до 1 МБ кладётся в мир страницы той же
// функцией, что код страницы (`L.intoPage`: узел, текст, снятие). `ISOLATED`:
// ТОЛЬКО файлом папки, и только мостом `content/content.js`: текст в
// изолированный мир расширения Chrome не исполнит (политика расширения не
// пускает ни `new Function`, ни текстовый скрипт), поэтому текста там нет вовсе.
// Наш сайт мостом вебапа не переизбирается: там свой мост.

var ISOLATED_FILES=['content/content.js'];

function scriptingRun(args,sender){if(!plain(args))return Promise.resolve(no('bad-args'));
var world=args.world===undefined?'MAIN':args.world;
if(world!=='MAIN'&&world!=='ISOLATED')return Promise.resolve(no('bad-world'));
if(world==='MAIN'&&(typeof args.text!=='string'||args.text===''||args.text.length>RUN_MAX))return Promise.resolve(no('bad-text'));
if(world==='ISOLATED'&&args.text!==undefined&&args.text!==null)return Promise.resolve(no('isolated-text'));
var file=args.file===undefined?ISOLATED_FILES[0]:args.file;
if(world==='ISOLATED'&&ISOLATED_FILES.indexOf(file)<0)return Promise.resolve(no('bad-file'));
return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
if(world==='ISOLATED'&&isSite(tab.url))return no('site-tab');
var call=world==='MAIN'?{target:{tabId:tab.id},world:'MAIN',func:L.intoPage,args:[[{text:args.text,attrs:null}]]}:{target:{tabId:tab.id},files:[file]};
return Promise.resolve(chrome.scripting.executeScript(call)).then(function(results){var got=Array.isArray(results)&&results[0]&&plain(results[0].result)?results[0].result:null;
return yes({ran:got&&Number.isSafeInteger(got.ran)?got.ran:(world==='ISOLATED'?1:null)})},function(){return no('scripting')})})}

// --- боковая панель (LOADER-FINAL-1 §1 п.5, п.6) ------------------------------------------
//
// Общее «есть ли панель» решает сервер (`config.sidePanel`, `loader/code.js`).
// Дверь включает или гасит панель только для одной вкладки паспорта (своей или
// названной): настройка вкладки сильнее общей и не спорит с сервером.
// `sidepanel.open` Chrome исполняет только в ответ на действие человека.

function sidepanelEnable(args,sender){var on=plain(args)&&args.on===true;
if(!chrome.sidePanel||typeof chrome.sidePanel.setOptions!=='function')return Promise.resolve(no('sidepanel'));
return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
return Promise.resolve(chrome.sidePanel.setOptions({tabId:tab.id,path:L.PANEL_PATH,enabled:on})).then(function(){return yes(on)},function(){return no('sidepanel')})})}

function sidepanelOpen(args,sender){if(!chrome.sidePanel||typeof chrome.sidePanel.open!=='function')return Promise.resolve(no('sidepanel'));
return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
return Promise.resolve(chrome.sidePanel.open({tabId:tab.id})).then(function(){return yes(true)},function(err){return no(/gesture|user action/i.test(word(err))?'gesture':'sidepanel')})})}

// --- рамки вкладки (право `webNavigation`, LOADER-FINAL-1 §1 п.2) --------------------------

function navFrames(args,sender){if(!chrome.webNavigation||typeof chrome.webNavigation.getAllFrames!=='function')return Promise.resolve(no('nav'));
return tabOf(args,sender).then(function(tab){if(!tab||!inPassport(tab.url))return no('outside-passport');
return Promise.resolve(chrome.webNavigation.getAllFrames({tabId:tab.id})).then(function(frames){return yes((frames||[]).slice(0,200).map(function(frame){return{frameId:frame.frameId,parentFrameId:frame.parentFrameId,url:inPassport(frame.url)?frame.url:null}}))},function(){return no('nav')})})}

/** Кто вошёл: номер и подсказка почты из снимка права. Сессия наружу не уходит никогда. */
function accountWho(){return chrome.storage.local.get('account.snapshot').then(function(stored){var kept=stored&&stored['account.snapshot'];
var account=plain(kept)&&plain(kept.answer)&&plain(kept.answer.account)?kept.answer.account:null;
if(!account||typeof account.id!=='string')return yes({signedIn:false,id:null,hint:null});
return yes({signedIn:true,id:account.id,hint:typeof account.hint==='string'?account.hint:null})},function(){return no('storage')})}

var DOORS={
'net.fetch':netFetch,
'store.get':storeGet,'store.set':storeSet,'store.remove':storeRemove,'store.keys':storeKeys,
'alarm.set':alarmSet,'alarm.clear':alarmClear,'alarm.list':alarmList,
'notify.show':notifyShow,'notify.clear':notifyClear,
'clipboard.read':clipboardRead,'clipboard.write':clipboardWrite,
'download.text':downloadText,'download.bytes':downloadBytes,
'tabs.open':tabsOpen,'tabs.focus':tabsFocus,'tabs.reload':tabsReload,'tabs.query':tabsQuery,
'scripting.inject':scriptingInject,
'offscreen.audio':audioPlay,
'menu.add':menuAdd,'menu.remove':menuRemove,
'idle.state':idleState,
'runtime.info':runtimeInfo,
'code.status':function(){return L.status().then(yes,function(){return no('loader')})},
'code.refresh':function(){return L.check('manual').then(function(){return L.status()}).then(yes,function(){return no('loader')})},
// Настройки: открытое поле сервера без восьми флагов папки плюс флаги из
// подписанной записи (LOADER-FINAL-1 дописка 4 п.1, `L.effectiveConfig`).
'config.get':function(){return L.effectiveConfig().then(yes,function(){return no('storage')})},
'account.who':accountWho,
// LOADER-FINAL-1: двери на год вперёд, по одной на каждое новое право паспорта.
'perm.contains':permContains,'perm.request':permRequest,
'net.rules.set':rulesSet,'net.rules.clear':rulesClear,'net.rules.list':rulesList,
'tabs.capture':tabsCapture,
'power.keepAwake':powerKeep,'power.release':powerRelease,
'scripting.run':scriptingRun,
'sidepanel.enable':sidepanelEnable,'sidepanel.open':sidepanelOpen,
'nav.frames':navFrames};

L.DOOR_NAMES=Object.freeze(Object.keys(DOORS).sort());

/**
 * ДВЕРИ НАШЕГО САЙТА УЗКИЕ (дописка 2 п.3). На страницах eshario.com бывают
 * чужие скрипты (проверочный код платёжного партнёра, счётчик), а жетон сайта
 * лежит на корне документа и прямой путь `externally_connectable` открыт любому
 * скрипту наших страниц. Поэтому сайту открыто только «кто я и что у меня»:
 * кто вошёл, что с кодом, сведения о расширении (плюс `hello`). Прочие двери
 * сайту отвечают `no-door`, с какого бы пути он ни пришёл. Оболочка окна
 * аккаунта не сайт: она страница расширения и ходит своим путём.
 */
var SITE_DOORS=Object.freeze(['account.who','code.status','runtime.info']);
L.SITE_DOORS=SITE_DOORS;

/** Просьба пришла со страницы нашего сайта (мост `content/site.js`). */
function fromSitePage(sender){return !!sender&&typeof sender.url==='string'&&isSite(sender.url)}

/**
 * Одна дверь. `sender` называет Chrome, а не просьба: чужой мир не может
 * назваться своим.
 */
L.door=function(params,sender,external){return(external?Promise.resolve(true):trusted(sender)).then(function(ok){if(!ok)return no('untrusted');
if(!plain(params)||typeof params.name!=='string')return no('bad-door');
if((external||fromSitePage(sender))&&SITE_DOORS.indexOf(params.name)<0)return no('no-door');
var work=Object.prototype.hasOwnProperty.call(DOORS,params.name)?DOORS[params.name]:null;
if(work===null)return no('no-door');
try{return Promise.resolve(work(params.args,sender)).then(function(result){return plain(result)&&typeof result.ok==='boolean'?result:no('door-error')},function(){return no('door-error')})}catch(err){return no('door-error')}},function(){return no('door-error')})};

// --- наш сайт напрямую (externally_connectable) ---------------------------------------------------

function siteSender(sender){if(!sender)return false;
var origin=typeof sender.origin==='string'&&sender.origin!=='null'?sender.origin:(typeof sender.url==='string'?sender.url:'');
return isSite(origin)}

L.external=function(message,sender){if(!siteSender(sender))return Promise.resolve(no('untrusted'));
if(!plain(message))return Promise.resolve(no('bad-message'));
if(message.method==='hello')return accountWho().then(function(who){var id='';
try{id=chrome.runtime.id}catch(err){}
return yes({installed:true,version:L.own(),id:id,account:who.ok?who.value:null})});
if(message.method==='door')return L.door(message.params,sender,true);
return Promise.resolve(no('no-method'))};

// --- слушатели ---------------------------------------------------------------------------------

try{chrome.runtime.onMessageExternal.addListener(function(message,sender,sendResponse){L.external(message,sender).then(sendResponse,function(){sendResponse(no('loader-error'))});
return true})}catch(err){}
try{chrome.alarms.onAlarm.addListener(function(alarm){if(!alarm||typeof alarm.name!=='string'||alarm.name.indexOf(NS)!==0)return;
void deliver('door.alarm',{name:alarm.name.slice(NS.length),scheduledTime:alarm.scheduledTime},true)})}catch(err){}
try{chrome.notifications.onClicked.addListener(function(id){if(typeof id!=='string'||id.indexOf(NS)!==0)return;
void deliver('door.notify',{id:id.slice(NS.length),action:'click'},false)})}catch(err){}
// Команды клавиш (LOADER-FINAL-1 §1 п.5): три команды паспорта без клавиш по
// умолчанию; человек назначает клавиши сам на chrome://extensions/shortcuts, а
// что делать, решает код страницы (например, «стоп всему» с любой вкладки).
try{chrome.commands.onCommand.addListener(function(command,tab){if(typeof command!=='string'||!COMMAND_RE.test(command))return;
void deliver('door.command',{name:command,tabId:tab&&Number.isSafeInteger(tab.id)?tab.id:null},false)})}catch(err){}
// Права сменились (кнопка оболочки, «Сведения» Chrome): известие в вебап, мост
// на выданных сайтах сверяется заново (LOADER-FINAL-1 §1 п.2).
function permissionsChanged(kind){return function(change){var out={kind:kind,origins:plain(change)&&Array.isArray(change.origins)?change.origins.slice(0,PERM_LIST_MAX):[],permissions:plain(change)&&Array.isArray(change.permissions)?change.permissions.slice(0,PERM_LIST_MAX):[]};
void deliver('door.permissions',out,false);
if(typeof L.applyConfig==='function')void L.applyConfig()}}
try{chrome.permissions.onAdded.addListener(permissionsChanged('added'))}catch(err){}
try{chrome.permissions.onRemoved.addListener(permissionsChanged('removed'))}catch(err){}
// Закрыта вкладка: просьба «экран не гаснет» не переживает последний вебап.
try{chrome.tabs.onRemoved.addListener(function(){void powerOnTabClosed()})}catch(err){}
try{chrome.contextMenus.onClicked.addListener(function(info,tab){if(!info||typeof info.menuItemId!=='string'||info.menuItemId.indexOf(NS)!==0||!tab||!Number.isSafeInteger(tab.id))return;
void sendEvent(tab.id,'door.menu',{id:info.menuItemId.slice(NS.length),selectionText:typeof info.selectionText==='string'?info.selectionText.slice(0,2000):null,linkUrl:info.linkUrl||null,srcUrl:info.srcUrl||null,pageUrl:info.pageUrl||null})})}catch(err){}
})()


})(host.bg,host.fetch,host.global);
// --- src/background/worker.js (byte for byte) ---
(function(chrome,fetch,importScripts,globalThis){
// Фоновый service worker. Ходит в сеть за тем, до чего страница не дотянется:
// за ценами FUT.GG и за ценой сборки набора SBC.
//
// ЗАЧЕМ ОН ВООБЩЕ ПОЯВИЛСЯ (решение итерации 5 «воркер не заводим» отменено):
// FUT.GG публикует manifest/index/platform blobs на отдельном R2 origin.
// Доступ к нему ограничен и host_permissions, и точным шаблоном пути ниже.
//
// Классический скрипт, а не модуль: импортов здесь нет, а классический файл
// исполняется в песочнице node:vm целиком — тем же способом, которым проверен
// content.js. Модульный воркер пришлось бы проверять пересказом.
//
// РАЗБОРА ЦЕНЫ ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО. Воркер отдаёт сырое тело ответа;
// понимать его — дело src/features/futgg.js, где это уже написано и покрыто
// тестами. Логика в двух местах разъезжается, доставка байтов — нет.
(function(){'use strict';

/** Точный origin официальных price blobs FUT.GG. */
var PRICE_ORIGIN='https://r2.fut.gg';

/**
 * Разрешены manifest и блобы, которые манифест объявляет.
 *
 * Имя блоба перечислить нельзя: кроме цен нам нужны промо-списки редкостей
 * (`futties`, `fut-birthday`, …), а их имена меняются от промо к промо
 * (RECON 183). Поэтому здесь проверяется ФОРМА адреса — имя, версия и хеш
 * через точку с расширением json в папке игры, — а какое имя законно,
 * решает манифест: страница
 * берёт имена только из него, и файл неверной формы отбрасывается разбором.
 * Origin по-прежнему один и тот же, и это главная защита.
 */
var PRICE_PATH_RE=/^\/[0-9]+\/(?:manifest\.json|[a-z0-9][a-z0-9-]{0,40}\.v[0-9]+\.[A-Za-z0-9_-]+\.json)$/;

/**
 * МАНИФЕСТ БЕРЁТСЯ МИМО HTTP-КЭША БРАУЗЕРА (разведка S4, RECON 222).
 *
 * Адрес манифеста один и тот же всегда, а отдаётся он с `max-age=60`. Значит
 * браузер вправе честно ответить своей копией, и к нашей минуте ожидания
 * добавляется ещё до минуты чужой — цена стареет на ровном месте. `no-cache`
 * не отключает кэш, а требует перепроверить: ответ 304 стоит одного заголовка.
 *
 * Файлы цен сюда НЕ попадают намеренно: их имя содержит хеш, отдаются они
 * `immutable`, и перепроверять там нечего — новый файл приезжает новым именем.
 */
var MANIFEST_PATH_RE=/^\/[0-9]+\/manifest\.json$/;

/** Метод моста. Продублирован из src/bridge/page-client.js — сверяется тестом. */
var METHOD='price.fetch';

/**
 * Deployment-owned account origin.
 *
 * ВКЛЮЧЕНО 07.09.2026 (кирпич ACCOUNT-4, коммит включения — по слову владельца
 * «1.1.0 упакован»). До этого дня строка была пуста НАРОЧНО: пакет 1.1.0 уходил
 * в магазин без нового разрешения, и вся стройка линии аккаунта лежала в нём
 * мёртвым грузом — `accountRoot()` возвращает `null` и ни одного запроса не
 * делает вовсе.
 *
 * ОДИН ТОЧНЫЙ ORIGIN, И ОН ЖЕ ЕДИНСТВЕННЫЙ В `host_permissions`. Сервер стоит
 * на своём VPS за собственным туннелем cloudflared (отчёт стадии 2); адрес
 * разбирается `new URL` и сверяется целиком, а не префиксом строки:
 * `https://api.eshario.com.example.net` начинается с нужных знаков и ведёт
 * совсем не туда.
 */
var ACCOUNT_ORIGIN='https://api.eshario.com';
/**
 * АДРЕС СЕРВЕРА ИЗ СПИСКА ЗАГРУЗЧИКА (кирпич LOADER-FINAL-1 §1 п.1в). Строка выше
 * остаётся выключателем линии аккаунта (пустая: запросов нет вовсе) и адресом
 * по умолчанию; живой адрес берётся у загрузчика (`loader/code.js`, `L.origin()`):
 * кто ответил на последний вопрос о коде, или первый в списке, где впереди
 * адреса подписанной управляющей записи. Домен сервера заблокировали или
 * переехали: окно аккаунта, база карт и строка обновления идут следом за кодом,
 * без нового архива. Ключ сессии тот же: сервер тот же, другое только имя.
 */
function accountOrigin(){if(typeof ACCOUNT_ORIGIN!=='string'||ACCOUNT_ORIGIN==='')return '';
var loader=globalThis.esharioLoader;
var live=loader&&typeof loader.origin==='function'?loader.origin():null;
return typeof live==='string'&&live!==''?live:ACCOUNT_ORIGIN}
var ACCOUNT_SESSION_KEY='account.session';
var ACCOUNT_DEVICE_KEY='account.device';
var ACCOUNT_SNAPSHOT_KEY='account.snapshot';
/**
 * МЕТКА «СЕРВЕР ОТВЕТИЛ 401» (задание A97-FIX п.2, СТОП A97-01).
 *
 * ЗАЧЕМ ОНА НА ДИСКЕ. 401 уносит сессию — и следующий вопрос про аккаунт
 * приходит уже БЕЗ сессии, то есть выглядит неотличимо от «в аккаунт никогда
 * не входили». А это единственный случай, когда партнёрский ключ снова
 * становится главным. Без метки отзыв сессии открывал бы премиум по старому
 * ключу: достаточно спросить второй раз.
 *
 * СНИМАЮТ ЕЁ ДВОЕ, И ОБА — ДЕЙСТВИЕ ЧЕЛОВЕКА: успешный вход и явный выход.
 * Выход руками и есть «сессии аккаунта нет» по слову владельца, после него
 * ключ отвечает законно. Подъём воркера метку не трогает — она переживает и
 * смерть воркера, и перезапуск браузера.
 */
var ACCOUNT_DENIED_KEY='account.denied';
var ACCOUNT_TIMEOUT_MS=5000;

/**
 * СКОЛЬКО ЖИВЁТ СОХРАНЁННОЕ ПРАВО БЕЗ СЕТИ — СЕМЬ СУТОК (задание ACCOUNT-4
 * п.3, правка закона «сервер единственный судья»).
 *
 * ЗАЧЕМ ВООБЩЕ. До этого кирпича один отказ сети означал FREE: человек с
 * оплаченной подпиской, у которого моргнул интернет или лёг наш сервер, читал
 * это как поломку расширения (живой баг владельца 24.08, шапка
 * `licensing/account.js`). Снимок права ПОДПИСАН сервером, и предъявить его
 * повторно — не «поверить пользователю на слово», а показать ту же бумагу,
 * которую сервер уже выдал.
 *
 * ПОЧЕМУ СРОК СЧИТАЕТСЯ ОТ `iat` СНИМКА, А НЕ ОТ ВРЕМЕНИ ЗАПИСИ. `iat` лежит
 * ВНУТРИ подписи: подделать его нельзя, не сломав подпись. Время записи —
 * наше собственное поле в `chrome.storage.local`, и человек, который правит
 * хранилище, продлевал бы им подписку бесконечно. Разница между этими двумя
 * числами — миллисекунды сети, а разница в честности — вся.
 *
 * СРОК САМОГО ПРАВА ЭТИМ НЕ ПРОДЛЕВАЕТСЯ. Истёкший `exp` внутри снимка
 * закрывает премиум сразу и на любой день кэша: его проверяет
 * `verifyLicenseKey` в странице, и семь суток к нему отношения не имеют.
 */
var ACCOUNT_CACHE_MS=604800000;

/**
 * ЗАПАС НА РАЗЪЕХАВШИЕСЯ ЧАСЫ — пять минут, и ни минутой больше.
 *
 * `iat` ставит сервер по своим часам, а сравниваем мы с часами машины
 * человека. Расхождение в секунды — обычное дело, и без запаса честный
 * свежий снимок изредка объявлялся бы «выданным в будущем». Запас нужен
 * только на это: всё, что дальше пяти минут вперёд, — не скос, а подделка,
 * и права такой снимок не даёт.
 */
var ACCOUNT_CLOCK_SKEW_MS=300000;

/**
 * КАК ЧАСТО СЕРВЕР СПРАШИВАЕТСЯ ЗАНОВО ПРИ ЖИВОЙ СЕТИ — раз в шесть часов.
 *
 * Тариф спрашивается на КАЖДЫЙ возврат фокуса в страницу EA (см. шапку
 * `licensing/account.js`), а человек за день уводит и возвращает фокус
 * десятки раз. Без этой отсечки каждый такой возврат стоил бы запроса к
 * нашему серверу — при том, что подписка меняется раз в месяц.
 *
 * ПЕРВЫЙ ВОПРОС ПОСЛЕ ПОДЪЁМА ВОРКЕРА ИДЁТ В СЕТЬ ВСЕГДА (`accountAsked`
 * ниже): воркер MV3 умирает через десятки секунд простоя, и его подъём —
 * единственный честный признак «сеанс начался заново».
 */
var ACCOUNT_FRESH_MS=21600000;

/** Спрашивали ли сервер после подъёма ЭТОГО воркера. Не переживает MV3 нарочно. */
var accountAsked=false;

/**
 * Проверка адреса ДО обращения к сети.
 *
 * Без неё воркер становится открытым прокси: любой скрипт на странице EA —
 * включая чужие расширения и код самой EA — мог бы просить наше расширение
 * сходить куда угодно с его привилегиями и прочитать ответ, недоступный
 * странице. Сравнивается разобранный origin, а не префикс строки:
 * `https://r2.fut.gg.example.com` начинается с нужных символов, но ведёт
 * совсем не туда.
 */
function isAllowedUrl(url,origin){if(typeof url!=='string'||url==='') return false;
var parsed;
try{parsed=new URL(url)}catch(err){return false}
return parsed.protocol==='https:'&&parsed.origin===origin}

function isAllowedPriceUrl(url){if(!isAllowedUrl(url,PRICE_ORIGIN))return false;
try{var parsed=new URL(url);
return parsed.search===''&&parsed.hash===''&&PRICE_PATH_RE.test(parsed.pathname)}catch(err){return false}}

/**
 * ЦЕНА СБОРКИ НАБОРА SBC И ГОЛОСА ЗА НЕГО (кирпич SBT-2, решение владельца
 * 2026-08-21). Второй origin FUT.GG — сайтовый, не складской: цены карт лежат
 * на R2, а цена решения набора отдаётся их же открытым API.
 *
 * ЗДЕСЬ РАЗРЕШЕНЫ ДВА ТОЧНЫХ ПУТИ И НИЧЕГО БОЛЬШЕ. Манифест снимает CORS со
 * всего `/api/*` — этого требует Chrome, шаблоны там грубые, — а решать, куда
 * именно можно сходить, обязан тот, кто ходит. Иначе одна строка манифеста
 * превращает воркер в открытый прокси по чужому API.
 *
 * ЗАПРОС ПРОВЕРЯЕТСЯ ЦЕЛИКОМ, А НЕ ТОЛЬКО ПУТЬ. У списка законен ровно один
 * параметр — номер страницы; у голосов — список ключей вида `20_<id>` (20 это
 * тип сущности «набор SBC» у FUT.GG, RECON 3580.5). Всё остальное — отказ до
 * обращения к сети.
 */
var SBC_ORIGIN='https://www.fut.gg';
var SBC_LIST_PATH='/api/fut/sbc/';
var SBC_VOTES_PATH='/api/voting/entities/';
var SBC_PAGE_RE=/^page=[1-9][0-9]{0,2}$/;
var SBC_VOTES_RE=/^identifiers=20_[0-9]{1,9}(?:,20_[0-9]{1,9}){0,199}$/;

function isAllowedSbcUrl(url){if(!isAllowedUrl(url,SBC_ORIGIN))return false;
try{var parsed=new URL(url);
if(parsed.hash!=='')return false;
var query=parsed.search===''?'':parsed.search.slice(1);
if(parsed.pathname===SBC_LIST_PATH)return query===''||SBC_PAGE_RE.test(query);
if(parsed.pathname===SBC_VOTES_PATH)return SBC_VOTES_RE.test(query);
return false}catch(err){return false}}

/**
 * ВОЗРАСТ ФАЙЛА ЕДЕТ ОДНИМ ЗАГОЛОВКОМ ВМЕСТЕ С ТЕЛОМ (кирпич S4, решение
 * Fable 2026-08-07). У самих цен FUT.GG времени нет ни в одном файле, а
 * `last-modified` говорит про то тело, которое приехало, — и это единственная
 * честная мерка свежести нашей копии. Строка отдаётся сырой: разбирать её —
 * дело src/features/futgg.js, как и разбор цены.
 */
function lastModified(response){try{var value=response.headers.get('last-modified');
return typeof value==='string'?value:null}catch(err){return null}}

/**
 * @param {string} url
 * @returns {Promise<{ok: boolean, status?: number, body?: string, modified?: string|null, reason?: string}>}
 */
function fetchPrice(url){if(!isAllowedPriceUrl(url)&&!isAllowedSbcUrl(url)) return Promise.resolve({ok:false,reason:'forbidden-url'});

// credentials: 'omit' — куки пользователя на сторонний сайт не уходят.
// Любой 403 доедет до источника отдельным typed отказом. Отправлять
// стороннему сайту куки ради цены на карту всё равно не требуется.
var init={credentials:'omit',headers:{accept:'application/json'}};
if(MANIFEST_PATH_RE.test(new URL(url).pathname))init.cache='no-cache';
return fetch(url,init).then(function(response){var modified=lastModified(response);
return response.text().then(function(body){return{ok:true,status:response.status,body:body,modified:modified}},function(){return{ok:true,status:response.status,body:'',modified:modified}})},function(){return{ok:false,reason:'network'}})}

// --- Production account client -------------------------------------------
//
// Credentials and bearer session never cross window.postMessage. Login,
// logout and recovery are called by account/account-ui.js, an extension-owned
// page. content.js exposes only read-only account.status and account.open
// (the latter only asks this worker to open that page; see accountOpen below).
function accountRoot(){var origin=accountOrigin();
if(origin==='')return null;
try{var parsed=new URL(origin);
if(parsed.protocol!=='https:'||parsed.pathname!=='/'||parsed.search||parsed.hash)return null;
return parsed.origin}catch(err){return null}}

function readAccountSession(){return chrome.storage.local.get(ACCOUNT_SESSION_KEY).then(function(stored){var value=stored&&stored[ACCOUNT_SESSION_KEY];
return typeof value==='string'&&/^[A-Za-z0-9_-]{40,}$/.test(value)?value:null})}

/**
 * ПОКОЛЕНИЕ СЕССИИ (кирпич A117-FIX-1, остаток STOP-116-1 по ASTRA-117).
 *
 * Счётчик в памяти воркера растёт на КАЖДОЙ записи и КАЖДОМ стирании сессии, в
 * том же шаге, где запись уходит в хранилище. Сессию пишет только этот воркер,
 * поэтому счётчик видит каждую смену аккаунта.
 *
 * Зачем он, если строку сессии можно прочитать: чтение асинхронно, и вход в
 * другой аккаунт успевал пройти между чтением и записью (пробы L, U, S
 * ASTRA-117). Сверка счётчика синхронна и стоит в одном шаге с запуском
 * записи; воркер однопоточный, а хранилище кладёт записи в порядке вызова.
 * Значит вход либо случился до сверки (и сверка его видит), либо ляжет после
 * записи (и тогда операция честно закончилась при прежнем аккаунте).
 *
 * Новый экземпляр воркера начинает с нуля, но и операций прежнего у него нет:
 * их цепочки умерли вместе с ним.
 */
var sessionEpoch=0;
function writeAccountSession(value){var payload={};
payload[ACCOUNT_SESSION_KEY]=value;
sessionEpoch+=1;
return chrome.storage.local.set(payload)}
function clearAccountSession(){sessionEpoch+=1;
return chrome.storage.local.remove(ACCOUNT_SESSION_KEY)}

/**
 * Сессия, закреплённая за операцией: строка и поколение. Поколение снимается ДО
 * чтения строки: снятое после чтения могло бы уже принадлежать B при строке A.
 * @returns {Promise<{session: string, epoch: number}|null>}
 */
function pinAccountSession(){var epoch=sessionEpoch;
return readAccountSession().then(function(session){return session?{session:session,epoch:epoch}:null})}

/**
 * Побочный эффект только при той же сессии. Строка из хранилища сверяется, как
 * прежде; поколение сверяется в том же синхронном шаге, где `effect` запускает
 * запись. Поэтому `effect` обязан звать хранилище или сеть сразу, без ожидания
 * перед вызовом.
 */
function ifSameSession(pin,effect,refused){return readAccountSession().then(function(now){return now===pin.session&&sessionEpoch===pin.epoch?effect():refused()})}

/**
 * ТРИ СОСТОЯНИЯ МЕТКИ И ПАМЯТЬ ВОРКЕРА (задание A98-FIX п.1, СТОП A98-01).
 *
 * ЧТЕНИЕ ОТВЕЧАЕТ ТРЕМЯ ЗНАЧЕНИЯМИ, А НЕ ДВУМЯ: `true` — метка стоит,
 * `false` — метки нет, `null` — ПРОЧИТАТЬ НЕ УДАЛОСЬ. Прежнее «не смог
 * прочитать — значит метки нет» и было дырой: сломанное хранилище выдавало
 * отказ сервера за «в аккаунт не входили», а это единственное состояние, при
 * котором партнёрский ключ снова становится главным. Незнание не разрешение —
 * тот же закон, что у талонов счётчиков ниже.
 *
 * ПАМЯТЬ СТАВИТСЯ В ТОТ ЖЕ МИГ, ЧТО И НАЧИНАЕТСЯ ЗАПИСЬ, и конца записи не
 * ждёт. Запись асинхронна, а соседняя вкладка спрашивает тариф когда хочет —
 * между началом и концом записи тоже. Память отвечает ей сразу; она же держит
 * отказ, если запись на диск не удалась вовсе.
 *
 * ЧЕГО ЭТА ПАМЯТЬ НЕ ЗАКРЫВАЕТ, И ЭТО ЧЕСТНО: сломанное хранилище ПЛЮС подъём
 * воркера. Память нового экземпляра пуста, диск не отвечает — но там нет и
 * сессии, и вопрос про метку в этом случае решает третье состояние выше.
 *
 * СНИМАЮТ МЕТКУ ТЕ ЖЕ ДВОЕ, ЧТО И РАНЬШЕ, И ОБА — ДЕЙСТВИЕ ЧЕЛОВЕКА: успешный
 * вход и явный выход. Оба снимают её сразу и с диска, и из памяти.
 */
var accountDeniedInMemory=false;
function readAccountDenied(){return chrome.storage.local.get(ACCOUNT_DENIED_KEY).then(function(stored){return !!(stored&&stored[ACCOUNT_DENIED_KEY]===true)},function(){return null})}
function writeAccountDenied(){accountDeniedInMemory=true;
var payload={};
payload[ACCOUNT_DENIED_KEY]=true;
return chrome.storage.local.set(payload).then(function(){},function(){})}
function clearAccountDenied(){accountDeniedInMemory=false;
return chrome.storage.local.remove(ACCOUNT_DENIED_KEY).then(function(){},function(){})}

// --- УСТРОЙСТВО: СВОЁ ИМЯ И ЧЕЛОВЕЧЕСКАЯ ПОДПИСЬ ------------------------------
//
// ЗАЧЕМ ИМЯ. Живых сессий у аккаунта две (слово владельца: лимит устройств —
// два). Считать их по сессиям нельзя: вход заново с ТОГО ЖЕ компьютера съедал
// бы слот, и человек, переустановивший расширение дважды, оставался бы без
// доступа на своём единственном ноутбуке. Имя устройства рождается ОДИН раз и
// живёт рядом с сессией, поэтому сервер отличает «тот же компьютер снова» от
// «третий компьютер».
//
// ЭТО НЕ СЕКРЕТ И НЕ ПРОПУСК. Имя ничего не открывает: без сессии оно
// бесполезно. Поэтому запасной путь через Math.random честен — он нужен
// стендам, где WebCrypto не подан, и ничего не ослабляет.
function randomDeviceId(){var bytes=new Uint8Array(16);
var source=globalThis.crypto;
if(source&&typeof source.getRandomValues==='function')source.getRandomValues(bytes);
else for(var i=0;i<bytes.length;i+=1)bytes[i]=Math.floor(Math.random()*256);
var out='';
for(var j=0;j<bytes.length;j+=1)out+=(bytes[j]+256).toString(16).slice(1);
return out}

var ACCOUNT_DEVICE_RE=/^[a-f0-9]{32}$/;

/**
 * ОДИН ПРОМИС РОЖДЕНИЯ ИМЕНИ НА ВОРКЕР (задание A97-FIX п.4, A97-06).
 *
 * ЧТЕНИЕ ХРАНИЛИЩА АСИНХРОННО, а рождение имени идёт ПОСЛЕ него. Два первых
 * входа подряд — окно по значку и вкладка настроек — оба видели пустое
 * хранилище, оба рождали СВОЁ имя и записывали его поверх соседа. Сервер
 * считал это двумя разными компьютерами и отдавал им оба места из двух: один
 * человек на одной машине оставался без свободного слота.
 *
 * Промис отпускается после разрешения — ровно как `inFlight` у `refresh` в
 * слое лицензий. Следующее чтение снова идёт в хранилище и находит там уже
 * записанное имя; общим он остаётся только на время самой гонки.
 */
var accountDeviceInFlight=null;
function readAccountDevice(){if(accountDeviceInFlight)return accountDeviceInFlight;
accountDeviceInFlight=bornAccountDevice();
return accountDeviceInFlight}
function bornAccountDevice(){return chrome.storage.local.get(ACCOUNT_DEVICE_KEY).then(function(stored){var value=stored&&stored[ACCOUNT_DEVICE_KEY];
if(typeof value==='string'&&ACCOUNT_DEVICE_RE.test(value))return value;
var born=randomDeviceId();
var payload={};
payload[ACCOUNT_DEVICE_KEY]=born;
// Не записалось — вход всё равно идёт: сервер посчитает это устройство новым,
// и это лучше, чем отказ входа из-за хранилища.
return chrome.storage.local.set(payload).then(function(){return born},function(){return born})},function(){return randomDeviceId()}).then(function(value){accountDeviceInFlight=null;
return value},function(err){accountDeviceInFlight=null;
throw err})}

/**
 * ПОДПИСЬ УСТРОЙСТВА ДЛЯ ПИСЬМА «вход с нового устройства»: платформа и
 * браузер, и больше ничего.
 *
 * Человек, получивший такое письмо, должен узнать свой компьютер — или не
 * узнать чужой. «Windows · Google Chrome» отвечает на этот вопрос целиком.
 * Полная строка `userAgent` отвечала бы на него же, но заодно уехала бы в
 * почту с номером сборки и разрядностью системы: лишнее о человеке мы не
 * собираем и не пересылаем.
 */
function accountDeviceLabel(){try{var nav=globalThis.navigator;
if(!nav)return null;
var data=nav.userAgentData;
var platform=typeof data?.platform==='string'&&data.platform!==''?data.platform:null;
var brand=null;
var brands=data&&Array.isArray(data.brands)?data.brands:[];
for(var i=0;i<brands.length;i+=1){var name=brands[i]&&brands[i].brand;
// «Not A(Brand)» — заполнитель самих браузеров, а не имя браузера.
if(typeof name==='string'&&name!==''&&!/not[^a-z]*a[^a-z]*brand/i.test(name))brand=name}
var agent=typeof nav.userAgent==='string'?nav.userAgent:'';
if(brand===null){var known=/(Edg|OPR|Chrome|Firefox|Safari)\/(\d+)/.exec(agent);
if(known)brand=known[1]==='Edg'?'Edge':(known[1]==='OPR'?'Opera':known[1])}
if(platform===null){var host=/\(([^;)]+)/.exec(agent);
if(host)platform=host[1].trim()}
var parts=[platform,brand].filter(function(value){return typeof value==='string'&&value!==''});
return parts.length===0?null:parts.join(' · ').slice(0,64)}catch(err){return null}}

// --- СОХРАНЁННОЕ ПРАВО --------------------------------------------------------

/**
 * `iat` снимка — из САМОЙ подписи, а не из наших полей.
 *
 * Разбор здесь нарочно свой и куцый: воркер — классический скрипт без единого
 * импорта (см. шапку файла), и тащить сюда `licensing/key.js` нельзя. Ничего,
 * кроме одного числа, отсюда не берётся: подпись и срок права проверяет
 * страница настоящей функцией `verifyLicenseKey`.
 */
function entitlementIssuedAt(token){try{if(typeof token!=='string')return null;
var parts=token.split('.');
if(parts.length!==4)return null;
var normal=parts[2].replace(/-/g,'+').replace(/_/g,'/');
var padded=normal+'===='.slice((normal.length%4)||4);
var payload=JSON.parse(atob(padded));
return Number.isSafeInteger(payload&&payload.iat)?payload.iat:null}catch(err){return null}}

function writeAccountSnapshot(answer,at){if(entitlementIssuedAt(answer&&answer.entitlement)===null)return clearAccountSnapshot();
var payload={};
// ПЛОСКОГО `iat` ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО (дописка 1 Fable к ACCOUNT-4).
// Он лежал рядом со снимком отдельным числом, и на чтении решение принималось
// по НЕМУ. Написать в него будущее — и разность `now - iat` уходит в минус,
// проверка семи суток проходит всегда, а отзыв права, лимит устройств и выход
// из аккаунта не доезжают до такого клиента до конца оплаченного срока.
// Теперь при чтении `iat` разбирается заново из САМОГО токена.
payload[ACCOUNT_SNAPSHOT_KEY]={answer:answer,at:at};
return chrome.storage.local.set(payload).then(function(){},function(){})}
function clearAccountSnapshot(){return chrome.storage.local.remove(ACCOUNT_SNAPSHOT_KEY).then(function(){},function(){})}
function readAccountSnapshot(){return chrome.storage.local.get(ACCOUNT_SNAPSHOT_KEY).then(function(stored){var kept=stored&&stored[ACCOUNT_SNAPSHOT_KEY];
if(!kept||typeof kept!=='object')return null;
var answer=kept.answer;
if(!answer||answer.ok!==true||typeof answer.entitlement!=='string'||answer.entitlement==='')return null;
// `iat` — ТОЛЬКО ИЗ ТОКЕНА, и только на чтении. Эти байты накрыты подписью:
// подделать их, не сломав подпись, нельзя, а сломанную подпись отбивает
// страница настоящей `verifyLicenseKey` (`src/licensing/account.js`), где
// стоит и второй, главный замок тех же семи суток.
var iat=entitlementIssuedAt(answer.entitlement);
if(iat===null)return null;
// `at` — НЕ РЕШЕНИЕ О ПРАВЕ, а подсказка «когда мы в последний раз спросили
// сервер»; по ней считаются шесть часов свежести, и только они. Мусор в ней
// означает «спросить сервер заново», а не «право есть».
var at=Number.isSafeInteger(kept.at)?kept.at:null;
return{answer:answer,iat:iat,at:at}},function(){return null})}

/**
 * Сохранённое право, если ему меньше семи суток от `iat`. Иначе — ничего.
 *
 * `iat` ПРИХОДИТ ИЗ ПОДПИСАННЫХ БАЙТ (см. `readAccountSnapshot`), и это вся
 * суть замка. Отдельно проверяется, что он НЕ В БУДУЩЕМ: срок, отсчитываемый
 * от завтрашней даты, не кончается никогда, а разность `now - iat` в минусе
 * проходит любое сравнение «меньше». Пять минут запаса — на разъехавшиеся
 * часы машины и сервера, не больше.
 *
 * `cached` СТАВИТСЯ ТОЛЬКО ТОГДА, КОГДА СЕТЬ МОЛЧИТ, и это не мелочь: по
 * этому полю окно расширения говорит человеку «нет сети — работает
 * сохранённое право до …». Ответ, взятый из памяти просто потому, что ей
 * меньше шести часов, — обычный СВЕЖИЙ ответ: сеть жива, сервер отвечал
 * недавно, и пугать человека словом «нет сети» здесь не за что.
 */
function keptRight(kept,now,offline){if(!kept)return null;
var age=now-kept.iat;
if(age<-ACCOUNT_CLOCK_SKEW_MS)return null;
if(!(age<ACCOUNT_CACHE_MS))return null;
var answer=Object.assign({},kept.answer,{hasSession:true});
if(offline){answer.cached=true;
answer.cachedAt=kept.at}
return answer}

function accountRequest(method,path,params){var root=accountRoot();
if(!root)return Promise.resolve({ok:false,status:0,reason:'not-configured'});
var headers={accept:'application/json','content-type':'application/json'};
if(params&&params.session)headers.authorization='Bearer '+params.session;
if(params&&params.operationId)headers['idempotency-key']=params.operationId;
var init={method:method,credentials:'omit',headers:headers,signal:AbortSignal.timeout(ACCOUNT_TIMEOUT_MS)};
if(params&&params.body!==undefined)init.body=JSON.stringify(params.body);
return fetch(root+path,init).then(function(response){return response.text().then(function(text){var body=null;
try{body=text===''?null:JSON.parse(text)}catch(err){return{ok:false,status:response.status,reason:'invalid-response'}}
if(response.status>=200&&response.status<300)return{ok:true,status:response.status,body:body};
return{ok:false,status:response.status,reason:typeof body?.reason==='string'?body.reason:'http-'+response.status,body:body}},function(){return{ok:false,status:response.status,reason:'invalid-response'}})},function(){return{ok:false,status:0,reason:'network'}})}

function publicAccount(raw,hasSession){if(!raw||raw.ok!==true||!raw.account||typeof raw.account.id!=='string'||raw.account.id===''||typeof raw.account.hint!=='string')return null;
var inactive=raw.entitlement===null&&raw.quota===null;
var active=typeof raw.entitlement==='string'&&raw.entitlement!==''&&raw.quota
&&Number.isSafeInteger(raw.quota.total)&&raw.quota.total>=0
&&Number.isSafeInteger(raw.quota.remaining)&&raw.quota.remaining>=0
&&raw.quota.remaining<=raw.quota.total;
if(!inactive&&!active)return null;
return{ok:true,configured:true,hasSession:hasSession,authenticated:true,account:{id:raw.account.id,hint:raw.account.hint},entitlement:inactive?null:raw.entitlement,quota:inactive?null:{total:raw.quota.total,remaining:raw.quota.remaining}}}

/**
 * Право аккаунта: свежий ответ сервера, память или честный отказ.
 *
 * ПОРЯДОК ВОПРОСОВ ЗДЕСЬ И ЕСТЬ ВЕСЬ СМЫСЛ ФУНКЦИИ:
 *  1. нет сессии — «выйден», и память стирается вместе с ней;
 *  2. память моложе шести часов и воркер уже спрашивал сервер в этом
 *     подъёме — отвечает память, сеть не трогается вовсе;
 *  3. иначе спрашивается сервер;
 *  4. сервер сказал 401 — сессия и память стираются: это ОТВЕТ, а не отказ;
 *  5. сеть промолчала — отвечает память, пока ей меньше семи суток от `iat`;
 *  6. памяти нет или она стара — прежний честный отказ.
 *
 * `force` присылает только окно расширения (кнопка «Обновить»): страница EA
 * такого не умеет — `content.js` зовёт метод без параметров.
 */
function accountStatus(params){if(!accountRoot())return Promise.resolve({ok:false,configured:false,hasSession:false,reason:'not-configured'});
var now=Date.now();
var force=params?.force===true;
// СЕССИЯ ЗАКРЕПЛЯЕТСЯ ЗА ВОПРОСОМ (OPEN-118-4 ASTRA-118, бриф FIXES-2-3-0-2
// п.2): поколение снимается до чтения строки, как у переноса (A117-FIX-1).
return pinAccountSession().then(function(pin){var session=pin===null?null:pin.session;
if(!session)return clearAccountSnapshot().then(readAccountDenied).then(function(denied){
// СЕССИИ НЕТ — НО ПОЧЕМУ (задание A97-FIX п.2, A98-FIX п.1). Ответов ТРИ,
// и третий — главная правка A98-FIX.
//  1. память воркера ИЛИ метка на диске — сервер эту сессию ОТВЕРГ, и ключу
//     тут говорить нечего;
//  2. метка прочитана и её нет — в аккаунт просто не входили, и это законный
//     `signed-out` партнёра;
//  3. метку ПРОЧИТАТЬ НЕ УДАЛОСЬ — и это не «нет». Ответ `storage` с
//     `ok:false`: слой лицензий видит отказ, даёт FREE и авторитета ключу не
//     отдаёт (`legacyAllowed` — только `signed-out`). Сломанное хранилище не
//     должно открывать премиум отозванной подписке.
if(accountDeniedInMemory||denied===true)return{ok:true,configured:true,hasSession:false,authenticated:false,reason:'unauthorized'};
if(denied===null)return{ok:false,configured:true,hasSession:false,authenticated:false,reason:'storage'};
return{ok:true,configured:true,hasSession:false,authenticated:false,reason:'signed-out'}});
// ШЕСТЬ ЧАСОВ СЧИТАЮТСЯ ТОЛЬКО ВПЕРЁД. `at` — наше плоское поле, и `at` из
// будущего означал бы «сервер спрошен только что» вечно. Права оно не даёт
// (тот замок стоит на `iat` под подписью), но откладывало бы новый вопрос
// серверу, а с ним — отзыв права и лимит устройств.
return readAccountSnapshot().then(function(kept){var since=kept===null||kept.at===null?null:now-kept.at;
var fresh=!force&&accountAsked&&since!==null&&since>=0&&since<ACCOUNT_FRESH_MS?keptRight(kept,now,false):null;
if(fresh)return fresh;
accountAsked=true;
// МЕТКА ПИШЕТСЯ ПЕРВОЙ, И ЭТОТ ПОРЯДОК И ЕСТЬ ЗАМОК (задание A98-FIX п.1,
// СТОП A98-01). Раньше сначала стиралась сессия, и между «сессии уже нет» и
// «метка ещё не поставлена» соседняя вкладка успевала спросить тариф —
// получала `signed-out` и отдавала слово ключу. Теперь такого мгновения нет
// вовсе: вопрос в эту секунду либо ещё видит сессию (и сервер ответит 401 и
// ему), либо уже видит метку — на диске или в памяти воркера.
//
// 401 УНОСИТ ТОЛЬКО ТУ СЕССИЮ, КОТОРОЙ ПРИШЁЛ ОТКАЗ (OPEN-118-4 ASTRA-118).
// Прежде цепочка метки и стирания шла без сверки: вопрос начат с A, пока он в
// сети, человек вошёл аккаунтом B, и 401 для A стирал сессию и снимок B (проба
// Astra). Теперь сверка поколения стоит перед каждой из двух записей, как у
// переноса; порядок «метка первой, стирание после» прежний.
//
// СЕССИЯ СМЕНИЛАСЬ: ВОПРОС ЗАДАЁТСЯ ЗАНОВО, ПРО НОВУЮ. Отказ для A ничего не
// говорит про B, а ответ `unauthorized` отнял бы у B тариф до следующего
// вопроса. Новый вопрос читает снимок, записанный входом, и в сеть обычно не
// ходит.
return accountRequest('GET','/v1/account',{session:session}).then(function(result){if(!result.ok){if(result.reason==='unauthorized'){var denied=function(){return{ok:true,configured:true,hasSession:false,authenticated:false,reason:'unauthorized'}};
var moved=function(){return accountStatus(params)};
return ifSameSession(pin,function(){return writeAccountDenied().then(function(){return ifSameSession(pin,function(){return clearAccountSession().then(clearAccountSnapshot).then(denied)},moved)})},moved)}
return keptRight(kept,now,true)||{ok:false,configured:true,hasSession:true,reason:result.reason}}
var shown=publicAccount(result.body,true);
if(!shown)return keptRight(kept,now,true)||{ok:false,configured:true,hasSession:true,reason:'invalid-response'};
// ПОДПИСКА КОНЧИЛАСЬ — ПАМЯТЬ СТИРАЕТСЯ. Сервер ответил «права нет», и
// держать после этого вчерашний снимок значило бы открывать премиум
// неоплаченному человеку ещё неделю.
//
// ОТВЕТ 200 ПИШЕТ СНИМОК ТОЛЬКО ТОЙ СЕССИИ, КОТОРОЙ ОН ПРИШЁЛ (ACCOUNT-RACE-1,
// OPEN-119-8 ASTRA-119). Вопрос начат с A, пока он в сети, человек вошёл B
// или вышел, и ответ для A лёг снимком поверх B (проба Astra). Сверка та же,
// что у ветки 401: при смене вопрос задаётся заново, про новую сессию.
return ifSameSession(pin,function(){return (shown.entitlement===null?clearAccountSnapshot():writeAccountSnapshot(shown,now)).then(function(){return shown})},function(){return accountStatus(params)})})})})}

function accountLogin(params){if(!accountRoot())return Promise.resolve({ok:false,configured:false,hasSession:false,reason:'not-configured'});
if(typeof params?.email!=='string'||typeof params?.password!=='string'||params.password.length<12||params.password.length>256)return Promise.resolve({ok:false,configured:true,hasSession:false,reason:'invalid-input'});
return readAccountDevice().then(function(deviceId){return accountRequest('POST','/v1/session',{body:{email:params.email,password:params.password,deviceId:deviceId,deviceLabel:accountDeviceLabel()}})}).then(function(result){if(!result.ok)return{ok:false,configured:true,hasSession:false,reason:result.reason};
var raw=result.body,session=raw?.sessionToken,shown=publicAccount(raw,true);
if(typeof session!=='string'||!/^[A-Za-z0-9_-]{40,}$/.test(session)||!shown)return{ok:false,configured:true,hasSession:false,reason:'invalid-response'};
accountAsked=true;
return writeAccountSession(session).then(function(){return clearAccountDenied().then(function(){return (shown.entitlement===null?clearAccountSnapshot():writeAccountSnapshot(shown,Date.now())).then(function(){return shown})})},function(){return{ok:false,configured:true,hasSession:false,reason:'storage'}})})}

function accountLogout(){if(!accountRoot())return clearAccountSession().then(clearAccountSnapshot).then(clearAccountDenied).then(function(){return{ok:true,configured:false,hasSession:false,authenticated:false}});
return readAccountSession().then(function(session){var request=session?accountRequest('DELETE','/v1/session',{session:session}):Promise.resolve();
return Promise.resolve(request).then(clearAccountSession,clearAccountSession).then(clearAccountSnapshot).then(clearAccountDenied).then(function(){return{ok:true,configured:true,hasSession:false,authenticated:false}})})}

function accountRecoveryStart(params){if(!accountRoot())return Promise.resolve({ok:false,configured:false,reason:'not-configured'});
if(typeof params?.email!=='string')return Promise.resolve({ok:false,configured:true,reason:'invalid-input'});
return accountRequest('POST','/v1/recovery',{body:{email:params.email}}).then(function(result){return result.ok&&result.body?.accepted===true?{ok:true,accepted:true}:{ok:false,reason:result.reason}})}
function accountRecoveryComplete(params){if(!accountRoot())return Promise.resolve({ok:false,configured:false,reason:'not-configured'});
if(typeof params?.token!=='string'||typeof params?.password!=='string'||params.password.length<12||params.password.length>256)return Promise.resolve({ok:false,configured:true,reason:'invalid-input'});
return accountRequest('POST','/v1/recovery/complete',{body:{token:params.token,password:params.password}}).then(function(result){return result.ok?{ok:true}:{ok:false,reason:result.reason}})}

// Cloud settings remain extension-owned: neither values nor conflict choices
// cross the EA page window-message bridge. Sync is started only by a click in
// options.js and uses the same opaque account session as account status.
// `pin` (кирпич ACCOUNT-SYNC-2, STOP-116-1 ASTRA-116): сессия, закреплённая
// за операцией переноса. Запрос идёт ею, а не той, что лежит в хранилище
// сейчас: между чтением и записью человек мог выйти и войти другим аккаунтом.
// Без `pin` (прежние двери `account.settings.*`) запрос закрепляет сессию сам.
// С `pin` запрос уходит в сеть в том же шаге, без ожидания: так его можно звать
// из `ifSameSession`.
function accountSettingsRequest(method,body,pin){if(!accountRoot())return Promise.resolve({ok:false,reason:'not-configured'});
if(pin)return accountSettingsSend(method,body,pin);
return pinAccountSession().then(function(own){return own?accountSettingsSend(method,body,own):{ok:false,reason:'signed-out'}})}
function accountSettingsSend(method,body,pin){return accountRequest(method,'/v1/settings',{session:pin.session,body:body}).then(function(result){
// ТА ЖЕ МЕТКА И ТОТ ЖЕ ПОРЯДОК, ЧТО И У СТАТУСА (задание A97-FIX п.2,
// A98-FIX п.1): 401 здесь уносит сессию ровно так же, и без метки дверь
// ключа открывалась бы соседним путём: синхронизацией настроек вместо
// вопроса о тарифе. Метка первой, стирание сессии после: окна между ними
// не остаётся и здесь.
// 401 УНОСИТ ТОЛЬКО ТУ СЕССИЮ, КОТОРОЙ ПРИШЁЛ ОТКАЗ (A117-FIX-1, проба U
// ASTRA-117): прежде сверка стояла одна до метки, и вход в B, прошедший
// между меткой и стиранием, терял новую сессию. Теперь сверка стоит перед
// каждой из двух записей.
if(result.reason==='unauthorized'){var denied=function(){return{ok:false,reason:'unauthorized'}};
return ifSameSession(pin,function(){return writeAccountDenied().then(function(){return ifSameSession(pin,function(){return clearAccountSession().then(denied)},denied)})},denied)}
if(result.ok)return result.body&&typeof result.body==='object'?result.body:{ok:false,reason:'invalid-response'};
return result.body&&typeof result.body==='object'?result.body:{ok:false,reason:result.reason}})}
function accountSettingsRead(){return accountSettingsRequest('GET')}
function accountSettingsWrite(params){if(params?.schema!==1||!Number.isSafeInteger(params?.baseRevision)||params.baseRevision<0||!params.namespaces||typeof params.namespaces!=='object'||Array.isArray(params.namespaces))return Promise.resolve({ok:false,reason:'invalid-input'});
return accountSettingsRequest('PUT',{schema:1,baseRevision:params.baseRevision,namespaces:params.namespaces})}

// --- ПЕРЕНОС НАСТРОЕК ЧЕРЕЗ НАШ СЕРВЕР (кирпич ACCOUNT-SYNC-1) ---------------
//
// ДВЕ КНОПКИ С ЯВНЫМ НАПРАВЛЕНИЕМ ВМЕСТО ОДНОЙ СО СПОРОМ (заказы 12.4.3, 12.5.9).
// «Сохранить настройки»: настройки этого компьютера ложатся на сервер и заменяют
// прошлую копию. «Загрузить настройки»: копия с сервера заменяет настройки
// этого компьютера. Выбора «облачное или локальное» больше нет: сторону
// человек назвал кнопкой.
//
// ОДНА РУКА НА ДВЕ ДВЕРИ (предупреждение 6). Окно настроек в вебапе и страница
// аккаунта зовут ОДИН И ТОТ ЖЕ метод `settings.transfer`, и работает он здесь.
// Почему здесь, а не модулем `settings-client.js`: воркер классический скрипт
// без импортов (шапка файла), модуль в нём не исполнить, а страница EA работу
// делать не вправе (закон ниже). Поэтому раскладка ключей по пространствам и
// список полей `ui.state` повторены здесь, и сверочная сцена
// (`tests/account-sync-transfer.test.mjs`) держит их равными схеме
// `src/sync/settings-schema.js`: так же, как арифметика окон счётчиков ниже.
// Чистит снимок СЕРВЕР той же схемой (`server/settings.mjs`); воркер только
// раскладывает ключи, сводит старые галочки покупки (`transferBuyerOptions`)
// и проверяет форму ответа.
//
// ЗАКОН POP-1 В НОВОЙ РЕДАКЦИИ (дописка Fable 23.09). Страница EA получает ровно
// ДВЕ команды переноса, «сохранить» и «загрузить», и ничего больше. Работу
// делает этот воркер: сам читает настройки из хранилища, сам несёт ключ
// сессии, сам пишет ответ сервера в хранилище. Наружу уходит только
// `{ok, revision, reason}`: ни ключ сессии, ни почта, ни снимок права, ни снимок
// настроек с сервера этот метод не отдаёт никому, даже странице аккаунта.
//
// РЕВИЗИЯ ОСТАЁТСЯ ЗАМКОМ (предупреждение 5 дословно: «Две кнопки заменяют
// спор, а не ревизию. Ревизия сервера (409 на старую) остаётся замком от гонки
// двух компьютеров; „Сохранить настройки" с чужого компьютера не имеет права
// затереть свежую копию молча»). Базовая линия `settings.sync` помнит, какую
// ревизию этот компьютер видел последней. Лежит на сервере копия новее (её
// сохранил другой компьютер) или копия, которой этот компьютер не видел вовсе,
// «Сохранить» отвечает `conflict` и ничего не пишет. Второе нажатие той же
// кнопки в течение двух минут, пока на сервере та же ревизия, заменяет копию:
// человек услышал слово и нажал ещё раз, это уже не молча. Гонка двух записей
// между чтением и записью ловится 409 сервера тем же словом.
var TRANSFER_METHOD='settings.transfer';
/** Закрытый список причин отказа. Слова к ним у окна настроек и у страницы аккаунта. */
var TRANSFER_REASONS=['not-signed-in','offline','server','conflict','too-big','empty','no-port'];
var SYNC_STATE_KEY='settings.sync';
/** Отметка времени каждой «Загрузить». Её слушает мост (`content.js`), наружу не едет. */
var TRANSFER_LOADED_KEY='settings.loadedAt';
var SYNC_STORAGE_KEYS={features:'settings.toggles',filters:'filters.sets',buyerLimits:'automation.limits',buyerOptions:'automation.options',sellerOptions:'seller.options',interface:'ui.state',packLocks:'packs.locks'};
var SYNC_UI_FIELDS=['filters','sbcPolicy','pickPreselect','listing','relist','packShow','soundVolume','solver','hotkeys'];
/** Сколько живёт право второго нажатия «Сохранить» после слова `conflict`. */
var TRANSFER_REPLACE_MS=120000;
var transferQueue=Promise.resolve();
var transferReplace=null;

function transferAnswer(ok,revision,reason){var out={ok:ok===true};
if(Number.isSafeInteger(revision)&&revision>=0)out.revision=revision;
if(!out.ok)out.reason=TRANSFER_REASONS.indexOf(reason)>=0?reason:'server';
return out}

/** Слово сервера или сети превращается в слово закрытого списка. */
function transferReason(raw){var reason=raw&&typeof raw.reason==='string'?raw.reason:'';
if(reason==='signed-out'||reason==='unauthorized')return 'not-signed-in';
if(reason==='network')return 'offline';
if(reason==='revision-conflict')return 'conflict';
if(reason==='settings-too-large')return 'too-big';
return 'server'}

var isPlain=function(value){return !!value&&typeof value==='object'&&!Array.isArray(value)};

/** Форма снимка сервера: та же, что проверяет `parseRemoteSettings`. */
function transferRemote(raw){if(!raw||raw.ok!==true||raw.schema!==1||typeof raw.subject!=='string'||raw.subject===''||!Number.isSafeInteger(raw.revision)||raw.revision<0||typeof raw.initialized!=='boolean')return null;
if(!raw.initialized)return raw.namespaces===null?raw:null;
var ns=raw.namespaces;
if(!isPlain(ns)||!isPlain(ns.features)||!Array.isArray(ns.filters)||!isPlain(ns.buyerLimits)||!isPlain(ns.buyerOptions)||!isPlain(ns.sellerOptions)||!isPlain(ns.interface)||!Array.isArray(ns.packLocks))return null;
return raw}

function transferKeys(){var keys=[SYNC_STATE_KEY];
for(var name in SYNC_STORAGE_KEYS)keys.push(SYNC_STORAGE_KEYS[name]);
return keys}

/**
 * СТАРЫЙ ПРОФИЛЬ ПОКУПКИ УХОДИТ УЖЕ СВЕДЁННЫМ (кирпич A117-FIX-1, STOP-117-1
 * ASTRA-117). Две снятые галочки профилей 2.1.x, `moveToClub` и `listAfterBuy`,
 * страница переводит в положение `afterBuy` при каждом чтении, но на диск
 * перевод не пишет, и прежде они уезжали на сервер как лежали. Здесь тот же
 * перевод, что у `destinationOf` в `src/automation/options-input.js`: старые
 * галочки сильнее ползунка, «в клуб» первой. Модуль воркеру не импортировать
 * (шапка файла), поэтому правило повторено, и сверочная сцена
 * (`tests/account-sync-transfer.test.mjs`) держит его равным
 * `sanitizeOptionInput` на всех сочетаниях. Прочие поля не трогаются: их чистит
 * сервер той же схемой, как и раньше.
 */
function transferBuyerOptions(value){if(!isPlain(value)||!('moveToClub' in value||'listAfterBuy' in value))return value;
var out=Object.assign({},value);
delete out.moveToClub;
delete out.listAfterBuy;
if(value.moveToClub===true)out.afterBuy='club';
else if(value.listAfterBuy===true)out.afterBuy='transferListNow';
return out}

/** Снимок с диска: сырые значения по пространствам, из `ui.state` только поля переноса. */
function transferCollect(stored){var out={};
for(var name in SYNC_STORAGE_KEYS){var value=stored?stored[SYNC_STORAGE_KEYS[name]]:undefined;
if(name==='interface'){var ui={};
if(isPlain(value))SYNC_UI_FIELDS.forEach(function(field){if(Object.prototype.hasOwnProperty.call(value,field))ui[field]=value[field]});
out.interface=ui}
else if(name==='buyerOptions')out.buyerOptions=value===undefined?null:transferBuyerOptions(value);
else out[name]=value===undefined?null:value}
return out}

function transferBase(remote){return{schema:1,subject:remote.subject,revision:remote.revision,initialized:true,namespaces:remote.namespaces}}

// СЕССИЯ ЗАКРЕПЛЕНА ЗА ОПЕРАЦИЕЙ (кирпич ACCOUNT-SYNC-2, STOP-116-1 ASTRA-116).
// Прежде каждый запрос читал сессию заново: GET мог уйти аккаунтом A, а PUT
// аккаунтом B с ревизией A, и при равных ревизиях сервер честно писал снимок
// этого компьютера в копию B; «Загрузить» так же применяла ответ A, когда
// сессия была уже B. Теперь сессия берётся один раз на старте, оба запроса идут
// ею, а перед каждым побочным эффектом (запись на сервер, запись на диск)
// сверяется с текущей: сменилась, значит отказ словом `server` и ничего не
// записано. Сервер вдобавок получает ожидаемого владельца (`expectedSubject`)
// и отвергает чужую запись до записи.
// СВЕРКА И ЗАПИСЬ ОДНИМ ШАГОМ (кирпич A117-FIX-1, остаток STOP-116-1 по
// ASTRA-117). Прежняя сверка читала строку сессии и отдавала ответ, а запись
// шла следующим шагом: вход в B, прошедший между ними, пропускал ответ A на
// диск (проба L) и базовую линию A после PUT (проба S). Теперь каждую запись
// запускает `ifSameSession`, и поколение сессии сверяется в том же шаге.
function transferRefused(){return transferAnswer(false,null,'server')}

function transferSave(){return pinAccountSession().then(function(pin){if(!pin)return transferAnswer(false,null,'not-signed-in');
return chrome.storage.local.get(transferKeys()).then(function(stored){var namespaces=transferCollect(stored);
var base=stored?stored[SYNC_STATE_KEY]:null;
return accountSettingsRequest('GET',undefined,pin).then(function(raw){var remote=transferRemote(raw);
if(!remote)return transferAnswer(false,null,transferReason(raw));
var seen=isPlain(base)&&base.subject===remote.subject&&base.revision===remote.revision;
var replace=transferReplace!==null&&transferReplace.subject===remote.subject&&transferReplace.revision===remote.revision&&Date.now()-transferReplace.at<TRANSFER_REPLACE_MS;
if(remote.initialized&&!seen&&!replace){transferReplace={subject:remote.subject,revision:remote.revision,at:Date.now()};
return transferAnswer(false,remote.revision,'conflict')}
return ifSameSession(pin,function(){transferReplace=null;
return accountSettingsRequest('PUT',{schema:1,baseRevision:remote.revision,expectedSubject:remote.subject,namespaces:namespaces},pin).then(function(answer){var written=transferRemote(answer);
if(!written||!written.initialized||written.subject!==remote.subject){var why=transferReason(answer);
var current=answer&&answer.current;
if(why==='conflict'&&isPlain(current)&&current.subject===remote.subject&&Number.isSafeInteger(current.revision))transferReplace={subject:current.subject,revision:current.revision,at:Date.now()};
return transferAnswer(false,null,why)}
var payload={};
payload[SYNC_STATE_KEY]=transferBase(written);
// Базовая линия A не ложится, когда сессия уже B (проба S). Копия A на сервере
// при этом записана сессией A до смены: это законная запись, её не откатываем.
return ifSameSession(pin,function(){return chrome.storage.local.set(payload).then(function(){return transferAnswer(true,written.revision)},function(){return transferAnswer(false,written.revision,'server')})},transferRefused)})},transferRefused)})})})}

function transferLoad(){return pinAccountSession().then(function(pin){if(!pin)return transferAnswer(false,null,'not-signed-in');
return accountSettingsRequest('GET',undefined,pin).then(function(raw){var remote=transferRemote(raw);
if(!remote)return transferAnswer(false,null,transferReason(raw));
if(!remote.initialized)return transferAnswer(false,remote.revision,'empty');
var ns=remote.namespaces;
return chrome.storage.local.get(SYNC_STORAGE_KEYS.interface).then(function(stored){var current=stored?stored[SYNC_STORAGE_KEYS.interface]:null;
// Едет ровно то, что есть в снимке; всё прочее в `ui.state` этого
// компьютера (раскладка окна, язык, виды экранов, согласия) остаётся как было.
var ui=isPlain(current)?Object.assign({},current):{};
SYNC_UI_FIELDS.forEach(function(field){if(Object.prototype.hasOwnProperty.call(ns.interface,field))ui[field]=ns.interface[field]});
var payload={};
for(var name in SYNC_STORAGE_KEYS)payload[SYNC_STORAGE_KEYS[name]]=name==='interface'?ui:ns[name];
payload[SYNC_STATE_KEY]=transferBase(remote);
// Отметка каждой загрузки: по ней мост будит перечитку открытых вкладок
// вебапа, даже когда загружена та же копия (живой лист, шаг 3, 23.09).
payload[TRANSFER_LOADED_KEY]=Date.now();
// Ответ аккаунта A не ложится на диск, когда сессия уже B (STOP-116-1, проба L).
return ifSameSession(pin,function(){transferReplace=null;
return chrome.storage.local.set(payload).then(function(){return transferAnswer(true,remote.revision)},function(){return transferAnswer(false,null,'server')})},transferRefused)})})})}

/**
 * Одна очередь на оба направления: второе нажатие ждёт первое, а не бежит
 * рядом с ним по тому же хранилищу. Сбой внутри — слово `server`, а не тишина.
 */
function settingsTransfer(params){var direction=params&&params.direction;
if(direction!=='save'&&direction!=='load')return Promise.resolve(transferAnswer(false,null,'server'));
if(!accountRoot())return Promise.resolve(transferAnswer(false,null,'server'));
var run=function(){return (direction==='save'?transferSave():transferLoad()).then(null,function(){return transferAnswer(false,null,'server')})};
var done=transferQueue.then(run,run);
transferQueue=done.then(function(){},function(){});
return done}

// --- ОТЧЁТ О ПРОБЛЕМЕ НА НАШ СЕРВЕР (кирпич ACCOUNT-SYNC-1, путь А, 13.5.4) -----
//
// Страница EA присылает только слова человека, его Telegram и отчёт, уже
// прошедший сторож чистоты (`src/features/problem-report.js`). ПРИВЯЗКУ К
// АККАУНТУ ДЕЛАЕТ ЗДЕСЬ ФОНОВАЯ ЧАСТЬ (закон POP-1 в новой редакции): ключ
// сессии, если он есть, едет заголовком отсюда и больше никуда; номер
// устройства тоже отсюда, он держит на сервере потолок «один отчёт в минуту».
// Наружу уходит `{ok, number}` или отказ словом из закрытого списка.
var REPORT_METHOD='report.send';
var REPORT_REASONS=['offline','too-many','too-big','server','no-port'];
function reportAnswer(ok,number,reason){var out={ok:ok===true};
if(out.ok&&Number.isSafeInteger(number)&&number>0)out.number=number;
if(!out.ok)out.reason=REPORT_REASONS.indexOf(reason)>=0?reason:'server';
return out}
function reportSend(params){if(!accountRoot())return Promise.resolve(reportAnswer(false,null,'server'));
var report=params&&params.report;
var words=params&&typeof params.words==='string'?params.words:'';
var contact=params&&typeof params.contact==='string'?params.contact:'';
if(!isPlain(report))return Promise.resolve(reportAnswer(false,null,'server'));
if(words.length>2000||contact.length>64)return Promise.resolve(reportAnswer(false,null,'too-big'));
return Promise.all([readAccountSession().then(null,function(){return null}),readAccountDevice().then(null,function(){return null})]).then(function(both){var session=both[0],deviceId=both[1];
return accountRequest('POST','/v1/reports',{session:session||undefined,body:{schema:1,report:report,words:words,contact:contact,deviceId:deviceId||undefined}}).then(function(result){if(result.ok&&result.body&&Number.isSafeInteger(result.body.number))return reportAnswer(true,result.body.number);
if(result.status===429)return reportAnswer(false,null,'too-many');
if(result.status===413)return reportAnswer(false,null,'too-big');
if(result.reason==='network')return reportAnswer(false,null,'offline');
return reportAnswer(false,null,'server')})},function(){return reportAnswer(false,null,'server')})}

// --- ДВЕРЬ В СТРАНИЦУ АККАУНТА (кирпич ACCOUNT-OPEN-1) ---------------------
//
// ОТКРЫВАЕТ ВОРКЕР, ПОТОМУ ЧТО В CONTENT SCRIPT ЭТОЙ РУКИ НЕТ. Прежде дверь
// `account.open` звала `chrome.runtime.openOptionsPage()` прямо из content
// script, а Chrome даёт ему от `runtime` только почту (`sendMessage`,
// `connect`), `getURL`, `getManifest`, `id` и события. Вызов бросал, кнопка
// «Настройки аккаунта» не делала ничего с первого дня (лист SIDE-CHANNEL-1,
// шаг 4: владелец в новом профиле не смог войти без значка на панели).
//
// ДВЕ РУКИ, ПЕРВАЯ ТА, ЧТО ЕСТЬ. `openOptionsPage` открывает `options_ui`
// манифеста (та же `account/popup.html`, вкладкой) и второй раз не плодит
// вкладку, а показывает уже открытую. Нет её или она отказала: своя вкладка на
// тот же адрес, `chrome.tabs.create` разрешения `tabs` не требует. Нет и этой:
// честный отказ словом, и content script донесёт его до `__eshario.errors`.
var ACCOUNT_OPEN_METHOD='account.open';
var ACCOUNT_PAGE_PATH='account/popup.html';
// ВОПРОС, С КОТОРЫМ ОТКРЫВАЕТСЯ СТРАНИЦА (кирпич LOGOUT-BUTTON-1, вариант В владельца
// 23.09): красная «Выйти» окна настроек в вебапе открывает эту страницу сразу с
// вопросом о выходе. Выходит только «Подтвердить» на странице расширения: страница
// EA может лишь открыть вопрос, сама выйти она не может (граница моста цела).
// Список закрыт; `openOptionsPage` адреса с вопросом не несёт, поэтому такой
// заход идёт своей вкладкой. Без вопроса путь прежний до буквы.
var ACCOUNT_OPEN_ASKS=['logout'];
function accountOpen(params){var ask=params&&typeof params==='object'&&ACCOUNT_OPEN_ASKS.indexOf(params.ask)>=0?params.ask:null;
if(ask!==null)return accountOpenTab(ask);
var runtime=chrome.runtime;
if(runtime&&typeof runtime.openOptionsPage==='function'){return new Promise(function(resolve){resolve(runtime.openOptionsPage())})
.then(function(){return{ok:true,via:'options'}},function(){return accountOpenTab()})}
return accountOpenTab()}
function accountOpenTab(ask){if(!chrome.tabs||typeof chrome.tabs.create!=='function'||!chrome.runtime||typeof chrome.runtime.getURL!=='function')return Promise.resolve({ok:false,reason:'no-tabs'});
return new Promise(function(resolve){resolve(chrome.tabs.create({url:chrome.runtime.getURL(ACCOUNT_PAGE_PATH)+(ask?'?ask='+ask:'')}))})
.then(function(){return{ok:true,via:'tab'}},function(){return{ok:false,reason:'open-failed'}})}

// --- ВЛАДЕЛЕЦ СЧЁТЧИКОВ АККАУНТА (кирпич SN-SAFE, блокер B1 SOL-39) -------
//
// ЗАЧЕМ ОН ЖИВЁТ ЗДЕСЬ, А НЕ В СТРАНИЦЕ. Настоящего одиночки на профиль в
// page context нет ни одного: content.js существует ПО ЭКЗЕМПЛЯРУ НА ВКЛАДКУ,
// а у chrome.storage.local нет сравнения-с-обменом. Две вкладки читали одно и
// то же число, каждая прибавляла своё и записывала поверх соседа — это живой
// lost update BG1 §7.3 (202 -> 183) и замер SOL-39 §4.2: двадцать разрешений
// при потолке десять, и то же самое у суток и у часа ставок. Фоновый воркер —
// единственный одиночка на профиль: сообщения приходят к нему в один цикл
// событий, а очередь обещаний ниже сериализует их по-честному.
//
// АРИФМЕТИКА ОКОН ЗДЕСЬ ПРОДУБЛИРОВАНА, и это не лень: классический скрипт
// импортов не имеет вовсе (см. шапку файла). Равенство с head-counters.js и с
// min-bin.js закрыто сверочной сценой, которая гоняет обе реализации по одним
// и тем же отметкам и требует одинаковых чисел.
//
// ТАЛОН, А НЕ ОЖИДАНИЕ. Страница спрашивает разрешение ЗАРАНЕЕ и держит в
// руке ровно столько талонов, сколько ей выдал владелец; её синхронный
// take() тратит талон из руки. Талонов нет — ответ counter-unavailable:
// незнание не разрешение. Так синхронный уговор со всеми вызывающими
// (обход клуба, награды, склад, рельса паков) остаётся прежним, а число
// разрешений на профиль по-прежнему не превышает потолка — их выдаёт один.
//
// ДВА ШАГА, А НЕ ОДИН, И ЭТО ГЛАВНОЕ РЕШЕНИЕ ЭТОГО ФАЙЛА. Талон (reserve)
// только ОБЕЩАЕТ место и живёт в памяти воркера; отметка на диск ставится
// вторым сообщением (spend), когда запрос к EA действительно ушёл. Одношаговый
// владелец был бы проще, но он ставил бы отметку в миг ВЫДАЧИ — и каждая
// перезагрузка вебапа (а он перезагружается сам) съедала бы сутки за запросы,
// которых не было. Число в шапке обязано означать настоящие обращения к EA:
// на нём построена вся сверка живого листа с моделью.
//
// ОБЕЩАНИЯ НЕ ПИШУТСЯ НА ДИСК НАРОЧНО. Воркер MV3 умирает через десятки секунд
// простоя, и оживший воркер о выданных талонах не знает. Просроченные обещания
// снимаются сроком ниже.
//
// У КАЖДОГО ОБЕЩАНИЯ ЕСТЬ ИМЯ, И ВЫКУП ЕГО ПРЕДЪЯВЛЯЕТ (кирпич SN-WARM, блокер
// WARM-STALE-PLEDGE ревью SOL-47). Раньше выкуп верил на слово: он ставил
// отметку на диск, ничего не спрашивая про обещание. Обещание при этом умирало
// двумя способами — по сроку и вместе с воркером, — а талон в руке страницы не
// умирал никогда. После того как соседние вкладки добирали суточный потолок,
// протухший талон проходил и дописывал 1501 при потолке 1500. Потолок,
// который можно ПРЕВЫСИТЬ, — худший класс ошибки, какой тут бывает.
//
// Теперь резерв возвращает имя обещания, выкуп его называет, и место в потолке
// тратится только живым обещанием. Выкуп без живого имени не отбрасывается
// молча: запрос к EA уже ушёл, и не посчитать его значило бы соврать в опасную
// сторону. Он проходит ВТОРУЮ проверку потолка прямо здесь, в одной очереди с
// остальными: место есть — отметка ставится, места нет — отказ, и страница
// узнаёт о смерти талона тем же ответом.
var BUDGET_KEY='market.owner';
var BUDGET_RESERVE='budget.reserve';
var BUDGET_SPEND='budget.spend';
var BUDGET_RELEASE='budget.release';
var BUDGET_REST='budget.rest';
var BUDGET_STATE='budget.state';

// Потолки. Каждое число — копия исходника страницы, и каждое сверяется сценой:
// minute/rest — min-bin.js, день — day-budget.js, час поисков — head-counters.js,
// час ставок — auto-buy.js.
// НИ ОДИН ПОТОЛОК ОБЪЁМА БОЛЬШЕ НЕ ОТКАЗЫВАЕТ И НЕ ЗАДЕРЖИВАЕТ (слово владельца
// 22.09 14:31 и 14:33, кирпич CEILINGS-NEVER-STOP-1: «я бы не стопил вообще, у
// нас юзер должен быть главным, просто даём пред и пусть дальше сам думает»).
// Сутки, час поисков и час ставок стали РЕКОМЕНДАЦИЕЙ ещё 21.09; теперь к ним
// ушла и МИНУТА. Просьба сверх сорока пяти разрешается и идёт сразу (вариант Б,
// ответ владельца 22.09), а счёт продолжает считать её и красить шкалу.
// ОТКАЗ ОСТАЛСЯ РОВНО ОДИН — `rest`, общий отдых после капчи и 429. Это ответ
// EA на нас, а не наш совет себе: продолжать в софтбане значит собирать бан.
// СОРОК ПЯТЬ В МИНУТУ — СЛОВО ВЛАДЕЛЬЦА 21.09 (решение 1, темп Б; было 30 по
// замеру MR10, RECON 6110). Середина полосы поиска стала 2 000 мс, то есть 30
// поисков в минуту, и снайп делит окно с замером цен: при тридцати он вставал
// бы в очередь к нашему же прибору. Здесь потолок ЖИВОЙ: страница берёт талон
// именно у этого числа, а её собственный `BUDGET_LIMIT` — запасное окно.
var MINUTE_CAP=45,MINUTE_MS=60000;
/**
 * СУТОЧНЫЙ ПОТОЛОК — 2 000 СО СЛОВА ВЛАДЕЛЬЦА 29.08 (кирпич HD8; было 1 500).
 * Числа и довод — у своего хозяина, `DAY_REQUEST_CAP` в day-budget.js.
 *
 * КОПИЯ ЧИСЛА, А НЕ ВТОРОЕ РЕШЕНИЕ. Классический скрипт импортов не имеет
 * вовсе, а отказывает по суткам ИМЕННО ЭТОТ файл: он один на профиль. До HD8
 * равенство двух копий не сторожил никто — сцена `budget-hubs` теперь читает
 * оба исходника, тем же приёмом, каким сверяется слово отказа ниже.
 */
var DAY_CAP=2000;
var SEARCH_HOUR_CAP=1000,HOUR_MS=3600000;
/**
 * СЛОВО ОТКАЗА ЧАСОВОГО ОКНА ПОИСКОВ. Копия строки страницы
 * (SEARCH_HOUR_REFUSAL в head-counters.js) — классический скрипт импортов не
 * имеет вовсе, и равенство закрыто сверочной сценой, которая читает оба
 * исходника. Своё слово, а не ставочный hour-cap: у того другой предел, другой
 * счёт и другой совет человеку.
 */
var SEARCH_HOUR_REFUSAL='search-hour';
var BID_CAP=60;
/**
 * ОБЩИЙ ОТДЫХ РЫНКА ПОСЛЕ КАПЧИ ИЛИ 429, ПОЛОСОЙ (закон ритма PACE-LAW-1,
 * часть 2, слово владельца 21.09: «ровно 5 минут» в кубик от 4,5 до 6 минут).
 *
 * Ровный срок был подписью программы: отдых кончается САМ, и возврат ровно
 * через 300,000 с после прикрика это поведение таймера, а не человека.
 *
 * КОПИЯ ЧИСЛА, А НЕ ВТОРОЕ РЕШЕНИЕ. Хозяин полосы это REST_BAND_MS в
 * min-bin.js; классический скрипт импортов не имеет вовсе, а отдых живьём
 * держит ИМЕННО ЭТОТ файл: он один на профиль. Равенство обеих копий читает
 * сцена «ПЯТЬ МИНУТ ОТДЫХА» в tests/budget-owner.test.mjs тем же приёмом,
 * каким сверяются сутки и слово отказа выше.
 */
var REST_BAND_MIN_MS=270000,REST_BAND_MAX_MS=360000;
/**
 * БРОСОК ОДИН РАЗ НА ОТДЫХ. Срок считается здесь и дальше едет одним числом: и
 * в снимок, который увидит человек, и в собственную память отдыха. Второй
 * бросок где-нибудь ниже назвал бы человеку не тот срок, который движок лежит.
 *
 * СЛОМАННЫЙ БРОСОК ПЛАТИТ ПОТОЛКОМ, А НЕ ПОЛОМ (закон общего кубика проекта):
 * незнание в разговоре с EA стоит дороже ожидания.
 */
function ownerRestRoll(){var low=REST_BAND_MIN_MS,high=REST_BAND_MAX_MS,roll;
try{roll=Math.random()}catch(err){return high}
if(typeof roll!=='number'||!isFinite(roll))return high;
if(roll<0)roll=0;
if(roll>1)roll=1;
return Math.min(high,low+Math.floor(roll*(high-low+1)))}
/** Разумный потолок одной просьбы: группа наград стоит два, запас взят с горой. */
var MAX_RESERVE=64;
/** Сколько живёт невыкупленное обещание. Минута — окно самого частого счёта. */
var PLEDGE_TTL_MS=60000;

/**
 * ПОКОЛЕНИЕ ЭТОГО ВОРКЕРА. Входит в имя каждого обещания, поэтому перезапуск
 * MV3 рвёт ВСЕ выданные имена разом: оживший воркер о них не знает, и назвать
 * их живыми ему нечем. Одного счётчика здесь мало — он у каждого поколения
 * начинается с нуля, и второе поколение выдало бы имена первого.
 */
var OWNER_GENERATION='g'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e9).toString(36);
var ownerLeaseSeq=0;

/** Ключ МЕСТНЫХ суток. Та же арифметика, что dayKeyOf в head-counters.js. */
function ownerDayKey(now){var date=new Date(now);
return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}

/**
 * Отметки скользящего окна: мусор и время из будущего выбрасываются.
 * Правило то же, что у readStamps в head-counters.js.
 */
function ownerPrune(list,now,windowMs){var out=[],i,at;
for(i=0;i<list.length;i+=1){at=list[i];
if(typeof at==='number'&&isFinite(at)&&at<=now&&now-at<windowMs)out.push(at)}
out.sort(function(a,b){return a-b});
return out}

function ownerList(value){return Array.isArray(value)?value.slice():[]}

/**
 * Разбирает запись с диска. Мусор — это ЧИСТЫЕ СУТКИ, а не отказ: потерянный
 * счётчик обязан начинаться с нуля, а не запирать инструменты навсегда.
 * Отказ ЧТЕНИЯ — совсем другое дело, он ниже и отвечает counter-unavailable.
 */
function ownerRead(raw){var day=null,used=0,resting=0;
if(raw&&typeof raw==='object'&&!Array.isArray(raw)){if(typeof raw.day==='string'&&raw.day!=='')day=raw.day;
if(Number.isSafeInteger(raw.used)&&raw.used>=0)used=raw.used;
if(Number.isSafeInteger(raw.restingUntil)&&raw.restingUntil>=0)resting=raw.restingUntil}
return{day:day,used:day===null?0:used,minute:ownerList(raw&&raw.minute),
hour:ownerList(raw&&raw.hour),buy:ownerList(raw&&raw.buy),restingUntil:resting}}

/** Прочитанное состояние. null — ещё не читали либо чтение потеряно. */
var ownerState=null;
var ownerLoading=null;
/** Запись не доехала: новых разрешений нет до успешной записи (правило BG1 §1). */
var ownerBroken=false;
/**
 * Выданные, но ещё не выкупленные обещания. Только в памяти — см. шапку.
 * Ключ — имя обещания; в нём поколение воркера, поэтому чужое имя не найдётся.
 */
var ownerLeases={};
/** Очередь обещаний. Ровно она и делает владельца сериализующим. */
var ownerChain=Promise.resolve();

function ownerNoop(){}

function ownerSerial(job){var next=ownerChain.then(job,job);
ownerChain=next.then(ownerNoop,ownerNoop);
return next}

function ownerLoad(){if(ownerState!==null)return Promise.resolve(ownerState);
if(ownerLoading!==null)return ownerLoading;
ownerLoading=chrome.storage.local.get(BUDGET_KEY).then(function(stored){ownerState=ownerRead(stored&&stored[BUDGET_KEY]);
ownerBroken=false;
ownerLoading=null;
return ownerState},function(err){ownerLoading=null;
ownerState=null;
throw err});
return ownerLoading}

function ownerSave(){var payload={};
payload[BUDGET_KEY]={v:1,day:ownerState.day,used:ownerState.used,minute:ownerState.minute,
hour:ownerState.hour,buy:ownerState.buy,restingUntil:ownerState.restingUntil};
return chrome.storage.local.set(payload).then(function(){ownerBroken=false;
return true},function(err){
// СЧЁТ ОСТАЁТСЯ В ПАМЯТИ, НО ЗАПЕРТ. Обнулить его значило бы потерять уже
// сделанные запросы: перезагрузка подняла бы с диска число ДО них и подарила
// EA всё, что не доехало. Пока диск не примет запись, новых разрешений нет.
ownerBroken=true;
throw err})}

/**
 * Готов ли владелец выдавать. Заперт неудачной записью — сначала пробуем
 * дописать то, что уже потрачено; только успешная запись снимает замок.
 */
function ownerReady(){return ownerLoad().then(function(){if(!ownerBroken)return true;
return ownerSave().then(function(){return true},function(){return false})},function(){return false})}

/** Новые сутки — новый счёт; скользящие окна и обещания подрезаются на каждом обращении. */
function ownerFresh(now){var today=ownerDayKey(now),kind;
if(ownerState.day!==today){ownerState.day=today;
ownerState.used=0}
ownerState.minute=ownerPrune(ownerState.minute,now,MINUTE_MS);
ownerState.hour=ownerPrune(ownerState.hour,now,HOUR_MS);
ownerState.buy=ownerPrune(ownerState.buy,now,HOUR_MS);
ownerSweep(now)}

/**
 * Умершие по сроку обещания забываются. Время из будущего считается мусором —
 * то же правило, что у отметок окон: часы могли переставить назад.
 */
function ownerSweep(now){var id,age;
for(id in ownerLeases){if(!Object.hasOwn(ownerLeases,id))continue;
age=now-ownerLeases[id].at;
if(!(age>=0&&age<PLEDGE_TTL_MS))delete ownerLeases[id]}}

/**
 * ОТОЗВАТЬ ВСЕ ОБЕЩАНИЯ ЭТОГО СЧЁТА (волна 21, линия D, A92-10).
 *
 * Общий отдых — это запрет НА ЗАПРОС, а не на выкуп: талон, выданный до него,
 * стал бы ровно тем поиском, ради запрета которого отдых и существует. Отзыв
 * идёт у ВЛАДЕЛЬЦА, потому что вкладок у профиля много и своё зеркало каждая
 * обновляет когда придётся.
 */
function ownerDropLeases(kind){var id;
for(id in ownerLeases){if(Object.hasOwn(ownerLeases,id)&&ownerLeases[id].kind===kind)delete ownerLeases[id]}}

/** Сколько мест обещано по этому счёту прямо сейчас. */
function ownerPledgedOf(kind){var id,total=0;
for(id in ownerLeases){if(Object.hasOwn(ownerLeases,id)&&ownerLeases[id].kind===kind)total+=ownerLeases[id].left}
return total}

/**
 * ПРЕДЪЯВИТЬ ОБЕЩАНИЕ. Живое — места списываются с него и возвращается true.
 * Мёртвое (чужое поколение, вышедший срок, другой счёт, мест не осталось) —
 * false, и решение о нём принимает вызывающий.
 */
function ownerLeaseTake(id,kind,count){if(typeof id!=='string'||id==='')return false;
if(!Object.hasOwn(ownerLeases,id))return false;
var lease=ownerLeases[id];
if(lease.kind!==kind||lease.left<count)return false;
lease.left-=count;
if(lease.left<=0)delete ownerLeases[id];
return true}

/** Сколько мест уже занято по этому счёту: потрачено плюс обещано. */
function ownerBusy(kind){if(kind==='minute')return ownerState.minute.length+ownerPledgedOf('minute');
if(kind==='bid')return ownerState.buy.length+ownerPledgedOf('bid');
return ownerState.used+ownerPledgedOf('market')+ownerPledgedOf('other')}

function ownerCapOf(kind){if(kind==='minute')return MINUTE_CAP;
if(kind==='bid')return BID_CAP;
return DAY_CAP}

/**
 * Сколько мест занято в ЧАСОВОМ окне ПОИСКОВ: отметки плюс обещанные рыночные.
 *
 * СЧЁТ ЗДЕСЬ УЖЕ, ЧЕМ У СУТОК, И ЭТО НЕ МЕЛОЧЬ. Сутки платят за ВСЕ наши
 * обращения к EA — и market, и other вместе (см. ownerBusy). Час считает
 * только поиски рынка, потому что только они кладут отметку в ownerState.hour
 * при выкупе. Обещание вида other часового места не занимает ровно потому,
 * что и не потратит его; сложить их здесь значило бы отнять у поиска места,
 * которых он не тратил.
 */
function ownerHourBusy(){return ownerState.hour.length+ownerPledgedOf('market')}

function ownerWindow(list,cap,windowMs){return{used:list.length,cap:cap,windowMs:windowMs,
oldest:list.length>0?list[0]:null}}

/** Полный снимок владельца. Едет с КАЖДЫМ ответом: зеркало вкладки живёт им. */
function ownerSnapshot(now){return{day:ownerState.day,used:ownerState.used,cap:DAY_CAP,
minute:ownerWindow(ownerState.minute,MINUTE_CAP,MINUTE_MS),
hour:ownerWindow(ownerState.hour,SEARCH_HOUR_CAP,HOUR_MS),
buy:ownerWindow(ownerState.buy,BID_CAP,HOUR_MS),
pledged:{minute:ownerPledgedOf('minute'),market:ownerPledgedOf('market'),
other:ownerPledgedOf('other'),bid:ownerPledgedOf('bid')},
// ПОКОЛЕНИЕ ЕДЕТ С КАЖДЫМ ОТВЕТОМ. Страница сравнивает его со своим и на смене
// выбрасывает все талоны сразу, не дожидаясь отказа выкупа.
generation:OWNER_GENERATION,
restingUntil:ownerState.restingUntil,now:now}}

/**
 * Чем ответит просьба. Слово отказа осталось ОДНО — `rest`, общий отдых после
 * капчи и 429.
 *
 * ПОТОЛКИ ОБЪЁМА ПЕРЕСТАЛИ ОТКАЗЫВАТЬ (поправка владельца 21.09, решение 2,
 * страница `reports/shots/DECIDE-SNIPER-2026-09-21.html`): «потолок в шапке это
 * рекомендация, он НИКОГДА не должен стопить пользователя, это совет, а не
 * правило, пользователь выбирает сам». Слова `day-budget`, `hour-cap` и
 * `search-hour` ушли отсюда тогда же.
 *
 * МИНУТА УШЛА СЛЕДОМ 22.09 (кирпич CEILINGS-NEVER-STOP-1, слово владельца
 * 14:31: «минута, 45 запросов: единственный, что реально стопит — я бы не
 * стопил вообще»). Слово `budget` из ответа резерва исчезло совсем: просьба
 * сверх сорока пяти РАЗРЕШАЕТСЯ и идёт СРАЗУ, без ожидания.
 *
 * ЖДАТЬ ИЛИ ИДТИ — РЕШИЛ ВЛАДЕЛЕЦ, И ОН ВЫБРАЛ «ИДТИ» (вариант Б, ответ 22.09
 * на вопрос Fable). Довод: сорок пять в минуту это НАШЕ число, а не предел EA.
 * Сорок поисков в минуту проходили без единого отказа, fut.exe ищет от
 * тридцати до пятидесяти, а коды 429 и 521 мы видели только на СТАВКАХ чаще
 * секунды. Ожидания у минуты нет нигде: ни здесь, ни на странице.
 *
 * ЧТО ОСТАЛОСЬ ЗАЩИТОЙ, И ЭТО НЕ ПРОТИВОРЕЧИЕ. Отдых после капчи и 429 — ответ
 * EA на нас, а не наша рекомендация себе: продолжать в софтбане значит собирать
 * бан. Собственные пределы человека на заход (поисков, покупок, минут) тоже
 * остались остановками: это его правила, а не наш совет.
 *
 * СЧЁТ НЕ ОБНУЛЯЕТСЯ И НЕ ОБРЕЗАЕТСЯ. Счётчик обязан считать ВЫШЕ рекомендации:
 * владельцу нужно видеть, на каком числе придёт бан, чтобы поправить число.
 * Счётчик, запирающий работу на тысяче, отнял бы у него ровно тот замер.
 */
function ownerRefusal(kind,count,now){if(kind==='minute'&&now<ownerState.restingUntil)return 'rest';
return null}

function ownerKindOk(kind){return kind==='minute'||kind==='market'||kind==='other'||kind==='bid'}

function ownerCount(asked){return Number.isSafeInteger(asked)&&asked>0?Math.min(asked,MAX_RESERVE):1}

var OWNER_BAD_REQUEST={ok:false,granted:0,reason:'bad-request',state:null};
var OWNER_UNAVAILABLE={ok:false,granted:0,reason:'counter-unavailable',state:null};

/**
 * ЧЕТЫРЕ ВИДА ПРОСЬБЫ — РОВНО ТЕ ЖЕ ЧЕТЫРЕ СЧЁТА, ЧТО БЫЛИ У СТРАНИЦЫ.
 *
 *   minute — минутный ритм поиска рынка и общий отдых (min-bin.js);
 *   market — сутки ПЛЮС отметка часового окна поисков (шкала шапки);
 *   other  — только сутки: пак, награда, страница склада, запись снайпера;
 *   bid    — только час ставок (auto-buy.js), сутки за него платит other.
 *
 * Разделение не выдумано здесь: оно уже жило на странице (BD1 §5), и владелец
 * его только переносит. Склеить их в одну просьбу значило бы поставить в шкалу
 * шапки отметку поиска, которого не было (замер RECON 2930.2).
 */
function ownerReserve(params){var kind=params&&params.kind;
if(!ownerKindOk(kind))return Promise.resolve(OWNER_BAD_REQUEST);
var count=ownerCount(params&&params.count);
return ownerSerial(function(){return ownerReady().then(function(ready){if(!ready)return OWNER_UNAVAILABLE;
var now=Date.now(),i;
ownerFresh(now);
var refusal=ownerRefusal(kind,count,now);
if(refusal!==null)return{ok:false,granted:0,reason:refusal,state:ownerSnapshot(now)};
ownerLeaseSeq+=1;
var id=OWNER_GENERATION+'.'+ownerLeaseSeq;
ownerLeases[id]={kind:kind,left:count,at:now};
// Диск здесь НЕ трогается: обещание ничего ещё не потратило.
// СРОК ЕДЕТ ЧИСЛОМ, А НЕ ДЛИТЕЛЬНОСТЬЮ. Часы у воркера и у страницы одни и те
// же (Date.now одного профиля), а вот дорога назад занимает неизвестное время:
// пересчитанный на странице срок оказался бы ДЛИННЕЕ настоящего.
return{ok:true,granted:count,reason:null,
lease:{id:id,count:count,expiresAt:now+PLEDGE_TTL_MS},
state:ownerSnapshot(now)}},
function(){return OWNER_UNAVAILABLE})})}

/**
 * ВЫКУП ТАЛОНА: запрос к EA ушёл, отметка ложится на диск.
 *
 * ВЫКУП ПРЕДЪЯВЛЯЕТ ИМЯ ОБЕЩАНИЯ (кирпич SN-WARM). Живое обещание списывает
 * свои места и отметка ставится, как ставилась всегда.
 *
 * ОБЕЩАНИЯ МОГЛО НЕ ОСТАТЬСЯ — воркер умер, срок вышел. Тогда выкуп проходит
 * ВТОРУЮ проверку потолка прямо здесь: место есть — запрос считается (он был
 * настоящий, и промолчать о нём значило бы соврать в опасную сторону); места
 * нет — отказ, и НИ ОДНОЙ отметки. Именно эта развилка и делает потолок
 * непревышаемым: 1501 на диске взяться больше неоткуда.
 *
 * Поле lease в ответе говорит странице, живо ли было её обещание. Услышав
 * слово stale, она выбрасывает остальные талоны этого счёта и просит заново.
 */
function ownerSpend(params){var kind=params&&params.kind;
if(!ownerKindOk(kind))return Promise.resolve(OWNER_BAD_REQUEST);
var count=ownerCount(params&&params.count);
var id=params&&params.lease;
return ownerSerial(function(){return ownerLoad().then(function(){var now=Date.now(),i;
ownerFresh(now);
// ОБЩИЙ ОТДЫХ СТАРШЕ ЛЮБОГО ТАЛОНА, И ПРОВЕРЯЕТСЯ ОН ЗДЕСЬ (A92-10, волна 21).
//
// ЧТО БЫЛО СЛОМАНО. Отдых спрашивался только у РЕЗЕРВА (`ownerRefusal`), а
// выкуп живого имени проходил всегда. Значит вкладка B, взявшая минутный талон
// за секунду до того, как вкладка A увидела капчу, спокойно шла искать: её
// зеркало об отдыхе ещё не знало, а владелец её не останавливал. Отметка
// ложилась на диск ровно в те пять минут, ради которых отдых и заведён.
//
// ОТВЕТ ТЕРМИНАЛЬНЫЙ И СО СЛОВОМ `stale`: рука минуты у этой вкладки вся
// недействительна, и услышав `stale`, страница выбрасывает её целиком.
// Счётчиков это не трогает — запроса не было.
if(kind==='minute'&&now<ownerState.restingUntil){ownerDropLeases('minute');
return{ok:false,granted:0,reason:'rest',lease:'stale',state:ownerSnapshot(now)}}
var live=ownerLeaseTake(id,kind,count);
// МЁРТВОЕ ИМЯ — ВСЕГДА ОТКАЗ, И НИ ОДИН СЧЁТЧИК НЕ МЕНЯЕТСЯ (блокер
// WARM-LEASE-BYPASS ревью SOL-51). Прежде здесь стояла развилка: места в
// потолке нет — отказ, место есть — отметка ставилась и без живого обещания.
// Это и была вторая дорога траты мимо имени: пустое, чужое, истёкшее или уже
// выкупленное имя проходило, пока сутки не выбраны. Страница теперь к EA до
// ответа на выкуп не идёт (WARM-RESTART-PREAUTH), поэтому не посчитать такой
// выкуп — честно: запроса не было.
if(!live){var refusal=ownerRefusal(kind,count,now);
return{ok:false,granted:0,reason:refusal===null?'counter-unavailable':refusal,lease:'stale',state:ownerSnapshot(now)}}
if(kind==='minute')for(i=0;i<count;i+=1)ownerState.minute.push(now);
if(kind==='bid')for(i=0;i<count;i+=1)ownerState.buy.push(now);
if(kind==='market'||kind==='other')ownerState.used+=count;
if(kind==='market')for(i=0;i<count;i+=1)ownerState.hour.push(now);
var snapshot=ownerSnapshot(now);
var word=live?'live':'stale';
return ownerSave().then(function(){return{ok:true,granted:0,reason:null,lease:word,state:snapshot}},
function(){return OWNER_UNAVAILABLE})},
function(){return OWNER_UNAVAILABLE})})}

/**
 * Талон не пригодился: место возвращается тем, кто его держал. Возврат тоже
 * называет имя обещания — иначе он снял бы чужое, а страниц у профиля много.
 * Имени нет или оно мёртвое — снимать нечего, и это не ошибка.
 */
function ownerRelease(params){var kind=params&&params.kind;
if(!ownerKindOk(kind))return Promise.resolve(OWNER_BAD_REQUEST);
var count=ownerCount(params&&params.count);
var id=params&&params.lease;
return ownerSerial(function(){return ownerLoad().then(function(){var now=Date.now();
ownerFresh(now);
ownerLeaseTake(id,kind,count);
return{ok:true,granted:0,reason:null,state:ownerSnapshot(now)}},
function(){return OWNER_UNAVAILABLE})})}

/**
 * Общий отдых рынка после капчи или 429: тоже один на профиль.
 * Идущий отдых НЕ УКОРАЧИВАЕТСЯ: короткая просьба поверх долгого отдыха
 * капчи означала бы снятие защиты (то же правило, что в min-bin.js).
 * Без названного срока длину бросает ownerRestRoll, один раз на отдых.
 */
function ownerRest(params){var asked=params&&params.ms;
var ms=Number.isSafeInteger(asked)&&asked>0?asked:ownerRestRoll();
return ownerSerial(function(){return ownerLoad().then(function(){var now=Date.now();
ownerFresh(now);
var until=now+ms;
if(until>ownerState.restingUntil)ownerState.restingUntil=until;
// ОТДЫХ ОТБИРАЕТ УЖЕ ВЫДАННЫЕ МИНУТНЫЕ ОБЕЩАНИЯ (A92-10, волна 21). Прежде он
// менял только срок: талоны соседних вкладок оставались в силе, и первый же из
// них уходил поиском внутрь отдыха. Снимок ниже поэтому строится ПОСЛЕ отзыва —
// иначе он назвал бы отозванные места обещанными.
ownerDropLeases('minute');
var snapshot=ownerSnapshot(now);
return ownerSave().then(function(){return{ok:true,granted:0,reason:null,state:snapshot}},
function(){return OWNER_UNAVAILABLE})},
function(){return OWNER_UNAVAILABLE})})}

/** Чтение без траты: им живёт шкала шапки второй вкладки. */
function ownerReport(){return ownerSerial(function(){return ownerLoad().then(function(){var now=Date.now();
ownerFresh(now);
return{ok:true,granted:0,reason:null,state:ownerSnapshot(now)}},
function(){return OWNER_UNAVAILABLE})})}

// --- ВЛАДЕЛЕЦ ОПЕРАЦИЙ ЗАМКОВ (волна 22, B2; A93-01) ----------------------
//
// ЗАЧЕМ ОН ПЕРЕЕХАЛ СЮДА ИЗ CONTENT SCRIPT. Замки складывал с диском content
// script — тот единственный, кто в page world видит `chrome.storage`. Но
// content script существует ПО ЭКЗЕМПЛЯРУ НА ВКЛАДКУ, а `chrome.storage.local`
// не умеет сравнения-с-обменом, и потому два экземпляра честно теряли замок в
// таком порядке (A93-01, ревью Astra волны 21):
//
//   A читает пустой диск; B читает пустой диск;
//   A пишет [A]; A перечитывает [A] — «моя операция легла», успех;
//   B пишет заранее посчитанное [B]; B перечитывает [B] — успех.
//
// Повтора не случилось ни у кого, на диске один [B], и обе вкладки уверены, что
// их замок стоит. Третья вкладка видит карту A НЕЗАПЕРТОЙ — то есть решателю
// она открыта. Перепроверка после записи этот порядок не ловит по построению:
// она спрашивает диск ДО того, как соседняя вкладка на него положила.
//
// ЭТО ТА ЖЕ ПОРОДА БЕДЫ И ТО ЖЕ ЛЕКАРСТВО, ЧТО У СЧЁТЧИКОВ ВЫШЕ (SN-SAFE):
// настоящего одиночки на профиль в page context нет ни одного, а фоновый воркер
// — есть. Сообщения приходят к нему в один цикл событий, очередь обещаний ниже
// сериализует их по-честному, и «прочитать — сложить — записать» становится
// неделимым для всего профиля.
//
// РАСПИСКА ПОЛОЖИТЕЛЬНАЯ, И ТОЛЬКО ОНА (закон замков). Молчание воркера,
// отказ диска и любой неизвестный ответ — это `save-failed` у вкладки, а
// `save-failed` у замков значит «заперты все, новых не принимаем». Цена ошибки
// здесь несимметрична: лишний замок стоит человеку нажатия, пропущенный — карты
// навсегда.
//
// АРИФМЕТИКА МНОЖЕСТВ ЗДЕСЬ ПРОДУБЛИРОВАНА с `applyCardLockDelta`
// (src/features/card-locks.js), и это не лень, а построение: классический
// скрипт импортов не имеет вовсе (см. шапку файла). Равенство двух копий
// закрыто сверочной сценой, которая гоняет обе по одной таблице случаев —
// ровно тем же приёмом, каким сверяются потолки счётчиков.
//
// РАЗБОРА ЗНАЧЕНИЙ ЗДЕСЬ ПО-ПРЕЖНЕМУ НЕТ: правила замков (что считать картой,
// чьё имя хранить) живут в `sanitizeCardLockState` и читают диск на КАЖДОМ
// чтении. Здесь только «добавить номер, убрать номер, обрезать по потолку».
var LOCKS_KEY='card.locks';
var LOCKS_WRITE='locks.write';
/**
 * Потолок длины списка. Копия MAX_CARD_LOCKS (src/features/card-locks.js) и
 * сверяется сценой: слияние живёт здесь, значит и обрезать список обязано
 * здесь, иначе диск рос бы без края.
 */
var MAX_LOCK_IDS=500;

function lockIds(raw){var out=[];
if(!Array.isArray(raw))return out;
for(var at=0;at<raw.length;at+=1){var id=Number(raw[at]);
if(!Number.isSafeInteger(id)||id<=0||out.indexOf(id)>=0)continue;
out.push(id)}
return out}

// Две формы диска, один ответ: голый массив номеров (старый диск) и запись с
// тремя полками. Та же пара форм, что читает страница.
function lockRecord(raw){if(Array.isArray(raw))return{ids:lockIds(raw),recreated:[],names:{}};
if(!raw||typeof raw!=='object')return{ids:[],recreated:[],names:{}};
var names={};
var source=raw.names;
if(source&&typeof source==='object'&&!Array.isArray(source)){for(var key in source){if(!Object.prototype.hasOwnProperty.call(source,key))continue;
if(typeof source[key]==='string')names[key]=source[key]}}
return{ids:lockIds(raw.ids),recreated:lockIds(raw.recreated),names:names}}

function lockWithout(list,id){var out=[];
for(var at=0;at<list.length;at+=1){if(list[at]!==id)out.push(list[at])}
return out}

// ОПЕРАЦИЯ ЛОЖИТСЯ НА ДИСК, А НЕ НА ЧЕЙ-ТО СНИМОК. Порядок тот же, каким его
// знает страница: свежий замок встаёт первым, потолок режет хвост, подпись и
// пометка «пересоздана» держатся только при своём замке.
function mergeLocks(state,params){var at;
var off=lockIds(params&&params.off);
for(at=0;at<off.length;at+=1){state.ids=lockWithout(state.ids,off[at]);
state.recreated=lockWithout(state.recreated,off[at]);
delete state.names[String(off[at])]}
var on=Array.isArray(params&&params.on)?params.on:[];
for(at=0;at<on.length;at+=1){var one=on[at]||{};
var id=Number(one.id);
if(!Number.isSafeInteger(id)||id<=0)continue;
state.ids=[id].concat(lockWithout(state.ids,id));
state.recreated=lockWithout(state.recreated,id);
if(typeof one.name==='string'&&one.name!=='')state.names[String(id)]=one.name}
var mark=lockIds(params&&params.mark);
for(at=0;at<mark.length;at+=1){if(state.ids.indexOf(mark[at])<0)continue;
if(state.recreated.indexOf(mark[at])<0)state.recreated.push(mark[at])}
if(state.ids.length>MAX_LOCK_IDS)state.ids=state.ids.slice(0,MAX_LOCK_IDS);
// Полки без своего замка не хранятся: иначе на диске копились бы имена и
// пометки номеров, которых нет ни у карты, ни у записи.
state.recreated=state.recreated.filter(function(id){return state.ids.indexOf(id)>=0});
var kept={};
for(at=0;at<state.ids.length;at+=1){var name=state.names[String(state.ids[at])];
if(typeof name==='string')kept[String(state.ids[at])]=name}
state.names=kept;
return state}

/**
 * ОЧЕРЕДЬ ЗАМКОВ — СВОЯ, А НЕ ОБЩАЯ СО СЧЁТЧИКАМИ. Ключ другой, и складывать
 * их в одну цепочку значило бы, что медленная запись замков задерживает талон
 * поиска рынка. Сериализация нужна ВНУТРИ каждого ключа, а не между ними.
 */
var locksChain=Promise.resolve();

function locksSerial(job){var next=locksChain.then(job,job);
locksChain=next.then(ownerNoop,ownerNoop);
return next}

var LOCKS_BAD_REQUEST={ok:false,reason:'bad-request'};

/**
 * ПРОЧИТАТЬ — СЛОЖИТЬ — ЗАПИСАТЬ, НЕДЕЛИМО ДЛЯ ВСЕГО ПРОФИЛЯ.
 *
 * Отказ ЧТЕНИЯ — тоже отказ, а не «диск пуст»: сложить операцию не с чем, и
 * записать поверх неизвестного значило бы стереть чужие замки в темноте.
 */
function locksWrite(params){if(!params||typeof params!=='object'||Array.isArray(params))return Promise.resolve(LOCKS_BAD_REQUEST);
return locksSerial(function(){return chrome.storage.local.get(LOCKS_KEY).then(function(stored){var state=mergeLocks(lockRecord(stored?stored[LOCKS_KEY]:null),params);
var payload={};
payload[LOCKS_KEY]=state;
return chrome.storage.local.set(payload).then(function(){return{ok:true,reason:null}},
function(){return{ok:false,reason:'save-failed'}})},
function(){return{ok:false,reason:'load-failed'}})})}

// --- БАЗА КАРТ (кирпич CARD-BASE) --------------------------------------------
//
// ЧТО ЭТО. Один файл на сезон с нашего сервера: рейтинг, позиции, нация, лига,
// клуб и редкость ВСЕХ карт игры. Страница засевает им каталог при старте и
// знает все карты с первой минуты, а не после того, как человек их увидел.
//
// ПОЧЕМУ СЕТЬ ИМЕННО ЗДЕСЬ. Узел `api.eshario.com` уже стоит в правах
// расширения (линия аккаунта, кирпич ACCOUNT-4) — ни нового хоста, ни новой
// рецензии магазина. У страницы EA этих прав нет, а у воркера нет ни бандлов
// EA, ни номера сезона: номер приезжает в просьбе от страницы.
//
// ТЕЛО НЕ РАЗБИРАЕТСЯ ЗДЕСЬ, как не разбирается и цена (см. шапку файла):
// воркер отдаёт байты, понимать их — дело `features/card-base.js`, где это
// написано один раз и покрыто тестами.
//
// НИ ОДНОЙ КУКИ И НИ БАЙТА ЛИЧНЫХ ДАННЫХ. `credentials:'omit'`, ни заголовка
// авторизации, ни имени устройства: база — публичные сведения об игровых
// карточках, и спрашивать её от чьего-то имени незачем.
var CARDS_METHOD='cards.base';
var CARDS_STATE_KEY='cards.meta';
var CARDS_PATH_RE=/^\/v1\/cards\/([0-9]{2})$/;
/** Файл — до мегабайта в gzip, и пяти секунд аккаунта ему мало. */
var CARDS_TIMEOUT_MS=30000;

/**
 * РАСПИСАНИЕ ПРИВЯЗАНО К ЛОНДОНУ, А НЕ К ЧАСАМ МАШИНЫ (дописка 1 брифа,
 * слово владельца 17.09).
 *
 * Контент EA выходит в 18:00 по Лондону. Сервер снимает FUT.GG в 18:20,
 * пользователь приходит к нам в 18:30 — и дальше каждые шесть часов. Считать
 * это «по Тбилиси» нельзя: Британия переводит часы 25.10, Грузия — нет, и
 * весной расписание уехало бы на час само собой.
 */
var CARDS_SLOTS=[30,390,750,1110];
/** Шесть часов — запасное расписание, когда часов Лондона не спросить. */
var CARDS_EVERY_MS=21600000;
/**
 * СЕМЬ ЧАСОВ — КОГДА БАЗА СЧИТАЕТСЯ СТАРОЙ ПРИ СТАРТЕ. Шаг расписания шесть
 * часов плюс час запаса: без запаса каждый второй старт объявлял бы свежую
 * базу старой из-за случайной задержки и пары минут сети.
 */
var CARDS_STALE_MS=25200000;
/**
 * СЛУЧАЙНАЯ ЗАДЕРЖКА 0–10 МИНУТ У КАЖДОГО. Без неё все установки стучат в
 * одну и ту же секунду: файл отдаёт кэш Cloudflare, но толпа в одну секунду
 * не нужна никому. Рождается один раз и живёт рядом с базой.
 */
var CARDS_JITTER_MAX_MS=600000;
/** После отказа — полчаса тишины. Мёртвая сеть не лечится повтором в цикле. */
var CARDS_RETRY_MS=1800000;
/**
 * НЕДОСОБРАННУЮ БАЗУ СПРАШИВАЮТ ЧАЩЕ — но не чаще получаса.
 *
 * Первый съём сезона идёт у сервера около двух часов, и файл всё это время
 * растёт. Ждать шести часов ради карт, которые появятся через двадцать минут,
 * незачем. Просит об этом страница (она одна читает тело и знает, что база
 * недособрана), а меру держит воркер: страница могла бы попросить и каждую
 * секунду.
 */
var CARDS_SOON_MS=1800000;

function cardsGame(value){return Number.isSafeInteger(value)&&value>=20&&value<=99?value:null}

function cardsUrl(game){return accountOrigin()+'/v1/cards/'+game}

/**
 * Проверка адреса ДО обращения к сети — там же, где и сам запрос. Адрес мы
 * строим сами, но закон один на все три двери воркера: сравнивается
 * разобранный origin и точная форма пути, а не префикс строки.
 */
function isAllowedCardsUrl(url){if(!isAllowedUrl(url,accountOrigin()))return false;
try{var parsed=new URL(url);
return parsed.search===''&&parsed.hash===''&&CARDS_PATH_RE.test(parsed.pathname)}catch(err){return false}}

/**
 * Минуты от полуночи ПО ЛОНДОНУ. Часы берутся у самой платформы (`Intl`), а
 * не считаются нами: правило перевода часов в Британии мы держать у себя не
 * обязаны и не имеем права — оно меняется законом, а не нашим кодом.
 */
function londonMinutes(at){try{var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(at));
var hour=null;
var minute=null;
for(var i=0;i<parts.length;i+=1){if(parts[i].type==='hour')hour=parseInt(parts[i].value,10);
else if(parts[i].type==='minute')minute=parseInt(parts[i].value,10)}
if(hour===null||minute===null||isNaN(hour)||isNaN(minute))return null;
// `en-GB` с `hour12:false` называет полночь двадцать четвёртым часом. Это ноль.
if(hour===24)hour=0;
return hour*60+minute}catch(err){return null}}

/**
 * Когда стучаться в следующий раз. Часов Лондона нет (чужая сборка, `Intl`
 * без данных о поясах) — расписание честно вырождается в «через шесть часов»:
 * молчать было бы хуже, база не обновлялась бы вовсе.
 */
function nextCardsAt(at,jitterMs){var minutes=londonMinutes(at);
if(minutes===null)return at+CARDS_EVERY_MS;
var jitter=Number.isSafeInteger(jitterMs)&&jitterMs>=0?jitterMs:0;
var best=null;
for(var i=0;i<CARDS_SLOTS.length;i+=1){var away=CARDS_SLOTS[i]-minutes;
// Слот, который уже прошёл (и тот, что ровно сейчас), — это завтрашний слот.
if(away<=0)away+=1440;
if(best===null||away<best)best=away}
return at+best*60000+jitter}

function cardsJitter(){return Math.floor(Math.random()*CARDS_JITTER_MAX_MS)}

function readCardsMeta(){return chrome.storage.local.get(CARDS_STATE_KEY).then(function(stored){var kept=stored&&stored[CARDS_STATE_KEY];
return kept&&typeof kept==='object'&&!Array.isArray(kept)?kept:null},function(){return null})}

function writeCardsMeta(meta){var payload={};
payload[CARDS_STATE_KEY]=meta;
return chrome.storage.local.set(payload).then(function(){return meta},function(){return meta})}

/**
 * Пора ли спрашивать сервер.
 *
 * ПЯТЬ ПОВОДОВ, И КАЖДЫЙ НАЗЫВАЕТСЯ СЛОВОМ — иначе «почему оно опять пошло в
 * сеть» разбирался бы догадками. Часы, уехавшие НАЗАД, тоже повод: иначе
 * запись «спрашивали в будущем» заперла бы базу до конца этого будущего.
 */
function cardsDue(meta,now,game,soon){if(!meta)return 'no-base';
if(cardsGame(meta.game)!==game)return 'other-season';
if(!Number.isSafeInteger(meta.at))return 'no-base';
if(now<meta.at)return 'clock-back';
if(now-meta.at>=CARDS_STALE_MS)return 'stale';
if(Number.isSafeInteger(meta.nextAt)&&now>=meta.nextAt)return 'schedule';
if(soon===true&&now-meta.at>=CARDS_SOON_MS)return 'incomplete';
return null}

/** Сколько места заняло хранилище расширения. Замер, а не решение. */
function cardsBytes(){try{var used=chrome.storage.local.getBytesInUse;
if(typeof used!=='function')return Promise.resolve(null);
return chrome.storage.local.getBytesInUse(null).then(function(value){return Number.isSafeInteger(value)?value:null},function(){return null})}catch(err){return Promise.resolve(null)}}

/** Что показывает прибор: только числа, ни одного секрета. */
function cardsReport(meta,bytes,due,status,reason){return{game:meta?cardsGame(meta.game):null,
etag:meta&&typeof meta.etag==='string'?meta.etag:null,
at:meta&&Number.isSafeInteger(meta.at)?meta.at:null,
nextAt:meta&&Number.isSafeInteger(meta.nextAt)?meta.nextAt:null,
jitterMs:meta&&Number.isSafeInteger(meta.jitter)?meta.jitter:null,
bytes:meta&&Number.isSafeInteger(meta.bytes)?meta.bytes:null,
storageBytes:bytes,due:due||null,status:Number.isSafeInteger(status)?status:null,
reason:typeof reason==='string'?reason:null}}

/** Один запрос на профиль: две вкладки EA не качают мегабайт дважды. */
var cardsInFlight={};

/**
 * База карт: свежий файл, честное «ничего не изменилось» или честный отказ.
 *
 * FAIL CLOSED НА ВСЕХ ВЕТКАХ: непонятный ответ, мёртвая сеть, `503` сервера,
 * который ещё собирает базу, — всё это «тела нет», а не «база пуста». Старая
 * база остаётся у страницы нетронутой, и мозг продолжает работать на ней.
 *
 * `If-None-Match` ставится по метке СТРАНИЦЫ, а не по нашей: спрашивает тот,
 * кому нужно тело, и знать, что у него уже есть, может только он сам.
 * Каталог могло стереть сменой сезона, пока наша метка стояла на месте.
 */
function cardsBase(params){var game=cardsGame(params&&params.game);
if(game===null)return Promise.resolve({ok:false,status:0,reason:'bad-season',state:null});
var known=params&&typeof params.etag==='string'&&params.etag!==''?params.etag:null;
var soon=params&&params.soon===true;
var key=game+'|'+(known===null?'':known);
if(cardsInFlight[key])return cardsInFlight[key];
var work=cardsAsk(game,known,soon).then(function(answer){delete cardsInFlight[key];
return answer},function(err){delete cardsInFlight[key];
throw err});
cardsInFlight[key]=work;
return work}

function cardsAsk(game,known,soon){var now=Date.now();
return readCardsMeta().then(function(meta){var due=cardsDue(meta,now,game,soon);
// Метки у страницы нет вовсе — тело нужно ей независимо от расписания:
// иначе каталог после смены сезона остался бы пустым до следующего слота.
if(known!==null&&due===null)return cardsBytes().then(function(bytes){return{ok:true,status:304,fresh:false,
state:cardsReport(meta,bytes,null,304,'fresh')}});
var jitter=meta&&Number.isSafeInteger(meta.jitter)?meta.jitter:cardsJitter();
var url=cardsUrl(game);
if(!isAllowedCardsUrl(url))return Promise.resolve({ok:false,status:0,reason:'forbidden-url',state:null});
var headers={accept:'application/json'};
if(known!==null)headers['if-none-match']=known;
var init={method:'GET',credentials:'omit',headers:headers,signal:AbortSignal.timeout(CARDS_TIMEOUT_MS)};
return fetch(url,init).then(function(response){var status=response.status;
var etag=null;
try{etag=response.headers.get('etag')}catch(err){etag=null}
if(status===304)return cardsSave({game:game,etag:known,at:now,nextAt:nextCardsAt(now,jitter),jitter:jitter,
bytes:meta&&Number.isSafeInteger(meta.bytes)?meta.bytes:null}).then(function(saved){return cardsBytes().then(function(bytes){return{ok:true,status:304,fresh:true,
state:cardsReport(saved,bytes,due,304,'not-modified')}})});
if(status<200||status>=300){
// Сервер ещё собирает базу (`503`) — это не поломка, а «приходи позже»:
// повтор запирается на полчаса, а старая база у страницы цела.
var reason=status===503?'building':(status===404?'no-season-file':'http-'+status);
// ЧЕТЫРЁХСОТЧЕТВЁРТЫЙ — НЕ СБОЙ, А ОТВЕТ: файла этого сезона на сервере нет
// вовсе. Долбиться в него каждые полчаса незачем — ждём обычного слота.
// Так же выглядит и день, когда расширение уже у людей, а сервер ещё
// собирает первый файл сезона: одна просьба в шесть часов, и ни одной беды.
var again=status===404?nextCardsAt(now,jitter):now+CARDS_RETRY_MS;
return cardsSave(Object.assign({},meta||{},{game:game,jitter:jitter,nextAt:again})).then(function(saved){return cardsBytes().then(function(bytes){return{ok:false,status:status,reason:reason,
state:cardsReport(saved,bytes,due,status,reason)}})})}
return response.text().then(function(body){var text=typeof body==='string'?body:'';
if(text===''){return cardsSave(Object.assign({},meta||{},{game:game,jitter:jitter,nextAt:now+CARDS_RETRY_MS})).then(function(saved){return cardsBytes().then(function(bytes){return{ok:false,status:status,reason:'empty-body',
state:cardsReport(saved,bytes,due,status,'empty-body')}})})}
return cardsSave({game:game,etag:typeof etag==='string'&&etag!==''?etag:null,at:now,
nextAt:nextCardsAt(now,jitter),jitter:jitter,bytes:text.length}).then(function(saved){return cardsBytes().then(function(bytes){return{ok:true,status:status,fresh:true,
etag:typeof etag==='string'&&etag!==''?etag:null,body:text,
state:cardsReport(saved,bytes,due,status,null)}})})},function(){return cardsSave(Object.assign({},meta||{},{game:game,jitter:jitter,nextAt:now+CARDS_RETRY_MS})).then(function(saved){return cardsBytes().then(function(bytes){return{ok:false,status:status,reason:'unreadable-body',
state:cardsReport(saved,bytes,due,status,'unreadable-body')}})})})},
function(){return cardsSave(Object.assign({},meta||{},{game:game,jitter:jitter,nextAt:now+CARDS_RETRY_MS})).then(function(saved){return cardsBytes().then(function(bytes){return{ok:false,status:0,reason:'network',
state:cardsReport(saved,bytes,due,0,'network')}})})})})}

function cardsSave(meta){return writeCardsMeta(meta).then(function(){return meta},function(){return meta})}

// --- ПОСЛЕДНЯЯ ВЕРСИЯ ДЛЯ КОПИИ БЕЗ МАГАЗИНА (кирпич SIDE-CHANNEL-1) ----------
//
// ЧТО ЭТО. Копия, поставленная «Загрузить распакованное», сама не
// обновляется никогда. Раз в час воркер спрашивает наш сервер
// `GET /v1/version` и отдаёт странице готовый ответ: показывать ли строку
// «Есть версия X.Y.Z. Скачать» и куда ведёт ссылка, а если сервер назвал
// архив (поле `zip`, UPDATE-EASE-1), то и прямую ссылку на него. К EA — ноль
// запросов.
//
// КОПИЯ ИЗ МАГАЗИНА НЕ СПРАШИВАЕТ ВОВСЕ. Её обновляет магазин, и строка ей не
// нужна никогда. Признак — поле `update_url` в своём манифесте: его вписывает
// сам магазин при выдаче пакета (замер RECON 9900: манифест пакета магазина
// 1.2.0 несёт `https://clients2.google.com/service/update2/crx`, а zip без
// магазина его не несёт). Манифест не прочитался — тоже «из магазина»: молчать
// безопаснее, чем звать человека не туда.
//
// СРАВНЕНИЕ ПО ТРЁМ ЧИСЛАМ, А НЕ СТРОКОЙ: строкой «2.0.10» меньше «2.0.9».
//
// ССЫЛКА ТОЛЬКО НА НАШ САЙТ ПО HTTPS. Сервер проверяет её при записи, воркер —
// ещё раз здесь: ссылка — единственное, что строка даёт нажать.
var UPDATE_METHOD='update.check';
var UPDATE_RELOAD_METHOD='update.reload';
var UPDATE_STATE_KEY='update.meta';
var UPDATE_PATH='/v1/version';
var UPDATE_SITE_ORIGIN='https://eshario.com';
/**
 * РАЗ В ЧАС — и при открытии вебапа, если час с прошлого вопроса уже прошёл
 * (UPDATE-EASE-1, путь Б: платные живут на версии с сайта, и срочная починка
 * должна дойти до них за час, а не за шесть). Вопрос при открытии — это
 * первый вопрос страницы воркеру (`features/update-notice.js`): в сеть он идёт,
 * только если `nextAt` уже прошёл. Не чаще: сервер один на всех, и шаг держит
 * ПРОФИЛЬ, а не вкладка — десять вкладок EA спрашивают сервер один раз в час.
 * Цена — не больше 24 крошечных запросов в сутки с копии без магазина.
 * Прежде было шесть часов (слово владельца 19.09 на листе SIDE-CHANNEL-1).
 */
var UPDATE_EVERY_MS=3600000;
/** Сеть не ответила вовсе — следующая попытка через час, как и обычный вопрос. */
var UPDATE_RETRY_MS=3600000;
/**
 * ПОЛ ДЛЯ ПРОСЬБЫ «СПРОСИ СЕЙЧАС». Её зовёт прибор на живом листе, а
 * подделать сообщение окна умеет любой скрипт страницы EA: без пола он гонял
 * бы наш сервер через браузер человека. Минута и лимит сервера (десять за
 * десять минут) держат это.
 */
var UPDATE_FORCE_FLOOR_MS=60000;
var UPDATE_TIMEOUT_MS=5000;
var UPDATE_VERSION_RE=/^(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/;

function isAllowedUpdateUrl(url){if(!isAllowedUrl(url,accountOrigin()))return false;
try{var parsed=new URL(url);
return parsed.search===''&&parsed.hash===''&&parsed.pathname===UPDATE_PATH}catch(err){return false}}

/** Своя версия и признак копии без магазина. */
function updateSelf(){try{var manifest=chrome.runtime.getManifest();
var version=manifest&&typeof manifest.version==='string'?manifest.version:null;
var store=!manifest||(typeof manifest.update_url==='string'&&manifest.update_url!=='');
return{version:version,sideload:!store}}catch(err){return{version:null,sideload:false}}}

function updateParts(text){var match=typeof text==='string'?UPDATE_VERSION_RE.exec(text):null;
return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null}

/** Новее ли `latest`, чем своя: по трём числам слева направо. Нечитаемое — «нет». */
function updateNewer(latest,own){var a=updateParts(latest);
var b=updateParts(own);
if(a===null||b===null)return false;
for(var i=0;i<3;i+=1){if(a[i]!==b[i])return a[i]>b[i]}
return false}

function updateDownload(value){if(typeof value!=='string'||value===''||value.length>300)return null;
try{var parsed=new URL(value);
return parsed.protocol==='https:'&&parsed.origin===UPDATE_SITE_ORIGIN&&parsed.username===''&&parsed.password===''?parsed.href:null}catch(err){return null}}

/**
 * ПРЯМАЯ ССЫЛКА НА АРХИВ (UPDATE-EASE-1). Годна, как `download` (наш сайт,
 * https), плюс файл `.zip` без хвоста запроса и с ТЕМ ЖЕ номером в имени, что
 * `latest`: архив чужой версии звал бы качать не то. Негодная — поля нет, и
 * строка остаётся прежней, одной ссылкой на страницу установки.
 */
function updateZip(value,latest){var href=updateDownload(value);
if(href===null||typeof latest!=='string'||updateParts(latest)===null)return null;
try{var parsed=new URL(href);
var name=parsed.pathname.split('/').pop()||'';
return parsed.search===''&&parsed.hash===''&&/\.zip$/.test(name)&&name.slice(0,-4).split('-').indexOf(latest)!==-1?href:null}catch(err){return null}}

/**
 * ЧТО ЛЕЖИТ В ПАПКЕ РАСШИРЕНИЯ ПРЯМО СЕЙЧАС (UPDATE-EASE-1). Свой манифест
 * читается С ДИСКА (`no-store`), а не из памяти Chrome: распакованная копия
 * отдаёт свои файлы прямо из папки, и так видно, что человек УЖЕ распаковал
 * новый архив поверх старого. Замер RECON 9930: Chrome держит 1.0.0, а файл с
 * диска отдаёт 1.0.1. В сеть это не идёт вовсе.
 */
function updateOnDisk(){try{return fetch(chrome.runtime.getURL('manifest.json'),{cache:'no-store'}).then(function(response){return response.json()}).then(function(body){var value=body&&typeof body.version==='string'?body.version:null;
return value!==null&&updateParts(value)!==null?value:null},function(){return null})}catch(err){return Promise.resolve(null)}}

/** К ответу странице — что на диске и выросла ли там версия. */
function withDisk(self,answer){if(self.sideload!==true)return Promise.resolve(answer);
return updateOnDisk().then(function(disk){answer.disk=disk;
answer.ready=disk!==null&&updateNewer(disk,self.version);
return answer})}

/**
 * «РАСПАКОВАЛ, ПЕРЕЗАГРУЗИТЬ» (UPDATE-EASE-1, слово владельца 20.09).
 *
 * ЗАМЕР RECON 9930 (Chrome 153, своя проба, два захода). При ВКЛЮЧЁННОМ режиме
 * разработчика `chrome.runtime.reload()` перечитывает папку с диска целиком:
 * было 1.0.0, на диске 1.0.1, после перезагрузки 1.0.1, и код тоже новый. При
 * ВЫКЛЮЧЕННОМ Chrome гасит копию совсем (`unsupportedDeveloperExtension`), а
 * узнать режим расширение не может: `chrome.management.getSelf()` в обоих
 * случаях отвечает слово в слово одинаково.
 *
 * ОТСЮДА ДВА ЗАМКА. Перезагрузка идёт, только если копия распакованная И на
 * диске лежит версия ВЫШЕ своей: нажатие впустую не гасило бы ничего полезного,
 * но и не помогло бы. Всё остальное — честный отказ словом, и строка говорит
 * человеку, что архив не распакован в ту же папку.
 */
function updateReload(){var self=updateSelf();
if(self.sideload!==true)return Promise.resolve({ok:false,reason:'store-copy'});
return updateOnDisk().then(function(disk){if(disk===null||!updateNewer(disk,self.version))return{ok:false,reason:'same-version',own:self.version,disk:disk};
reloadSoon();
return{ok:true,reloading:true,own:self.version,disk:disk}})}

/** Перезагрузка НЕ в том же такте: иначе ответ странице не успеет уйти. */
function reloadSoon(){setTimeout(function(){try{chrome.runtime.reload()}catch(err){}},100)}

function readUpdateMeta(){return chrome.storage.local.get(UPDATE_STATE_KEY).then(function(stored){var kept=stored&&stored[UPDATE_STATE_KEY];
return kept&&typeof kept==='object'&&!Array.isArray(kept)?kept:null},function(){return null})}

function writeUpdateMeta(meta){var payload={};
payload[UPDATE_STATE_KEY]=meta;
return chrome.storage.local.set(payload).then(function(){return meta},function(){return meta})}

/**
 * Пора ли спрашивать сервер. Повод называется словом: «почему оно опять
 * пошло в сеть» не должно разбираться догадкой. Часы, уехавшие назад, — тоже
 * повод, иначе запись «спрашивали в будущем» заперла бы вопрос надолго.
 *
 * ШАГ УКОРОТИЛИ — СТАРАЯ ЗАПИСЬ НЕ ДЕРЖИТ (UPDATE-EASE-1, находка на живом
 * листе 20.09). Срок следующего вопроса лежит в памяти профиля и переживает
 * обновление расширения: копия владельца, поставленная ещё при суточном шаге,
 * молчала двенадцать часов после того, как шаг стал шестичасовым, и считала
 * последней версией 2.0.1. Новый шаг иначе доходил бы до людей ровно через
 * старый, то есть сутки. Поэтому запись с шагом ДЛИННЕЕ нынешнего — повод
 * спросить сейчас, один раз: следующий срок уже ляжет по новому шагу.
 */
function updateDue(meta,now,force){if(!meta||!Number.isSafeInteger(meta.at))return 'first';
if(now<meta.at)return 'clock-back';
if(force===true&&now-meta.at>=UPDATE_FORCE_FLOOR_MS)return 'force';
if(!Number.isSafeInteger(meta.nextAt)||now>=meta.nextAt)return 'daily';
if(meta.nextAt-meta.at>UPDATE_EVERY_MS)return 'step-shrunk';
return null}

/** Ответ странице: готовое «показать или нет» плюс числа прибора, без секретов. */
function updateAnswer(self,meta,due){var latest=meta&&typeof meta.latest==='string'?meta.latest:null;
var download=meta?updateDownload(meta.download):null;
var show=self.sideload===true&&latest!==null&&download!==null&&updateNewer(latest,self.version);
var zip=show&&meta?updateZip(meta.zip,latest):null;
return{ok:true,show:show,latest:latest,download:download,zip:zip,own:self.version,sideload:self.sideload===true,
state:{at:meta&&Number.isSafeInteger(meta.at)?meta.at:null,nextAt:meta&&Number.isSafeInteger(meta.nextAt)?meta.nextAt:null,
status:meta&&Number.isSafeInteger(meta.status)?meta.status:null,reason:meta&&typeof meta.reason==='string'?meta.reason:null,
asked:typeof due==='string'?due:null}}}

/** Один вопрос на профиль: две вкладки EA на старте не спрашивают дважды. */
var updateInFlight=null;

function updateCheck(params){var self=updateSelf();
if(!self.sideload)return Promise.resolve(updateAnswer(self,null,null));
if(updateInFlight)return updateInFlight;
var force=!!(params&&params.force===true);
var work=readUpdateMeta().then(function(meta){var now=Date.now();
var due=updateDue(meta,now,force);
if(due===null)return updateAnswer(self,meta,null);
return updateAsk(meta,now).then(function(saved){return updateAnswer(self,saved,due)})}).then(function(answer){return withDisk(self,answer)}).then(withNeeds);
updateInFlight=work.then(function(answer){updateInFlight=null;
return answer},function(){updateInFlight=null;
return{ok:false,show:false,reason:'worker-error'}});
return updateInFlight}

/**
 * Вопрос серверу. ПРЕЖНИЙ ГОДНЫЙ ОТВЕТ ПЕРЕЖИВАЕТ ПЛОХОЙ: кривое тело или 503
 * не стирают знание «вышла 2.0.2», а только сдвигают следующий вопрос. Номер
 * отзывают годным ответом с меньшим номером, а не поломкой сервера.
 */
function updateAsk(meta,now){var kept={latest:meta&&typeof meta.latest==='string'?meta.latest:null,
download:meta&&typeof meta.download==='string'?meta.download:null,
zip:meta&&typeof meta.zip==='string'?meta.zip:null,
updatedAt:meta&&Number.isSafeInteger(meta.updatedAt)?meta.updatedAt:null};
var url=accountOrigin()+UPDATE_PATH;
if(!isAllowedUpdateUrl(url))return writeUpdateMeta(Object.assign({},kept,{at:now,nextAt:now+UPDATE_EVERY_MS,status:0,reason:'forbidden-url'}));
var init={method:'GET',credentials:'omit',cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(UPDATE_TIMEOUT_MS)};
return fetch(url,init).then(function(response){var status=response.status;
if(status!==200)return writeUpdateMeta(Object.assign({},kept,{at:now,nextAt:now+UPDATE_EVERY_MS,status:status,reason:'http-'+status}));
return response.json().then(function(body){var latest=body&&typeof body.latest==='string'&&updateParts(body.latest)!==null?body.latest:null;
var download=body?updateDownload(body.download):null;
if(latest===null||download===null)return writeUpdateMeta(Object.assign({},kept,{at:now,nextAt:now+UPDATE_EVERY_MS,status:status,reason:'bad-body'}));
return writeUpdateMeta({latest:latest,download:download,zip:updateZip(body.zip,latest),updatedAt:Number.isSafeInteger(body.updatedAt)?body.updatedAt:null,
at:now,nextAt:now+UPDATE_EVERY_MS,status:status,reason:null})},
function(){return writeUpdateMeta(Object.assign({},kept,{at:now,nextAt:now+UPDATE_EVERY_MS,status:status,reason:'bad-body'}))})},
function(){return writeUpdateMeta(Object.assign({},kept,{at:now,nextAt:now+UPDATE_RETRY_MS,status:0,reason:'network'}))})}

/**
 * РУКОПОЖАТИЕ ВЕРСИЙ (кирпич LOADER-1, §3.2). Загрузчик отказался ставить код
 * страницы, которому нужна папка новее нашей (`code.needsLoader`). Строка в
 * вебапе говорит человеку «Нужен новый архив ESHArio N» тем же органом, что
 * «Есть версия N»; архив берётся из того же ответа `/v1/version`, если сервер
 * уже выложил версию не ниже нужной. Иначе в строке остаётся ссылка на
 * страницу установки.
 */
function withNeeds(answer){var loader=globalThis.esharioLoader;
if(!answer||!loader||typeof loader.needsLoader!=='function')return answer;
return loader.needsLoader().then(function(needs){if(!needs){answer.needsLoader=null;
return answer}
return readUpdateMeta().then(function(meta){var latest=meta&&typeof meta.latest==='string'?meta.latest:null;
var fits=latest!==null&&!updateNewer(needs.minLoader,latest);
answer.needsLoader={minLoader:needs.minLoader,version:needs.version,archive:fits?latest:needs.minLoader,
zip:fits?updateZip(meta.zip,latest):null,download:meta?updateDownload(meta.download):null};
return answer})},function(){return answer})}

// --- ТОНКИЙ ЗАГРУЗЧИК (кирпич LOADER-1, путь Д) ------------------------------
//
// Код страницы с нашего сервера под подписью, память годной версии, самолечение
// и общие двери живут в двух своих файлах: `loader/code.js` и `loader/doors.js`.
// Они классические, как и этот воркер, и грузятся здесь, при первом исполнении
// файла: `importScripts` в воркере MV3 работает только в эту минуту. Прежние
// двери этого файла не трогаются; слушатели загрузчика стоят рядом со своими.
// Песочницы старых сцен `importScripts` не дают, и загрузчик в них молчит:
// его сцены живут в `tests/loader.test.mjs`. Открытый ключ подписи кода
// (`loader/code-public-key.js`, его пишет линия склейки) грузится отдельно:
// нет файла, и загрузчик честно отказывает каждой версии с сервера, а не
// падает целиком вместе с дверями.
if(typeof importScripts==='function'){try{importScripts('../loader/code-public-key.js')}catch(err){}
try{importScripts('../loader/code.js','../loader/doors.js')}catch(err){}}

// Сообщения сюда приходят только из контекстов нашего же расширения: чужая
// страница идёт `onMessageExternal`, а его слушает только `loader/doors.js`,
// и только наш сайт (`externally_connectable`). Настоящая защита прежних
// дверей: проверка адреса выше.
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){if(!message)return false;

var work=null;
if(message.method===METHOD)work=fetchPrice(message.url);
else if(message.method==='account.status')work=accountStatus(message.params);
else if(message.method==='account.login')work=accountLogin(message.params);
else if(message.method==='account.logout')work=accountLogout();
else if(message.method==='account.recovery.start')work=accountRecoveryStart(message.params);
else if(message.method==='account.recovery.complete')work=accountRecoveryComplete(message.params);
else if(message.method==='account.settings.read')work=accountSettingsRead();
else if(message.method==='account.settings.write')work=accountSettingsWrite(message.params);
// ПЕРЕНОС НАСТРОЕК: одна рука на окно в вебапе и страницу аккаунта (ACCOUNT-SYNC-1).
else if(message.method===TRANSFER_METHOD)work=settingsTransfer(message.params);
// ОТЧЁТ О ПРОБЛЕМЕ: привязка к аккаунту и номер устройства отсюда (ACCOUNT-SYNC-1, путь А).
else if(message.method===REPORT_METHOD)work=reportSend(message.params);
// ДВЕРЬ В СТРАНИЦУ АККАУНТА: чип «войти» и «Настройки аккаунта» (ACCOUNT-OPEN-1).
else if(message.method===ACCOUNT_OPEN_METHOD)work=accountOpen(message.params);
// СЧЁТЧИКИ АККАУНТА: один владелец на профиль (кирпич SN-SAFE, блокер B1).
else if(message.method===BUDGET_RESERVE)work=ownerReserve(message.params);
else if(message.method===BUDGET_SPEND)work=ownerSpend(message.params);
else if(message.method===BUDGET_RELEASE)work=ownerRelease(message.params);
else if(message.method===BUDGET_REST)work=ownerRest(message.params);
else if(message.method===BUDGET_STATE)work=ownerReport();
// ЗАМКИ КАРТ: один последовательный владелец операций на профиль (волна 22, B2).
else if(message.method===LOCKS_WRITE)work=locksWrite(message.params);
// БАЗА КАРТ: справочник сезона с нашего узла (кирпич CARD-BASE).
else if(message.method===CARDS_METHOD)work=cardsBase(message.params);
// ПОСЛЕДНЯЯ ВЕРСИЯ: строка «есть версия новее» у копии без магазина (SIDE-CHANNEL-1).
else if(message.method===UPDATE_METHOD)work=updateCheck(message.params);
// «РАСПАКОВАЛ, ПЕРЕЗАГРУЗИТЬ»: перечитать папку с диска (UPDATE-EASE-1).
else if(message.method===UPDATE_RELOAD_METHOD)work=updateReload();
// Чужой метод: канал не держим. Вернуть true значило бы пообещать ответ,
// которого не будет.
if(work===null)return false;

work.then(sendResponse,function(){sendResponse({ok:false,reason:'worker-error'})});

// Канал ответа держим открытым: ответ асинхронный.
return true})})()


})(host.bg,host.fetch,undefined,host.global);
host.adoptLoader();
// --- src/content/content.js (byte for byte) ---
if(host.mode==="webapp")host.whenCode(function(){(function(chrome,window){
// Content script — isolated world. Классический скрипт, не модуль:
// content_scripts в MV3 не умеют ESM, поэтому импортов здесь нет и быть не может.
// Значения протокола продублированы из src/bridge/protocol.js и сверяются тестом,
// так что разъехаться они не могут.
(function(){'use strict';

var CHANNEL='fut-companion';
var FROM_PAGE='fut-companion/page';
var FROM_CONTENT='fut-companion/content';
var KIND_EVENT='event';
// Имя известия «список замков на диске поменялся». Продублировано из
// src/features/card-locks.js по той же причине, что значения протокола, и той
// же проверкой сверяется.
var LOCKS_CHANGED='locks.changed';
// Имя операции у владельца замков в фоне. Продублировано из
// src/background/worker.js — там оно и объявлено — и сверяется тестом.
var LOCKS_WRITE='locks.write';
// Известие «дверь в аккаунт не открылась» (кирпич ACCOUNT-OPEN-1). Продублировано
// из src/features/account-door.js и сверяется тестом.
var ACCOUNT_OPEN_FAILED='account.open.failed';
// ПЕРЕНОС НАСТРОЕК ИЗ ОКНА (кирпич ACCOUNT-SYNC-1). Имя метода и закрытый
// список причин продублированы из src/background/worker.js и
// src/sync/transfer-port.js и сверяются тестом; известие «настройки легли на
// диск» продублировано из того же порта.
var TRANSFER_METHOD='settings.transfer';
var TRANSFER_REASONS=['not-signed-in','offline','server','conflict','too-big','empty','no-port'];
var SETTINGS_APPLIED='settings.applied';
// Отчёт о проблеме (путь А): имя метода и причины продублированы из воркера и
// из src/features/problem-report.js, сверяются тестом.
var REPORT_METHOD='report.send';
var REPORT_REASONS=['offline','too-many','too-big','server','no-port'];

// --- 1. ВСТАВКА КОДА СТРАНИЦЫ (кирпич LOADER-1, путь Д) --------------------
//
// Из isolated world глобалы приложения EA не видны. Единственный способ до них
// добраться: вставить в страницу <script>, который выполнится в её контексте.
//
// ЧТО ВСТАВЛЯЕТСЯ. Код страницы одним файлом, ТЕКСТОМ, а не адресом: политика
// страницы EA пускает `'unsafe-inline'`, а `src` с чужого адреса и `blob:` не
// пройдут (RECON_SOLVER_NEXT, строки 855 по 869). Откуда текст, по порядку:
//   1. память `code.current`: версия с нашего сервера, прошедшая подпись в
//      фоне (`loader/code.js`); что лежит в памяти, считается доверенным;
//   2. если самолечение пометило её «не поднялась» дважды: `code.previous`;
//   3. иначе НИЧЕГО (вариант Б владельца, кирпич LOADER-THIN-1): запасной копии
//      кода в архиве нет, код всегда с сервера. Мост ставит на вебапе строку
//      «ESHArio загружает код с сервера…» своими средствами (ниже, «СТРОКА
//      КОДА ЕЩЁ НЕТ»), вебап работает как без ESHArio.
// Копию из папки мост не вставляет НИКОГДА, даже если файл там лежит: старый
// код без сервера и без подписи в памяти это то, от чего вариант Б уходит.
// Папка, чей паспорт называет модули (сборка разработки, стенды гейта), в
// шаге 3 берёт модуль `page/page-entry.js`, как до кирпича; в архиве людей
// модулей нет, и этот шаг там не наступает. Сборка разработки (`dist/`
// владельца, гейта и руля: вторая группа паспорта есть) идёт сразу модулем и
// память не читает (дописка 2 п.1). Файл склейки мост не спрашивает никогда:
// в сборке разработки его нет по построению, и Chrome писал бы на каждой
// загрузке `net::ERR_FILE_NOT_FOUND` (LOADER-FINAL-1 дописка 4 п.4).
//
// АТРИБУТЫ НА <script> (контракт 1.1): версия папки, адрес расширения и жетон
// загрузки. Код страницы читает их в первой синхронной части и больше нигде:
// узел снимается сразу после исполнения.
//
// ЖЕТОН. Случайные 16 байт на КАЖДУЮ загрузку страницы. По контракту 1.2 он в
// сообщениях не едет: код страницы подписывает им каждое сообщение (HMAC), и
// общие двери (`door`) без верной подписи отказывают словом `no-token`.
//
// МОМЕНТ. Текст исполняется сразу при вставке. Поэтому мост вставляет его,
// когда документ разобран (`DOMContentLoaded`, ниже `whenParsed`): живой лист
// LOADER-THIN-1 показал, что на `document_start` плюс чтение памяти у EA ещё
// нет `document.body`, и части кода без него молча не встают. Приложение EA
// точка входа ждёт сама (`page-entry.js`: ленивые адаптеры, `navOrNull`). Мост
// при этом уже слушает окно: его слушатели ставятся синхронно, до ответа памяти.
//
// МОМЕНТ РЕШАЕТ СЕРВЕР (LOADER-FINAL-1 §1 п.4). Слово `injectAt` из подписанной
// управляющей записи (`code.control.config`, дописка 4 п.1: флаги папки только
// под подписью; читается тем же `get`, что код): `parsed` (умолчание, как выше)
// или `start` (сразу, до скриптов EA: для перехвата на старте). Чужое слово
// читается как `parsed`; то же слово в открытом `code.config` не действует.
var CODE_CURRENT='code.current';
var CODE_PREVIOUS='code.previous';
var CODE_STATE='code.state';
var CODE_CONTROL='code.control';
// Признак «коду нужна папка новее» (фон, `loader/code.js`): строка «нужен новый архив».
var CODE_NEEDS='code.needsLoader';
var MODULE_PATH='page/page-entry.js';
// Код не поднял мост за двадцать секунд: провал подъёма (самолечение, §3.2).
var BOOT_WAIT_MS=20000;
var FOCUS_FLOOR_MS=60000;
// Мост стоит на всех страницах EA (дописка 1 брифа), код страницы сам решает,
// поднимать ли себя. Прежние двери моста (настройки, замки, ключ, аккаунт)
// открыты ТОЛЬКО на вебапе, как было: на прочих страницах EA живут рекламные и
// чужие скрипты, и ключ или замки им не отдаются. Общие двери с жетоном
// открыты везде, где встал наш код.
var WEBAPP_RE=/^https:\/\/www\.ea\.com\/(?:[^?#]*\/)?ultimate-team\/web-app/;
// Переезд пути вебапа (LOADER-FINAL-1 §1 п.5): сверх зашитого пути вебапом
// считается адрес, начинающийся строкой из `config.webapp` (только
// `https://www.ea.com/` и путь от четырёх знаков; та же сверка в `loader/doors.js`).
var WEBAPP_PREFIX_RE=/^https:\/\/www\.ea\.com\/[^?#\s]{4,200}$/;
var TOKEN=makeToken();
var HERE=here();
var ON_WEBAPP=WEBAPP_RE.test(HERE);
// Страница EA, но не вебап: здесь прежние двери закрыты. Так же и на сайте, куда
// человек сам выдал право и куда фон поставил этот мост (LOADER-FINAL-1 §1 п.2):
// на любой https странице, кроме вебапа, прежние двери закрыты. Стенды гейта
// поднимают мост на своей странице `file:` или без адреса: там двери открыты,
// как и до кирпича.
var WEBAPP=HERE===''||ON_WEBAPP||!/^https:\/\//i.test(HERE);
var loaded={source:null,version:null,sha8:null,sha256:null,bytes:null,readMs:null,injectMs:null,waitMs:null,injectAt:null};
// СБОРКА РАЗРАБОТКИ (дописка 2 п.1): в паспорте вторая группа доступных файлов
// с модулями страницы. Папки людей её не несут (упаковщик вырезает), значит в
// архиве признак всегда «нет». И это папка настоящего расширения: стенды гейта
// поднимают мост на своей странице с поддельным адресом (`data:`), и там
// сборкой разработки он себя не считает и глобала жетона не ставит.
var DEV_PASSPORT=devPassport();
// ПАСПОРТ БЕЗ МОДУЛЕЙ (архив людей, вариант Б): группы доступных файлов есть,
// и ни одна не называет модули страницы. Кода в памяти нет: здесь не ставится
// НИЧЕГО, только строка. Паспорт вовсе без групп бывает только у подставного
// паспорта стендов гейта (в Chrome у архива группа есть всегда, её держит
// упаковщик): там, как и в папке с модулями, прежний модуль.
var THIN_PASSPORT=thinPassport();

function devPassport(){try{if(!/^chrome-extension:\/\//.test(chrome.runtime.getURL('')))return false;
return namesModules(chrome.runtime.getManifest().web_accessible_resources||[])}catch(err){return false}}
function thinPassport(){try{var groups=chrome.runtime.getManifest().web_accessible_resources;
return Array.isArray(groups)&&groups.length>0&&!namesModules(groups)}catch(err){return false}}
function namesModules(groups){return groups.some(function(group){return isPlain(group)&&Array.isArray(group.resources)&&group.resources.indexOf('page/*.js')>=0})}
var boot=null;

function makeToken(){var bytes=new Uint8Array(16);
try{crypto.getRandomValues(bytes)}catch(err){for(var i=0;i<16;i+=1)bytes[i]=Math.floor(Math.random()*256)}
var out='';
for(var j=0;j<16;j+=1)out+=(bytes[j]<16?'0':'')+bytes[j].toString(16);
return out}
function here(){try{return String(window.location.href||'')}catch(err){return ''}}
function clock(){try{return performance.now()}catch(err){return Date.now()}}
function own(){try{return chrome.runtime.getManifest().version}catch(err){return ''}}
function isPlain(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function goodCode(one){return isPlain(one)&&isPlain(one.meta)&&typeof one.text==='string'&&one.text!==''}

/** Какой код из памяти: текущий или, после самолечения, прошлый. */
function pickCode(stored){var current=stored[CODE_CURRENT],previous=stored[CODE_PREVIOUS],state=stored[CODE_STATE];
var marked=goodCode(current)&&isPlain(state)&&isPlain(state.fallback)&&state.fallback.version===current.meta.version&&state.fallback.sha256===current.meta.sha256;
if(goodCode(current)&&!marked)return{source:'server',meta:current.meta,text:current.text};
if(marked&&goodCode(previous))return{source:'previous',meta:previous.meta,text:previous.text};
return null}

function attributes(node){node.dataset.esharioLoader=own();
node.dataset.esharioBase=chrome.runtime.getURL('');
node.dataset.esharioToken=TOKEN}

/**
 * ТЕКСТ В МИР СТРАНИЦЫ ИДЁТ ЧЕРЕЗ ФОН (лист LOADER-1 шаг 1, 24.09). Chrome
 * судит текстовый `<script>`, вставленный мостом, политикой ИЗОЛИРОВАННОГО
 * мира расширения (`script-src 'self' …`), а не политикой страницы EA: текст
 * не исполняется, в консоли страницы «Executing inline script violates …».
 * Стенды гейта этого не видели: там мост живёт прямо на странице. Поэтому
 * текст (код, прибор, жетон сборки разработки) едет фону, и фон кладёт его в
 * мир страницы `chrome.scripting.executeScript` с `world: 'MAIN'`: там
 * действует политика страницы, а она текст пускает. Узел, атрибуты и снятие
 * узла прежние, код страницы читает жетон из своего `<script>`, как по
 * договору. Фон не ответил или отказал ДО вставки: прежняя вставка из моста
 * (стенды гейта; в Chrome она упрётся в ту же политику и честно промолчит).
 */
function inPage(parts){var sent;
try{sent=chrome.runtime.sendMessage({method:'code.main',params:{parts:parts}})}catch(err){sent=Promise.reject(err)}
return Promise.resolve(sent).then(function(answer){return isPlain(answer)&&answer.ok===true?answer:inDom(parts)},function(){return inDom(parts)})}

/** Прежняя вставка из моста: узел, атрибуты, текст, снять узел. */
function inDom(parts){var out={ok:true,injectMs:null};
for(var i=0;i<parts.length;i+=1){try{var node=document.createElement('script');
var attrs=parts[i].attrs;
if(attrs)for(var key in attrs)node.dataset[key]=attrs[key];
node.textContent=parts[i].text;
var started=clock();
(document.head||document.documentElement).appendChild(node);
if(i===0)out.injectMs=Math.round(clock()-started);
if(typeof node.remove==='function')node.remove()}catch(err){}}
return out}

/** Три атрибута вставки кода (контракт §2): версия папки, адрес, жетон. */
function tagAttrs(){return{esharioLoader:own(),esharioBase:chrome.runtime.getURL(''),esharioToken:TOKEN}}

/**
 * ШТАМП МИГА ВСТАВКИ (LOADER-FINAL-1 дописка 3, по отчёту BOOT-HANG-1 §10.1).
 * На корне документа атрибут `data-eshario-inject`: `performance.now()` в миг,
 * когда мост отдаёт код странице (текст или модуль), в целых мс от старта
 * страницы. Журнал фаз кода страницы читает его и показывает, когда встал код.
 * Поведения сверх атрибута нет.
 */
function stampInject(){try{document.documentElement.setAttribute('data-eshario-inject',String(Math.round(clock())))}catch(err){}}

/** Вставить код текстом; узел снимается сразу, классический текст исполняется при вставке. */
function injectText(code){stampInject();
return inPage([{text:code.text,attrs:tagAttrs()}]).then(function(done){loaded.injectMs=Number.isSafeInteger(done.injectMs)?done.injectMs:null})}

/** Сборка для разработки: модуль из папки, как до кирпича. */
function injectModule(){stampInject();
var node=document.createElement('script');
node.type='module';
node.src=chrome.runtime.getURL(MODULE_PATH);
node.dataset.futCompanion='page-entry';
attributes(node);
node.addEventListener('load',function(){node.remove()});
// На document_start head ещё может не существовать.
(document.head||document.documentElement).appendChild(node)}

/**
 * СБОРКА РАЗРАБОТКИ: ВСЕГДА МОДУЛЬ, ПАМЯТЬ КОДА НЕ ЧИТАЕТСЯ (дописка 2 п.1).
 * Признак: вторая группа паспорта есть (по паспорту, файл склейки не
 * спрашивается: LOADER-FINAL-1 дописка 4 п.4). Это `dist` владельца, гейта и
 * руля; код с сервера туда не ставится никогда, даже если память полна (её
 * могла наполнить прежняя установка того же профиля).
 */
function startPage(){if(!DEV_PASSPORT)return startRelease();
loaded.source='module';
return injectDevTag().then(function(){injectModule();
watchBoot()})}

/**
 * ЖЕТОН МОДУЛЮ В СБОРКЕ РАЗРАБОТКИ. Склейка читает жетон из атрибутов своего
 * `<script>` в замыкание `__eshario_tag`; у модуля такого замыкания нет, и
 * `src/bridge/loader-tag.js` находит то же имя глобалом окна. Поэтому перед
 * модулем крошечный текст кладёт на окно неизменяемое и неперечислимое
 * `__eshario_tag` с версией папки, адресом и жетоном. Глобал виден скриптам
 * страницы, и это законно ТОЛЬКО здесь: сборка разработки живёт на машине
 * владельца. Склейка выпуска и архив людей такого текста не вставляют никогда
 * (сцена сторожит: на пути памяти его нет).
 */
var DEV_TAG='(function(t){try{Object.defineProperty(window,"__eshario_tag",{value:Object.freeze(t),writable:false,configurable:false,enumerable:false})}catch(e){}})';

function injectDevTag(){return inPage([{text:DEV_TAG+'('+JSON.stringify({loader:own(),base:chrome.runtime.getURL(''),token:TOKEN})+')',attrs:{esharioDevTag:'1'}}]).then(function(){},function(){})}

function startRelease(){var started=clock();
var read;
try{read=chrome.storage.local.get([CODE_CURRENT,CODE_PREVIOUS,CODE_STATE,CODE_NEEDS,CODE_CONTROL])}catch(err){read=Promise.reject(err)}
return Promise.resolve(read).then(function(stored){loaded.readMs=Math.round(clock()-started);
var kept=isPlain(stored)?stored:{};
return{code:pickCode(kept),state:kept[CODE_STATE],needs:kept[CODE_NEEDS],config:isPlain(kept[CODE_CONTROL])&&isPlain(kept[CODE_CONTROL].config)?kept[CODE_CONTROL].config:{}}},function(){return{code:null,state:null,needs:null,config:{}}}).then(function(found){var code=found.code;
adoptWebapp(found.config);
loaded.injectAt=injectAtOf(found.config);
if(code===null){if(THIN_PASSPORT)return noCode(found.state,found.needs);
loaded.source='module';
injectModule();
watchBoot();
return}
// Код исполняется этой загрузкой: строки «кода нет» здесь быть не может
// (её мог поставить прежний мост этой же вкладки до переизбрания).
dropLine();
loaded.source=code.source;
loaded.version=typeof code.meta.version==='string'?code.meta.version:null;
loaded.sha256=typeof code.meta.sha256==='string'?code.meta.sha256:null;
loaded.sha8=loaded.sha256===null?null:loaded.sha256.slice(0,8);
loaded.bytes=code.text.length;
var waitFrom=clock();
return(loaded.injectAt==='start'?Promise.resolve():whenParsed()).then(function(){loaded.waitMs=Math.round(clock()-waitFrom);
return injectText(code)}).then(injectInstrument).then(function(){watchBoot();
if(loaded.sha8===null)digestLater(code.text)})})}

/** Слово момента вставки из настройки сервера: `start` или `parsed` (всё прочее). */
function injectAtOf(config){return isPlain(config)&&config.injectAt==='start'?'start':'parsed'}

/**
 * ВЕБАП ПО НАСТРОЙКЕ СЕРВЕРА (LOADER-FINAL-1 §1 п.5). Строки `config.webapp`:
 * адрес этой страницы начинается одной из них, значит это вебап (переехал путь
 * EA). Годны только `https://www.ea.com/` с путём от четырёх знаков.
 */
function adoptWebapp(config){if(ON_WEBAPP)return;
var list=isPlain(config)&&Array.isArray(config.webapp)?config.webapp.slice(0,10):[];
for(var i=0;i<list.length;i+=1){if(typeof list[i]==='string'&&WEBAPP_PREFIX_RE.test(list[i])&&HERE.indexOf(list[i])===0){ON_WEBAPP=true;
WEBAPP=true;
return}}}

/**
 * КОД ВСТАЁТ НА РАЗОБРАННУЮ СТРАНИЦУ (лист LOADER-THIN-1 шаг 1, 24.09). Память
 * читается за десятки миллисекунд после `document_start`, а EA держит разбор
 * документа своими скриптами в `<head>` дольше: код из памяти вставал, когда
 * `document.body` ещё не было. Модули до кирпича так рано не вставали никогда
 * (их граф грузился сотни миллисекунд). Части кода, что вешают наблюдателя на
 * `document.body` при подъёме, молча оставались без него: пункт «Галерея» не
 * вставал вовсе (`__eshario.galleryPanel().why`: `observing: false`,
 * `passes: 1`). Поэтому текст кода ждёт конца разбора (`DOMContentLoaded`), как
 * ждал бы отложенный скрипт; разобранная страница получает код сразу. Сколько
 * ждали, видно в приборе полем `waitMs`.
 */
function whenParsed(){var state='';
try{state=String(document.readyState||'')}catch(err){state=''}
if(state!=='loading')return Promise.resolve();
return new Promise(function(resolve){var done=false;
function go(){if(done)return;
done=true;
resolve()}
try{document.addEventListener('DOMContentLoaded',go,{once:true})}catch(err){go()}})}

/**
 * КОДА НЕТ (вариант Б): первый запуск, память стёрта или сервер ещё не
 * ответил. В страницу не ставится ничего, вебап работает как без ESHArio. На
 * вебапе строка сверху и отчёт фону «кода нет» (`code.boot`, источник `none`):
 * это повод спросить сервер сейчас (`why` `boot`) и держать вопрос раз в
 * минуту, пока код не ляжет. Прочие страницы EA молчат, как молчит на них код.
 */
function noCode(state,needs){loaded.source='none';
if(!ON_WEBAPP)return;
waiting=true;
showLine(lineKind(null,state,needs));
try{Promise.resolve(chrome.runtime.sendMessage({method:'code.boot',params:{ok:false,source:'none',version:null,sha256:null}})).then(function(){},function(){})}catch(err){}}

// --- СТРОКА «КОДА ЕЩЁ НЕТ» (кирпич LOADER-THIN-1, вариант Б владельца) -------
//
// Кода страницы нет, и человек видит вебап без ESHArio, не понимая почему.
// Мост ставит сверху страницы одну тонкую строку СВОИМИ средствами (кода
// страницы нет, а с ним нет и органа `update-notice.js`): «загружает код»,
// «сервер не отвечает, повторю позже», «код загружен, обновите
// страницу (F5)» и «нужен новый архив» (код с сервера просит папку новее
// нашей: признак `code.needsLoader`, его пишет фон). Строку двигает память
// загрузчика (`code.current`, `code.state`, `code.needsLoader` в
// `chrome.storage.onChanged`); страницу мост сам не перезагружает. Строка
// снимается, когда код исполняется: вставка кода этой загрузкой или первый
// вопрос кода страницы мосту. Клики идут сквозь строку в вебап.
//
// ДВА ЯЗЫКА (дописка 1 брифа, тексты Fable): язык браузера `navigator.language`
// начинается с `ru`: русские; иначе английские. Словарей страницы здесь нет
// (они едут в коде страницы), поэтому восемь строк живут прямо тут.
//
// ЦВЕТА СТРОКОЙ СТИЛЯ ПРЯМО В УЗЛЕ: единственное исключение из правила одного
// файла темы (DESIGN.md, бриф LOADER-THIN-1 §2 п.2). Таблицы стилей в вебапе
// здесь нет: она едет в коде страницы, а его нет, и `ui/theme.css` странице
// недоступен (паспорт его не открывает, а паспорт не меняется). Значения те же,
// что в теме, каждое на своей строке с именем токена: шаг гейта `theme` сверяет
// их с `ui/theme.css` (`RAW_COLOR_EXCEPTIONS`), и смена гаммы красит гейт здесь.
var LINE_ID='eshario-loader-line';
var LINE_TEXTS={
ru:{wait:'ESHArio загружает код с сервера…',silent:'ESHArio: сервер не отвечает, повторю позже',ready:'ESHArio: код загружен, обновите страницу (F5)',needs:'ESHArio: нужен новый архив, скачайте на eshario.com'},
en:{wait:'ESHArio is loading its code from the server…',silent:'ESHArio: server not responding, retrying later',ready:'ESHArio: code loaded, refresh the page (F5)',needs:'ESHArio: a new install is needed, download it at eshario.com'}};
var LINE_TEXT=LINE_TEXTS[lineLang()];
function lineLang(){try{var said=typeof navigator!=='undefined'&&navigator&&typeof navigator.language==='string'?navigator.language:'';
return /^ru/i.test(said)?'ru':'en'}catch(err){return 'en'}}
var LINE_SURFACE='#131417'; // --fx-surface
var LINE_INK='#EEF1F7'; // --fx-ink
var LINE_ACCENT='#3DD8FF'; // --fx-accent
var LINE_WARN='#FFB454'; // --fx-warn
var line=null;
var waiting=false;

/** Какую строку показать: код лёг, нужен новый архив, сервер не ответил или ждём. */
function lineKind(current,state,needs){if(goodCode(current))return 'ready';
if(needsArchive(needs))return 'needs';
return isPlain(state)&&typeof state.lastError==='string'&&state.lastError!==''?'silent':'wait'}

/**
 * НУЖЕН НОВЫЙ АРХИВ: фон записал `code.needsLoader`, когда сервер предложил
 * код с `minLoader` выше нашей папки (`loader/code.js`, рукопожатие). Папку уже
 * обновили до нужной: признак ничего не значит, как и у фона.
 */
function needsArchive(needs){return isPlain(needs)&&typeof needs.minLoader==='string'&&newerThan(needs.minLoader,own())}

/** Больше ли номер `a`, чем `b`, по четырём числам. Нечитаемое не больше ничего. */
function newerThan(a,b){var re=/^\d{1,5}(?:\.\d{1,5}){0,3}$/;
if(typeof a!=='string'||typeof b!=='string'||!re.test(a)||!re.test(b))return false;
var x=a.split('.').map(Number),y=b.split('.').map(Number);
for(var i=0;i<4;i+=1){var p=x[i]||0,q=y[i]||0;
if(p!==q)return p>q}
return false}

function lineStyle(kind){return 'position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;box-sizing:border-box;margin:0;padding:3px 12px;'
+'font:12px/16px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
+'background:'+LINE_SURFACE+';color:'+LINE_INK+';border-bottom:2px solid '+(kind==='silent'||kind==='needs'?LINE_WARN:LINE_ACCENT)}

function showLine(kind){if(!ON_WEBAPP||!Object.prototype.hasOwnProperty.call(LINE_TEXT,kind))return;
try{if(line===null){line=document.createElement('div');
line.id=LINE_ID;
line.setAttribute('role','status');
(document.documentElement||document.body).appendChild(line)}
line.dataset.esharioLine=kind;
line.textContent=LINE_TEXT[kind];
// Стиль через CSSOM, а не атрибутом: правило `style-src` без `'unsafe-inline'`
// гасит атрибут `style`, а свойства `style` не трогает.
var css=lineStyle(kind);
if(line.style&&typeof line.style==='object')line.style.cssText=css;
else line.setAttribute('style',css)}catch(err){}}

/** Снять строку: и свою, и оставленную прежним мостом этой вкладки. */
function dropLine(){waiting=false;
try{var node=line;
if(node===null&&typeof document.getElementById==='function')node=document.getElementById(LINE_ID);
if(node&&typeof node.remove==='function')node.remove()}catch(err){}
line=null}

/** Память загрузчика сменилась: строка перечитывает код и состояние. */
function refreshLine(){var read;
try{read=chrome.storage.local.get([CODE_CURRENT,CODE_STATE,CODE_NEEDS])}catch(err){return}
Promise.resolve(read).then(function(stored){if(!waiting)return;
var kept=isPlain(stored)?stored:{};
showLine(lineKind(kept[CODE_CURRENT],kept[CODE_STATE],kept[CODE_NEEDS]))},function(){})}

/**
 * ПРИБОР `__eshario.loader()` (для листа). Ставится отдельным крошечным
 * текстом ПОСЛЕ кода страницы. Объект `__eshario` склейка создаёт телом точки
 * входа, а до него могут идти модули с `await` на верхнем уровне: к мигу
 * прибора объекта может ещё не быть. Тогда прибор ждёт его присваивания
 * (одноразовый перехват свойства окна, после первого присваивания свойство
 * снова обычное). Числа приходят событием `loader.state` и обновляются им же;
 * подделать событие может любой скрипт страницы, но прибор ничего не решает,
 * он только показывает.
 */
var INSTRUMENT='(function(snap,channel,from){var state=snap;'
+'function attach(box){if(box&&typeof box==="object"&&typeof box.loader!=="function")box.loader=function(){return JSON.parse(JSON.stringify(state))}}'
+'if(window.__eshario&&typeof window.__eshario==="object")attach(window.__eshario);'
+'else{try{Object.defineProperty(window,"__eshario",{configurable:true,get:function(){return undefined},'
+'set:function(v){Object.defineProperty(window,"__eshario",{value:v,writable:true,configurable:true,enumerable:true});attach(v)}})}catch(e){}}'
+'window.addEventListener("message",function(e){if(e.source!==window)return;var m=e.data;'
+'if(!m||m.channel!==channel||m.from!==from||m.kind!=="event"||m.name!=="loader.state"||!m.payload||typeof m.payload!=="object")return;state=m.payload})})';

function snapshot(status){var out={loader:own(),code:{version:loaded.version,source:loaded.source,sha256:loaded.sha8},
readMs:loaded.readMs,injectMs:loaded.injectMs,waitMs:loaded.waitMs,injectAt:loaded.injectAt,bytes:loaded.bytes,checkedAt:null,lastError:null,needsLoader:null,fallback:null,
server:null,previous:null,writeMs:null,log:[]};
if(isPlain(status)){out.checkedAt=Number.isSafeInteger(status.checkedAt)?status.checkedAt:null;
out.lastError=typeof status.lastError==='string'?status.lastError:null;
out.needsLoader=isPlain(status.needsLoader)?status.needsLoader:null;
out.fallback=isPlain(status.fallback)?status.fallback:null;
out.server=isPlain(status.current)?status.current:null;
out.previous=isPlain(status.previous)?status.previous:null;
out.writeMs=Number.isSafeInteger(status.writeMs)?status.writeMs:null;
out.log=Array.isArray(status.log)?status.log:[]}
return out}

function injectInstrument(){return inPage([{text:INSTRUMENT+'('+JSON.stringify(snapshot(null))+','+JSON.stringify(CHANNEL)+','+JSON.stringify(FROM_CONTENT)+')',attrs:null}]).then(function(){},function(){}).then(refreshInstrument)}

var refreshTimer=null;
function refreshInstrument(){if(loaded.source===null||loaded.source==='module'||loaded.source==='none'||refreshTimer!==null)return;
refreshTimer=setTimeout(function(){refreshTimer=null;
var sent;
try{sent=chrome.runtime.sendMessage({method:'code.status'})}catch(err){sent=Promise.reject(err)}
Promise.resolve(sent).then(function(status){window.postMessage({channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name:'loader.state',payload:snapshot(status)},window.location.origin)},function(){})},300)}

/** Отпечаток запасной копии: для прибора, после вставки, не на пути кода. */
function digestLater(text){try{if(typeof crypto==='undefined'||!crypto.subtle)return;
crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(function(buffer){var view=new Uint8Array(buffer),hex='';
for(var i=0;i<4;i+=1)hex+=(view[i]<16?'0':'')+view[i].toString(16);
loaded.sha8=hex;
refreshInstrument()},function(){})}catch(err){}}

/**
 * ПОДНЯЛСЯ ЛИ КОД (самолечение §3.2). Первый вопрос кода страницы мосту
 * (`ping` проверки моста на старте точки входа) и есть «поднялся». Нет его за
 * двадцать секунд: провал. Считается только на вебапе: на прочих страницах EA
 * код страницы молчит нарочно. Отчёт уходит воркеру один раз за загрузку, он
 * же повод спросить сервер о новой версии.
 */
function watchBoot(){if(!ON_WEBAPP)return;
boot={reported:false,timer:setTimeout(function(){reportBoot(false)},BOOT_WAIT_MS)}}

function reportBoot(ok){if(boot===null||boot.reported)return;
boot.reported=true;
clearTimeout(boot.timer);
var params={ok:ok,source:loaded.source,version:loaded.version,sha256:loaded.source==='server'?loaded.sha256:null};
try{Promise.resolve(chrome.runtime.sendMessage({method:'code.boot',params:params})).then(function(){},function(){})}catch(err){}}

/** Возврат фокуса в окно вебапа: повод спросить сервер (пол в минуту и здесь, и в фоне). */
var focusAt=0;
// Слушатель ставится всегда: вебапом страница может стать после чтения памяти
// (`config.webapp`, LOADER-FINAL-1).
try{window.addEventListener('focus',function(){if(!ON_WEBAPP)return;
var now=Date.now();
if(now-focusAt<FOCUS_FLOOR_MS)return;
focusAt=now;
try{Promise.resolve(chrome.runtime.sendMessage({method:'code.focus'})).then(function(){},function(){})}catch(err){}})}catch(err){}

// Событие фона (будильник, уведомление, пункт меню) уходит в страницу голым
// известием: код страницы сам спросит, что ему нужно, дверью с жетоном.
try{if(chrome.runtime.onMessage&&typeof chrome.runtime.onMessage.addListener==='function'){chrome.runtime.onMessage.addListener(function(message){if(!message||typeof message.loaderEvent!=='string'||!/^door\.[a-z]+$/.test(message.loaderEvent))return false;
window.postMessage({channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name:message.loaderEvent,payload:message.payload===undefined?null:message.payload},window.location.origin);
return false})}}catch(err){}

// --- 2. Обработчики запросов из page context ------------------------------
// Здесь живёт то, что доступно только расширению: chrome.storage, версия,
// лицензия. Page context всё это получает через мост.
var SETTINGS_KEY='settings.toggles';
var FILTERS_KEY='filters.sets';
var LIMITS_KEY='automation.limits';
var OPTIONS_KEY='automation.options';
var SELLER_KEY='seller.options';
var UI_KEY='ui.state';
var JOURNAL_KEY='automation.journal';
var LEDGER_KEY='automation.ledger';
var LICENSE_KEY='license.key';
var PACKS_KEY='packs.locks';
var LOCKS_KEY='card.locks';
// Заморозка карты (кирпич TR10): «наши оптовые кнопки эту карту не трогают».
// Свой ключ рядом с замками, а не поле внутри них: замок отвечает решателю,
// заморозка — трём кнопкам листа, и класть два разных ответа в одну запись
// значило бы, что правка одного вопроса роняет другой.
var FROZEN_KEY='card.frozen';
var LIVE_CONTROL_KEY='live.control';
// Каталог карт лежит ОСКОЛКАМИ: значение здесь копируется целиком, и один
// ключ на 27 000 карт означал бы почти мегабайт структурного копирования на
// каждый сброс, прямо в главном потоке EA (RECON 203).
var CATALOG_PREFIX='catalog.v1.';
var CATALOG_SHARDS=16;
// Книга пар «редкость → группы EA». Осколков нет намеренно: редкостей сто с
// небольшим, вся книга — байты. Наблюдённое знание бесплатно не
// восстанавливается, поэтому оно и лежит на диске (решение Fable 2026-08-06).
var GROUPS_KEY='rarity.groups';
// Какой базой карт засеян каталог этого профиля (кирпич CARD-BASE): метка
// файла и час засева. Своё знание — и потому свой ключ: воркер помнит, что
// он СКАЧАЛ, а это запись о том, что страница УСВОИЛА. Стереть каталог сменой
// сезона можно, не тронув память воркера, и тогда одна метка врала бы другой.
var CARDBASE_KEY='cards.seed';
// Состав просмотренного превью-пака (кирпич PACK-PEEK-1, заказ владельца 19.09):
// после перезагрузки EA помнит только обложку, а состав того же превью лежит
// здесь. Наблюдение страницы, не настройка: тот же путь, что у памяти спроса.
var PREVIEW_KEY='preview.packs';
// Память спроса: какие классы живые SBC просили за последние две недели
// (решение пользователя 2026-08-08). Тот же путь и тот же вес, что у книги
// групп. Восстановить её бесплатно нельзя ничем: провал между волнами сборок
// как раз и означает, что спрашивать больше некого.
var DEMAND_KEY='demand.memory';
// Журнал покупок (кирпич LG1): «номер карты → сколько за неё заплачено».
// Цену покупки EA стирает сама — у проданной карты её нет вовсе, — поэтому
// восстановить журнал бесплатно нельзя ничем. Один ключ, не осколки: тысяча
// записей двумя плоскими списками весит ~17 КБ, втрое меньше одного осколка
// каталога.
var PURCHASES_KEY='purchase.log';
// Два счётчика защиты аккаунта (кирпич AB): сколько раз за сутки мы ходили к
// поиску рынка и когда делались ставки последнего часа. Оба обязаны пережить
// перезагрузку — счётчик, который обнуляется по F5, защитой не является, а
// вебап EA перезагружается сам.
var DAY_BUDGET_KEY='market.daybudget';
var BUY_RATE_KEY='market.buyrate';
// Третий счётчик той же породы (кирпич HD2, проводка HD3): сколько испытаний SBC
// сдано за скользящий час и за местные сутки. Рамки чужие (90/час и 300/сутки),
// и шкала в шапке обязана уцелеть после перезагрузки: вебап EA перезагружается
// сам, а рамка EA этого не забывает.
var SBC_RATE_KEY='sbc.rate';
// ЗЕРКАЛО КАРТ КЛУБА (кирпич CM2). Осколки по той же причине, что у каталога:
// значение копируется целиком, а клуб на 5 000 карт в одном ключе — это больше
// полумегабайта структурного копирования на КАЖДУЮ точечную правку, прямо в
// главном потоке EA. Голова лежит отдельным маленьким ключом: в ней время
// чтения, счётчики по типам и суточный счётчик чтений клуба.
var MIRROR_PREFIX='club.mirror.v1.';
var MIRROR_HEAD_KEY='club.mirror.head';
var MIRROR_SHARDS=8;
// БАЗОВАЯ ЛИНИЯ ОБЛАКА (кирпич CLOUD-2). Снимок настроек, на котором сошлись
// профиль и облако Chrome. Ключ такой же обычный, как семнадцать соседних, и
// доставка у него такая же: `readKey`/`writeKey`, ни строчкой больше.
var SYNC_BASE_KEY='settings.sync';
// ОБЛАКО CHROME — ЕДИНСТВЕННОЕ МЕСТО, ГДЕ МОСТ КАСАЕТСЯ `chrome.storage.sync`.
// Снимок не влезает в один ключ облака (8 KB на ключ у Google, наш потолок
// 96 KB), поэтому он лежит кусками `settings.cloud.<n>`, а рядом метаданные с
// их числом. ИМЕНА КУСКОВ СТРОЯТСЯ ЗДЕСЬ ПО НОМЕРУ, а не приезжают из page
// context: мир страницы может соврать, и чужое имя ключа отсюда не построить.
var CLOUD_META_KEY='settings.cloud.meta';
var CLOUD_CHUNK_PREFIX='settings.cloud.';
// Столько ключей в облаке Google всего; наш снимок не может занять больше, и
// число служит потолком цикла, а не обещанием места.
var CLOUD_MAX_CHUNKS=512;

// Хранилище живёт в chrome.storage, которого в page context нет вовсе.
// Разбор и проверка значений — не здесь: этим занимаются sanitize() в
// src/settings/ и src/features/filter-store.js, чтобы каждое правило было
// записано ровно в одном месте. Здесь только доставка байтов.
function readKey(key){return function(){return chrome.storage.local.get(key).then(function(stored){return(stored&&stored[key]!==undefined)?stored[key]:null})}}

function writeKey(key){return function(params){var payload={};
payload[key]=params;
return chrome.storage.local.set(payload).then(function(){return true})}}

// --- ЗАМКИ: ОПЕРАЦИЯ УЕЗЖАЕТ ВЛАДЕЛЬЦУ В ФОН (волна 22, B2; A93-01) --------
//
// ПОЧЕМУ СЛИЯНИЕ ЗДЕСЬ БОЛЬШЕ НЕ ЖИВЁТ. Оно жило здесь всю волну 21, и этого
// не хватило: content script существует ПО ЭКЗЕМПЛЯРУ НА ВКЛАДКУ, а
// `chrome.storage.local` не умеет сравнения-с-обменом. Два экземпляра читали
// пустой диск, каждый складывал свою операцию и каждый успешно перечитывал
// СВОЮ запись — а на диске оставалась одна из двух (порядок A93-01). Ровно та
// же беда и то же лекарство, что у счётчиков: настоящий одиночка на профиль
// один — фоновый воркер.
//
// ЗДЕСЬ ОСТАЛАСЬ ДОСТАВКА И НИ ОДНОЙ МЫСЛИ. Операция уезжает воркеру как есть;
// сложить её с диском и положить байты — его дело.
//
// РАСПИСКА ПОЛОЖИТЕЛЬНАЯ, И ТОЛЬКО ОНА. Молчание воркера (он умирает через
// десятки секунд простоя), отказ диска и любой неизвестный ответ — это ОТКАЗ
// записи: обещание отклоняется, провайдер помечается `save-failed`, а это у
// замков значит «заперты все, новых не принимаем». Тихий `true` из незнания
// вернул бы ту самую болезнь, ради которой всё это написано.
//
// ЧУЖОЕ ИМЯ КЛЮЧА ОТСЮДА ПО-ПРЕЖНЕМУ НЕ ПОСТРОИТЬ: ключ один и написан у
// владельца, а мир страницы называет только операцию.
function writeLocks(params){if(!params||typeof params!=='object'||Array.isArray(params))return Promise.resolve(false);
return chrome.runtime.sendMessage({method:LOCKS_WRITE,params:params})
.then(function(result){if(result&&result.ok===true)return true;
return Promise.reject('locks: '+((result&&result.reason)||'no-response'))},
function(err){return Promise.reject('locks: '+String((err&&err.message)||err))})}

// Номер осколка приходит из page context, то есть из мира, который может
// соврать. Чужое имя ключа отсюда не построить: число либо в диапазоне, либо
// запроса нет вовсе.
function catalogKey(params){var shard=params&&params.shard;
if(typeof shard!=='number'||!isFinite(shard)||Math.floor(shard)!==shard) return null;
if(shard<0||shard>=CATALOG_SHARDS) return null;
return CATALOG_PREFIX+shard}

function readCatalog(params){var key=catalogKey(params);
if(key===null) return Promise.resolve(null);
return chrome.storage.local.get(key).then(function(stored){return(stored&&stored[key]!==undefined)?stored[key]:null})}

function writeCatalog(params){var key=catalogKey(params);
if(key===null) return Promise.resolve(false);
var payload={};
payload[key]=params.value;
return chrome.storage.local.set(payload).then(function(){return true})}

// Номер осколка зеркала приходит из page context — мира, который может соврать.
// Чужое имя ключа отсюда не построить по той же причине, что и у каталога:
// число либо в диапазоне, либо запроса нет вовсе.
function mirrorKey(params){var shard=params&&params.shard;
if(typeof shard!=='number'||!isFinite(shard)||Math.floor(shard)!==shard) return null;
if(shard<0||shard>=MIRROR_SHARDS) return null;
return MIRROR_PREFIX+shard}

function readMirror(params){var key=mirrorKey(params);
if(key===null) return Promise.resolve(null);
return chrome.storage.local.get(key).then(function(stored){return(stored&&stored[key]!==undefined)?stored[key]:null})}

function writeMirror(params){var key=mirrorKey(params);
if(key===null) return Promise.resolve(false);
var payload={};
payload[key]=params.value;
return chrome.storage.local.set(payload).then(function(){return true})}

// --- ОБЛАКО CHROME: ТРИ ТОНКИЕ ДВЕРИ И НИ ОДНОЙ МЫСЛИ (кирпич CLOUD-2) ------
//
// ДУМАЕТ PAGE CONTEXT, А НЕ МОСТ. Схема снимка, склейка с базовой линией,
// список «чего синхронизировать нельзя», резак на куски и разбор ответа живут
// в `src/sync/*` — модулях, которые в этот файл не приедут никогда: content
// script в MV3 не умеет импортов, и вторая копия схемы здесь разошлась бы с
// первой молча. Поэтому здесь ровно доставка байтов: собрать то, что лежит, и
// положить то, что дали.
//
// ЧИСЛО КУСКОВ БЕРЁТСЯ ИЗ САМИХ МЕТАДАННЫХ, а не из просьбы страницы: лишний
// кусок прежнего снимка не должен уметь испортить текущий, а чужое число не
// должно уметь заставить нас читать чужие ключи.
function cloudRead(){return chrome.storage.sync.get([CLOUD_META_KEY]).then(function(head){var meta=head&&head[CLOUD_META_KEY];
var count=meta&&typeof meta==='object'?meta.chunks:null;
if(typeof count!=='number'||!isFinite(count)||Math.floor(count)!==count||count<=0){return{meta:meta===undefined?null:meta,parts:[]}}
if(count>CLOUD_MAX_CHUNKS)count=CLOUD_MAX_CHUNKS;
var keys=[];
for(var at=0;at<count;at+=1)keys.push(CLOUD_CHUNK_PREFIX+at);
return chrome.storage.sync.get(keys).then(function(stored){var parts=[];
for(var index=0;index<count;index+=1){var one=stored?stored[CLOUD_CHUNK_PREFIX+index]:undefined;
// Потерянный кусок едет наверх как есть (`null`): «половина снимка» — это
// ответ page context, а не решение моста.
parts.push(typeof one==='string'?one:null)}
return{meta:meta,parts:parts}})})}

// ОДИН `set` НА ВСЕ КУСКИ И МЕТАДАННЫЕ. Chrome считает записью КАЖДЫЙ вызов, а
// не каждый ключ: это одна запись из ста двадцати в минуту и единственный
// способ не оставить в облаке половину снимка при обрыве. Лишние куски
// прежнего снимка сносятся ТЕМ ЖЕ ходом и ИМЕННО ПОСЛЕ записи — число кусков в
// метаданных уже новое, поэтому недоехавшее удаление ничего не портит.
function cloudWrite(params){var parts=params&&params.parts;
var meta=params&&params.meta;
if(!Array.isArray(parts)||parts.length>CLOUD_MAX_CHUNKS||!meta||typeof meta!=='object')return Promise.resolve({ok:false,reason:'bad-payload'});
var payload={};
payload[CLOUD_META_KEY]=meta;
for(var at=0;at<parts.length;at+=1){if(typeof parts[at]!=='string')return Promise.resolve({ok:false,reason:'bad-payload'});
payload[CLOUD_CHUNK_PREFIX+at]=parts[at]}
var drop=Number(params&&params.dropFrom);
return chrome.storage.sync.set(payload).then(function(){var stale=[];
if(isFinite(drop)&&drop>parts.length){var end=Math.min(drop,CLOUD_MAX_CHUNKS);
for(var index=parts.length;index<end;index+=1)stale.push(CLOUD_CHUNK_PREFIX+index)}
if(stale.length===0)return{ok:true,removed:[]};
return chrome.storage.sync.remove(stale).then(function(){return{ok:true,removed:stale}},
// Лишний кусок ничего не портит: его никто не читает. Но сказать об этом
// честно надо — page context решает сам, что делать с несостоявшейся уборкой.
function(){return{ok:true,removed:[]}})},
function(err){return{ok:false,reason:String((err&&err.message)||err)}})}

// Сеть за ценой — не здесь: content script подчиняется CORS страницы так же,
// как сама страница. Ходит фоновый воркер, content script только передаёт
// запрос ему и ответ обратно. Проверку адреса делает воркер: она обязана
// стоять там, где происходит сам запрос, а не только по дороге к нему.
function fetchPrice(params){return chrome.runtime.sendMessage({method:'price.fetch',url:params&&params.url})
.then(function(result){return result||{ok:false,reason:'no-response'}},function(err){return{ok:false,reason:String((err&&err.message)||err)}})}


// Account session and credentials never enter this window-message bridge.
// The page may only read a public signed snapshot or open the extension-owned
// options page. Sign-in/recovery talk to the worker directly from that page.
// СЧЁТЧИКИ ЗАЩИТЫ ЖИВУТ У ФОНОВОГО ВОРКЕРА (кирпич SN-SAFE, блокер B1).
// Здесь только доставка: content script существует ПО ЭКЗЕМПЛЯРУ НА ВКЛАДКУ и
// одиночкой на профиль быть не может, а без одиночки две вкладки удваивают
// каждое окно (замер SOL-39 §4.2, живой lost update BG1 §7.3).
//
// СМЕРТЬ ВОРКЕРА МЕЖДУ ПРОСЬБОЙ И ОТВЕТОМ ЧИТАЕТСЯ КАК ОТКАЗ (рецепт BG1 §4.3):
// незнание — не разрешение, и «ответа нет» обязано звучать тем же словом, что
// «счётчики не читаются». Разрешение из молчания не выдаётся никогда.
function budgetAsk(method){return function(params){return chrome.runtime.sendMessage({method:method,params:params||null})
.then(function(result){return result&&typeof result==='object'&&result.ok!==undefined?result:{ok:false,granted:0,reason:'counter-unavailable',state:null}},
function(){return{ok:false,granted:0,reason:'counter-unavailable',state:null}})}}

// База карт живёт у воркера по той же причине, что и цены: у страницы EA прав
// на наш узел нет, а content script подчиняется CORS страницы так же, как она
// сама. Здесь только доставка; проверку адреса делает воркер — там, где
// происходит сам запрос.
function cardsBase(params){return chrome.runtime.sendMessage({method:'cards.base',params:params||null})
.then(function(result){return result||{ok:false,reason:'no-response',state:null}},
// Смерть воркера между просьбой и ответом — отказ, а не пустая база: старое
// знание каталога остаётся на месте (fail closed).
function(err){return{ok:false,reason:String((err&&err.message)||err),state:null}})}

// ПОСЛЕДНЯЯ ВЕРСИЯ (кирпич SIDE-CHANNEL-1): тот же путь, что у базы карт.
// Странице отдаётся готовый ответ воркера «показывать строку или нет»; из
// просьбы страницы берётся ровно один флаг `force`, и тот воркер держит своим
// полом частоты: подделать сообщение окна может любой скрипт EA.
function updateCheck(params){return chrome.runtime.sendMessage({method:'update.check',params:{force:!!(params&&params.force===true)}})
.then(function(result){return result||{ok:false,show:false,reason:'no-response'}},
function(err){return{ok:false,show:false,reason:String((err&&err.message)||err)}})}

// «РАСПАКОВАЛ, ПЕРЕЗАГРУЗИТЬ» (UPDATE-EASE-1): доводов у просьбы нет вовсе.
// Решают оба замка воркера: копия распакованная и на диске версия выше своей.
function updateReload(){return chrome.runtime.sendMessage({method:'update.reload'})
.then(function(result){return result||{ok:false,reason:'no-response'}},
function(err){return{ok:false,reason:String((err&&err.message)||err)}})}

// ОБЩИЕ ДВЕРИ ФОНА (кирпич LOADER-1, дописка 1 Д1.2). Одна дверь моста на все
// двери фона: имя и доводы. Имя проверяется формой, список дверей держит фон
// (`loader/doors.js`).
//
// КОНТРАКТ 1.2: ПОДПИСЬ СООБЩЕНИЙ ВМЕСТО ЖЕТОНА В ПИСЬМЕ (дописка 2 п.2). Окно
// сообщений слышит любой скрипт страницы EA, и жетон, ехавший в каждом
// сообщении (1.1), подслушивался одним сообщением. Теперь жетон не едет никогда
// (К1): он живёт в замыкании кода страницы и здесь. Сообщение несёт `id`
// (одноразовый в загрузке) и `sig`: base64 HMAC-SHA256 ключом 16 байт жетона
// над текстом `id + "\n" + method + "\n" + JSON.stringify(params ?? null)` (К2).
// Мост считает то же и сверяет (WebCrypto `verify`). Нет подписи или не
// сошлась: `no-token`, и фон об этой просьбе не узнаёт вовсе; тот же `id`
// второй раз: `replay` (К3). Поле `token` в сообщении больше ничего не значит.
var SEEN_CAP=10000;
var seenIds=new Set();
var hmacOnce=null;

function tokenBytes(){var out=new Uint8Array(16);
for(var i=0;i<16;i+=1)out[i]=parseInt(TOKEN.slice(i*2,i*2+2),16);
return out}

function hmacKey(){if(hmacOnce===null)hmacOnce=crypto.subtle.importKey('raw',tokenBytes(),{name:'HMAC',hash:'SHA-256'},false,['verify']);
return hmacOnce}

function sigBytes(text){var binary=atob(text);
var out=new Uint8Array(binary.length);
for(var i=0;i<binary.length;i+=1)out[i]=binary.charCodeAt(i);
return out}

function remember(id){seenIds.add(id);
if(seenIds.size>SEEN_CAP)seenIds.delete(seenIds.values().next().value)}

/** Подпись сообщения страницы: `ok`, `no-token` или `replay`. */
function signedOk(msg){if(!msg||typeof msg.sig!=='string'||msg.sig===''||msg.sig.length>100)return Promise.resolve('no-token');
if((typeof msg.id!=='string'&&typeof msg.id!=='number')||String(msg.id).length>80)return Promise.resolve('no-token');
var id=String(msg.id);
if(seenIds.has(id))return Promise.resolve('replay');
var text=id+'\n'+msg.method+'\n'+JSON.stringify(msg.params===undefined?null:msg.params);
var signature;
try{signature=sigBytes(msg.sig)}catch(err){return Promise.resolve('no-token')}
try{return hmacKey().then(function(key){return crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode(text))}).then(function(ok){if(ok!==true)return 'no-token';
if(seenIds.has(id))return 'replay';
remember(id);
return 'ok'},function(){return 'no-token'})}catch(err){return Promise.resolve('no-token')}}

function door(params,msg){return signedOk(msg).then(function(verdict){if(verdict!=='ok')return{ok:false,reason:verdict};
return doorSend(params)})}

function doorSend(params){var name=isPlain(params)?params.name:null;
if(typeof name!=='string'||!/^[a-z]+(?:\.[a-z]+)+$/i.test(name)||name.length>40)return Promise.resolve({ok:false,reason:'bad-door'});
var sent;
try{sent=chrome.runtime.sendMessage({method:'door',params:{name:name,args:params.args===undefined?null:params.args}})}catch(err){sent=Promise.reject(err)}
return Promise.resolve(sent).then(function(result){return isPlain(result)&&typeof result.ok==='boolean'?result:{ok:false,reason:'no-response'}},function(){return{ok:false,reason:'no-port'}})}

function accountStatus(){return chrome.runtime.sendMessage({method:'account.status'})
.then(function(result){return result||{ok:false,reason:'no-response'}},function(){return{ok:false,reason:'network'}})}
// ДВЕРЬ В СТРАНИЦУ АККАУНТА ОТКРЫВАЕТ ВОРКЕР (кирпич ACCOUNT-OPEN-1). Здесь
// `chrome.runtime.openOptionsPage` нет вовсе: прежний вызов бросал, и кнопка
// «Настройки аккаунта» молчала с первого дня. Здесь только доставка.
//
// ОТКАЗ НЕ ГЛОТАЕТСЯ. Ответ уходит странице значением `{ok:false, reason}`, и
// одновременно голое известие с тем же словом: кнопку в окне настроек держит
// точка входа, а она на значение не смотрит; известие ловит
// `features/account-door.js` и пишет строку в `__eshario.errors`. Слово
// причины проходит только из закрытой формы: окно страницы видит любой скрипт EA.
//
// ВОПРОС О ВЫХОДЕ (кирпич LOGOUT-BUTTON-1): от страницы проходит ровно одно поле,
// `ask`, и только со словом `logout`; прочее, что прислала страница, отбрасывается.
// Выйти этим нельзя: воркер лишь откроет страницу аккаунта с вопросом, и ответ
// даёт рука человека там. Выхода в этом мосте по-прежнему нет.
function openAccount(params){var sent;var ask=params&&typeof params==='object'&&params.ask==='logout'?'logout':null;
try{sent=ask===null?chrome.runtime.sendMessage({method:'account.open'}):chrome.runtime.sendMessage({method:'account.open',params:{ask:ask}})}catch(err){sent=Promise.reject(err)}
return Promise.resolve(sent).then(function(result){if(result&&result.ok===true)return{ok:true};
return accountDoorFailed(result&&typeof result.reason==='string'?result.reason:'no-response')},
function(){return accountDoorFailed('no-worker')})}
function accountDoorFailed(reason){var word=/^[a-z][a-z-]{0,39}$/.test(reason)?reason:'open-failed';
window.postMessage({channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name:ACCOUNT_OPEN_FAILED,payload:{reason:word}},window.location.origin);
return{ok:false,reason:word}}

// ДВЕРЬ ПЕРЕНОСА НАСТРОЕК: ЗАКОН POP-1 В НОВОЙ РЕДАКЦИИ (дописка Fable 23.09,
// кирпич ACCOUNT-SYNC-1). Прежний закон стоит целиком: ключ сессии, пароль,
// почта, снимок права, снимок настроек с сервера и выбор при споре в этот
// мост не входят никогда. Добавлена ОДНА дверь: страница EA шлёт ровно две
// команды, «сохранить» и «загрузить», и ничего больше. Из просьбы страницы
// берётся одно слово направления; работу делает фоновый воркер (сам читает
// настройки, сам несёт ключ сессии, сам пишет ответ сервера в хранилище).
// Обратно странице уходят только три поля, СОБРАННЫЕ ЗДЕСЬ ЗАНОВО: `ok`,
// номер ревизии и слово причины из закрытого списка. Лишнее в ответе воркера
// (даже если его туда подложат) сюда не проходит. Худшее, что может чужой
// скрипт страницы: нажать кнопку за человека.
function transferReply(result){var out={ok:!!(result&&result.ok===true)};
if(result&&Number.isSafeInteger(result.revision)&&result.revision>=0)out.revision=result.revision;
if(!out.ok)out.reason=result&&TRANSFER_REASONS.indexOf(result.reason)>=0?result.reason:'server';
return out}
function settingsTransfer(params){var direction=params&&params.direction;
if(direction!=='save'&&direction!=='load')return Promise.resolve({ok:false,reason:'server'});
var sent;
try{sent=chrome.runtime.sendMessage({method:TRANSFER_METHOD,params:{direction:direction}})}catch(err){sent=Promise.reject(err)}
// Воркер не ответил (расширение обновилось, вкладка осиротела): слово
// `no-port`, а не молчание и не чужой текст ошибки.
return Promise.resolve(sent).then(transferReply,function(){return{ok:false,reason:'no-port'}})}

// ОТЧЁТ О ПРОБЛЕМЕ НА НАШ СЕРВЕР (кирпич ACCOUNT-SYNC-1, путь А). Страница несёт
// только слова человека, его Telegram и отчёт, уже прошедший сторож чистоты;
// привязку к аккаунту делает воркер. Отсюда уходят ровно три поля просьбы, а
// назад странице ровно `ok`, номер и слово причины из закрытого списка.
function reportSend(params){var report=params&&params.report;
if(!report||typeof report!=='object'||Array.isArray(report))return Promise.resolve({ok:false,reason:'server'});
var words=params&&typeof params.words==='string'?params.words.slice(0,2000):'';
var contact=params&&typeof params.contact==='string'?params.contact.slice(0,64):'';
var sent;
try{sent=chrome.runtime.sendMessage({method:REPORT_METHOD,params:{report:report,words:words,contact:contact}})}catch(err){sent=Promise.reject(err)}
return Promise.resolve(sent).then(function(result){var out={ok:!!(result&&result.ok===true)};
if(out.ok&&result&&Number.isSafeInteger(result.number)&&result.number>0)out.number=result.number;
if(!out.ok)out.reason=result&&REPORT_REASONS.indexOf(result.reason)>=0?result.reason:'server';
return out},function(){return{ok:false,reason:'no-port'}})}

var handlers={ping:function(){return 'pong'},version:function(){return chrome.runtime.getManifest().version},'price.fetch':fetchPrice,
'settings.read':readKey(SETTINGS_KEY),'settings.write':writeKey(SETTINGS_KEY),'filters.read':readKey(FILTERS_KEY),'filters.write':writeKey(FILTERS_KEY),'packs.read':readKey(PACKS_KEY),'packs.write':writeKey(PACKS_KEY),'locks.read':readKey(LOCKS_KEY),'locks.write':writeLocks,'frozen.read':readKey(FROZEN_KEY),'frozen.write':writeKey(FROZEN_KEY),'limits.read':readKey(LIMITS_KEY),'limits.write':writeKey(LIMITS_KEY),'options.read':readKey(OPTIONS_KEY),'options.write':writeKey(OPTIONS_KEY),'seller.read':readKey(SELLER_KEY),'seller.write':writeKey(SELLER_KEY),
// Состояние интерфейса: свёрнутость панели. Отдельный ключ, а не поле в
// настройках фич — см. шапку src/features/ui-state.js.
'ui.read':readKey(UI_KEY),'ui.write':writeKey(UI_KEY),
// Журнал автоматики: вебка EA перезагружается сама, и до задачи 12.2
// пользователь терял ленту событий, не сделав ничего. Пишется пачками —
// см. шапку src/automation/journal.js.
'journal.read':readKey(JOURNAL_KEY),'journal.write':writeKey(JOURNAL_KEY),
// Копилка торговли за всё время: тот же приём, свой ключ.
'ledger.read':readKey(LEDGER_KEY),'ledger.write':writeKey(LEDGER_KEY),
// Премиум-ключ. Читается обратно намеренно: проверка подписи идёт в page
// context (WebCrypto есть и там), и без чтения ключ пришлось бы вводить
// заново на каждой загрузке страницы.
'license.read':readKey(LICENSE_KEY),'license.write':writeKey(LICENSE_KEY),
// Durable checkpoints of already-sanitized live evidence. They are
// diagnostics only and never participate in licensing or EA actions.
'live-control.read':readKey(LIVE_CONTROL_KEY),'live-control.write':writeKey(LIVE_CONTROL_KEY),
// Каталог карт: данные, а не настройка. Один осколок за запрос — см. выше.
'catalog.read':readCatalog,'catalog.write':writeCatalog,
// Книга групп редкости — те же данные, тот же путь, один ключ на всю книгу.
'groups.read':readKey(GROUPS_KEY),'groups.write':writeKey(GROUPS_KEY),
// База карт: сеть — у воркера, память о засеве — обычным ключом рядом.
'cards.base':cardsBase,
'cardbase.read':readKey(CARDBASE_KEY),'cardbase.write':writeKey(CARDBASE_KEY),
// Состав просмотренного превью: номера карт и квиксел, без цен (PACK-PEEK-1).
'preview.read':readKey(PREVIEW_KEY),'preview.write':writeKey(PREVIEW_KEY),
// Память спроса — тоже наблюдённые данные и тоже один ключ (кирпич B17-E).
'demand.read':readKey(DEMAND_KEY),'demand.write':writeKey(DEMAND_KEY),
// Журнал покупок — тот же путь и та же порода: наблюдённые данные, один ключ.
'purchases.read':readKey(PURCHASES_KEY),'purchases.write':writeKey(PURCHASES_KEY),
// Счётчики защиты: суточные походы к рынку и ставки скользящего часа.
'daybudget.read':readKey(DAY_BUDGET_KEY),'daybudget.write':writeKey(DAY_BUDGET_KEY),
'buyrate.read':readKey(BUY_RATE_KEY),'buyrate.write':writeKey(BUY_RATE_KEY),
'sbcrate.read':readKey(SBC_RATE_KEY),'sbcrate.write':writeKey(SBC_RATE_KEY),
// Зеркало карт клуба: осколки плюс голова. Данные, а не настройка.
'mirror.read':readMirror,'mirror.write':writeMirror,
'mirror.head.read':readKey(MIRROR_HEAD_KEY),'mirror.head.write':writeKey(MIRROR_HEAD_KEY),
// ОБЛАКО CHROME — ТРИ ДВЕРИ (кирпич CLOUD-2). Базовая линия — обычный ключ
// рядом с семнадцатью соседними; чтение и запись облака — единственные два
// метода, за которыми стоит `chrome.storage.sync`. Разбора здесь нет.
'sync.base.read':readKey(SYNC_BASE_KEY),'sync.base.write':writeKey(SYNC_BASE_KEY),
'cloud.read':cloudRead,'cloud.write':cloudWrite,
// Read-only account surface. Password/session/recovery methods are absent on
// purpose: every EA page script can observe and forge window messages.
'account.status':accountStatus,'account.open':openAccount,
// Перенос настроек: две команды, работа в воркере (закон POP-1, новая редакция).
'settings.transfer':settingsTransfer,
// Отчёт о проблеме: слова, Telegram и чистый отчёт; привязка к аккаунту в воркере.
'report.send':reportSend,
// Последняя версия для копии без магазина (SIDE-CHANNEL-1).
'update.check':updateCheck,
// Общие двери фона с жетоном загрузки (LOADER-1).
'door':door,
'update.reload':updateReload,
// Владелец счётчиков: резерв, выкуп, возврат, общий отдых рынка и чтение.
'budget.reserve':budgetAsk('budget.reserve'),'budget.spend':budgetAsk('budget.spend'),
'budget.release':budgetAsk('budget.release'),'budget.rest':budgetAsk('budget.rest'),
'budget.state':budgetAsk('budget.state')};

/** Двери, открытые на всех страницах EA, а не только на вебапе. */
var OPEN_EVERYWHERE=['ping','version','door'];

// --- 3. Мост page → content → page ---------------------------------------
window.addEventListener('message',function(event){if(event.source!==window)return;
var msg=event.data;
if(!msg||msg.channel!==CHANNEL||msg.from!==FROM_PAGE)return;
if(msg.kind!=='request'||typeof msg.method!=='string') return;

// Первый вопрос кода страницы мосту: код поднялся (самолечение, LOADER-1).
if(boot!==null&&!boot.reported)reportBoot(true);
// Код исполняется (например, переизбран дверью `scripting.inject`): строка
// «кода нет» больше не правда (LOADER-THIN-1).
if(waiting||line!==null)dropLine();
var handler=Object.prototype.hasOwnProperty.call(handlers,msg.method)?handlers[msg.method]:null;
// Вне вебапа открыты только проверка моста и общие двери с жетоном.
if(handler&&!WEBAPP&&OPEN_EVERYWHERE.indexOf(msg.method)<0)handler=null;
if(!handler){reply({channel:CHANNEL,from:FROM_CONTENT,kind:'response',id:msg.id,ok:false,error:'unknown method: '+msg.method});
return}
try{Promise.resolve(handler(msg.params,msg)).then(function(value){reply({channel:CHANNEL,from:FROM_CONTENT,kind:'response',id:msg.id,ok:true,value:value})},function(err){reply({channel:CHANNEL,from:FROM_CONTENT,kind:'response',id:msg.id,ok:false,error:String((err&&err.message)||err)})})}catch(err){reply({channel:CHANNEL,from:FROM_CONTENT,kind:'response',id:msg.id,ok:false,error:String((err&&err.message)||err)})}});

function reply(message){window.postMessage(message,window.location.origin)}

// --- 4. ЧУЖАЯ ВКЛАДКА СКАЗАЛА СЛОВО (волна 21, B1) ------------------------
//
// `chrome.storage.onChanged` живёт только в мире расширения — в page context
// его нет вовсе (замер, записанный в page-entry.js). Значит единственный, кто
// может сказать странице «список замков на диске поменялся», — это content
// script, и говорит он ГОЛОЕ известие без значения: сообщение окна умеет
// подделать любой скрипт страницы EA, а значение из подделки открыло бы ему
// право стереть все замки. Страница в ответ спрашивает своё хранилище тем же
// мостом и получает ответ от `chrome.storage`, до которого подделке не достать.
//
// ИЗВЕСТИЕ ПРИХОДИТ И СВОЕЙ ВКЛАДКЕ — так его рассылает Chrome, и это ровно то,
// что нужно: после слияния на диске лежит СУММА, а не то, что послала страница.
//
// --- 5. НАСТРОЙКИ ЛЕГЛИ С СЕРВЕРА (кирпич ACCOUNT-SYNC-1, заказ 12.5.8) -----
//
// «Загрузить настройки» пишет воркер, и нажать её можно и в окне вебапа, и на
// странице аккаунта в соседней вкладке. Страница EA держит настройки в кэшах
// провайдеров, и без слова отсюда человек увидел бы старые числа до F5.
// Подписка на `onChanged` одна на оба известия (сторож её числа в сценах).
// Слово ГОЛОЕ, без значения, по той же причине, что известие замков выше:
// страница перечитывает хранилище сама тем же мостом.
//
// УЗНАЁТСЯ ЗАГРУЗКА ПО СВОЕЙ ОТМЕТКЕ ВРЕМЕНИ, А НЕ ПО БАЗОВОЙ ЛИНИИ (живой лист,
// шаг 3, 23.09). Первая редакция ждала смены базовой линии переноса вместе с
// настройками. Владелец сохранил копию, поправил окно и загрузил ту же копию со
// страницы аккаунта: ревизия та же, базовая линия байт в байт прежняя, Chrome
// не шлёт `onChanged` на неизменённый ключ, и вебап остался со старыми
// числами. Теперь «Загрузить» воркер пишет отметку `settings.loadedAt` каждый
// раз, и она меняется всегда; «Сохранить» её не трогает и перечитки не будит.
var LOADED_KEY='settings.loadedAt';
if(chrome.storage&&chrome.storage.onChanged&&typeof chrome.storage.onChanged.addListener==='function'){chrome.storage.onChanged.addListener(function(changes,area){if(area!=='local'||!changes)return;
if(changes[LOCKS_KEY]!==undefined)window.postMessage({channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name:LOCKS_CHANGED,payload:null},window.location.origin);
if(changes[LOADED_KEY]!==undefined)window.postMessage({channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name:SETTINGS_APPLIED,payload:null},window.location.origin);
// Загрузчик что-то узнал (вопрос серверу, новая версия, самолечение): прибор
// `__eshario.loader()` перечитывает состояние у фона. Новый код в эту вкладку
// не вставляется: он встанет со следующей загрузкой страницы.
if(changes[CODE_STATE]!==undefined||changes['code.log']!==undefined||changes[CODE_NEEDS]!==undefined)refreshInstrument();
// Кода нет, и строка ждёт: код лёг или сервер не ответил (LOADER-THIN-1).
if(waiting&&(changes[CODE_CURRENT]!==undefined||changes[CODE_STATE]!==undefined||changes[CODE_NEEDS]!==undefined))refreshLine()})}

// --- 6. Код страницы в страницу: мост уже слушает, теперь можно вставлять ----
startPage().then(function(){},function(){});
})()


})(host.tab,host.window);});
host.bindLogin();
})();
