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

// --- 2. CONFIGURAÇÃO DO MARKDOWN ---
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

// Copia pastas inteiras (essencial para o CSS/JS ir para a pasta dist)
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name), d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

// Constrói o menu lateral
function buildNavTree(dir, baseUrl = '') {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const dirs = entries.filter(e => e.isDirectory()).map(e => {
        const m = path.join(dir, e.name, '_meta.json');
        const sub = fs.existsSync(m) ? JSON.parse(fs.readFileSync(m, 'utf-8')) : {};
        return { 
            type: 'section', name: e.name, label: sub.label || e.name, 
            icon: sub.icon || 'folder', order: sub.order || 99, 
            url: `${baseUrl}/${e.name}`, 
            children: buildNavTree(path.join(dir, e.name), `${baseUrl}/${e.name}`) 
        };
    });

    const files = entries.filter(e => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md').map(e => {
        const { data } = matter(fs.readFileSync(path.join(dir, e.name), 'utf-8'));
        const slug = e.name.replace('.md', '');
        return { 
            type: 'page', name: slug, label: data.title || slug, 
            icon: data.icon || 'file-text', order: data.order || 99, 
            url: `${baseUrl}/${slug}.html` 
        };
    });
    return [...dirs, ...files].sort((a, b) => a.order - b.order);
}

// Gera o HTML do menu
function renderNav(items, cur = '', depth = 0) {
    if (!items.length) return '';
    let html = `<ul class="nav-list ${depth > 0 ? 'nav-sub' : ''}">`;
    for (const item of items) {
        if (item.type === 'section') {
            const active = JSON.stringify(item.children).includes(`"url":"${cur}"`);
            html += `<li class="nav-section-item">
                <button class="nav-section-toggle ${active ? 'open' : ''}" data-target="nav-${item.name}">
                    <span>${item.label}</span>
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

// --- 4. PROCESSO PRINCIPAL (BUILD) ---

async function build() {
    console.log('🧹 Limpando pasta de distribuição...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });

    console.log('📂 Copiando Design System (CSS/JS)...');
    copyDir(STATIC_DIR, DIST_STATIC_DIR);

    const template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    const searchIndex = [];
    const mdFiles = await glob('**/*.md', { cwd: CONTENT_DIR });
    
    const nav = [
        { type: 'page', name: 'index', label: 'Início', order: 0, url: '/index.html' },
        ...buildNavTree(CONTENT_DIR)
    ];

    for (const file of mdFiles) {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
        const { data: fm, content } = matter(raw);
        const slug = file.replace('.md', '');
        const outPath = file === 'index.md' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, slug + '.html');
        
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        // Calcula profundidade para não quebrar links de CSS/JS
        const depth = file.split('/').length - 1;
        const relRoot = depth > 0 ? '../'.repeat(depth) : './';
        const pageUrl = (file === 'index.md' ? '/index.html' : '/' + slug + '.html');

        const bodyHtml = marked.parse(content);

        searchIndex.push({ title: fm.title || slug, url: relRoot + (file === 'index.md' ? 'index.html' : slug + '.html') });

        const finalPage = template
            .replace(/\{\{ROOT\}\}/g, relRoot)
            .replace(/\{\{TITLE\}\}/g, fm.title || 'Governança de IA')
            .replace(/\{\{DESCRIPTION\}\}/g, fm.description || '')
            .replace(/\{\{NAV\}\}/g, renderNav(nav, pageUrl))
            .replace(/\{\{CONTENT\}\}/g, bodyHtml);

        fs.writeFileSync(outPath, finalPage);
        console.log(`✓ Gerado: ${file}`);
    }

    fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
    console.log(`\n✅ Pronto! O Workflow agora pode levar a pasta "dist" completa.`);
}

build().catch(err => {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
});
