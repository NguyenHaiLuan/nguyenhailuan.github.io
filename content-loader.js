/* HL Portfolio Content Loader v1.0 */
/* Reads data from localStorage and injects blog + portfolio into the page */
(function () {
  var raw = localStorage.getItem('hl_cms');

  if (raw) {
    renderContent(JSON.parse(raw));
  } else {
    fetch('hl-portfolio-data.json')
      .then(response => {
        if (!response.ok) throw new Error("Chưa có file JSON");
        return response.json();
      })
      .then(data => renderContent(data))
      .catch(err => console.log("Đang dùng nội dung mặc định của HTML."));
  }

  // Chuyển toàn bộ logic cũ vào một hàm render để dùng chung
  function renderContent(D) {
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function nl2p(s){return s?s.split(/\n\n+/).map(function(p){return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';}).join(''):'';}

    /* ── INJECT BLOG ── */
    var bg=document.querySelector('.blog-grid');
    if(bg&&D.blog&&D.blog.length){
      bg.innerHTML=D.blog.map(function(b){return(
        '<div class="blog-card reveal">'+
        '<div class="blog-meta">'+
        '<span class="blog-cat" data-en>'+esc(b.cat.en)+'</span>'+
        '<span class="blog-cat" data-vi>'+esc(b.cat.vi)+'</span>'+
        '<span>·</span>'+
        '<span data-en>'+esc(b.readTime.en)+'</span>'+
        '<span data-vi>'+esc(b.readTime.vi)+'</span>'+
        '</div>'+
        '<div class="blog-title">'+
        '<span data-en>'+esc(b.title.en)+'</span>'+
        '<span data-vi>'+esc(b.title.vi)+'</span>'+
        '</div>'+
        '<p class="blog-excerpt" data-en-b>'+esc(b.excerpt.en)+'</p>'+
        '<p class="blog-excerpt" data-vi-b>'+esc(b.excerpt.vi)+'</p>'+
        '<a href="'+esc(b.link||'#')+'" class="blog-read">'+
        '<span data-en>Read →</span><span data-vi>Đọc →</span>'+
        '</a>'+
        '</div>'
      );}).join('');
    }

    /* ── INJECT PORTFOLIO ── */
    var pg=document.querySelector('.port-grid');
    if(pg&&D.portfolio&&D.portfolio.length){
      /* Store data globally for modal access */
      window._hlPortData=D.portfolio;
      pg.innerHTML=D.portfolio.map(function(p,i){
        var hasModal=!!(p.brief&&(p.brief.en||p.brief.vi)||p.copyVI||p.copyEN);
        return(
          '<div class="port-card reveal"'+(hasModal?' onclick="hlOpenModal(\'' + p.id + '\')"':'')+'>'+
          '<div class="port-top port-top-'+(p.color||((i%6)+1))+'">'+
          '<span class="port-type" data-en>'+esc(p.type.en)+'</span>'+
          '<span class="port-type" data-vi>'+esc(p.type.vi)+'</span>'+
          '<div class="port-title" data-en>'+esc(p.title.en)+'</div>'+
          '<div class="port-title" data-vi>'+esc(p.title.vi)+'</div>'+
          '</div>'+
          '<div class="port-bottom">'+
          '<span class="port-meta">'+esc(p.meta)+'</span>'+
          '<span class="port-arrow">'+(hasModal?'→':'')+'</span>'+
          '</div></div>'
        );
      }).join('');
    }

    /* ── DYNAMIC MODAL ── */
    window.hlOpenModal=function(id){
      var p=(window._hlPortData||[]).find(function(x){return x.id===id;});
      if(!p)return;
      var m=document.getElementById('modal');
      if(!m)return;
      function qs(sel){return m.querySelector(sel);}
      var bds=p.breakdown?p.breakdown.split('\n').filter(Boolean).map(function(line){
        var pts=line.split('||');
        var tag=pts[0]||'';var body=pts[1]||'';
        return '<li><span class="bk-tag">'+esc(tag)+'</span><span>'+esc(body)+'</span></li>';
      }).join(''):'';
      var mh=m.querySelector('.modal-head');
      if(mh){
        var mts=mh.querySelectorAll('.modal-type');
        if(mts[0])mts[0].textContent='Case Study — '+p.type.en;
        if(mts[1])mts[1].textContent='Case Study — '+p.type.vi;
        var mtls=mh.querySelectorAll('.modal-title');
        if(mtls[0])mtls[0].textContent=p.title.en;
        if(mtls[1])mtls[1].textContent=p.title.vi;
      }
      var mb=m.querySelector('.modal-body');
      if(mb){
        mb.innerHTML=
          '<div class="modal-sec">'+
          '<h4 data-en>Brief</h4><h4 data-vi>Bối cảnh</h4>'+
          '<p class="brief-text" data-en-b>'+esc(p.brief&&p.brief.en||'')+'</p>'+
          '<p class="brief-text" data-vi-b>'+esc(p.brief&&p.brief.vi||'')+'</p>'+
          '</div>'+
          (p.copyVI?'<div class="modal-sec"><h4 data-en>The copy (Vietnamese)</h4><h4 data-vi>Bài viết</h4><div class="copy-sample"><div class="copy-body">'+nl2p(p.copyVI)+'</div></div></div>':'')+(p.copyEN?'<div class="modal-sec"><h4 data-en>English version</h4><h4 data-vi>Bản tiếng Anh</h4><div class="copy-sample"><div class="copy-body">'+nl2p(p.copyEN)+'</div></div></div>':'')+
          (bds?'<div class="modal-sec"><h4>Copywriting breakdown</h4><ul class="bk-list">'+bds+'</ul></div>':'');
      }
      if(typeof openModal==='function')openModal();
      else m.classList.add('open');
      /* re-apply lang */
      var lang=document.body.className||'en';
      if(typeof setLang==='function')setLang(lang);
    };

    /* ── RE-APPLY LANG ── */
    var lang=document.body.className||'en';
    if(typeof setLang==='function')setLang(lang);

    /* ── SCROLL REVEAL ── */
    if(typeof IntersectionObserver!=='undefined'){
      var obs=new IntersectionObserver(function(entries){
        entries.forEach(function(e,i){if(e.isIntersecting){setTimeout(function(){e.target.classList.add('on');},i*75);obs.unobserve(e.target);}});
      },{threshold:0.1});
      document.querySelectorAll('.blog-grid .reveal,.port-grid .reveal').forEach(function(el){obs.observe(el);});
    }
  }catch(e){console.warn('[HL CMS]',e);}
})();