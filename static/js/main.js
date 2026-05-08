(function () {
  'use strict';
  var html=document.documentElement,sidebar=document.getElementById('sidebar'),overlay=document.getElementById('sidebarOverlay'),collapseBtn=document.getElementById('sidebarCollapseBtn'),hamburger=document.getElementById('hamburgerBtn'),layoutMain=document.querySelector('.layout-main'),themeToggle=document.getElementById('themeToggle'),searchTrig=document.getElementById('searchTrigger'),mobileSearch=document.getElementById('mobileSearchBtn'),searchModal=document.getElementById('searchModal'),searchBack=document.getElementById('searchBackdrop'),searchInput=document.getElementById('searchInput'),searchRes=document.getElementById('searchResults'),scrollBar=document.getElementById('scrollProgress'),tagsEl=document.getElementById('articleTags');

  /* THEME — light por padrão */
  function getTheme(){return localStorage.getItem('csc-theme')||'light';}
  function setTheme(t){html.setAttribute('data-theme',t);localStorage.setItem('csc-theme',t);}
  setTheme(getTheme());
  themeToggle&&themeToggle.addEventListener('click',function(){setTheme(html.getAttribute('data-theme')==='dark'?'light':'dark');});

  /* SIDEBAR COLLAPSE */
  var collapsed=localStorage.getItem('csc-sidebar-collapsed')==='true';
  function applyCollapse(){
    if(window.innerWidth<=768){sidebar&&sidebar.classList.remove('collapsed');layoutMain&&layoutMain.classList.remove('sidebar-collapsed');return;}
    sidebar&&sidebar.classList.toggle('collapsed',collapsed);
    layoutMain&&layoutMain.classList.toggle('sidebar-collapsed',collapsed);
  }
  collapseBtn&&collapseBtn.addEventListener('click',function(){collapsed=!collapsed;localStorage.setItem('csc-sidebar-collapsed',collapsed);applyCollapse();});
  applyCollapse();
  window.addEventListener('resize',applyCollapse);

  /* MOBILE DRAWER */
  function openDrawer(){sidebar&&sidebar.classList.add('mobile-open');overlay&&overlay.classList.add('visible');if(overlay)overlay.style.display='block';document.body.style.overflow='hidden';}
  function closeDrawer(){sidebar&&sidebar.classList.remove('mobile-open');overlay&&overlay.classList.remove('visible');setTimeout(function(){if(overlay)overlay.style.display='';},260);document.body.style.overflow='';}
  hamburger&&hamburger.addEventListener('click',function(){sidebar&&sidebar.classList.contains('mobile-open')?closeDrawer():openDrawer();});
  overlay&&overlay.addEventListener('click',closeDrawer);

  /* NAV ACCORDION */
  document.querySelectorAll('.nav-section-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){var id=btn.getAttribute('data-target'),ch=document.getElementById(id);if(!ch)return;var open=ch.classList.contains('open');btn.classList.toggle('open',!open);ch.classList.toggle('open',!open);});
  });

  /* SCROLL PROGRESS + BACK TO TOP */
  var backTop=document.createElement('button');
  backTop.className='back-to-top';backTop.setAttribute('aria-label','Voltar ao topo');
  backTop.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
  document.body.appendChild(backTop);
  backTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
  function onScroll(){var s=window.scrollY||0,t=document.documentElement.scrollHeight-window.innerHeight;if(scrollBar)scrollBar.style.width=Math.min(t>0?s/t*100:0,100)+'%';backTop.classList.toggle('visible',s>400);}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* TOC ACTIVE */
  var tocLinks=document.querySelectorAll('.toc-link');
  if(tocLinks.length){
    var heads=[...document.querySelectorAll('.article-body h2,.article-body h3')];
    var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){tocLinks.forEach(function(l){l.classList.remove('active');});var l=document.querySelector('.toc-link[href="#'+e.target.id+'"]');l&&l.classList.add('active');}});},{rootMargin:'-60px 0px -70% 0px'});
    heads.forEach(function(h){obs.observe(h);});
    tocLinks.forEach(function(l){l.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(l.getAttribute('href'));t&&t.scrollIntoView({behavior:'smooth',block:'start'});});});
  }

  /* COPY CODE */
  document.querySelectorAll('.article-body pre').forEach(function(pre){
    var code=pre.querySelector('code');if(!code)return;
    var btn=document.createElement('button');btn.className='copy-btn';btn.textContent='Copiar';pre.appendChild(btn);
    btn.addEventListener('click',async function(){try{await navigator.clipboard.writeText(code.textContent||'');btn.textContent='Copiado!';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copiar';btn.classList.remove('copied');},2000);}catch(_){}});
  });

  /* TAGS RENDER */
  if(tagsEl){var raw=tagsEl.textContent.trim();if(raw){tagsEl.innerHTML=raw.split(',').map(function(t){return'<span class="tag">'+t.trim()+'</span>';}).join('');}}

  /* SEARCH */
  var searchData=[],searchLoaded=false,focusIdx=-1;
  async function loadIdx(){if(searchLoaded)return;try{var r=await fetch('./search-index.json');searchData=await r.json();searchLoaded=true;}catch(_){}}
  function openSearch(){searchModal.hidden=false;document.body.style.overflow='hidden';setTimeout(function(){searchInput&&searchInput.focus();},50);loadIdx();}
  function closeSearch(){searchModal.hidden=true;document.body.style.overflow='';if(searchInput)searchInput.value='';if(searchRes)searchRes.innerHTML='<p class="search-hint">Digite para buscar...</p>';focusIdx=-1;}
  searchTrig&&searchTrig.addEventListener('click',openSearch);
  mobileSearch&&mobileSearch.addEventListener('click',openSearch);
  searchBack&&searchBack.addEventListener('click',closeSearch);
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();searchModal.hidden?openSearch():closeSearch();}if(e.key==='Escape'&&!searchModal.hidden)closeSearch();});
  function fuzzy(s,q){var a=s.toLowerCase(),b=q.toLowerCase(),i=0,j=0,c=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){c++;j++;}i++;}return j===b.length?c:0;}
  var deb;searchInput&&searchInput.addEventListener('input',function(){clearTimeout(deb);deb=setTimeout(function(){var q=searchInput.value.trim();if(!q){searchRes.innerHTML='<p class="search-hint">Digite para buscar...</p>';return;}if(!searchLoaded){searchRes.innerHTML='<p class="search-hint">Carregando...</p>';return;}var r=searchData.map(function(i){return{...i,score:fuzzy(i.title,q)*3+fuzzy(i.description||'',q)};}).filter(function(i){return i.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,8);if(!r.length){searchRes.innerHTML='<p class="search-no-results">Nenhum resultado para "'+q+'"</p>';return;}searchRes.innerHTML=r.map(function(i){return'<a href="'+i.url+'" class="search-result-item"><div class="search-result-icon">>></div><div><div class="search-result-title">'+i.title+'</div>'+(i.description?'<div class="search-result-desc">'+i.description+'</div>':'')+'<div class="search-result-path">'+i.path+'</div></div></a>';}).join('');},180);});
})();
