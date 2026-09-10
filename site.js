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
  function readStore(){try{return localStorage.getItem(PROMO_KEY)||''}catch(e){return ''}}
  function writeStore(v){try{localStorage.setItem(PROMO_KEY,v)}catch(e){}}
  var linkPromo='';
  try{
    var q=new URLSearchParams(location.search).get('promo');
    if(q){linkPromo=q.trim().slice(0,32);if(linkPromo)writeStore(linkPromo)}
  }catch(e){}
  var promoCode=linkPromo||readStore();

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
  var picks=[].slice.call(document.querySelectorAll('[data-termpick]'));
  picks.forEach(function(pick){
    var box=pick.closest('.price-panel');
    if(!box)return;
    var money=box.querySelector('.pp-money');
    if(!money)return;
    var priceEl=money.querySelector('.p-price'),daysEl=money.querySelector('.p-days');
    var cheapEl=money.querySelector('.p-cheap'),codeEl=money.querySelector('.p-code b');
    var buy=box.querySelector('.pp-buy');
    var buttons=[].slice.call(pick.querySelectorAll('button'));
    function show(one,moved){
      if(moved&&money){money.classList.remove('is-swap');void money.offsetWidth;money.classList.add('is-swap')}
      if(priceEl)priceEl.textContent=one.getAttribute('data-list');
      if(daysEl)daysEl.textContent=one.getAttribute('data-days');
      fillCheap(cheapEl,one.getAttribute('data-cheap'));
      if(codeEl&&codeEl.textContent)codeEl.textContent=one.getAttribute('data-promo');
      if(buy){
        var msg=one.getAttribute('data-msg');
        if(msg&&buy.classList.contains('tgbuy')){buy.setAttribute('data-msg',msg);buy.href=tgText(buy,promoCode)}
        var href=one.getAttribute('data-payhref');
        if(href&&buy.classList.contains('pay')){buy.setAttribute('data-href',href);buy.href=href+(promoCode?'&promo='+encodeURIComponent(promoCode):'')}
      }
    }
    buttons.forEach(function(one){one.addEventListener('click',function(){
      buttons.forEach(function(other){other.setAttribute('aria-pressed',other===one?'true':'false')});
      show(one,true);
    })});
    var on=pick.querySelector('[aria-pressed="true"]');
    if(on)show(on);
    pick.setAttribute('data-live','1');
  });
  function fillPromo(v){
    picks.forEach(function(pick){
      var box=pick.closest('.price-panel');if(!box)return;
      var codeEl=box.querySelector('.pp-money .p-code b');
      var on=pick.querySelector('[aria-pressed="true"]');
      if(codeEl)codeEl.textContent=v&&on?on.getAttribute('data-promo'):'';
    });
  }
  var homeForm=document.querySelector('.price form[data-promo]');
  var homeHint=document.querySelector('.price [data-promo-hint]');
  if(homeForm)homeForm.addEventListener('submit',function(e){
    e.preventDefault();
    var v=homeForm.code.value.trim();
    if(!v){document.body.classList.remove('promo-on');fillPromo('');if(homeHint)homeHint.textContent=homeHint.getAttribute('data-idle');return}
    fillPromo(v);
    document.body.classList.add('promo-on');
    if(homeHint)homeHint.textContent=homeHint.getAttribute('data-done');
  });
  var consents=[].slice.call(document.querySelectorAll('.consent input[type="checkbox"]'));
  var pays=[].slice.call(document.querySelectorAll('a.pay'));
  function unticked(){for(var i=0;i<consents.length;i+=1){if(!consents[i].checked)return consents[i]}return null}
  function sync(){var ok=!unticked();pays.forEach(function(a){a.setAttribute('aria-disabled',ok?'false':'true')});}
  if(consents.length){consents.forEach(function(c){c.addEventListener('change',sync)});sync()}
  pays.forEach(function(a){a.addEventListener('click',function(e){
    if(a.getAttribute('aria-disabled')==='true'){e.preventDefault();var c=unticked();if(c){c.focus();c.closest('.consent').classList.add('nudge')}}
  })});
  var buyForm=document.getElementById('promo');
  var buyHint=document.getElementById('promo-hint');
  function applyBuy(v){
    if(!v){document.body.classList.remove('promo-on');fillPromo('');pays.forEach(function(a){a.href=a.getAttribute('data-href')});syncTg('');writeStore('');if(buyHint)buyHint.textContent=buyHint.getAttribute('data-idle');return}
    fillPromo(v);
    document.body.classList.add('promo-on');
    pays.forEach(function(a){a.href=a.getAttribute('data-href')+'&promo='+encodeURIComponent(v)});
    syncTg(v);
    writeStore(v);
    if(buyHint)buyHint.textContent=buyHint.getAttribute('data-done');
  }
  if(buyForm){
    buyForm.addEventListener('submit',function(e){e.preventDefault();applyBuy(buyForm.code.value.trim())});
    if(promoCode){
      buyForm.code.value=promoCode;
      applyBuy(promoCode);
      if(buyHint&&buyForm.getAttribute('data-applied-tpl'))buyHint.textContent=buyForm.getAttribute('data-applied-tpl').replace('{code}',promoCode);
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
