/* CSC DOC MAIN.JS - JavaScript Principal da Documentação */
(function() {
    'use strict';

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
    let sidebarCollapsed = localStorage.getItem('csc-sidebar-collapsed') === 'true';

    function applySidebarState() {
        if (isMobile()) {
            sidebar?.classList.remove('collapsed');
            layoutMain?.classList.remove('sidebar-collapsed');
            return;
        }
        sidebar?.classList.toggle('collapsed', sidebarCollapsed);
        layoutMain?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }

    collapseBtn?.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        localStorage.setItem('csc-sidebar-collapsed', sidebarCollapsed);
        applySidebarState();
    });

    function openMobileSidebar() {
        sidebar?.classList.add('mobile-open');
        sidebarOverlay?.classList.add('visible');
        if (sidebarOverlay) sidebarOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        sidebar?.classList.remove('mobile-open');
        sidebarOverlay?.classList.remove('visible');
        setTimeout(() => { if (sidebarOverlay) sidebarOverlay.style.display = ''; }, 250);
        document.body.style.overflow = '';
    }

    hamburgerBtn?.addEventListener('click', () => {
        sidebar?.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
    });

    sidebarOverlay?.addEventListener('click', closeMobileSidebar);

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

    const backTop = document.createElement('button');
    backTop.className = 'back-to-top';
    backTop.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
    document.body.appendChild(backTop);
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    applySidebarState();
    window.addEventListener('resize', applySidebarState);

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
    themeToggle?.addEventListener('click', () => {
        setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    function updateScroll() {
        const s = window.scrollY || document.documentElement.scrollTop;
        const t = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollProgress) scrollProgress.style.width = `${Math.min(t > 0 ? s / t * 100 : 0, 100)}%`;
        backTop.classList.toggle('visible', s > 400);
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // Sistema de Sumário (TOC)
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length > 0) {
        const headings = [...document.querySelectorAll('.article-body h2, .article-body h3')];
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    tocLinks.forEach(l => l.classList.remove('active'));
                    const link = document.querySelector(`.toc-link[href="#${e.target.id}"]`);
                    link?.classList.add('active');
                }
            });
        }, { rootMargin: '-60px 0px -70% 0px' });
        headings.forEach(h => obs.observe(h));
    }

    // Copiar código
    document.querySelectorAll('.article-body pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copiar';
        pre.appendChild(btn);
        btn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(code.textContent || '');
            btn.textContent = 'Copiado!';
            setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
        });
    });

    console.log('🚀 CSC Docs carregada.');
})();
