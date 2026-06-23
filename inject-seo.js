/**
 * inject-seo.js
 * Post-processes dist/index.html after `expo export --platform web`
 * to inject full SEO meta tags, Open Graph, Twitter Card, and structured data.
 *
 * Usage: node inject-seo.js
 */
const fs = require('fs');
const path = require('path');

const distHtml = path.join(__dirname, 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.error('❌  dist/index.html not found. Run `npx expo export --platform web` first.');
  process.exit(1);
}

const SEO_TAGS = `
    <!-- Primary SEO -->
    <title>Lazy To-Do – Simple Daily Planner &amp; Task Manager</title>
    <meta name="description" content="Lazy To-Do is a minimalist daily planner that helps you stay on top of daily, weekly, monthly, and yearly goals — without the overwhelm. Free, no account needed." />
    <meta name="keywords" content="to-do app, task manager, daily planner, productivity, habit tracker, goal tracker, simple todo, lazy todo" />
    <meta name="author" content="LazyToDo" />
    <link rel="canonical" href="https://lazytodo.app/" />

    <!-- Theme -->
    <meta name="theme-color" content="#14532d" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Lazy To-Do" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://lazytodo.app/" />
    <meta property="og:title" content="Lazy To-Do – Simple Daily Planner &amp; Task Manager" />
    <meta property="og:description" content="Stay on top of your daily, weekly, monthly, and yearly goals — without the overwhelm. Free, no account needed." />
    <meta property="og:image" content="https://lazytodo.app/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Lazy To-Do" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://lazytodo.app/" />
    <meta name="twitter:title" content="Lazy To-Do – Simple Daily Planner &amp; Task Manager" />
    <meta name="twitter:description" content="Stay on top of your daily, weekly, monthly, and yearly goals — without the overwhelm. Free, no account needed." />
    <meta name="twitter:image" content="https://lazytodo.app/og-image.png" />

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Lazy To-Do",
      "url": "https://lazytodo.app",
      "description": "A minimalist daily planner that helps you stay on top of daily, weekly, monthly, and yearly goals without the overwhelm.",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
    <\/script>

    <!-- Apple touch icon -->
    <link rel="apple-touch-icon" href="/assets/icon.png" />`;

let html = fs.readFileSync(distHtml, 'utf8');

// Replace the existing <title> tag with our full SEO block
html = html.replace(/<title>[^<]*<\/title>/, SEO_TAGS);

// Copy the OG image to dist/ (always overwrite to keep it fresh)
const ogSrc = path.join(__dirname, 'assets', 'og-image.png');
const ogDest = path.join(__dirname, 'dist', 'og-image.png');
if (fs.existsSync(ogSrc)) {
  fs.copyFileSync(ogSrc, ogDest);
  console.log('✅  Copied og-image.png to dist/');
}

fs.writeFileSync(distHtml, html, 'utf8');
console.log('✅  SEO tags injected into dist/index.html');

// ── sitemap.xml ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lazytodo.app/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lazytodo.app/app</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(__dirname, 'dist', 'sitemap.xml'), sitemap, 'utf8');
console.log('✅  sitemap.xml written to dist/');

// ── robots.txt ───────────────────────────────────────────────────────────────
const robots = `User-agent: *
Allow: /

Sitemap: https://lazytodo.app/sitemap.xml
`;
fs.writeFileSync(path.join(__dirname, 'dist', 'robots.txt'), robots, 'utf8');
console.log('✅  robots.txt written to dist/');
