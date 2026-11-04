// Builds the site into dist/:
//  1. copies every public file of the site
//  2. turns each blog post in content/blog/*.md into a page at /blog/<slug>
//  3. writes /assets/blog-posts.js (the list the Blog page shows)
//  4. adds the posts to sitemap.xml
// Run with: npm run build
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://hatille.com';
const SKIP = new Set(['dist', 'node_modules', 'content', 'scripts', '.git', '.github', 'package.json', 'package-lock.json', 'netlify.toml', 'HOW-TO-LAUNCH.txt', 'README.md', '.gitignore']);

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = p => !p ? '' : /^https?:\/\//.test(p) ? p : '/' + String(p).replace(/^\/+/, '');

// 1. copy the site
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  fs.cpSync(path.join(ROOT, name), path.join(OUT, name), { recursive: true });
}

// 2. read posts
const dir = path.join(ROOT, 'content', 'blog');
const posts = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    const slug = f.replace(/\.md$/, '');
    const words = content.split(/\s+/).filter(Boolean).length;
    const date = data.date ? new Date(data.date) : new Date();
    const plain = content.replace(/[#*_>`\[\]]|\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    return {
      slug,
      title: data.title || slug,
      cat: data.category || 'Journal',
      date: date.toISOString(),
      img: abs(data.image) || '/assets/img/og-hatille.jpg',
      summary: data.summary || (plain.length > 160 ? plain.slice(0, plain.lastIndexOf(' ', 157)) + '…' : plain),
      min: Math.max(1, Math.ceil(words / 200)),
      html: marked.parse(content),
      draft: data.draft === true,
    };
  })
  .filter(p => !p.draft)
  .sort((a, b) => b.date.localeCompare(a.date));

// 3. one page per post, reusing the site's header, footer and styles
const fmtDate = iso => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto' });
const page = (p, i) => {
  const more = posts.filter(x => x.slug !== p.slug).slice(0, 3);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} · Hatille</title>
<meta name="description" content="${esc(p.summary)}">
<link rel="icon" href="/assets/img/hatille-icon-black.svg">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<meta name="theme-color" content="#0c0b0a">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Hatille">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.summary)}">
<meta property="og:url" content="${SITE}/blog/${p.slug}">
<meta property="og:image" content="${SITE}${esc(p.img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${SITE}/blog/${p.slug}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital@1&family=Poppins:wght@300;400;500&display=swap">
<link rel="stylesheet" href="/assets/style.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.date, image: SITE + p.img, author: { '@type': 'Organization', name: 'Hatille' }, publisher: { '@type': 'Organization', name: 'Hatille' }, mainEntityOfPage: `${SITE}/blog/${p.slug}` }).replace(/</g, '\\u003c')}</script>
</head>
<body>
<main>
  <article class="section post-page">
    <div class="wrap narrow">
      <a class="back" href="/blog">← All stories</a>
      <span class="tag">${esc(p.cat)}</span>
      <h1>${esc(p.title)}</h1>
      <div class="note">${fmtDate(p.date)} · ${p.min} min read · Hatille</div>
      <img class="hero-img" src="${esc(p.img)}" alt="">
      <div class="prose">${p.html}</div>
    </div>
  </article>
  ${more.length ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="num" style="margin-bottom:22px">KEEP READING</div><div class="posts">${more.map(card).join('')}</div></div></section>` : ''}
</main>
<script src="/assets/site.js"></script>
</body>
</html>
`;
};
function card(p) {
  return `<a class="post" href="/blog/${p.slug}"><div class="cov"><img src="${esc(p.img)}" alt="" loading="lazy"></div><div class="body"><span class="tag">${esc(p.cat)}</span><h3>${esc(p.title)}</h3><div class="note">${p.min} min read</div></div></a>`;
}
fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
posts.forEach((p, i) => fs.writeFileSync(path.join(OUT, 'blog', p.slug + '.html'), page(p, i)));

// The Blog page lives at /blog/ next to its posts (so /blog and /blog/<post> never clash)
const listPage = path.join(OUT, 'blog.html');
if (fs.existsSync(listPage)) {
  const html = fs.readFileSync(listPage, 'utf8').replace(/(["(])assets\//g, '$1/assets/');
  fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), html);
  fs.rmSync(listPage);
}

// 4. the list for the Blog page
const list = posts.map(({ html, draft, ...p }) => p);
fs.writeFileSync(path.join(OUT, 'assets', 'blog-posts.js'), `window.BLOG_POSTS = ${JSON.stringify(list).replace(/</g, '\\u003c')};\n`);

// 5. sitemap
const smPath = path.join(OUT, 'sitemap.xml');
if (fs.existsSync(smPath)) {
  const urls = posts.map(p => `  <url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${p.date.slice(0, 10)}</lastmod></url>`).join('\n');
  fs.writeFileSync(smPath, fs.readFileSync(smPath, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
}

console.log(`Built ${posts.length} blog posts into dist/`);
