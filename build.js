const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked, Renderer } = require('marked');
const hljs = require('highlight.js');
const { glob } = require('glob');

// --- 1. CONFIGURAÇÃO DE CAMINHOS ---
const CONTENT_DIR = path.join(__dirname, 'content');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_FILE = path.join(__dirname, 'templates', 'page.html');
const STATIC_DIR = path.join(__dirname, 'static');
const DIST_STATIC_DIR = path.join(DIST_DIR, 'static');

// --- 2. CONFIGURAÇÃO DO RENDERIZADOR ---
const renderer = new Renderer();
renderer.code = function({ text, lang }) {
    let highlighted;
    try {
        if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(text, { language: lang }).value;
        } else {
            highlighted = hljs.highlightAuto(text).value;
        }
    } catch (e) { highlighted = text; }
    return `<pre><code class="hljs language-${lang || 'text'}">${highlighted}</code></pre>`;
};
marked.use({ renderer, gfm: true, breaks: true });

// --- 3. FUNÇÕES DE SUPORTE ---

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name), d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

function buildNavTree(dir, baseUrl = '') {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const metaPath = path.join(fullPath, '_meta.json');
            const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : {};
            items.push({
                type: 'section',
                name: entry.name,
                label: meta.label || entry.name,
                order: meta.order || 99,
                url: `${baseUrl}/${entry.name}`,
                children: buildNavTree(fullPath, `${baseUrl}/${entry.name}`)
            });
        } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
            const { data } = matter(fs.readFileSync(fullPath, 'utf-8'));
            const slug = entry.name.replace('.md', '');
            items.push({
                type: 'page',
                label: data.title || slug,
                order: data.order || 99,
                url: `${baseUrl}/${slug}.html`
            });
        }
    }
    return items.sort((a, b) => a.order - b.order);
}

function renderNav(items, cur = '', depth = 0) {
    if (!items.length) return '';
    let html = `<ul class="nav-list ${depth > 0 ? 'nav-sub' : ''}">`;
    for (const item of items) {
        if (item.type === 'section') {
            const active = JSON.stringify(item.children).includes(`"url":"${cur}"`);
            html += `<li class="nav-section-item">
                <button class="nav-section-toggle ${active ? 'open' : ''}" data-target="nav-${item.name}">
                    <span>${item.label}</span>
                    <i data-lucide="chevron-right" class="nav-chevron"></i>
                </button>
                <div id="nav-${item.name}" class="nav-section-children ${active ? 'open' : ''}">
                    ${renderNav(item.children, cur, depth + 1)}
                </div>
            </li>`;
        } else {
            html += `<li><a href="${item.url}" class="nav-item ${item.url === cur ? 'active' : ''}"><span>${item.label}</span></a></li>`;
        }
    }
    return html + '</ul>';
}

// --- 4. PROCESSO DE BUILD ---

async function build() {
    console.log('🧹 Limpando pasta de distribuição...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });

    console.log('📂 Copiando Design System (CSS/JS)...');
    copyDir(STATIC_DIR, DIST_STATIC_DIR);

    const template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    const searchIndex = [];
    const mdFiles = await glob('**/*.md', { cwd: CONTENT_DIR });
    
    const navTree = buildNavTree(CONTENT_DIR);
    const nav = [
        { type: 'page', label: 'Início', url: '/index.html' },
        ...navTree
    ];

    for (const file of mdFiles) {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
        const { data: fm, content } = matter(raw);
        const slug = file.replace('.md', '');
        const outPath = file === 'index.md' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, slug + '.html');
        
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        const depth = file.split('/').length - 1;
        const relRoot = depth > 0 ? '../'.repeat(depth) : './';
        const pageUrl = (file === 'index.md' ? '/index.html' : '/' + slug + '.html');

        const bodyHtml = marked.parse(content);
        
        // --- LÓGICA DO BREADCRUMB ---
        const parts = slug.split('/').filter(p => p !== 'index' && p !== '');
        let breadcrumb = `<a href="${relRoot}index.html" class="breadcrumb-link">Início</a>`;
        if (parts.length > 0) {
            breadcrumb += ` <i data-lucide="chevron-right" class="breadcrumb-sep"></i> `;
            breadcrumb += parts.map((p, i) => {
                const isLast = i === parts.length - 1;
                return isLast ? `<span class="breadcrumb-current">${fm.title || p}</span>` : `<span class="breadcrumb-link">${p}</span>`;
            }).join(' <i data-lucide="chevron-right" class="breadcrumb-sep"></i> ');
        }

        // --- LÓGICA DO TOC ---
        const tocMatches = [...bodyHtml.matchAll(/<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/g)];
        const tocHtml = tocMatches.length > 1
            ? '<ul>' + tocMatches.map(([, l, id, t]) => `<li class="toc-item toc-h${l}"><a href="#${id}" class="toc-link">${t.replace(/<[^>]+>/g, '')}</a></li>`).join('') + '</ul>'
            : '';

        searchIndex.push({ title: fm.title || slug, url: relRoot + (file === 'index.md' ? 'index.html' : slug + '.html') });

        const finalPage = template
            .replace(/\{\{ROOT\}\}/g, relRoot)
            .replace(/\{\{TITLE\}\}/g, fm.title || 'Governança de IA')
            .replace(/\{\{DESCRIPTION\}\}/g, fm.description || '')
            .replace(/\{\{TAGS\}\}/g, fm.tags ? fm.tags.map(t => `<span class="tag">${t}</span>`).join('') : '')
            .replace(/\{\{NAV\}\}/g, renderNav(nav, pageUrl))
            .replace(/\{\{BREADCRUMB\}\}/g, breadcrumb)
            .replace(/\{\{CONTENT\}\}/g, bodyHtml)
            .replace(/\{\{TOC\}\}/g, tocHtml);

        fs.writeFileSync(outPath, finalPage);
        console.log(`✓ Gerado: ${file}`);
    }

    fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
    console.log(`\n✅ Build finalizado com sucesso!`);
}

build().catch(err => {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
});
