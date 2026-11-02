// ESHArio page-bundle 2.8.92 4316222dc0273e64918773936d810c288a811d21 2026-11-02T21:22:26Z
(function(){'use strict';
// Адрес: на чужой странице EA склейка молчит (контракт 1.1) и убирает за мостом штамп и ловушку прибора.
if(!(function(h){return /^https:\/\/www\.ea\.com\/.*\/ultimate-team\/web-app.*/.test(h)})(String(globalThis.location&&globalThis.location.href))){(function(w,n){try{w.document.documentElement.removeAttribute("data-eshario-inject")}catch(e){}var k="__eshario",t=function(){try{var d=Object.getOwnPropertyDescriptor(w,k);if(d&&d.configurable===true&&d.enumerable===false&&typeof d.set==="function"){delete w[k];return}if(--n>0)w.setTimeout(t,50)}catch(e){}};try{w.setTimeout(t,50)}catch(e){}})(globalThis,20);return}
// Атрибуты своего <script> читаются первой синхронной строкой: узел снимается сразу.
const __eshario_tag=(function(s){return s&&typeof s.getAttribute==='function'?Object.freeze({loader:s.getAttribute("data-eshario-loader"),base:s.getAttribute("data-eshario-base"),token:s.getAttribute("data-eshario-token")}):null})(globalThis.document&&globalThis.document.currentScript);
const __eshario_assets=Object.freeze({
"eshario-asset:ui/theme.css":":root,\n:host {\n  --fx-accent: #3DD8FF;        /* акцент: наши кнопки, метки, значения */\n  --fx-accent-dim: #1B90B3;    /* приглушённый акцент, рамки */\n  --fx-on-accent: #062733;     /* текст на акцентной заливке */\n  --fx-accent-tint: rgba(61, 216, 255, .09); /* фон наших блоков */\n  --fx-ok: #00E07F;            /* успех (совпадает с языком EA) */\n  --fx-warn: #FFB454;          /* предупреждение (страж, замок) */\n  --fx-warn-ink: #2A1C05;      /* текст на янтарной заливке */\n  --fx-danger: #FF5470;        /* ошибка */\n  --fx-gold: #E8C35A;          /* только про монеты */\n  --fx-surface: #131417;       /* фон наших окон/блоков */\n  --fx-surface-2: #1E2330;     /* фон вложенных элементов */\n  --fx-line: #24262C;          /* линии и рамки */\n  --fx-ink: #EEF1F7;           /* основной текст */\n  --fx-dim: #939DB4;           /* второстепенный текст */\n  --fx-surface-glass: rgba(19, 20, 23, .985); /* фон панели поверх вебапа */\n  --fx-surface-sunken: #0D0F13;               /* поля ввода и «колодцы» */\n  --fx-line-strong: #333743;                  /* рамка кнопки и поля */\n  --fx-ink-strong: #FFFFFF;                   /* фокус и максимальный контраст */\n  --fx-muted: #6D7589;                        /* выключенный текст */\n  --fx-overlay: rgba(0, 0, 0, .55);           /* затемнение под диалогом */\n  --fx-shadow: rgba(0, 0, 0, .34);            /* тень небольшого элемента */\n  --fx-shadow-strong: rgba(0, 0, 0, .48);     /* тень панели и диалога */\n  --fx-ok-tint: rgba(0, 224, 127, .10);       /* заливка сообщения об успехе */\n  --fx-warn-tint: rgba(255, 180, 84, .10);    /* заливка предупреждения */\n  --fx-warn-dim: #6B4E1E;                     /* рамка предупреждения */\n  --fx-danger-tint: rgba(255, 84, 112, .12);  /* заливка ошибки */\n  --fx-flag-white: #FFFFFF;    /* белое поле обоих флагов */\n  --fx-flag-uk-blue: #012169;  /* синее поле британского флага */\n  --fx-flag-uk-red: #C8102E;   /* красный крест британского флага */\n  --fx-flag-ru-blue: #0039A6;  /* средняя полоса российского флага */\n  --fx-flag-ru-red: #D52B1E;   /* нижняя полоса российского флага */\n  --fx-holo-cyan: rgba(61, 216, 255, .75);    /* холодный край блика */\n  --fx-holo-shine: rgba(255, 255, 255, .9);   /* середина блика */\n  --fx-holo-violet: rgba(178, 128, 255, .75); /* фиолетовый перелив */\n  --fx-holo-rose: rgba(255, 128, 204, .6);    /* тёплый край блика */\n  --fx-gem-light: #54FDDE;  /* верхняя левая грань */\n  --fx-gem-mid: #3DA888;    /* нижняя правая грань */\n  --fx-gem-dark: #216751;   /* нижняя левая грань */\n  --fx-tier-bronze: #C78B5C;\n  --fx-tier-silver: #C9CFDB;\n  --fx-tier-gold: #E8C35A;\n  --fx-tier-ink: #1A1405;\n}\n.fx-tt-panel {\n  box-sizing: border-box;\n  min-width: 0;\n  padding: 12px 14px;\n  border: 1px solid var(--fx-line-strong);\n  border-radius: 10px;\n  background: var(--fx-surface-2);\n}\n.fx-tt-h {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  height: 22px;\n  margin: 0 0 10px;\n  white-space: nowrap;\n}\n.fx-tt-h b { font-size: 15px; font-weight: 600; color: var(--fx-ink-strong); }\n.fx-tt-h i {\n  margin-left: auto;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  font-style: normal;\n  font-size: 11px;\n  letter-spacing: .3px;\n  text-transform: uppercase;\n  color: var(--fx-dim);\n}\n.fx-tt-key {\n  font-size: 10.5px;\n  line-height: 13px;\n  letter-spacing: .4px;\n  text-transform: uppercase;\n  color: var(--fx-dim);\n  white-space: nowrap;\n}\n.fx-tt-val {\n  font-size: 16px;\n  line-height: 20px;\n  font-weight: 800;\n  color: var(--fx-ink);\n  white-space: nowrap;\n  font-variant-numeric: tabular-nums;\n}\n.fx-site-icon { display: block; flex: none; overflow: hidden; opacity: .9; background: center / 100% 100% no-repeat; }\n.fx-site-icon:hover { opacity: 1; box-shadow: 0 0 0 1.5px var(--fx-accent); }\n.fx-site-icon.futgg { background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALYSURBVFhH7VhNSFRRGD1Jmpb571gqU9M4jjNg6mjQODPOaFoSEdSmokW0CIJoIRW0KlpEvxAEFVFGlhiIUu2LNhUEYmWQtKl9vUVtwhbNiW/ue/Xumxm1FjmLWZyZ9+79zr3nfve758JDMoIHyR4YyegSQeaOYAzJKOaYANmzREiAokGEGKmG6BKhJyXEyAv5jbwQJ/JCnMhtITFlMOw1/+MO85F3e79z0Pn4dq5A3jMKMfGkFTzlBvfWggMVYKQM7C4DY+Xgtkpwn0v1P201B5PJZcA4+D0CTgTB443g7hqw1+QL4uXg9irwQB143gO+DpnCNCEJ8HMY7KsAgcVDBv0pC0iAUyHQvzI9JhuWAbziVdn5I6QP3FObHrwYvGwDk3HQW5zetxCKC8Bv3WAyJkJiML6GVaM9qKsUHGoEL3jAyxvAcx7whBtsXaXHjfrBmVD6JLKNJ93gRQ94yQOeXQ8ebQBdhXrc247UQgzIz5sOvXPTanP/pagcxTrbCV71gtebwJs+8ONmcNin8w+tAbnFrAGpIRv/2UbFv9EE3vaBRtjKSBzGizZ9oMNrQfaDn7pAVxFYXWhiOVhfBDaXKPhKwIdB8FaTzr/nBzkAPg7auCbfvULnT9szkk3Ih069PRNGmsE7joyMiJCtatuc8U6YNZZ5a+SoSmp/RMCd1eCOKgV5TpTrsff94HiL3jbUAHJQ1Y7FTfFrwPZSPfZVuyUkS7Huqgav+cDJIPgoCE4GwNEAeKRejxsPgDOOhRQVqKwON6utE/5EALwbUILsse9DlhDz+IqB2QMWi3dqIHpL0vsWgtTNXNQqVtPQvoTB/sr04PlwrNE8XXFwOgS2/IWhSdZSRa0Zmu2IinWfzmLxg5Xgfhd4Zh34vG1hixendlr8wTrlS7NdmSzeuvQE811a9ovLurT+9dKz5swq5H8jL8SJvBAn8kKcyEUhOfJZIoKxXPhQ8wtZqcuzVb/HQAAAAABJRU5ErkJggg==\"); }\n.fx-site-icon.futbin { background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAWwSURBVFhHtVhbbBRVGF4fFDFqIkHUBxOND8YHY6LhSUOM8VK1YNo9Z2a323J5qfHBGKNRo4nRGMEbJiREU9F2zpnd2V5pQQU1UaJI251zZm9du7SACFbAC0hVIEHlmP9MZ5k5M6W7JnzJ99Ddf/7zz/9/5zunG4tdAIiTl9v3bz2BOKmb2KEnktW+43jc6FTz/W8gRuz2A8NCL1kNMTnZLxIT2X9ac8YKNWfDwLme6xEjp/ViRmBOGyMjshi9ZB197OvuG9XcDUFj5JG26oDATsRCjrkwORXt+4cFdtJ20/SORWr+uoGY8RaMRX1T6BC8bbI6sDAn+8W6nz8XiJFtaw72XK6uURcQI2NtewcChSS/64OkRegWYuaj9TDO082IU7yqOnKVusaCaCnSZYiRv0B4/kLaD4wIxOjravxFQzyfftjVhztrTxeyI5zep8ZfNMRt8mZIH1AUI1BIAbY14rRhaoUMx4X0p6lx82p1zUggRner+vDrJFkFsUZwsl+0TQ2K1Ye218Sqxqz58RPIM6KuGUK7q49TejGoj3qo5dMCczKLbPItFKTlfaP1sePgNhFnZL26dgAoR5tC+vCoeoVC6ADmtNLJuy7VHHMTjFcDQ2RKwYW0SE0PCTTak1LXrwF2RUgf4B8lS0CBF+K6o5/BrqJeLszNF6Ezejkrc/hzJiay8PkZzMk9wQrmgBn5pm3vYOAh0AVmtKRz0hznpFmz6coopqpDq/RC9qZAvhxdC+dOotIbLIYRsfrQx1D4Bn+8RJJnliJG/oj0D5u8ocbXi5Y9Xcv1id5jgbwwyuqAaOXkITU+FmfmgyF9OKZsO7ikGh+CEJeoH7Xsocu0kvWcVsz85j9AoSgEws5/dK36DIxlPby9vxuwe8BlE2NbroMYNLpxMbKNL/RyNo85rTE1PVSA+0st167NV+JC+nmtmDkGObUCiPb8aEA7mNGvAgV4wJzuUvUhu2GTnBej2d3LIQlQ+sQc1x7ZCQW3yZhC5nG9ZB1o/35EJCZ6A/mAmmO6hyGPGDeq9C1BzJgN62MYKn+nFsfIk/J49ycG/3DMM8ghL+G8yeB7KXClAG/3gbHp5exOVKQ3B6uQb0rulz6g+Ad0SHPoSi8OMboVPEBdBNnknHRd10si6d7gMjOoaM1/XsU5eS2sjwycLadbmHkDxDTt2LQobpOZqHZLqpcox3QNbe5v0Emi0jvbOtpzt7p+DYiRL6WAfInc3ULHvBiNmXdCca6VRxTiI/iG3IGM/l5zVkZFstIn9LJ1UnfIbcEKYrFYM88sxZyeXFAf3HhK1YdKcFEQqV6yZrBDOzEnLwQ2ACOuvXMygQ73LQ4UgvL0ARBQlD4QN1q8OMzpUJQ+4E2hUzBavWid0ArWq2h0yxL3GXMwtW9rIN696RlTcCYFC2F0A9itf5/X/KNsSf/Alf7LEKOHQvqYe0O9ZJ3Sy9l3dTtbu7U3864rkE2OwLnifwa6ijh9P1AEIM7Me/WJ7Fl5OHndAH1wn3/U9BHsGrydXrKGkW3eGswai2EncxeMW9WUHI1DE2q8ROtYz1oI8B4CfSBGNnnfz+cfWtH6F41/EPYDWQh9OvQMOCynf6PxCA/xgGxjI1xaZEemBkWr3ROvfcfJQGpanXU/+EclmOU8EKNDIX1M9sMLlmMiFjqXAsAO3eHqhZ7y+wdi5LA8ypWxIJvmMDc0nDeTNTIjiWzSgRj9JbATmXs7Q4y8ra4bQtvu967Ry9mfECP7vM+0PL1DK2TOqbMGoUKroXupqaEQ4SYW2ABlCwzurM6MW4KrzoPW3IcrsGO+4v2NGH1CnXWjhJfo+GG7iNvGs8HVGgBipE+ddd0EjylnvZFsVnPXDfgHGrxA3j0jfoKYl2U4ZQdEh7wKZP/UGHlGzd0QEOu+XS+kj+O8GfpRZj7CjzXYob9qxQzTStaGejTxH1KMzNFSq2XeAAAAAElFTkSuQmCC\"); }\n",
"eshario-asset:ui/shell.css":".fx-shell-cell{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);padding:8px 12px;box-sizing:border-box;border:1px solid var(--fx-accent-dim);border-radius:8px;background:var(--fx-surface);color:var(--fx-ink);font:500 14px/1.3 system-ui,sans-serif}\n.fx-shell-text{flex:0 1 auto}\n.fx-shell-button{flex:0 0 auto;padding:6px 12px;border:0;border-radius:6px;background:var(--fx-accent);color:var(--fx-on-accent);font:inherit;font-weight:600;cursor:pointer}\n"});
const __ESB_x=[],__ESB_g=[],__ESB_r=[];for(let i=0;i<400;i++)__ESB_x.push(Object.create(null));
const __ESB_d=(o,m)=>{for(const k of Object.keys(m))Object.defineProperty(o,k,{enumerable:true,get:m[k]})};
const __ESB_t=(j,k,v)=>{try{return __ESB_x[j][k]}catch(e){return v}};
let __ESB_on=false,__ESB_ids=null;
const __eshario_paid=Object.freeze({version:"2.8.92",file:"page-paid-87c7b6984266c3ce.bin",sha256:"87c7b6984266c3ce31a0828dc1191e17217002159eda1cb18ab1d42095f9cb86",bytes:1755545,docked:()=>__ESB_on,get:(rel)=>__ESB_on&&__ESB_ids&&rel in __ESB_ids?__ESB_x[__ESB_ids[rel]]:null,attach(piece){if(__ESB_on)return false;const p=piece({x:__ESB_x,g:__ESB_g,r:__ESB_r,d:__ESB_d,t:__ESB_t});__ESB_ids=p.ids;const it={};for(const i of p.order){const g=__ESB_g[i].call(void 0);it[i]=g;g.next()}__ESB_on=true;const c=[...__ESB_c,...p.ring],a=new Set(p.async),ring=()=>{for(const j of c)__ESB_r[j]()},run=(k)=>{for(;k<p.order.length;k++){ring();const i=p.order[k],r=it[i].next();if(a.has(i))return r.then(()=>run(k+1))}ring();return true};return run(0)}});
// src/bridge/protocol.js
__ESB_g[0]=function*(){__ESB_d(__ESB_x[0],{CHANNEL:()=>CHANNEL,FROM_CONTENT:()=>FROM_CONTENT,FROM_PAGE:()=>FROM_PAGE,KIND_EVENT:()=>KIND_EVENT,isResponse:()=>isResponse,makeRequest:()=>makeRequest,signingText:()=>signingText});yield;
const CHANNEL='fut-companion'
const FROM_PAGE=`${CHANNEL}/page`
const FROM_CONTENT=`${CHANNEL}/content`
const KIND_REQUEST='request'
const KIND_RESPONSE='response'
const KIND_EVENT='event'
function makeRequest(id,method,params,sig){const request={channel:CHANNEL,from:FROM_PAGE,kind:KIND_REQUEST,id,method,params:params??null}
if(typeof sig==='string'&&sig!=='')request.sig=sig
return request}
function signingText(id,method,params){return `${id}\n${method}\n${JSON.stringify(params??null)}`}
function makeResponse(id,value){return{channel:CHANNEL,from:FROM_CONTENT,kind:KIND_RESPONSE,id,ok:true,value}}
function makeError(id,message){return{channel:CHANNEL,from:FROM_CONTENT,kind:KIND_RESPONSE,id,ok:false,error:message}}
function makeEvent(name,payload){return{channel:CHANNEL,from:FROM_CONTENT,kind:KIND_EVENT,name,payload:payload??null}}
function isFrom(msg,from){return Boolean(msg)&&typeof msg==='object'&&msg.channel===CHANNEL&&msg.from===from}
function isRequest(msg){return isFrom(msg,FROM_PAGE)&&msg.kind===KIND_REQUEST&&typeof msg.method==='string'
}
function isResponse(msg){return isFrom(msg,FROM_CONTENT)&&msg.kind===KIND_RESPONSE}

};
// src/bridge/loader-tag.js
__ESB_g[1]=function*(){__ESB_d(__ESB_x[1],{canSign:()=>canSign,signText:()=>signText});yield;
const TAG_ATTRS=Object.freeze({loader:'data-eshario-loader',base:'data-eshario-base',token:'data-eshario-token'})
const TAG_REGISTRY='__eshario_tag'
function captured(){try{return typeof __eshario_tag==='object'&&__eshario_tag!==null?__eshario_tag:null}catch{return null}}
function loaderInfo(){const tag=captured()
return tag===null?null:Object.freeze({loader:tag.loader??null,base:tag.base??null})}
const HEX_DIGITS='0123456789abcdef'
function tokenBytes(hex){if(typeof hex!=='string'||!/^[0-9a-f]{32}$/i.test(hex))return null
const digits=hex.toLowerCase()
const out=new Uint8Array(16)
for(let at=0;at<out.length;at+=1){const high=HEX_DIGITS.indexOf(digits[at*2])
const low=HEX_DIGITS.indexOf(digits[at*2+1])
out[at]=high*16+low}
return out}
const BASE64_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64(bytes){const parts=[]
for(let at=0;at<bytes.length;at+=3){const first=bytes[at]
const second=at+1<bytes.length?bytes[at+1]:0
const third=at+2<bytes.length?bytes[at+2]:0
const group=first*65536+second*256+third
parts.push(BASE64_ALPHABET[Math.floor(group/262144)%64],BASE64_ALPHABET[Math.floor(group/4096)%64],
at+1<bytes.length?BASE64_ALPHABET[Math.floor(group/64)%64]:'=',
at+2<bytes.length?BASE64_ALPHABET[group%64]:'=')}
return parts.join('')}
async function macOf(tokenHex,text){const bytes=tokenBytes(tokenHex)
const subtle=globalThis.crypto?.subtle
if(bytes===null||!subtle)return null
const key=await subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign'])
return base64(new Uint8Array(await subtle.sign('HMAC',key,new TextEncoder().encode(String(text)))))}
function canSign(){return tokenBytes(captured()?.token)!==null}
function signText(text){return canSign()?macOf(captured().token,text):Promise.resolve(null)}

};
// src/bridge/page-client.js
__ESB_g[2]=function*(){__ESB_d(__ESB_x[2],{CARDS_METHOD:()=>CARDS_METHOD,CARDS_TIMEOUT_MS:()=>CARDS_TIMEOUT_MS,checkBridge:()=>checkBridge,createBridgeClient:()=>createBridgeClient,createBridgeFetch:()=>createBridgeFetch});yield;const{CHANNEL,FROM_PAGE,FROM_CONTENT,makeRequest,isResponse,signingText}=__ESB_x[0];const{canSign,signText}=__ESB_x[1];
;
;
function createBridgeClient(win,opts={}){const{timeoutMs=5000,
prefix='',
setTimeout:setTimer=win.setTimeout?.bind(win),clearTimeout:clearTimer=win.clearTimeout?.bind(win),
sign=canSign()?signText:null}=opts
let nextId=1
const pending=new Map()
win.addEventListener('message',(event)=>{if(event.source!==undefined&&event.source!==win)return;
const msg=event.data;
if(!isResponse(msg))return;
const entry=pending.get(msg.id);
if(!entry)return;
pending.delete(msg.id);
if(entry.timer!==undefined&&clearTimer)clearTimer(entry.timer);
if(msg.ok)entry.resolve(msg.value);
else entry.reject(new Error(msg.error))})
function request(method,params,opts={}){const id=typeof sign==='function'?oneTimeId(nextId++):typeof prefix==='string'&&prefix!==''?`${prefix}:${nextId++}`:nextId++;
const asked=Number(opts?.timeoutMs)
const wait=Number.isFinite(asked)&&asked>0?asked:timeoutMs
return new Promise((resolve,reject)=>{let timer;
if(setTimer){timer=setTimer(()=>{if(!pending.delete(id))return;
reject(new Error(`bridge timeout: ${method}`))},wait)}
pending.set(id,{resolve,reject,timer});
if(typeof sign!=='function'){win.postMessage(makeRequest(id,method,params),win.location.origin)
return}
let payload=params
try{if(params!==undefined&&params!==null)payload=structuredClone(params)}catch{payload=params}
sign(signingText(id,method,payload)).then((sig)=>sig,()=>null).then((sig)=>{win.postMessage(makeRequest(id,method,payload,sig),win.location.origin)})})}
return{request,get pendingCount(){return pending.size},CHANNEL,FROM_PAGE,FROM_CONTENT}}
function oneTimeId(counter){const bytes=new Uint8Array(8)
globalThis.crypto.getRandomValues(bytes)
let hex=''
for(const byte of bytes)hex+=byte.toString(16).padStart(2,'0')
return `${counter}-${hex}`}
async function checkBridge(client){if(!client||typeof client.request!=='function'){return{ok:false,reason:'bridge-unavailable',version:null}}
try{if(await client.request('ping')!=='pong'){return{ok:false,reason:'unexpected-ping',version:null}}
const version=await client.request('version')
if(typeof version!=='string'||version===''){return{ok:false,reason:'invalid-version',version:null}}
return{ok:true,reason:null,version}}catch(err){return{ok:false,reason:String(err?.message??err),version:null}}}
const FETCH_METHOD='price.fetch'
const CARDS_METHOD='cards.base'
const CARDS_TIMEOUT_MS=35000
function createBridgeFetch(client,opts={}){if(!client||typeof client.request!=='function'){throw new Error('bridge-fetch: нужен клиент моста')}
const wait=Number.isFinite(Number(opts?.timeoutMs))&&Number(opts.timeoutMs)>0?{timeoutMs:Number(opts.timeoutMs)}:undefined
return async function bridgeFetch(url){const result=await client.request(FETCH_METHOD,{url},wait)
if(!result||result.ok!==true){
throw new Error(`bridge-fetch: ${result?.reason ?? 'нет ответа'}`)}
return{status:result.status,modified:typeof result.modified==='string'?result.modified:null,
json:async()=>JSON.parse(result.body),text:async()=>result.body}}}

};
// src/licensing/features.js
__ESB_g[3]=function*(){__ESB_d(__ESB_x[3],{FEATURES:()=>FEATURES,FREE:()=>FREE,HELD_BACK:()=>HELD_BACK,PREMIUM:()=>PREMIUM});yield;
const FREE='free'
const PREMIUM='premium'
const FEATURES=Object.freeze({
autologin:{tier:PREMIUM,phase:2},
hotkeyNav:{tier:PREMIUM,phase:23},
headBar:{tier:PREMIUM,phase:21},
navCenter:{tier:PREMIUM,phase:21},
dropdownSearch:{tier:PREMIUM,phase:24},
priceBadges:{tier:PREMIUM,phase:14},
minBinSearch:{tier:PREMIUM,phase:2},
eaTax:{tier:PREMIUM,phase:2},
hotkeys:{tier:PREMIUM,phase:2},
advancedFilters:{tier:PREMIUM,phase:3},autoBuyer:{tier:PREMIUM,phase:4},autoSeller:{tier:PREMIUM,phase:5},sbcSolver:{tier:PREMIUM,phase:6},clubAnalysis:{tier:PREMIUM,phase:7},priceSources:{tier:PREMIUM,phase:7},
notifications:{tier:PREMIUM,phase:11},enhancedTransferList:{tier:PREMIUM,phase:13},enhancedUnassignedList:{tier:PREMIUM,phase:13},enhancedObjectivesList:{tier:PREMIUM,phase:13},
packGrid:{tier:PREMIUM,phase:15},
sbcAutoBuy:{tier:PREMIUM,phase:16},
pickByPrice:{tier:PREMIUM,phase:17},
cardGrid:{tier:PREMIUM,phase:18},
clubBar:{tier:PREMIUM,phase:19},
hubRewards:{tier:PREMIUM,phase:20},
autoSnipe:{tier:PREMIUM,phase:22},
homeLayout:{tier:PREMIUM,phase:23},
unassignedTools:{tier:PREMIUM,phase:23},
squadScreen:{tier:PREMIUM,phase:24},
packPeek:{tier:PREMIUM,phase:25},
dimOwned:{tier:PREMIUM,phase:26},
packShow:{tier:PREMIUM,phase:27},
gallery:{tier:PREMIUM,phase:28},
hubUnlock:{tier:PREMIUM,phase:29},
holoGlow:{tier:PREMIUM,phase:30},
coinsRefresh:{tier:PREMIUM,phase:31},
itemPrices:{tier:PREMIUM,phase:32},
oneClickBuy:{tier:PREMIUM,phase:33},
latinNames:{tier:PREMIUM,phase:34},
previewShade:{tier:PREMIUM,phase:35},
nightRelist:{tier:PREMIUM,phase:36},
pickLast:{tier:PREMIUM,phase:37},
unassignedOverflow:{tier:PREMIUM,phase:38},
signals:{tier:PREMIUM,phase:39},
activity:{tier:PREMIUM,phase:40},
sbcSeries:{tier:PREMIUM,phase:41},
autobid:{tier:PREMIUM,phase:42},
tradeTotals:{tier:PREMIUM,phase:43},
snipeCapHint:{tier:PREMIUM,phase:44},
promoClose:{tier:PREMIUM,phase:23}})
const EXPECTED_FREE=Object.freeze([])
const HELD_BACK=Object.freeze([])
function featuresByTier(tier){return Object.entries(FEATURES)
.filter(([,meta])=>meta.tier===tier)
.map(([id])=>id)
.sort()}

};
// src/licensing/public-key.js
__ESB_g[4]=function*(){__ESB_d(__ESB_x[4],{ACCOUNT_KEYS:()=>ACCOUNT_KEYS,LICENSE_PUBLIC_KEYS:()=>LICENSE_PUBLIC_KEYS,PARTNER_KEYS:()=>PARTNER_KEYS});yield;
const ACCOUNT_PUBLIC_KEY='BOJm0Fcao9nrtLL6IcfITJScrX2s5d3RqEjMb6witprQbtG_qVFZjZKpcB8ctArV8cy4VoBL_I0oWQV7rF6epJU'
const PARTNER_PUBLIC_KEY='BGyrOlCOLjls9NyLxbpE45WA3EfCU1_eXIesqg009XAZXYWgr40ZGKhR1izDlPlnNegY2QXjmooXkB8cjh_9-Gc'
const PARTNER_KEYS=Object.freeze({p256:Object.freeze([PARTNER_PUBLIC_KEY]),ed25519:Object.freeze([])})
const ACCOUNT_KEYS=Object.freeze({p256:Object.freeze([ACCOUNT_PUBLIC_KEY]),ed25519:Object.freeze([])})
const LICENSE_PUBLIC_KEYS=Object.freeze({p256:Object.freeze([ACCOUNT_PUBLIC_KEY,PARTNER_PUBLIC_KEY]),ed25519:Object.freeze([])
})

};
// src/core/storage-provider.js
__ESB_g[5]=function*(){__ESB_d(__ESB_x[5],{STORAGE_LOADED:()=>STORAGE_LOADED,STORAGE_PENDING:()=>STORAGE_PENDING,createCachedProvider:()=>createCachedProvider,storageFailed:()=>storageFailed});yield;
const STORAGE_PENDING='pending'
const STORAGE_LOADED='loaded'
const STORAGE_LOAD_FAILED='loaded-failed'
const STORAGE_SAVE_FAILED='save-failed'
function storageFailed(provider){try{const state=provider?.status?.()
return state===STORAGE_LOAD_FAILED||state===STORAGE_SAVE_FAILED}catch{return true}}
function createCachedProvider(opts){const{fetch,push,sanitize,fallback}=opts
const onError=typeof opts.onError==='function'?opts.onError:()=>{}
let cache=fallback()
let status=STORAGE_PENDING
const report=(stage,err)=>{try{onError(stage,err)}catch{
}}
const failed=(stage,err)=>{status=stage==='load'?STORAGE_LOAD_FAILED:STORAGE_SAVE_FAILED
report(stage,err)
return false}
let tail=null
const send=(value,note)=>{try{const result=push(value,note)
if(result&&typeof result.then==='function')return Promise.resolve(result).then(()=>true,(err)=>failed('save',err))
return Promise.resolve(true)}catch(err){return Promise.resolve(failed('save',err))}}
return{
read:()=>clone(cache),
write(next,note){cache=sanitize(next)
const value=cache
let mine=null
mine=(tail===null?send(value,note):tail.then(()=>send(value,note))).then((ok)=>{if(tail===mine)tail=null
return ok})
tail=mine
return mine},
adopt(raw){if(status!==STORAGE_LOADED)return false
cache=sanitize(raw)
return true},
async load(){try{cache=sanitize(await fetch())
status=STORAGE_LOADED}catch(err){cache=fallback()
failed('load',err)}
return clone(cache)},
isLoaded:()=>status!==STORAGE_PENDING&&status!==STORAGE_LOAD_FAILED,
status:()=>status}}
function clone(value){if(Array.isArray(value))return[...value]
if(value&&typeof value==='object') return{...value}
return value}

};
// src/licensing/key.js
__ESB_g[6]=function*(){__ESB_d(__ESB_x[6],{createBridgeLicenseProvider:()=>createBridgeLicenseProvider,createKeyProvider:()=>createKeyProvider,parseLicenseKey:()=>parseLicenseKey,rejectLabelKey:()=>rejectLabelKey,verifyLicenseKey:()=>verifyLicenseKey});yield;const{FREE,PREMIUM}=__ESB_x[3];const{LICENSE_PUBLIC_KEYS,PARTNER_KEYS}=__ESB_x[4];const{createCachedProvider}=__ESB_x[5];
;
;
;
const LICENSE_STORAGE_KEY='license.key'
const LICENSE_READ='license.read'
const LICENSE_WRITE='license.write'
function sanitizeLicenseKey(stored){return typeof stored==='string'?stored:''
}
function createBridgeLicenseProvider(opts){const bridge=opts?.bridge
if(!bridge||typeof bridge.request!=='function') throw new Error('licensing: мост недоступен')
return createCachedProvider({fetch:()=>bridge.request(LICENSE_READ),push:(value)=>bridge.request(LICENSE_WRITE,value),sanitize:sanitizeLicenseKey,fallback:()=>'',onError:opts.onError})}
const LICENSE_PREFIX='futc1'
const ALG=Object.freeze({P256:'p256',ED25519:'ed25519'})
const REJECT=Object.freeze({EMPTY:'empty',SHAPE:'bad-shape',ALGORITHM:'unknown-algorithm',PAYLOAD:'bad-payload',SIGNATURE:'bad-signature',EXPIRED:'expired',PLAN:'bad-plan',CRYPTO:'no-crypto'
})
const REJECT_KEYS=Object.freeze({[REJECT.EMPTY]:'license.reason.empty',[REJECT.SHAPE]:'license.reason.bad-shape',[REJECT.ALGORITHM]:'license.reason.unknown-algorithm',[REJECT.PAYLOAD]:'license.reason.bad-payload',[REJECT.SIGNATURE]:'license.reason.bad-signature',[REJECT.EXPIRED]:'license.reason.expired',[REJECT.PLAN]:'license.reason.bad-plan',[REJECT.CRYPTO]:'license.reason.no-crypto'
})
function rejectLabelKey(reason){return REJECT_KEYS[reason]??REJECT_KEYS[REJECT.SHAPE]}
function publicKeysOf(value){const list=Array.isArray(value)?value:[value]
return list.filter((key)=>typeof key==='string'&&key!=='')}
const ACCOUNT_ONLY_FIELDS=Object.freeze(['sub','quota','v'])
function looksLikeAccountEntitlement(payload){if(!payload||typeof payload!=='object')return false
return ACCOUNT_ONLY_FIELDS.some((field)=>Object.hasOwn(payload,field))}
const ALGORITHMS={[ALG.P256]:{importParams:{name:'ECDSA',namedCurve:'P-256'},verifyParams:{name:'ECDSA',hash:'SHA-256'}},[ALG.ED25519]:{importParams:{name:'Ed25519'},verifyParams:{name:'Ed25519'}}}
function parseLicenseKey(token){const fail=(reason)=>({ok:false,reason,alg:null,payload:null,signed:null,signature:null})
if(typeof token!=='string'||token.trim()==='') return fail(REJECT.EMPTY)
const parts=token.trim().split('.')
if(parts.length!==4)return fail(REJECT.SHAPE)
const[prefix,alg,payloadPart,signature]=parts
if(prefix!==LICENSE_PREFIX)return fail(REJECT.SHAPE)
if(!Object.hasOwn(ALGORITHMS,alg))return fail(REJECT.ALGORITHM)
if(payloadPart===''||signature==='') return fail(REJECT.SHAPE)
let payload
try{payload=JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart)))}catch{return fail(REJECT.PAYLOAD)}
if(!payload||typeof payload!=='object'||Array.isArray(payload)) return fail(REJECT.PAYLOAD)
if(!Number.isFinite(payload.exp))return fail(REJECT.PAYLOAD)
if(payload.plan!==PREMIUM)return fail(REJECT.PLAN)
return{ok:true,reason:null,alg,payload,signed:`${prefix}.${alg}.${payloadPart}`,signature}}
async function verifyLicenseKey(token,opts={}){const parsed=parseLicenseKey(token)
const no=(reason,exp=null)=>({ok:false,reason,plan:FREE,exp,note:null})
if(!parsed.ok)return no(parsed.reason)
const subtle=opts.subtle??globalThis.crypto?.subtle
if(!subtle||typeof subtle.importKey!=='function') return no(REJECT.CRYPTO)
const keys=opts.keys??LICENSE_PUBLIC_KEYS
const candidates=publicKeysOf(keys?.[parsed.alg])
if(candidates.length===0) return no(REJECT.ALGORITHM)
const spec=ALGORITHMS[parsed.alg]
let valid=false,broke=false
for(const publicKey of candidates){try{const key=await subtle.importKey('raw',fromBase64Url(publicKey),spec.importParams,false,['verify'])
valid=await subtle.verify(spec.verifyParams,key,fromBase64Url(parsed.signature),new TextEncoder().encode(parsed.signed))}catch{
broke=true}
if(valid===true)break}
if(valid!==true)return no(broke?REJECT.CRYPTO:REJECT.SIGNATURE)
const now=Number.isFinite(opts.now)?opts.now:Number.NaN
if(!Number.isFinite(now))return no(REJECT.EXPIRED,parsed.payload.exp)
if(parsed.payload.exp<=now)return no(REJECT.EXPIRED,parsed.payload.exp)
return{ok:true,reason:null,plan:PREMIUM,exp:parsed.payload.exp,note:typeof parsed.payload.note==='string'?parsed.payload.note:null}}
function createKeyProvider(deps={}){const clock=deps.clock
if(!clock||typeof clock.now!=='function'){throw new Error('licensing: нужны часы (правило 6 NIGHT_BRIEF)')}
const storage=deps.provider??null
let state={plan:FREE,exp:null,reason:null,note:null}
const check=(token)=>{const parsed=parseLicenseKey(token)
if(parsed.ok&&looksLikeAccountEntitlement(parsed.payload))return Promise.resolve({ok:false,reason:REJECT.SHAPE,plan:FREE,exp:null,note:null})
return verifyLicenseKey(token,{now:clock.now(),subtle:deps.subtle,keys:deps.keys??PARTNER_KEYS})}
const apply=(result)=>{state={plan:result.ok?PREMIUM:FREE,exp:result.exp,reason:result.reason,note:result.note??null}
return state}
const stored=()=>{if(!storage)return null
try{const value=storage.read()
return typeof value==='string'&&value!==''?value:null}catch{return null}}
const visible=()=>({unlocked:state.plan===PREMIUM,exp:state.exp,reason:state.reason,note:state.note,hasKey:stored()!==null})
return{
getPlan:()=>state.plan,
state:visible,
async load(){const token=stored()
if(token===null){state={plan:FREE,exp:null,reason:null,note:null}
return state}
return apply(await check(token))},
async setKey(token){const value=typeof token==='string'?token.trim():''
if(value===''){if(storage){try{storage.write('')}catch{
}}
state={plan:FREE,exp:null,reason:null,note:null}
return visible()}
const result=await check(value)
apply(result)
if(result.ok&&storage){try{storage.write(value)}catch{
}}
return visible()}}}
function fromBase64Url(value){const normal=String(value).replace(/-/g,'+').replace(/_/g,'/')
const padded=normal+'='.repeat((4-(normal.length%4))%4)
const binary=atob(padded)
const bytes=new Uint8Array(binary.length)
for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
return bytes}
function toBase64Url(bytes){let binary=''
for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte);
return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}

};
// src/licensing/account.js
__ESB_g[7]=function*(){__ESB_d(__ESB_x[7],{ACCOUNT_OPEN:()=>ACCOUNT_OPEN,createAccountProvider:()=>createAccountProvider,createMigrationProvider:()=>createMigrationProvider,partnerOf:()=>partnerOf});yield;const{FREE,PREMIUM}=__ESB_x[3];const{parseLicenseKey,verifyLicenseKey}=__ESB_x[6];const{ACCOUNT_KEYS}=__ESB_x[4];
;
;
;
const ACCOUNT_STATUS='account.status'
const ACCOUNT_OPEN='account.open'
const ACCOUNT_BUILD='ACC8'
const ACCOUNT_CACHE_MS=604800000
const ACCOUNT_CLOCK_SKEW_MS=300000
const ACCOUNT_REASONS=Object.freeze(['pending','not-configured','signed-out','inactive','network','unauthorized','invalid-entitlement','clock','bridge'])
const HOLD_MS=3_600_000
const HOLD_CLOCK_SLACK_MS=2_000
const SILENT_RE=/^bridge timeout:|context invalidated/i
const silentError=(err)=>SILENT_RE.test(String(err?.message??err))
const silentAnswer=(raw)=>raw!==null&&typeof raw==='object'&&raw.ok===false&&!Object.hasOwn(raw,'configured')
const REASONS=new Set(ACCOUNT_REASONS)
const fail=(reason,configured=null)=>({mode:configured===false?'legacy':'account',configured,authenticated:false,unlocked:false,exp:null,reason:REASONS.has(reason)?reason:'network',cached:false,account:null,quota:null,friend:null,partner:null})
const FRIEND_CODE_RE=/^[0-9A-Z]{4,16}$/
const count=(value)=>Number.isSafeInteger(value)&&value>=0
const table=(value)=>{if(!value||typeof value!=='object'||Array.isArray(value))return null
const out={}
for(const[plan,one]of Object.entries(value)){if(!/^m\d{1,2}$/.test(plan)||!count(one))return null
out[plan]=one}
return Object.keys(out).length>0?out:null}
const SEAT_RE=/^[A-Za-z0-9_-]{6,128}$/
const SEAT_MODES=Object.freeze(['count','enforce'])
function seatOf(payload,token){const seat=payload?.seat
if(typeof seat!=='string'||!SEAT_RE.test(seat))return null
if(typeof token!=='string'||token===''||typeof payload?.sub!=='string'||payload.sub==='')return null
return{seat,mode:SEAT_MODES.includes(payload.seatMode)?payload.seatMode:null,sub:payload.sub,token}}
function friendOf(payload){const raw=payload?.friend
if(!raw||typeof raw!=='object'||Array.isArray(raw))return null
if(typeof raw.code!=='string'||!FRIEND_CODE_RE.test(raw.code)||!count(raw.friends)||!count(raw.days))return null
const pct=table(raw.pct),gift=table(raw.gift)
if(pct===null||gift===null)return null
return{code:raw.code,friends:raw.friends,days:raw.days,pct,gift}}
const PAID_KEY_RE=/^[A-Za-z0-9+/]{43}=$/
const PAID_VERSION_RE=/^\d+\.\d+\.\d+$/
const PAID_KEYS_MAX=3
function ckOf(payload){const raw=payload?.ck
if(!raw||typeof raw!=='object'||Array.isArray(raw))return null
const versions=Object.keys(raw)
if(versions.length===0||versions.length>PAID_KEYS_MAX)return null
for(const version of versions)if(!PAID_VERSION_RE.test(version)||typeof raw[version]!=='string'||!PAID_KEY_RE.test(raw[version]))return null
return raw}
const PARTNER_CODE_RE=/^[a-z0-9_-]{2,32}$/i
function partnerOf(payload){const raw=payload?.partner
if(!raw||typeof raw!=='object'||Array.isArray(raw))return null
if(typeof raw.code!=='string'||!PARTNER_CODE_RE.test(raw.code)||!count(raw.clients)||!count(raw.earned))return null
const pct=table(raw.pct)
if(pct===null)return null
return{code:raw.code,clients:raw.clients,earned:raw.earned,pct}}
const noAnswer=(known)=>fail('network',known)
function createAccountProvider(deps){const bridge=deps?.bridge,clock=deps?.clock
if(!bridge||typeof bridge.request!=='function')throw new Error('account: мост недоступен')
if(!clock||typeof clock.now!=='function')throw new Error('account: нужны часы')
let current=fail('pending'),inFlight=null
let seatNow=null
let keysNow=null
let proofNow=null
let until=null
let liveAt=null,holding=false,seen=-Infinity
const drop=(next)=>{until=null
seatNow=null
keysNow=null
proofNow=null
holding=false
current=next
return current}
const bridgeFail=()=>{const was=current
drop(fail('bridge',was.configured))
current.authenticated=was.authenticated===true
current.account=was.account?{hint:was.account.hint}:null
return current}
const holdAlive=(now)=>{if(now<seen-HOLD_CLOCK_SLACK_MS)return false
return Number.isFinite(liveAt)&&now>=liveAt&&now-liveAt<HOLD_MS}
const silence=()=>{if(live()){holding=true
return state()}
if(keySpeaks()){holding=true
return state()}
bridgeFail()
return state()}
const inactive=(account)=>{drop(fail('inactive',true))
current.authenticated=true
current.account={hint:account.hint}
return state()}
const apply=async(raw)=>{if(silentAnswer(raw))return silence()
if(!raw||typeof raw!=='object')return drop(noAnswer(current.configured))
liveAt=clock.now()
seen=liveAt
holding=false
if(raw.configured===false&&raw.hasSession===false)return drop(fail('not-configured',false))
if(raw.configured!==true)return drop(fail(raw.reason,raw.configured??null))
if(raw.reason==='unauthorized')return drop(fail('unauthorized',true))
if(raw.ok!==true){return drop(fail('network',true))}
if(raw.authenticated!==true||raw.hasSession!==true){return drop(fail('signed-out',true))}
const account=raw.account,quota=raw.quota
if(account&&typeof account.id==='string'&&account.id!==''&&typeof account.hint==='string'
&&raw.entitlement===null&&quota===null)return inactive(account)
const parsed=parseLicenseKey(raw.entitlement)
if(!account||typeof account.id!=='string'||account.id===''||typeof account.hint!=='string'
||!quota||!Number.isSafeInteger(quota.total)||quota.total<0
||!Number.isSafeInteger(quota.remaining)||quota.remaining<0||quota.remaining>quota.total
||!parsed.ok||parsed.payload?.v!==1||parsed.payload?.sub!==account.id
||parsed.payload?.quota?.total!==quota.total||parsed.payload?.quota?.remaining!==quota.remaining){return drop(fail('invalid-entitlement',true))}
const verified=await verifyLicenseKey(raw.entitlement,{now:clock.now(),subtle:deps.subtle,keys:deps.keys??ACCOUNT_KEYS})
if(!verified.ok){if(verified.reason==='expired')return inactive(account)
return drop(fail('invalid-entitlement',true))}
const issued=parsed.payload?.iat
const age=clock.now()-issued
if(!Number.isSafeInteger(issued)||!(age<ACCOUNT_CACHE_MS))return drop(fail('invalid-entitlement',true))
if(age<-ACCOUNT_CLOCK_SKEW_MS)return drop(fail('clock',true))
until=Math.min(verified.exp,issued+ACCOUNT_CACHE_MS)
current={mode:'account',configured:true,authenticated:true,unlocked:true,exp:verified.exp,reason:null,cached:raw.cached===true,account:{hint:account.hint},quota:{total:quota.total,remaining:quota.remaining},friend:friendOf(parsed.payload),partner:partnerOf(parsed.payload)}
seatNow=seatOf(parsed.payload,raw.entitlement)
keysNow=ckOf(parsed.payload)
proofNow=raw.entitlement
return state()}
const refresh=()=>{if(inFlight)return inFlight
inFlight=Promise.resolve().then(()=>bridge.request(ACCOUNT_STATUS)).then(apply,(err)=>{if(silentError(err))return silence()
drop(noAnswer(current.configured))
return state()}).finally(()=>{inFlight=null})
return inFlight}
const live=()=>{if(current.unlocked!==true||!Number.isFinite(until))return false
const now=clock.now()
if(!(now<until))return false
if(holding&&!holdAlive(now)){bridgeFail()
return false}
if(now>seen)seen=now
return true}
const state=()=>{const open=live()
return{build:ACCOUNT_BUILD,mode:current.mode,configured:current.configured,authenticated:current.authenticated,unlocked:open,exp:current.exp,reason:current.reason,cached:current.cached,account:current.account?{...current.account}:null,quota:current.quota?{...current.quota}:null,friend:current.friend?{...current.friend,pct:{...current.friend.pct},gift:{...current.friend.gift}}:null,partner:current.partner?{...current.partner,pct:{...current.partner.pct}}:null}}
const keySpeaks=(keyExp)=>{if(current.configured!==true||current.reason!=='signed-out')return false
const now=clock.now()
if(holding){let exp=null
try{exp=typeof keyExp==='function'?keyExp():null}catch{exp=null}
if(!holdAlive(now)||(Number.isFinite(exp)&&!(now<exp))){bridgeFail()
return false}}
if(now>seen)seen=now
return true}
const legacyAllowed=(keyExp)=>current.configured===false||keySpeaks(keyExp)
return{getPlan:()=>live()?PREMIUM:FREE,state,refresh,isLegacyAllowed:legacyAllowed,
seat:()=>(live()&&seatNow!==null?{...seatNow}:null),
paidKey:(version)=>(live()&&keysNow!==null&&Object.hasOwn(keysNow,version)?keysNow[version]:null),
proof:()=>(live()?proofNow:null)}}
function createMigrationProvider({account,legacy}={}){if(!account||typeof account.getPlan!=='function'||typeof account.isLegacyAllowed!=='function')throw new Error('account: нужен account provider')
if(!legacy||typeof legacy.getPlan!=='function')throw new Error('account: нужен legacy provider')
const keyExp=()=>(typeof legacy.state==='function'?legacy.state()?.exp:null)
const state=()=>{if(account.isLegacyAllowed(keyExp)){const old=typeof legacy.state==='function'?legacy.state():{}
return{...old,build:ACCOUNT_BUILD,mode:'legacy',configured:account.state().configured,account:null,quota:null,friend:null,partner:null}}
return account.state()}
return{getPlan:()=>account.isLegacyAllowed(keyExp)?legacy.getPlan():account.getPlan(),state,
seat:()=>(account.isLegacyAllowed(keyExp)||typeof account.seat!=='function'?null:account.seat()),
paidKey:(version)=>(account.isLegacyAllowed(keyExp)||typeof account.paidKey!=='function'?null:account.paidKey(version)),
proof:()=>(account.isLegacyAllowed(keyExp)||typeof account.proof!=='function'?null:account.proof()),
probe(){const view=state()
const open=view.unlocked===true
return{build:ACCOUNT_BUILD,source:open?(view.mode==='legacy'?'key':'account'):'none',exp:open&&Number.isFinite(view.exp)?view.exp:null}}}}

};
// src/features/account-door.js
__ESB_g[8]=function*(){__ESB_d(__ESB_x[8],{openAccountDoor:()=>openAccountDoor,watchAccountDoor:()=>watchAccountDoor});yield;const{createBridgeClient}=__ESB_x[2];const{CHANNEL,FROM_CONTENT,KIND_EVENT}=__ESB_x[0];const{ACCOUNT_OPEN}=__ESB_x[7];
;
;
;
const ACCOUNT_OPEN_FAILED='account.open.failed'
const ACCOUNT_BRIDGE_PREFIX='acc'
const REASON_RE=/^[a-z][a-z-]{0,39}$/
const rooms=new WeakMap()
function roomOf(win){let room=rooms.get(win)
if(room===undefined){room={client:null,watching:false,opens:0,failures:0,last:null}
rooms.set(win,room)
attachInstrument(win)}
return room}
function record(win,room,reason){room.failures+=1
room.last=reason
try{const box=win.__eshario
if(box&&Array.isArray(box.errors))box.errors.push(`account door: страница аккаунта не открылась (${reason})`)}catch{/* прибор молчит, счёт в комнате остался */}}
function watchAccountDoor(win){if(!win||typeof win.addEventListener!=='function')return false
const room=roomOf(win)
if(room.watching)return true
room.watching=true
win.addEventListener('message',(event)=>{if(event?.source!==undefined&&event.source!==win)return
const msg=event?.data
if(!msg||msg.channel!==CHANNEL||msg.from!==FROM_CONTENT||msg.kind!==KIND_EVENT||msg.name!==ACCOUNT_OPEN_FAILED)return
const said=msg.payload?.reason
record(win,room,typeof said==='string'&&REASON_RE.test(said)?said:'open-failed')})
return true}
async function openAccountDoor(win){if(!win)return{ok:false,reason:'no-window'}
const room=roomOf(win)
watchAccountDoor(win)
room.opens+=1
try{if(room.client===null)room.client=createBridgeClient(win,{prefix:ACCOUNT_BRIDGE_PREFIX})
const value=await room.client.request(ACCOUNT_OPEN)
if(value&&value.ok===true)return{ok:true,reason:null}
return{ok:false,reason:typeof value?.reason==='string'?value.reason:'no-response'}}catch{
record(win,room,'bridge')
return{ok:false,reason:'bridge'}}}
function accountDoorState(win){const room=win?rooms.get(win):undefined
return{opens:room?.opens??0,failures:room?.failures??0,last:room?.last??null,watching:room?.watching===true}}
function attachInstrument(win){try{const box=win.__eshario
if(box&&typeof box==='object'&&typeof box.accountDoor!=='function')box.accountDoor=()=>accountDoorState(win)}catch{/* ручки не будет, дверь всё равно живёт */}}

};
// src/features/api-door.js
__ESB_g[9]=function*(){__ESB_d(__ESB_x[9],{API_ORIGINS:()=>API_ORIGINS,apiDoor:()=>apiDoor,apiOrigin:()=>apiOrigin,apiUrl:()=>apiUrl,noteApiAnswer:()=>noteApiAnswer});yield;
const API_ORIGINS=Object.freeze(['https://api.eshario.com','https://api.eshario.app'])
const API_DOOR_HOLD_MS=10*60_000
const API_NETWORK_REASONS=Object.freeze(['network','timeout'])
function createApiDoor(deps={}){const now=typeof deps.now==='function'?deps.now:()=>Date.now()
let origin=API_ORIGINS[0]
let switchedAt=null
let until=null
let failures=0
const settle=()=>{if(until!==null&&now()>=until){origin=API_ORIGINS[0]
until=null}
return origin}
return{origin:settle,
note(url,answer){if(typeof url!=='string'||!API_ORIGINS.some((one)=>url.startsWith(`${one}/`)))return answer
const reason=answer!==null&&typeof answer==='object'&&answer.ok!==true&&typeof answer.reason==='string'?answer.reason:null
if(reason===null||!API_NETWORK_REASONS.includes(reason))return answer
failures+=1
if(url.startsWith(`${API_ORIGINS[0]}/`)&&settle()===API_ORIGINS[0]){const at=now()
origin=API_ORIGINS[1]
switchedAt=at
until=at+API_DOOR_HOLD_MS}
return answer},
view(){settle()
return{origin,switchedAt,until,failures}}}}
let door=createApiDoor()
function apiOrigin(){return door.origin()}
function apiUrl(path){return `${door.origin()}${path}`}
function noteApiAnswer(url,answer){return door.note(url,answer)}
function apiDoor(){return door.view()}
function useApiDoor(next){const prev=door
door=next
return prev}

};
// src/features/day-sign.js
__ESB_g[10]=function*(){__ESB_d(__ESB_x[10],{createDaySign:()=>createDaySign});yield;
const DAY_SIGN_KEY='eshario.daysign'
const DAY_SIGN_PATH='/v1/day-sign'
const HEX16=/^[0-9a-f]{16}$/
function londonDayKey(now){try{const parts={}
for(const part of new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now))parts[part.type]=part.value
return `${parts.year}-${parts.month}-${parts.day}`}catch{return new Date(now).toISOString().slice(0,10)}}
function createDaySign(deps={}){const win=deps.win??null
const clock=deps.clock??{now:()=>Date.now()}
const dayKey=deps.dayKey??londonDayKey
const onError=typeof deps.onError==='function'?deps.onError:()=>{}
const stats={ran:0,sent:0,skipped:null,last:null,error:null}
let busy=false
const read=()=>{try{const one=JSON.parse(win?.localStorage?.getItem(DAY_SIGN_KEY)??'null')
return one&&typeof one==='object'?one:{}}catch{return{}}}
const save=(one)=>{try{win?.localStorage?.setItem(DAY_SIGN_KEY,JSON.stringify(one))}catch(err){onError(err)}}
const idOf=()=>{const one=read()
if(typeof one.id==='string'&&HEX16.test(one.id))return one.id
const bytes=new Uint8Array(8)
;(deps.random??globalThis.crypto).getRandomValues(bytes)
const id=[...bytes].map((b)=>b.toString(16).padStart(2,'0')).join('')
save({...one,id})
return id}
return{
async step(){stats.ran+=1
if(busy)return'busy'
const why=deps.allowed?.()===false?'off':deps.signedIn?.()===true?'signed-in':typeof deps.send!=='function'?'no-door':null
if(why!==null){stats.skipped=why
return why}
const day=dayKey(clock.now())
if(read().day===day){stats.skipped='today'
return'today'}
busy=true
try{const id=idOf()
const level=deps.trade?.()?.level
const body={id,day,...(Number.isSafeInteger(level)&&level!==0&&level!==100?{trade:level}:{}),...(deps.plat?.()?{plat:deps.plat()}:{}),...(deps.app?.()?{app:deps.app()}:{})}
const res=await deps.send({path:DAY_SIGN_PATH,method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),timeoutMs:15_000})
const ok=res&&res.status===200
if(ok){save({id,day})
stats.sent+=1}
stats.last={day,status:res?res.status:null}
return ok?'sent':'failed'}catch(err){onError(err)
stats.error=String(err?.message??err).slice(0,120)
return'failed'}finally{busy=false}},
probe(){return{...stats,day:read().day??null,ea:0}}}}

};
// src/adapter/trade-access.js
__ESB_g[11]=function*(){__ESB_d(__ESB_x[11],{TRADE_ACCESS:()=>TRADE_ACCESS,readTradeAccess:()=>readTradeAccess});yield;
const TRADE_ACCESS=Object.freeze({NONE:0,BANNED:1,ALLOWED:2,CONSOLE_ONLY:3,UNAVAILABLE:4,MAINTENANCE:100})
const levelOf=(win,name)=>{const value=win?.TradeAccessLevel?.[name]
return Number.isFinite(value)?value:TRADE_ACCESS[name]}
function readTradeAccess(win=globalThis){let user=null
try{user=win?.services?.User?.getUser?.()??null}catch{user=null}
if(!user||typeof user!=='object')return{known:false,allowed:false,consoleOnly:false,level:null}
let level=null
try{level=Number.isFinite(user.tradeAccess)?user.tradeAccess:null}catch{level=null}
let allowed=null
try{if(typeof user.hasTradeAccess==='function')allowed=user.hasTradeAccess()===true}catch{allowed=null}
if(allowed===null)allowed=level!==null&&level===levelOf(win,'ALLOWED')
return{known:true,allowed,consoleOnly:allowed===false&&level!==null&&level===levelOf(win,'CONSOLE_ONLY'),level}}

};
// src/i18n/detect.js
__ESB_g[12]=function*(){__ESB_d(__ESB_x[12],{DEFAULT_LOCALE:()=>DEFAULT_LOCALE,SUPPORTED_LOCALES:()=>SUPPORTED_LOCALES,chooseLocale:()=>chooseLocale,currentTimeZone:()=>currentTimeZone});yield;
const SUPPORTED_LOCALES=Object.freeze(['en','ru'])
const DEFAULT_LOCALE='en'
const RUSSIAN_TIME_ZONES=Object.freeze([
'Europe/Kaliningrad','Europe/Moscow','Europe/Kirov','Europe/Volgograd','Europe/Astrakhan',
'Europe/Saratov','Europe/Ulyanovsk','Europe/Samara','Asia/Yekaterinburg','Asia/Omsk',
'Asia/Novosibirsk','Asia/Barnaul','Asia/Tomsk','Asia/Novokuznetsk','Asia/Krasnoyarsk',
'Asia/Irkutsk','Asia/Chita','Asia/Yakutsk','Asia/Khandyga','Asia/Vladivostok',
'Asia/Ust-Nera','Asia/Magadan','Asia/Sakhalin','Asia/Srednekolymsk','Asia/Kamchatka','Asia/Anadyr',
'Europe/Minsk',
'Asia/Almaty','Asia/Aqtau','Asia/Aqtobe','Asia/Atyrau','Asia/Oral','Asia/Qostanay','Asia/Qyzylorda',
'Asia/Bishkek','Asia/Samarkand','Asia/Tashkent','Asia/Dushanbe',
'Asia/Yerevan','Asia/Tbilisi'])
const ZONE_LOCALE='ru'
function currentTimeZone(){try{const zone=new Intl.DateTimeFormat().resolvedOptions().timeZone
return typeof zone==='string'&&zone!==''?zone:null}catch{return null}}
function detectLocale(preferences,timeZone=null){const list=typeof preferences==='string'?[preferences]:(preferences??[])
for(const tag of list){if(typeof tag!=='string') continue
const primary=tag.toLowerCase().split('-')[0]
if(primary!==DEFAULT_LOCALE&&SUPPORTED_LOCALES.includes(primary))return primary}
if(typeof timeZone==='string'&&RUSSIAN_TIME_ZONES.includes(timeZone))return ZONE_LOCALE
return DEFAULT_LOCALE}
function chooseLocale(chosen,preferences,timeZone=null){
if(typeof chosen==='string'&&chosen!=='')return detectLocale(chosen)
return detectLocale(preferences,timeZone)}

};
// src/i18n/dict.shell.js
__ESB_g[13]=function*(){__ESB_d(__ESB_x[13],{shellEn:()=>shellEn,shellRu:()=>shellRu});yield;
const shellEn=Object.freeze({
'shell.subscribe':'ESHArio works by subscription. Sign in or subscribe in the account window',
'shell.openAccount':'Open account',
'shell.paidMissing':'Paid part did not load, press to refresh',
'shell.refresh':'Refresh',
})
const shellRu=Object.freeze({
'shell.subscribe':'ESHArio работает по подписке. Войди или оформи её в окне аккаунта',
'shell.openAccount':'Открыть аккаунт',
'shell.paidMissing':'Платная часть не загрузилась, нажми обновить',
'shell.refresh':'Обновить',
})

};
// src/page/paid-dock.js
__ESB_g[14]=function*(){__ESB_d(__ESB_x[14],{PAID_BRIDGE_EXTRA_MS:()=>PAID_BRIDGE_EXTRA_MS,createPaidDock:()=>createPaidDock});yield;const{apiUrl,noteApiAnswer}=__ESB_x[9];
;
const PAID_DOCK_BUILD='ACR1-2'
const PAID_CACHE_KEY='paid.piece'
const PAID_API_MS=8_000
const PAID_STATIC_MS=20_000
const PAID_BRIDGE_EXTRA_MS=2_000
const PAID_STATICS=Object.freeze(['https://eshario.com','https://eshario.app'])
const PAID_MAGIC='ESP1'
const PAID_NONCE_BYTES=12
const PAID_REJECT='code.paid-reject'
const SOURCE_URL='eshario-page-paid.js'
const REJECTS_KEPT=8
function bundled(){try{return typeof __eshario_paid==='object'&&__eshario_paid!==null?__eshario_paid:null}catch{return null}}
const isPlain=(value)=>typeof value==='object'&&value!==null&&!Array.isArray(value)
function bytesOf(base64){const raw=atob(base64)
const out=new Uint8Array(raw.length)
for(let i=0;i<raw.length;i+=1)out[i]=raw.charCodeAt(i)
return out}
const bytesOrNull=(base64)=>{try{return bytesOf(base64)}catch{return null}}
const hexOf=(buffer)=>[...new Uint8Array(buffer)].map((byte)=>byte.toString(16).padStart(2,'0')).join('')
async function openPiece(subtle,bytes,key){const head=[...PAID_MAGIC].every((ch,i)=>bytes[i]===ch.charCodeAt(0))
if(!head)throw new Error('magic')
const start=PAID_MAGIC.length
const nonce=bytes.subarray(start,start+PAID_NONCE_BYTES)
const handle=await subtle.importKey('raw',bytesOf(key),'AES-GCM',false,['decrypt'])
const packed=await subtle.decrypt({name:'AES-GCM',iv:nonce},handle,bytes.subarray(start+PAID_NONCE_BYTES))
return new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}
function runInPage(doc,win,text){const name=`__esp${Math.random().toString(36).slice(2)}`
let got=null
win[name]=(piece)=>{got=piece}
try{const node=doc.createElement('script')
let nonce=''
try{const seen=doc.querySelector('script[nonce]')
if(seen)nonce=String(seen.nonce||seen.getAttribute('nonce')||'')}catch{nonce=''}
if(nonce!=='')node.nonce=nonce
node.textContent=`${name}(${text});\n//# sourceURL=${SOURCE_URL}\n`
;(doc.head||doc.documentElement).appendChild(node)
node.remove()}finally{delete win[name]}
return got}
function createPaidDock(deps){const paid=deps.paid!==undefined?deps.paid:bundled()
const subtle=deps.subtle??globalThis.crypto?.subtle
const now=deps.now??(()=>Date.now())
const run=deps.run??((text)=>runInPage(deps.doc??document,deps.win??window,text))
let phase='idle'
let source=null
let ms=null
let keyed=false
const rejects=[]
const readers=[]
const reject=(reason,detail=null)=>{const line=`${PAID_REJECT} ${paid?.version??'?'} ${reason}${detail===null?'':` ${detail}`}`
rejects.push(line)
if(rejects.length>REJECTS_KEPT)rejects.shift()
try{deps.onReject?.(line)}catch{/* журнал не держит причал */}}
const door=async(name,args)=>{const answer=await deps.request('door',{name,args})
return isPlain(answer)&&answer.ok===true?{ok:true,value:answer.value??null}:{ok:false,reason:isPlain(answer)&&typeof answer.reason==='string'?answer.reason:'no-door'}}
const fromCache=async()=>{const read=await door('store.get',{key:PAID_CACHE_KEY}).catch(()=>({ok:false}))
if(read.ok!==true||read.value===null)return null
const kept=read.value
if(isPlain(kept)&&kept.version===paid.version&&kept.sha256===paid.sha256&&typeof kept.base64==='string'){const bytes=bytesOrNull(kept.base64)
if(bytes===null)reject('cache-base64')
else{const seen=hexOf(await subtle.digest('SHA-256',bytes))
if(seen===paid.sha256)return{bytes,base64:kept.base64,from:'cache'}
reject('cache-sha',seen.slice(0,8))}}
await door('store.remove',{key:PAID_CACHE_KEY}).catch(()=>null)
return null}
const sources=()=>[{url:apiUrl(`/v1/code/${paid.version}/${paid.file}`),from:'api',timeoutMs:PAID_API_MS},
...PAID_STATICS.map((origin)=>({url:`${origin}/downloads/code/${paid.version}/${paid.file}`,from:'static',timeoutMs:PAID_STATIC_MS}))]
const fromNet=async({url,from,timeoutMs})=>{const answer=await deps.request('door',{name:'net.fetch',args:{url,as:'base64',timeoutMs}},{timeoutMs:timeoutMs+PAID_BRIDGE_EXTRA_MS}).catch(()=>null)
if(from==='api')noteApiAnswer(url,answer)
const value=isPlain(answer)&&answer.ok===true&&isPlain(answer.value)?answer.value:null
if(value===null||value.status!==200||typeof value.bodyBase64!=='string'){reject(`fetch-${from}`,String(value?.status??answer?.reason??'no-answer'))
return null}
const bytes=bytesOrNull(value.bodyBase64)
if(bytes===null){reject(`base64-${from}`)
return null}
const seen=hexOf(await subtle.digest('SHA-256',bytes))
if(seen!==paid.sha256){reject(`sha-${from}`,seen.slice(0,8))
return null}
return{bytes,base64:value.bodyBase64,from}}
const fetchPiece=async()=>{const kept=await fromCache()
if(kept!==null)return kept
for(const one of sources()){const got=await fromNet(one)
if(got!==null)return got}
return null}
const keyNow=()=>{try{return deps.paidKey(paid.version)}catch{return null}}
return{
async attach(){if(paid===null||phase==='docked')return phase==='docked'
const started=now()
const key=keyNow()
keyed=typeof key==='string'&&key!==''
if(!keyed){phase='no-key'
return false}
let got
try{got=await fetchPiece()}catch(err){reject('fetch',err?.message??String(err))
phase='failed'
return false}
if(got===null){phase='failed'
return false}
const fetched=now()
let text
try{text=await openPiece(subtle,got.bytes,key)}catch{reject('key')
phase='refused'
return false}
const opened=now()
if(got.from!=='cache')await door('store.set',{key:PAID_CACHE_KEY,value:{version:paid.version,sha256:paid.sha256,base64:got.base64}}).catch(()=>null)
if(keyNow()!==key){reject('right-gone')
keyed=false
phase='no-key'
return false}
try{const piece=run(text)
if(typeof piece!=='function')throw new Error('no-piece')
await paid.attach(piece)}catch(err){reject('run',err?.message??String(err))
phase='failed'
return false}
phase='docked'
source=got.from
ms={fetch:fetched-started,open:opened-fetched,run:now()-opened,total:now()-started}
for(const one of readers.splice(0)){try{one()}catch{/* читатель не держит причал */}}
return true},
get:(rel)=>paid?.get?.(rel)??null,
docked:()=>phase==='docked',
whenReady(fn){if(phase==='docked')fn()
else readers.push(fn)},
status:()=>({build:PAID_DOCK_BUILD,phase,version:paid?.version??null,file:paid?.file??null,bytes:paid?.bytes??null,
key:keyed,source,ms,rejects:[...rejects]})}}

};
// src/page/shell.js
__ESB_g[15]=function*(){yield;const{createBridgeClient,checkBridge}=__ESB_x[2];const{createAccountProvider}=__ESB_x[7];const{PREMIUM}=__ESB_x[3];const{openAccountDoor,watchAccountDoor}=__ESB_x[8];const{apiUrl,noteApiAnswer}=__ESB_x[9];const{createDaySign}=__ESB_x[10];const{readTradeAccess}=__ESB_x[11];const{chooseLocale,currentTimeZone}=__ESB_x[12];const{shellEn,shellRu}=__ESB_x[13];const{createPaidDock,PAID_BRIDGE_EXTRA_MS}=__ESB_x[14];
;
;
;
;
;
;
;
;
;
;
const SHELL_BUILD='ACR1-S1'
const SHELL_MARK='data-fut-shell'
const SHELL_FOCUS_MS=5_000
const SHELL_RETRY_MS=60_000
const SIGN_FIRST_MS=30_000
const SIGN_EVERY_MS=30*60_000
const SUMMARY_KEY='collectSummary'
const SHELL_BRIDGE_PREFIX='sh'
const THEME_CSS="eshario-asset:ui/theme.css"
const SHELL_CSS="eshario-asset:ui/shell.css"
function styleText(key){try{return typeof __eshario_assets==='object'&&__eshario_assets!==null?__eshario_assets[key]??'':''}catch{return''}}
function createShellCell({doc,say,onAccount,onRefresh}){let node=null
const styles=[]
const mount=()=>{if(node!==null)return node
for(const key of [THEME_CSS,SHELL_CSS]){const style=doc.createElement('style')
style.textContent=styleText(key)
doc.documentElement.appendChild(style)
styles.push(style)}
node=doc.createElement('div')
node.className='fx-shell-cell'
node.setAttribute(SHELL_MARK,'1')
const text=doc.createElement('span')
text.className='fx-shell-text'
const button=doc.createElement('button')
button.className='fx-shell-button'
button.type='button'
node.append(text,button)
doc.documentElement.appendChild(node)
return node}
let kind=null
const show=(next)=>{const cell=mount()
if(kind===next)return
kind=next
cell.setAttribute(SHELL_MARK,next)
const[text,button]=cell.children
text.textContent=say(next==='failed'?'shell.paidMissing':'shell.subscribe')
button.textContent=say(next==='failed'?'shell.refresh':'shell.openAccount')
button.onclick=next==='failed'?onRefresh:onAccount}
return{show,kind:()=>kind,
hide(){node?.remove()
for(const style of styles.splice(0))style.remove()
node=null
kind=null}}}
function carryInstrument(win,state){try{Object.defineProperty(win,'__eshario',{configurable:true,enumerable:true,get:()=>state,
set(next){for(const name of Object.getOwnPropertyNames(state)){if(typeof state[name]==='function'&&next&&!(name in next))next[name]=state[name]}
Object.defineProperty(win,'__eshario',{value:next,writable:true,configurable:true,enumerable:true})}})}catch{/* прибор не держит стыковку */}}
const noteOf=(state)=>(message)=>{state.errors?.push(String(message))
console.warn('[ESHArio]',message)}
function createShell(deps){const{win,account,dock,state}=deps
const note=noteOf(state)
const setTimer=deps.setTimer??((fn,ms)=>win.setTimeout(fn,ms))
const setEvery=deps.setEvery??((fn,ms)=>win.setInterval(fn,ms))
const now=deps.now??(()=>Date.now())
const open=deps.open??(()=>openAccountDoor(win))
let busy=false
let done=false
let forced=false
let retryArmed=false
let askedAt=-Infinity
const cell=createShellCell({doc:win.document,say:deps.say,onAccount:()=>{void open()},onRefresh:()=>win.location.reload()})
const armRetry=()=>{if(retryArmed||done)return
retryArmed=true
setTimer(()=>{retryArmed=false
void ask()},SHELL_RETRY_MS)}
const decide=async()=>{if(done||busy)return
busy=true
try{if(!forced&&account.getPlan()!==PREMIUM){cell.show('subscribe')
return}
carryInstrument(win,state)
if(await dock.attach()){done=true
cell.hide()
return}
cell.show(!forced&&account.getPlan()!==PREMIUM?'subscribe':'failed')
armRetry()}catch(err){note(`shell decide: ${err?.message??err}`)
cell.show('failed')
armRetry()}finally{busy=false}}
const ask=async()=>{if(done)return
askedAt=now()
try{await account.refresh()}catch{/* ответит следующий вопрос */}
await decide()}
const fromFocus=()=>{if(!done&&now()-askedAt>=SHELL_FOCUS_MS)void ask()}
return{decide,ask,
watch(){win.addEventListener('focus',fromFocus)
win.document.addEventListener('visibilitychange',fromFocus)
setEvery(()=>{if(!done)void ask()},SHELL_RETRY_MS)},
signDay(){if(!deps.sign)return
setTimer(()=>{if(!done)void deps.sign.step()},SIGN_FIRST_MS)
setEvery(()=>{if(!done)void deps.sign.step()},SIGN_EVERY_MS)},
probe(){forced=true
void decide()
return{plan:PREMIUM,docked:dock.docked(),engine:dock.get('automation/sniper.js'),cell:cell.kind()}},
cell}}
const daySignSend=(bridge)=>async(ask)=>{const url=apiUrl(ask.path)
const answer=noteApiAnswer(url,await bridge.request('door',{name:'net.fetch',args:{url,method:ask.method,headers:ask.headers,body:ask.body,timeoutMs:ask.timeoutMs}},{timeoutMs:ask.timeoutMs+PAID_BRIDGE_EXTRA_MS}))
return answer?.ok===true?{status:Number(answer.value?.status)||0,body:typeof answer.value?.body==='string'?answer.value.body:''}:null}
function startShell(win){const state={bridge:'unknown',version:null,panel:'shell',errors:[],shell:SHELL_BUILD}
win.__eshario=state
const note=noteOf(state)
const bridge=createBridgeClient(win,{prefix:SHELL_BRIDGE_PREFIX})
const clock={now:()=>Date.now()}
const account=createAccountProvider({bridge,clock})
const dock=createPaidDock({request:(method,params,opts)=>bridge.request(method,params,opts),paidKey:(version)=>account.paidKey(version),onReject:note})
const locale=chooseLocale(null,win.navigator?.languages,currentTimeZone())
const words=locale==='ru'?shellRu:shellEn
let summaryOn=true
const sign=createDaySign({win,clock,allowed:()=>summaryOn,signedIn:()=>typeof account.proof()==='string',trade:()=>readTradeAccess(win),app:()=>dock.status().version,
send:daySignSend(bridge),
onError:(err)=>note(`day sign: ${err?.message??err}`)})
const shell=createShell({win,bridge,account,dock,sign,state,say:(key)=>words[key]??key})
state.codeStatus=()=>dock.status()
state.paidDock=(rel)=>dock.get(rel)
state.paidProbe=()=>shell.probe()
state.plan=()=>account.getPlan()
state.daySign=(opts)=>(opts?.step===true?sign.step():sign.probe())
watchAccountDoor(win)
return Promise.resolve().then(async()=>{const health=await checkBridge(bridge)
if(!health.ok)throw new Error(health.reason)
state.bridge='ok'
state.version=health.version
const saved=await bridge.request('settings.read').catch(()=>null)
summaryOn=saved?.[SUMMARY_KEY]!==false
await account.refresh()
shell.watch()
shell.signDay()
await shell.decide()}).catch((err)=>{state.bridge=`failed: ${err?.message??err}`
note(err?.message??err)})}
function bundled(){try{return typeof __eshario_paid==='object'&&__eshario_paid!==null}catch{return false}}
if(bundled())void startShell(window)

};
// Запуск: шаг первый всем модулям (геттеры, подъём функций), потом тела по порядку браузера.
const __ESB_o=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],__ESB_a=new Set([]),__ESB_c=[];
const __ESB_it=[];for(const i of __ESB_o){const g=__ESB_g[i].call(void 0);__ESB_it[i]=g;g.next()}
const __ESB_ring=()=>{for(const j of __ESB_c)__ESB_r[j]()};
const __ESB_run=(k)=>{for(;k<__ESB_o.length;k++){__ESB_ring();const i=__ESB_o[k],r=__ESB_it[i].next();if(__ESB_a.has(i))return r.then(()=>__ESB_run(k+1))}__ESB_ring()};
__ESB_run(0);
})();
//# sourceURL=eshario-page-bundle.js
