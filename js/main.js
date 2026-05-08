/* CSC DOC MAIN.JS - JavaScript Principal da Documentação */
(function() {
    'use strict';

    // Seleção de elementos do DOM
    const html = document.documentElement,
        sidebar = document.getElementById('sidebar'),
        sidebarOverlay = document.getElementById('sidebarOverlay'),
        collapseBtn = document.getElementById('sidebarCollapseBtn'),
        hamburgerBtn = document.getElementById('hamburgerBtn'),
        layoutMain = document.querySelector('.layout-main'),
        themeToggle = document.getElementById('themeToggle'),
        searchTrigger = document.getElementById('searchTrigger'),
        mobileSearchBtn = document.getElementById('mobileSearchBtn'),
        searchModal = document.getElementById('searchModal'),
        searchBackdrop = document.getElementById('searchBackdrop'),
        searchInput = document.getElementById('searchInput'),
        searchResults = document.getElementById('searchResults'),
        scrollProgress = document.getElementById('scrollProgress'),
        articleTags = document.getElementById('articleTags');

    const isMobile = () => window.innerWidth <= 768;
    
    // Estado da Sidebar (Recolhida ou não) salvo no navegador
    let sidebarCollapsed = localStorage.getItem('csc-sidebar-collapsed') === 'true';

    function applySidebarState() {
        if (isMobile()) {
            sidebar.classList.remove('collapsed');
            layoutMain && layoutMain.classList.remove('sidebar-collapsed');
            return;
        }
        sidebar.classList.toggle('collapsed', sidebarCollapsed);
        layoutMain && layoutMain.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }

    // Evento de clique para recolher/expandir a barra lateral
    collapseBtn && collapseBtn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        localStorage.setItem('csc-sidebar-collapsed', sidebarCollapsed);
        applySidebarState();
    });

    // Funções para abrir/fechar o menu no celular
    function openMobileSidebar() {
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('visible');
        sidebarOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('visible');
        setTimeout(() => { sidebarOverlay.style.display = ''; }, 250);
        document.body.style.overflow = '';
    }

    hamburgerBtn && hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
    });

    sidebarOverlay && sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Gerenciamento dos Acordeões (menus expansíveis) da navegação
    document.querySelectorAll('.nav-section-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const children = document.getElementById(targetId);
            if (!children) return;
            const isOpen = children.classList.contains('open');
            btn.classList.toggle('open', !isOpen);
            children.classList.toggle('open', !isOpen);
        });
    });

    // Criação do botão "Voltar ao Topo"
    const backTop = document.createElement('button');
    backTop.className = 'back-to-top';
    backTop.setAttribute('aria-label', 'Voltar ao topo');
    backTop.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
    document.body.appendChild(backTop);
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    applySidebarState();
    window.addEventListener('resize', applySidebarState);

    // Sistema de Tema (Claro/Escuro)
    function getInitialTheme() {
        const s = localStorage.getItem('csc-theme');
        if (s) return s;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(t) {
        html.setAttribute('data-theme', t);
        localStorage.setItem('csc-theme', t);
    }

    setTheme(getInitialTheme());
    themeToggle && themeToggle.addEventListener('click', () => {
        setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    // Atualização da Barra de Progresso e Visibilidade do Botão Voltar ao Topo
    function updateScroll() {
        const s = window.scrollY || document.documentElement.scrollTop;
        const t = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollProgress) scrollProgress.style.width = `${Math.min(t > 0 ? s / t * 100 : 0, 100)}%`;
        backTop.classList.toggle('visible', s > 400);
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // Sumário Automático (Highlight de links enquanto rola a página)
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length > 0) {
        const headings = [...document.querySelectorAll('.article-body h2, .article-body h3')];
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    tocLinks.forEach(l => l.classList.remove('active'));
                    const l = document.querySelector(`.toc-link[href="#${e.target.id}"]`);
                    l && l.classList.add('active');
                }
            });
        }, { rootMargin: '-60px 0px -70% 0px' });
        headings.forEach(h => obs.observe(h));

        tocLinks.forEach(l => {
            l.addEventListener('click', e => {
                e.preventDefault();
                const t = document.querySelector(l.getAttribute('href'));
                t && t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // Botão de Copiar Código nos blocos <pre>
    document.querySelectorAll('.article-body pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copiar código');
        btn.textContent = 'Copiar';
        pre.appendChild(btn);
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.textContent || '');
                btn.textContent = 'Copiado!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Copiar';
                    btn.classList.remove('copied');
                }, 2000);
            } catch (_) {}
        });
    });

    // Processamento automático de tags (separa por vírgula e cria spans)
    if (articleTags) {
        const raw = articleTags.textContent.trim();
        if (raw) {
            const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
            articleTags.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
        } else {
            articleTags.innerHTML = '';
        }
    }

    // --- SISTEMA DE BUSCA ---
    let searchData = [], searchLoaded = false, searchFocusIdx = -1;

    async function loadSearchIndex() {
        if (searchLoaded) return;
        try {
            const base = document.querySelector('link[rel="stylesheet"]').href.split('/css/')[0];
            const res = await fetch(`${base}/search-index.json`);
            searchData = await res.json();
            searchLoaded = true;
        } catch (_) {}
    }

    function openSearch() {
        searchModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => searchInput.focus(), 50);
        loadSearchIndex();
    }

    function closeSearch() {
        searchModal.hidden = true;
        document.body.style.overflow = '';
        searchInput.value = '';
        searchResults.innerHTML = '<p class="search-hint">Digite para buscar...</p>';
        searchFocusIdx = -1;
    }

    searchTrigger && searchTrigger.addEventListener('click', openSearch);
    mobileSearchBtn && mobileSearchBtn.addEventListener('click', openSearch);
    searchBackdrop && searchBackdrop.addEventListener('click', closeSearch);

    // Atalho de teclado (Ctrl + K ou Cmd + K) para abrir busca
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchModal.hidden ? openSearch() : closeSearch();
        }
        if (e.key === 'Escape' && !searchModal.hidden) closeSearch();
    });

    // Função de busca simples (fuzzy search parcial)
    function fuzzy(s, q) {
        const a = s.toLowerCase(), b = q.toLowerCase();
        let i = 0, j = 0, c = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) { c++; j++; }
            i++;
        }
        return j === b.length ? c : 0;
    }

    let deb;
    searchInput && searchInput.addEventListener('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => {
            const q = searchInput.value.trim();
            if (!q) {
                searchResults.innerHTML = '<p class="search-hint">Digite para buscar...</p>';
                return;
            }
            if (!searchLoaded) {
                searchResults.innerHTML = '<p class="search-hint">Carregando...</p>';
                return;
            }
            const r = searchData.map(item => ({
                ...item,
                score: fuzzy(item.title, q) * 3 + fuzzy(item.description, q)
            })).filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

            if (!r.length) {
                searchResults.innerHTML = `<p class="search-no-results">Nenhum resultado para "<strong>${q}</strong>"</p>`;
                return;
            }
            searchResults.innerHTML = r.map(i => `
                <a href="${i.url}" class="search-result-item">
                    <div class="search-result-icon">📄</div>
                    <div class="search-result-content">
                        <div class="search-result-title">${i.title}</div>
                        ${i.description ? `<div class="search-result-desc">${i.description}</div>` : ''}
                        <div class="search-result-path">${i.path}</div>
                    </div>
                </a>`).join('');
        }, 180);
    });

    console.log('🚀 CSC Docs carregada.');
})();
