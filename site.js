(function(){
  (function(){
    var bar=document.querySelector('header.top');
    if(!bar)return;
    var mark=function(){bar.classList.toggle('is-stuck',(window.scrollY||0)>8)};
    mark();
    window.addEventListener('scroll',mark,{passive:true});
  })();

  document.querySelectorAll('[role="tablist"]').forEach(function(list){
    var tabs=[].slice.call(list.querySelectorAll('[role="tab"]'));
    tabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        tabs.forEach(function(t){
          var on=t===tab;
          t.setAttribute('aria-selected',on?'true':'false');
          var panel=document.getElementById(t.getAttribute('aria-controls'));
          if(panel)panel.hidden=!on;
        });
      });
    });
  });
  var abButtons=[].slice.call(document.querySelectorAll('[data-ab] button'));
  abButtons.forEach(function(button){
    button.addEventListener('click',function(){
      var side=button.getAttribute('data-side');
      abButtons.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-side')===side?'true':'false')});
      document.querySelectorAll('.frame-shot').forEach(function(shot){
        shot.setAttribute('data-show',side);
        var bare=shot.querySelector('.sh-bare'),wide=shot.querySelector('.sh-with');
        if(bare)bare.setAttribute('aria-hidden',side==='with'?'true':'false');
        if(wide)wide.setAttribute('aria-hidden',side==='bare'?'true':'false');
      });
    });
  });
  var PROMO_KEY='eshario_promo';
  var PROMO_TTL=90*60*1000;
  function writeStore(v){try{if(v)localStorage.setItem(PROMO_KEY,JSON.stringify({code:v,at:Date.now()}));else localStorage.removeItem(PROMO_KEY)}catch(e){}}
  function readStore(){
    var raw='';
    try{raw=localStorage.getItem(PROMO_KEY)||''}catch(e){return ''}
    if(!raw)return '';
    var s=null;
    try{s=JSON.parse(raw)}catch(e){s=null}
    if(!s||typeof s.code!=='string'||!s.code||typeof s.at!=='number'||Math.abs(Date.now()-s.at)>PROMO_TTL){writeStore('');return ''}
    return s.code;
  }
  var linkPromo='';
  try{
    var q=new URLSearchParams(location.search).get('promo');
    if(q){linkPromo=q.trim().slice(0,32);if(linkPromo)writeStore(linkPromo)}
  }catch(e){}
  var promoCode=linkPromo||readStore();
  if(promoCode)writeStore(promoCode);

  function tgText(a,code){
    var msg=a.getAttribute('data-msg')||'';
    if(code)msg=msg+(a.getAttribute('data-promo-word')||', промокод ')+code;
    return a.getAttribute('data-tg')+'?text='+encodeURIComponent(msg);
  }
  function syncTg(code){
    [].slice.call(document.querySelectorAll('.tgbuy')).forEach(function(a){a.href=tgText(a,code)});
  }
  if(promoCode)syncTg(promoCode);

  function fillCheap(box,pct){
    if(!box)return;
    box.textContent='';
    box.classList.toggle('p-cheap-off',!pct);
    if(!pct)return;
    var parts=String(box.parentNode.getAttribute('data-cheap-tpl')||'{pct}').split('{pct}');
    box.appendChild(document.createTextNode(parts[0]));
    var strong=document.createElement('b');strong.textContent=pct;box.appendChild(strong);
    box.appendChild(document.createTextNode(parts[1]||''));
  }
  var promoState={code:'',plans:null};
  var moneyText=function(n){
    var en=String(document.documentElement.getAttribute('lang')||'').slice(0,2)==='en';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,en?',':'\u00a0')+'\u00a0\u20bd';
  };
  var picks=[].slice.call(document.querySelectorAll('[data-termpick]'));
  picks.forEach(function(pick){
    var box=pick.closest('.price-panel');
    if(!box)return;
    var money=box.querySelector('.pp-money');
    if(!money)return;
    var priceEl=money.querySelector('.p-price'),daysEl=money.querySelector('.p-days');
    var cheapEl=money.querySelector('.p-cheap');
    var buttons=[].slice.call(pick.querySelectorAll('button'));
    function show(one,moved){
      if(moved&&money){money.classList.remove('is-swap');void money.offsetWidth;money.classList.add('is-swap')}
      if(priceEl)priceEl.textContent=one.getAttribute('data-list');
      if(daysEl)daysEl.textContent=one.getAttribute('data-days');
      fillCheap(cheapEl,one.getAttribute('data-cheap'));
    }
    buttons.forEach(function(one){one.addEventListener('click',function(){
      buttons.forEach(function(other){other.setAttribute('aria-pressed',other===one?'true':'false')});
      show(one,true);
    })});
    var on=pick.querySelector('[aria-pressed="true"]');
    if(on)show(on);
    pick.setAttribute('data-live','1');
  });
  function setPromo(code,plans){
    promoState.code=code;
    promoState.plans=plans;
    var body=document.body;
    if(code&&plans){
      body.setAttribute('data-promo-code',code);
      body.setAttribute('data-promo-plans',Object.keys(plans).filter(function(k){return plans[k]}).join(','));
    }else{
      body.removeAttribute('data-promo-code');
      body.removeAttribute('data-promo-plans');
    }
    if(kassaRender)kassaRender();
  }
  var kassaRender=null;
  (function(){
    var k=document.querySelector('[data-kassa]');
    if(!k)return;
    var terms=[].slice.call(k.querySelectorAll('[data-termpick] [data-term]'));
    var label=k.querySelector('[data-k-label]'),days=k.querySelector('[data-k-days]');
    var old=k.querySelector('.k-old'),now=k.querySelector('.k-now'),tag=k.querySelector('.k-tag');
    var tg=k.querySelector('.tgbuy');
    var priceOf=function(term){var p=promoState.plans&&promoState.plans[term];return p&&p.amount?p:null};
    kassaRender=function(){
      var on=null;
      terms.forEach(function(one){
        if(one.getAttribute('aria-pressed')==='true')on=one;
        var p=priceOf(one.getAttribute('data-term'));
        var was=one.querySelector('.t-old'),is=one.querySelector('.t-price');
        one.classList.toggle('is-promo',!!p);
        if(was){was.textContent=p?moneyText(p.list):'';was.hidden=!p}
        if(is)is.textContent=p?moneyText(p.amount):one.getAttribute('data-list');
      });
      if(!on)return;
      var p=priceOf(on.getAttribute('data-term'));
      if(label)label.textContent=on.getAttribute('data-label');
      if(days)days.textContent=on.getAttribute('data-days');
      k.classList.toggle('is-promo',!!p);
      if(old){old.textContent=p?moneyText(p.list):'';old.hidden=!p}
      if(now)now.textContent=p?moneyText(p.amount):on.getAttribute('data-list');
      if(tag){tag.textContent=p?k.getAttribute('data-tag')+' '+promoState.code:'';tag.hidden=!p}
      var msg=on.getAttribute('data-msg');
      if(tg&&msg){tg.setAttribute('data-msg',msg);tg.href=tgText(tg,promoState.code||promoCode)}
    };
    terms.forEach(function(one){one.addEventListener('click',function(){
      terms.forEach(function(other){other.setAttribute('aria-pressed',other===one?'true':'false')});
      kassaRender();
    })});
    kassaRender();
  })();
  var buyForm=document.getElementById('promo');
  var buyHint=document.getElementById('promo-hint');
  var asking=0;
  function hint(key,code,left){
    if(!buyHint)return;
    var text=String(buyHint.getAttribute('data-'+key)||'').replace('{code}',code||'');
    if(left)text+=' '+String(buyHint.getAttribute('data-left')||'').replace('{n}',left.n).replace('{limit}',left.limit);
    buyHint.textContent=text;
  }
  function applyBuy(v){
    var code=String(v||'').trim().toLowerCase().slice(0,32);
    var mine=asking+=1;
    if(!code){setPromo('',null);syncTg('');writeStore('');hint('idle');return}
    var api=buyForm&&buyForm.getAttribute('data-api');
    if(!api||!window.fetch){setPromo('',null);hint('fail');return}
    hint('wait');
    window.fetch(api+'/v1/price?promo='+encodeURIComponent(code),{credentials:'omit'}).then(function(r){
      return r.json().then(function(b){return {status:r.status,body:b}},function(){return {status:r.status,body:{}}});
    }).then(function(res){
      if(mine!==asking)return;
      var b=res.body||{};
      if(res.status===200&&b.ok&&b.plans){
        var plans=b.plans;
        var every=Object.keys(plans).every(function(k){return plans[k]});
        setPromo(b.promo||code,plans);
        syncTg(b.promo||code);
        writeStore(b.promo||code);
        var left=typeof b.remaining==='number'&&typeof b.limit==='number'?{n:b.remaining,limit:b.limit}:null;
        hint(every?'done':'part',b.promo||code,left);
      }else if(res.status===409&&b.reason==='promo-exhausted'){
        setPromo('',null);
        writeStore('');
        hint('gone');
      }else if(res.status===404||res.status===400){
        setPromo('',null);
        writeStore('');
        hint('bad');
      }else{
        setPromo('',null);
        hint('fail');
      }
    },function(){
      if(mine!==asking)return;
      setPromo('',null);
      hint('fail');
    });
  }
  if(buyForm){
    buyForm.addEventListener('submit',function(e){e.preventDefault();applyBuy(buyForm.code.value)});
    if(promoCode){
      buyForm.code.value=promoCode;
      applyBuy(promoCode);
    }
  }

  (function(){
    var wait=[].slice.call(document.querySelectorAll('[data-reveal]'));
    if(!wait.length)return;
    var show=function(){wait.forEach(function(el){el.classList.add('is-in')})};
    if(!('IntersectionObserver' in window)||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
    var vh=window.innerHeight||0;
    var below=wait.filter(function(el){return el.getBoundingClientRect().top>vh*0.9});
    if(!below.length)return;
    below.forEach(function(el){el.classList.add('reveal-wait')});
    var alive=false;
    var io=new IntersectionObserver(function(rows){
      alive=true;
      rows.forEach(function(row){
        if(row.isIntersecting){row.target.classList.add('is-in');io.unobserve(row.target)}
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:0});
    below.forEach(function(el){io.observe(el)});
    window.setTimeout(function(){if(!alive)show()},2000);
    window.addEventListener('scroll',function(){
      if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)show();
    },{passive:true});
  })();
})();
