const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked, Renderer } = require('marked');
const hljs = require('highlight.js');
const { glob } = require('glob');

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

const CONTENT_DIR = path.join(__dirname, 'content');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_FILE = path.join(__dirname, 'templates', 'page.html');
const STATIC_DIR = path.join(__dirname, 'static');

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(STATIC_DIR, DIST_DIR);

const template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

function buildNavTree(dir, baseUrl = '') {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => {
    const m = path.join(dir, e.name, '_meta.json');
    const sub = fs.existsSync(m) ? JSON.parse(fs.readFileSync(m, 'utf-8')) : {};
    return { type: 'section', name: e.name, label: sub.label || e.name, icon: sub.icon || 'folder', order: sub.order || 99, url: `${baseUrl}/${e.name}`, children: buildNavTree(path.join(dir, e.name), `${baseUrl}/${e.name}`) };
  });
  const files = entries.filter(e => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md').map(e => {
    const { data } = matter(fs.readFileSync(path.join(dir, e.name), 'utf-8'));
    const slug = e.name.replace('.md', '');
    return { type: 'page', name: slug, label: data.title || slug, icon: data.icon || 'file-text', order: data.order || 99, url: `${baseUrl}/${slug}.html` };
  });
  return [...dirs, ...files].sort((a, b) => a.order - b.order);
}

function renderNav(items, cur = '', depth = 0) {
  if (!items.length) return '';
  let html = `<ul class="nav-list ${depth > 0 ? 'nav-sub' : ''}">`;
  for (const item of items) {
    if (item.type === 'section') {
      const active = JSON.stringify(item.children).includes(`"url":"${cur}"`);
      html += `<li class="nav-section-item"><button class="nav-section-toggle ${active ? 'open' : ''}" data-target="nav-${item.name}"><i data-lucide="${item.icon}" class="nav-icon"></i><span>${item.label}</span><i data-lucide="chevron-right" class="nav-chevron"></i></button><div id="nav-${item.name}" class="nav-section-children ${active ? 'open' : ''}">${renderNav(item.children, cur, depth + 1)}</div></li>`;
    } else {
      html += `<li><a href="${item.url}" class="nav-item ${item.url === cur ? 'active' : ''}"><i data-lucide="${item.icon}" class="nav-icon"></i><span>${item.label}</span></a></li>`;
    }
  }
  return html + '</ul>';
}

const searchIndex = [];

async function build() {
  const mdFiles = await glob('**/*.md', { cwd: CONTENT_DIR });
  const nav = [
    { type: 'page', name: 'index', label: 'Visão Geral', icon: 'home', order: 0, url: '/index.html' },
    ...buildNavTree(CONTENT_DIR)
  ];

  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { data: fm, content } = matter(raw);
    const slug = file.replace('.md', '');
    const outPath = file === 'index.md' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, slug + '.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const depth = file.split('/').length - 1;
    const relRoot = depth > 0 ? '../'.repeat(depth) : './';
    const pageUrl = '/' + slug + '.html';
    const bodyHtml = marked.parse(content);
    const parts = slug.split('/');
    const breadcrumb = parts.map((p, i) => {
      if (p === 'index') return `<a href="${relRoot}index.html" class="breadcrumb-link">Início</a><i data-lucide="chevron-right" class="breadcrumb-sep"></i>`;
      if (i === parts.length - 1) return `<span class="breadcrumb-current">${fm.title || p}</span>`;
      const mp = path.join(CONTENT_DIR, parts.slice(0, i + 1).join('/'), '_meta.json');
      const label = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf-8')).label : p;
      return `<span class="breadcrumb-link">${label}</span><i data-lucide="chevron-right" class="breadcrumb-sep"></i>`;
    }).join('');
    const tocMatches = [...bodyHtml.matchAll(/<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/g)];
    const tocHtml = tocMatches.length > 2
      ? '<nav class="toc"><p class="toc-title">Nesta página</p><ul>' + tocMatches.map(([, l, id, t]) => `<li class="toc-item toc-h${l}"><a href="#${id}" class="toc-link">${t.replace(/<[^>]+>/g, '')}</a></li>`).join('') + '</ul></nav>'
      : '';
    searchIndex.push({ title: fm.title || slug, description: fm.description || '', tags: fm.tags || [], url: relRoot + slug + '.html', path: pageUrl });
    const page = template
      .replace(/\{\{ROOT\}\}/g, relRoot)
      .replace(/\{\{TITLE\}\}/g, fm.title || 'Documentação')
      .replace(/\{\{DESCRIPTION\}\}/g, fm.description || '')
      .replace(/\{\{ICON\}\}/g, fm.icon || 'file-text')
      .replace(/\{\{TAGS\}\}/g, (fm.tags || []).join(', '))
      .replace(/\{\{NAV\}\}/g, renderNav(nav, pageUrl))
      .replace(/\{\{BREADCRUMB\}\}/g, breadcrumb)
      .replace(/\{\{CONTENT\}\}/g, bodyHtml)
      .replace(/\{\{TOC\}\}/g, tocHtml);
    fs.writeFileSync(outPath, page);
    console.log(`✓ Built: ${outPath.replace(DIST_DIR, 'dist')}`);
  }
  fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
  console.log(`\n✅ Build completo — ${mdFiles.length} páginas`);
}

build().catch(err => { console.error(err); process.exit(1); });
