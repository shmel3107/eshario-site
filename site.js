(function(){
  if(document.documentElement.hasAttribute("data-framed"))return;
  var apiRoad=function(first){
  var A="https://api.eshario.com",B="https://api.eshario.app",KEY='eshario_api';
  var two=first===A;
  var good='';
  var kept=function(){try{return window.sessionStorage.getItem(KEY)===B}catch(e){return false}};
  var mark=function(name){
    if(good===name)return;
    good=name;
    try{if(name===B)window.sessionStorage.setItem(KEY,B);else if(kept())window.sessionStorage.removeItem(KEY)}catch(e){}
  };
  var cap=function(){
    try{if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)return AbortSignal.timeout(4000)}catch(e){}
    try{if(typeof AbortController!=='undefined'){var c=new AbortController();window.setTimeout(function(){c.abort()},4000);return c.signal}}catch(e){}
    return null;
  };
  var ask=function(path,opts){
    if(!two)return window.fetch(first+path,opts);
    var list=good===B||(!good&&kept())?[B,A]:[A,B];
    var go=function(i){
      var o={},k;
      for(k in opts)if(Object.prototype.hasOwnProperty.call(opts,k))o[k]=opts[k];
      if(i===0&&list[0]===A){var s=cap();if(s)o.signal=s}
      return window.fetch(list[i]+path,o).then(function(r){mark(list[i]);return r},function(err){if(i+1<list.length)return go(i+1);throw err});
    };
    return go(0);
  };
  var base=function(){return two?good||(kept()?B:''):first};
  var once=function(path,opts){
    if(!two)return window.fetch(first+path,opts);
    var send=function(name){return window.fetch(name+path,opts).then(function(r){mark(name);return r})};
    var known=base();
    if(known)return send(known);
    return ask('/v1/health',{credentials:'omit',cache:'no-store'}).then(function(){return good||A},function(){return A}).then(send);
  };
  return {ask:ask,once:once,base:base};
};
  var STEP_AT=1796072400000;
  var stepSide=null;
  var priceStep=function(after){
    after=!!after;
    if(stepSide===after)return;
    stepSide=after;
    var i=after?1:0;
    [].slice.call(document.querySelectorAll('[data-price-step]')).forEach(function(one){
      var s=null;
      try{s=JSON.parse(one.getAttribute('data-price-step'))}catch(err){s=null}
      if(!s)return;
      if(s.t)one.textContent=s.t[i];
      if(s.a)Object.keys(s.a).forEach(function(k){one.setAttribute(k,s.a[k][i])});
    });
    try{document.dispatchEvent(new Event('eshario-price-step'))}catch(err){}
  };
  priceStep(Date.now()>=STEP_AT);
  (function(){var left=STEP_AT-Date.now();if(!(left>0&&left<2e9)||typeof window.setTimeout!=='function')return;var h=window.setTimeout(function(){priceStep(true)},left+50);if(h&&typeof h.unref==='function')h.unref()})();
  (function(){
    var bar=document.querySelector('header.top');
    if(!bar)return;
    var mark=function(){bar.classList.toggle('is-stuck',(window.scrollY||0)>8)};
    mark();
    window.addEventListener('scroll',mark,{passive:true});
  })();

  (function(){
    var KEY='eshario_src';
    try{
      if(window.sessionStorage.getItem(KEY)!==null)return;
      var host='';
      try{host=document.referrer?new URL(document.referrer).hostname.toLowerCase():''}catch(e){host=''}
      if(host===window.location.hostname.toLowerCase())host='';
      var q=new URLSearchParams(window.location.search);
      var tag=function(n){return (q.get(n)||'').replace(/[^A-Za-z0-9._-]/g,'').slice(0,40)};
      var src=tag('utm_source')||tag('promo').toLowerCase();
      window.sessionStorage.setItem(KEY,[host,src,tag('utm_medium'),tag('utm_campaign')].join('|'));
    }catch(e){}
  })();

  document.querySelectorAll('[role="tablist"]:not(.hm-tabs)').forEach(function(list){
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
  var promoState={code:'',plans:null,friend:false};
  var moneyText=function(n){
    var en=String(document.documentElement.getAttribute('lang')||'').slice(0,2)==='en';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,en?',':'\u00a0')+'\u00a0\u20bd';
  };
  var codeCut=function(list,amount){
    var n=Math.round(100*(1-Number(amount)/Number(list)));
    return Number(list)>0&&n>0?n:0;
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
  function setPromo(code,plans,friend){
    promoState.code=code;
    promoState.plans=plans;
    promoState.friend=Boolean(code&&plans&&friend);
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
    try{var wantTerm=new URLSearchParams(window.location.search).get('term');var t0=terms.filter(function(o){return o.getAttribute('data-term')===wantTerm})[0];if(t0)terms.forEach(function(o){o.setAttribute('aria-pressed',o===t0?'true':'false')})}catch(err){}
    var label=k.querySelector('[data-k-label]'),days=k.querySelector('[data-k-days]');
    var old=k.querySelector('.k-old'),now=k.querySelector('.k-now'),tag=k.querySelector('.k-tag');
    var tg=k.querySelector('.tgbuy');
    var perTpl=k.getAttribute('data-per')||'';
    var priceOf=function(term){var p=promoState.plans&&promoState.plans[term];return p&&p.amount?p:null};
    var usdText=function(c){c=Math.round(Number(c)||0);return Math.floor(c/100)+'.'+('0'+(c%100)).slice(-2)+' $'};
    var usdOf=function(one,p){var u=Number(one.getAttribute('data-usd'))||0;return p&&p.amount!==p.list?Math.max(1,Math.round(u*p.amount/p.list)):u};
    var taxLine=k.querySelector('.k-tax');
    var swap=function(one,world){
      var price=one.querySelector('.t-price'),sub=one.querySelector('small'),cheap=one.querySelector('.t-cheap');
      if(price&&one.hasAttribute('data-usd-price'))price.textContent=one.getAttribute(world?'data-usd-price':'data-rub-price');
      if(sub&&one.hasAttribute('data-usd-sub'))sub.textContent=one.getAttribute(world?'data-usd-sub':'data-sub');
      if(cheap&&one.hasAttribute('data-usd-cheap'))cheap.textContent=one.getAttribute(world?'data-usd-cheap':'data-rub-cheap');
    };
    kassaRender=function(){
      var on=null;
      var world=document.body.getAttribute('data-way')==='world';
      [].slice.call(document.querySelectorAll('[data-scanpick] [data-scan]')).forEach(function(one){swap(one,world)});
      if(taxLine)taxLine.hidden=!world;
      terms.forEach(function(one){
        if(one.getAttribute('aria-pressed')==='true')on=one;
        var p=priceOf(one.getAttribute('data-term'));
        var was=one.querySelector('.t-old'),is=one.querySelector('.t-price');
        one.classList.toggle('is-promo',!!p);
        if(was){was.textContent=p?(world?one.getAttribute('data-usd-list'):moneyText(p.list)):'';was.hidden=!p}
        if(is)is.textContent=world?usdText(usdOf(one,p)):p?moneyText(p.amount):one.getAttribute('data-list');
        var sub=one.querySelector('small'),months=Number(one.getAttribute('data-months'))||0;
        if(sub&&world)sub.textContent=p&&months>1&&perTpl?perTpl.replace('{price}',usdText(Math.round(usdOf(one,p)/months))):one.getAttribute('data-usd-sub');
        else if(sub)sub.textContent=p&&months>1&&perTpl?perTpl.replace('{price}',moneyText(Math.round(p.amount/months))):one.getAttribute('data-sub');
        var cut=one.querySelector('.t-save'),save=one.querySelector('.t-cheap'),pct=p?codeCut(p.list,p.amount):0;
        if(cut){cut.textContent=pct?'\u2212'+pct+'\u00a0%':'';cut.hidden=!pct}
        if(save)save.hidden=!!p;
        if(save&&one.hasAttribute('data-usd-cheap'))save.textContent=one.getAttribute(world?'data-usd-cheap':'data-rub-cheap');
      });
      if(!on)return;
      var p=priceOf(on.getAttribute('data-term'));
      if(label)label.textContent=on.getAttribute('data-label');
      if(days)days.textContent=on.getAttribute('data-days');
      k.classList.toggle('is-promo',!!p);
      var sp=Number(document.body.getAttribute('data-scan-price'))||0;
      var own=p?p.amount:Number(on.getAttribute('data-amount'));
      document.body.setAttribute('data-line-rub',String(own));
      document.body.setAttribute('data-line-usd',String(usdOf(on,p)));
      if(world){
        var su=sp>0?Number(document.body.getAttribute('data-scan-usd'))||0:0;
        if(old){old.textContent=p?usdText((Number(on.getAttribute('data-usd'))||0)+su):'';old.hidden=!p}
        if(now)now.textContent=usdText(usdOf(on,p)+su);
      }else{
        if(old){old.textContent=p?moneyText(p.list+sp):'';old.hidden=!p}
        if(now)now.textContent=sp>0&&own>=0?moneyText(own+sp):p?moneyText(p.amount):on.getAttribute('data-list');
      }
      var rubSum=sp>0&&own>=0?moneyText(own+sp):p?moneyText(p.amount):on.getAttribute('data-list');
      var usdSum=usdText(usdOf(on,p)+(sp>0?Number(document.body.getAttribute('data-scan-usd'))||0:0));
      [].slice.call(document.querySelectorAll('[data-way-sum]')).forEach(function(n){n.textContent=n.getAttribute('data-way-sum')==='usd'?usdSum:rubSum});
      var scanLine=k.querySelector('.k-scanline'),scanText=k.querySelector('[data-k-scan]'),scanPromo=k.querySelector('.k-scan-promo');
      if(scanLine){scanLine.hidden=!(sp>0);if(scanText)scanText.textContent=document.body.getAttribute('data-scan-label')||''}
      if(scanPromo)scanPromo.hidden=!(sp>0&&p);
      if(tag){tag.textContent=p?k.getAttribute(promoState.friend?'data-tag-friend':'data-tag')+' '+String(promoState.code).toUpperCase():'';tag.hidden=!p}
      var msg=on.getAttribute('data-msg');
      if(tg&&msg){tg.setAttribute('data-msg',msg);tg.href=tgText(tg,promoState.code||promoCode)}
    };
    terms.forEach(function(one){one.addEventListener('click',function(){
      terms.forEach(function(other){other.setAttribute('aria-pressed',other===one?'true':'false')});
      kassaRender();
    })});
    document.addEventListener('eshario-scan',function(){kassaRender()});
    document.addEventListener('eshario-price-step',function(){kassaRender()});
    kassaRender();
  })();
  var buyForm=document.getElementById('promo');
  var buyHint=document.getElementById('promo-hint');
  var asking=0;
  var promoRoad=null;
  function leftText(left){
    var show=Number(buyHint.getAttribute('data-left-show'))||0;
    if(!left||!(left.n<=show))return '';
    var form='many';
    try{form=new Intl.PluralRules(document.documentElement.getAttribute('lang')||'ru').select(left.n)}catch(e){}
    var tpl=buyHint.getAttribute('data-left-'+form)||buyHint.getAttribute('data-left-many')||buyHint.getAttribute('data-left-other')||'';
    return tpl.replace('{n}',left.n);
  }
  function hint(key,code,left){
    if(!buyHint)return;
    var text=String(buyHint.getAttribute('data-'+key)||'').replace('{code}',String(code||'').toUpperCase());
    var more=leftText(left);
    if(more)text+=' '+more;
    buyHint.textContent=text;
  }
  function applyBuy(v){
    var code=String(v||'').trim().toLowerCase().slice(0,32);
    var mine=asking+=1;
    if(!code){setPromo('',null);syncTg('');writeStore('');hint('idle');return}
    var api=buyForm&&buyForm.getAttribute('data-api');
    if(!api||!window.fetch){setPromo('',null);hint('fail');return}
    hint('wait');
    promoRoad=promoRoad||apiRoad(api);
    promoRoad.ask('/v1/price?promo='+encodeURIComponent(code),{credentials:'omit'}).then(function(r){
      return r.json().then(function(b){return {status:r.status,body:b}},function(){return {status:r.status,body:{}}});
    }).then(function(res){
      if(mine!==asking)return;
      var b=res.body||{};
      if(res.status===200&&b.ok&&b.plans){
        var plans=b.plans;
        var every=Object.keys(plans).every(function(k){return plans[k]});
        setPromo(b.promo||code,plans,b.friend===true);
        syncTg(b.promo||code);
        writeStore(b.promo||code);
        var left=typeof b.remaining==='number'?{n:b.remaining}:null;
        hint(b.friend===true?'friend':every?'done':'part',b.promo||code,left);
      }else if(res.status===409&&b.reason==='partner-ended'){
        setPromo('',null);
        writeStore('');
        hint('ended');
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
  document.addEventListener('eshario-price-server',function(e){
    var d=e&&e.detail||{};
    if(typeof d.now==='number')priceStep(d.now>=STEP_AT);
    if(d.promo&&d.plans)setPromo(d.promo,d.plans,d.friend===true);
    else if(promoState.code)setPromo('',null);
    else if(kassaRender)kassaRender();
  });
  if(buyForm){
    buyForm.addEventListener('submit',function(e){e.preventDefault();applyBuy(buyForm.code.value)});
    if(promoCode){
      buyForm.code.value=String(promoCode).toUpperCase();
      applyBuy(promoCode);
    }
  }

  (function(){
    var still=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var box=document.getElementById('hm-cmp');
    if(box){
      var bare=box.querySelector('.hm-bare'),wth=box.querySelector('.hm-with'),knob=box.querySelector('.hm-knob'),said=document.getElementById('hm-new');
      var pos=50,raf=0,drag=false;
      var setPos=function(v){pos=Math.max(3,Math.min(97,v));box.style.setProperty('--pos',pos+'%');knob.setAttribute('aria-valuenow',String(Math.round(pos)))};
      var glide=function(to,ms,done){
        cancelAnimationFrame(raf);
        if(still){setPos(to);if(done)done();return}
        var start=pos,t0=performance.now();
        var step=function(t){var k=Math.min(1,(t-t0)/ms);k=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;setPos(start+(to-start)*k);if(k<1)raf=requestAnimationFrame(step);else if(done)done()};
        raf=requestAnimationFrame(step);
      };
      var at=function(e){var r=box.getBoundingClientRect();return (e.clientX-r.left)/r.width*100};
      box.addEventListener('pointerdown',function(e){drag=true;cancelAnimationFrame(raf);try{box.setPointerCapture(e.pointerId)}catch(x){}setPos(at(e))});
      box.addEventListener('pointermove',function(e){if(drag)setPos(at(e))});
      box.addEventListener('pointerup',function(){drag=false});
      box.addEventListener('pointercancel',function(){drag=false});
      knob.addEventListener('keydown',function(e){
        var k=e.key,to=null;
        if(k==='ArrowLeft'||k==='ArrowDown')to=pos-4;
        if(k==='ArrowRight'||k==='ArrowUp')to=pos+4;
        if(k==='PageDown')to=pos-20;
        if(k==='PageUp')to=pos+20;
        if(k==='Home')to=0;
        if(k==='End')to=100;
        if(to!==null){cancelAnimationFrame(raf);setPos(to);e.preventDefault()}
      });
      var tabs=[].slice.call(document.querySelectorAll('.hm-tabs [role="tab"]'));
      var pick=function(tab,focus){
        tabs.forEach(function(one){var on=one===tab;one.setAttribute('aria-selected',on?'true':'false');one.setAttribute('tabindex',on?'0':'-1')});
        box.setAttribute('aria-labelledby',tab.id);
        bare.src=tab.getAttribute('data-bare');bare.alt=tab.getAttribute('data-alt-bare');
        wth.src=tab.getAttribute('data-with');wth.alt=tab.getAttribute('data-alt-with');
        if(said)said.textContent=tab.getAttribute('data-new');
        if(focus)tab.focus();
        glide(28,380,function(){glide(50,420)});
      };
      tabs.forEach(function(tab,i){
        tab.addEventListener('click',function(){pick(tab,false)});
        tab.addEventListener('keydown',function(e){
          var n=null;
          if(e.key==='ArrowRight')n=(i+1)%tabs.length;
          if(e.key==='ArrowLeft')n=(i-1+tabs.length)%tabs.length;
          if(e.key==='Home')n=0;
          if(e.key==='End')n=tabs.length-1;
          if(n!==null){pick(tabs[n],true);e.preventDefault()}
        });
      });
      setPos(50);
      if(!still&&'IntersectionObserver' in window){
        var hinted=false;
        var io=new IntersectionObserver(function(rows){rows.forEach(function(row){
          if(row.isIntersecting&&!hinted&&!drag){hinted=true;io.disconnect();setTimeout(function(){if(!drag)glide(30,650,function(){glide(68,900,function(){glide(50,650)})})},350)}
        })},{threshold:.5});
        io.observe(box);
      }
    }
    var group=document.querySelector('.hm-terms');
    if(group){
      var opts=[].slice.call(group.querySelectorAll('[role="radio"]')),buyBtn=document.getElementById('hm-buy-btn');
      var choose=function(one,focus){
        opts.forEach(function(o){var on=o===one;o.setAttribute('aria-checked',on?'true':'false');o.setAttribute('tabindex',on?'0':'-1')});
        if(buyBtn){buyBtn.textContent=one.getAttribute('data-buy');buyBtn.setAttribute('href',String(buyBtn.getAttribute('href')||'').split('?')[0]+'?term='+one.getAttribute('data-term'))}
        if(focus)one.focus();
      };
      if(typeof document.addEventListener==='function')document.addEventListener('eshario-price-step',function(){var on=opts.filter(function(o){return o.getAttribute('aria-checked')==='true'})[0];if(on&&buyBtn)buyBtn.textContent=on.getAttribute('data-buy')});
      opts.forEach(function(one,i){
        one.addEventListener('click',function(){choose(one,false)});
        one.addEventListener('keydown',function(e){
          var n=null;
          if(e.key==='ArrowDown'||e.key==='ArrowRight')n=(i+1)%opts.length;
          if(e.key==='ArrowUp'||e.key==='ArrowLeft')n=(i-1+opts.length)%opts.length;
          if(n!==null){choose(opts[n],true);e.preventDefault()}
        });
      });
    }
    var scene=document.getElementById('hm-scene');
    if(scene){
      var hero=scene.parentNode;
      var fit=function(){var w=window.innerWidth;hero.style.setProperty('--k',w>760?String(Math.max(.74,Math.min(1.16,w/1440))):'1')};
      fit();window.addEventListener('resize',fit);
      if(!still&&window.matchMedia&&window.matchMedia('(pointer:fine)').matches){
        window.addEventListener('pointermove',function(e){
          var x=e.clientX/window.innerWidth-.5,y=e.clientY/window.innerHeight-.5;
          scene.style.setProperty('--px',(-x*10)+'px');scene.style.setProperty('--py',(-y*8)+'px');
          scene.style.setProperty('--fx',(x*16)+'px');scene.style.setProperty('--fy',(y*12)+'px');
          scene.style.setProperty('--gx',(x*26)+'px');scene.style.setProperty('--gy',(y*18)+'px');
        },{passive:true});
      }
    }
  })();
  (function(){
    var wait=[].slice.call(document.querySelectorAll('[data-reveal],.isteps>.istep'));
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
  (function(){
    if(!Element.prototype.animate||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
    [].slice.call(document.querySelectorAll('details.k-more')).forEach(function(d){
      var s=d.querySelector('summary');
      if(!s)return;
      var run=null;
      s.addEventListener('click',function(e){
        e.preventDefault();
        var open=!(d.open&&!d.hasAttribute('data-closing'));
        var from=d.offsetHeight;
        if(run){run.cancel();run=null}
        d.open=false;
        var shut=d.offsetHeight;
        d.open=true;
        var full=d.offsetHeight;
        if(open)d.removeAttribute('data-closing');else d.setAttribute('data-closing','');
        d.style.overflow='hidden';
        var root=document.documentElement;
        root.style.overflowAnchor='none';
        if(!open){var top=s.getBoundingClientRect().top;if(top<0)window.scrollBy({top:top-96,behavior:'smooth'})}
        run=d.animate([{height:from+'px'},{height:(open?full:shut)+'px'}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
        run.onfinish=function(){run=null;d.style.overflow='';d.removeAttribute('data-closing');d.open=open;root.style.overflowAnchor=''};
      });
    });
  })();
})();
