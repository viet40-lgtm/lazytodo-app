/**
 * inject-seo.js
 * Post-processes dist/index.html after `expo export --platform web`
 * to inject full SEO meta tags, Open Graph, Twitter Card, structured data,
 * FAQPage schema, SoftwareApplication schema, and generates manifest.json + robots.txt + sitemap.xml.
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

// ── FAQ data (keep in sync with app/index.tsx FAQS array) ────────────────────
const FAQS = [
  {
    q: 'Is Lazy To-Do free?',
    a: 'Yes — completely free, forever. No subscription, no credit card, no hidden fees. Core features will always be free.',
  },
  {
    q: 'Do I need an account to use it?',
    a: 'No. You can start using the app immediately with no sign-up required. Your tasks are saved locally on your device. Create a free account only if you want to sync across devices.',
  },
  {
    q: 'Can I track daily habits?',
    a: 'Yes. The Daily section is designed as a habit tracker — tasks added there reset automatically every day so you can build consistent routines.',
  },
  {
    q: 'Does it support recurring tasks?',
    a: 'Yes. You can set tasks to repeat daily, weekly, biweekly, monthly, or yearly. Recurring tasks spawn the next occurrence automatically when completed or skipped.',
  },
  {
    q: 'Can I set reminders?',
    a: 'Yes. You can attach a time-based reminder to any task. Reminders work on web, iOS, and Android.',
  },
  {
    q: 'Does it sync across iPhone and Android?',
    a: 'Yes. Sign in with a free account and your tasks sync across all devices — web, iPhone, and Android — in real time.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes. Lazy To-Do is available as a native app on iOS (iPhone) and Android, as well as in any web browser at lazytodo.app.',
  },
  {
    q: 'How is this different from other to-do apps?',
    a: 'Most task managers are overwhelming. Lazy To-Do is intentionally simple — it organizes tasks by timeframe (today, daily, weekly, monthly, yearly) so you always know what to focus on, without complex projects or folders.',
  },
];

// ── SEO meta tags block ───────────────────────────────────────────────────────
const SEO_TAGS = `
    <!-- Primary SEO -->
    <title>Lazy To-Do – Free Daily Planner, Habit Tracker &amp; Task Manager</title>
    <meta name="description" content="Free minimalist task manager and daily habit tracker. Organize daily tasks, weekly goals, and long-term plans. No account needed. Works on iOS, Android &amp; web." />
    <meta name="keywords" content="to-do app, task manager, daily planner, habit tracker, free todo app, recurring tasks, goal tracker, simple task manager, no account todo, cross device sync, reminder app, weekly planner, productivity app" />
    <meta name="author" content="LazyToDo" />
    <link rel="canonical" href="https://lazytodo.app/" />

    <!-- Theme & PWA -->
    <meta name="theme-color" content="#14532d" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Lazy To-Do" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://lazytodo.app/" />
    <meta property="og:title" content="Lazy To-Do – Free Daily Planner, Habit Tracker &amp; Task Manager" />
    <meta property="og:description" content="Free minimalist task manager and daily habit tracker. Organize tasks by day, week, month, and year. No account needed. Works on web, iPhone &amp; Android." />
    <meta property="og:image" content="https://lazytodo.app/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Lazy To-Do" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://lazytodo.app/" />
    <meta name="twitter:title" content="Lazy To-Do – Free Daily Planner, Habit Tracker &amp; Task Manager" />
    <meta name="twitter:description" content="Free minimalist task manager and daily habit tracker. No account needed. Works on web, iPhone &amp; Android." />
    <meta name="twitter:image" content="https://lazytodo.app/og-image.png" />

    <!-- Structured Data: SoftwareApplication -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Lazy To-Do",
      "url": "https://lazytodo.app",
      "description": "A free minimalist task manager and daily habit tracker. Organize daily tasks, recurring habits, weekly goals, and long-term plans without the overwhelm.",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": "1"
      },
      "featureList": [
        "Daily habit tracker",
        "Recurring tasks (daily, weekly, monthly, yearly)",
        "Cross-device sync",
        "Task reminders",
        "No account required",
        "Free forever",
        "Offline support",
        "Works on iPhone, Android, and web"
      ]
    }
    <\/script>

    <!-- Structured Data: FAQPage -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        ${FAQS.map(({ q, a }) => `{
          "@type": "Question",
          "name": ${JSON.stringify(q)},
          "acceptedAnswer": {
            "@type": "Answer",
            "text": ${JSON.stringify(a)}
          }
        }`).join(',\n        ')}
      ]
    }
    <\/script>

    <!-- Structured Data: WebSite with SearchAction -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Lazy To-Do",
      "url": "https://lazytodo.app"
    }
    <\/script>`;

// ── Patch index.html ──────────────────────────────────────────────────────────
let html = fs.readFileSync(distHtml, 'utf8');
// Remove existing title and description tags to prevent duplicates
html = html.replace(/<title>[^<]*<\/title>/, '');
html = html.replace(/<meta name="description"[^>]*>/g, '');
// Inject our SEO tags at the end of the <head>
html = html.replace('</head>', `\n${SEO_TAGS}\n</head>`);

// Inject static HTML for crawlers that don't execute JS (like Bing)
const staticHtml = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; color: #1f2937;">
    <h1>Lazy To-Do – Free Daily Planner, Habit Tracker &amp; Task Manager</h1>
    <h2>The lazy way to stay on top of things.</h2>
    <p>A free, minimalist task manager and daily habit tracker. Organize your daily tasks, weekly goals, and long-term plans — all in one place. No account needed to get started.</p>
    <ul>
      <li>Free forever</li>
      <li>No sign-up required</li>
      <li>Works offline</li>
    </ul>

    <h3>Features</h3>
    <ul>
      <li><strong>Today's Tasks:</strong> Quick one-off tasks for right now. Add, check off, move on — clutter-free.</li>
      <li><strong>Daily Habit Tracker:</strong> Track daily habits and routines. They reset automatically every morning.</li>
      <li><strong>Weekly &amp; Monthly Goals:</strong> Bigger tasks that span the week or month. Stay on track without micromanaging.</li>
      <li><strong>Yearly Goals:</strong> Long-term dreams and ambitions. Always visible, never forgotten.</li>
      <li><strong>Reminders:</strong> Set time-based reminders for any task. Never miss what matters.</li>
      <li><strong>Cross-Device Sync:</strong> Sign in free to sync your tasks across iPhone, Android, and web instantly.</li>
    </ul>

    <h3>How it works</h3>
    <ol>
      <li><strong>Add your tasks — no sign-up needed:</strong> Open the app and start adding tasks immediately. No account, no credit card, no friction.</li>
      <li><strong>Check them off:</strong> Tap to complete. Recurring tasks and daily habits reset themselves automatically.</li>
      <li><strong>Sync across all your devices:</strong> Create a free account to sync your tasks across iPhone, Android, and web in real time.</li>
    </ol>

    <h3>FAQ</h3>
    <dl>
      ${FAQS.map(f => `<dt style="margin-top: 16px;"><strong>${f.q}</strong></dt><dd style="margin-left: 0; margin-top: 4px; color: #4b5563;">${f.a}</dd>`).join('\n      ')}
    </dl>
    <a href="/app" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; margin-top: 32px;">Get Started Free</a>
  </div>
`;

html = html.replace('<div id="root"></div>', `<div id="root"></div>\n<noscript>${staticHtml}</noscript>`);

fs.writeFileSync(distHtml, html, 'utf8');
console.log('✅  SEO tags and static HTML injected into dist/index.html');

// ── Copy OG image ─────────────────────────────────────────────────────────────
const ogSrc = path.join(__dirname, 'assets', 'og-image.png');
const ogDest = path.join(__dirname, 'dist', 'og-image.png');
if (fs.existsSync(ogSrc)) {
  fs.copyFileSync(ogSrc, ogDest);
  console.log('✅  Copied og-image.png to dist/');
}

// ── manifest.json (PWA) ───────────────────────────────────────────────────────
const manifest = {
  name: 'Lazy To-Do',
  short_name: 'LazyToDo',
  description: 'Free daily planner, habit tracker, and task manager. No account needed.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f1f5f1',
  theme_color: '#14532d',
  orientation: 'portrait',
  icons: [
    {
      src: '/assets/icon.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/assets/favicon.png',
      sizes: '196x196',
      type: 'image/png',
    },
  ],
  categories: ['productivity', 'utilities', 'lifestyle'],
  screenshots: [
    {
      src: '/og-image.png',
      sizes: '1200x630',
      type: 'image/png',
      label: 'Lazy To-Do – Daily Planner and Habit Tracker',
    },
  ],
  lang: 'en',
  dir: 'ltr',
};
fs.writeFileSync(
  path.join(__dirname, 'dist', 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);
console.log('✅  manifest.json written to dist/');

// ── sitemap.xml ───────────────────────────────────────────────────────────────
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

// ── robots.txt ────────────────────────────────────────────────────────────────
const robots = `User-agent: *
Allow: /

Sitemap: https://lazytodo.app/sitemap.xml
`;
fs.writeFileSync(path.join(__dirname, 'dist', 'robots.txt'), robots, 'utf8');
console.log('✅  robots.txt written to dist/');

// ── BingSiteAuth.xml (Bing Webmaster Tools verification) ─────────────────────
const bingSrc = path.join(__dirname, 'BingSiteAuth.xml');
const bingDest = path.join(__dirname, 'dist', 'BingSiteAuth.xml');
if (fs.existsSync(bingSrc)) {
  fs.copyFileSync(bingSrc, bingDest);
  console.log('✅  BingSiteAuth.xml copied to dist/');
} else {
  console.warn('⚠️   BingSiteAuth.xml not found in project root — skipping.');
}
