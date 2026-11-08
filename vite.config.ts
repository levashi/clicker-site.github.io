import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import translations, { LANGUAGES, type Language } from './src/i18n/translations'

const BASE = 'https://clicker-site.vercel.app'
const LANGS = Object.keys(translations) as Language[]

/*
 * Build-time static localization.
 *
 * dist/{lang}.html : localized title/description/OG + VideoGame schema + a static
 *   help pill linking to the help page (crawled on first paint).
 * dist/{lang}/help.html : a real standalone guide page (scrollable, no app JS,
 *   back button, language switcher) — its own title/description/canonical and
 *   hreflang cluster, for SEO.
 * vercel.json rewrites /{lang} and /{lang}/help to them.
 *
 * siteTitle/siteDescription/ogTitle/ogDescription/keywords/help stay in sync
 * with src/i18n/translations.ts (game side); only help-page copy lives here.
 */

type Locale = {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  keywords: string
  ogLocale: string
  inLanguage: string
  section: string
}

const META: Record<string, Locale> = {
  en: {
    title: 'Clicker Game - Free Online Clicker Game',
    description:
      'Clicker Game is a free and addictive online clicker game. Track your clicks per second (CPS) and unlock upgrades to keep progressing!',
    ogTitle: 'Clicker Game - Free Online Clicker Game',
    ogDescription: 'Track your CPS, unlock upgrades and become the best on Clicker Game',
    keywords:
      'clicker game, click game, clicker, measure cps, cps test, rewards, upgrades, progression, browser game, casual gaming, clicker challenge',
    ogLocale: 'en_US',
    inLanguage: 'en',
    section: `
    <h2>Free online clicker game — measure your CPS</h2>
    <p>Clicker Game is a free and addictive online clicker game you can play right in your browser: no download, no sign-up, no ads to start a session. Your click record is saved on your device so you can keep chasing it.</p>
    <h2>How to play</h2>
    <p>Click the big CLICK button as fast as you can to earn coins, spend them on upgrades in the shop, and unlock boosts when you hit CPS milestones: a temporary bonus per click, a discount on your next purchase or instant coin rewards.</p>
    <h2>What is CPS?</h2>
    <p>CPS means “clicks per second”: it is your average click speed over 6 seconds, shown live under the CLICK button. Looking for a quick CPS test without installing anything? This clicker game doubles as a free online clicks-per-second counter.</p>
    <h2>Tips to boost your CPS</h2>
    <ul>
      <li>Warm your fingers up for 30 seconds before a run.</li>
      <li>Alternate fingers instead of hammering with one.</li>
      <li>Land your clicks on the center of the button.</li>
      <li>Play short, frequent sessions — the record persists in your browser.</li>
      <li>Buy upgrades the moment your per-click value makes it worth it.</li>
    </ul>`,
  },
  fr: {
    title: 'Clicker Game - Jeu de Clic Gratuit',
    description:
      'Clicker Game est un jeu de clic gratuit et addictif en ligne. Mesurez vos clics par seconde (CPS) et débloquez des améliorations pour aller toujours plus loin !',
    ogTitle: 'Clicker Game - Jeu de Clic Gratuit',
    ogDescription:
      'Mesurez votre CPS, débloquez des améliorations et devenez le meilleur sur Clicker Game',
    keywords:
      'clicker game, jeu de clic, jeu de click, mesurer cps, cps test, récompenses, amélioration, progression, jeu de navigateur, gaming casual, défi clicker',
    ogLocale: 'fr_FR',
    inLanguage: 'fr',
    section: `
    <h2>Jeu de clic gratuit — mesure ton CPS</h2>
    <p>Clicker Game est un jeu de clic gratuit et addictif, jouable directement dans ton navigateur : pas de téléchargement, pas d’inscription, et une session immédiate. Ton record est sauvegardé sur ton appareil pour le repousser à tout moment.</p>
    <h2>Comment jouer ?</h2>
    <p>Clique le plus vite possible sur le gros bouton CLIC pour gagner des pièces, achète des améliorations dans la boutique et débloque des bonus à chaque palier de CPS : boost de pièces par clic, remise sur le prochain achat ou bonus de pièces instantané.</p>
    <h2>C’est quoi le CPS ?</h2>
    <p>CPS veut dire « clics par seconde » : c’est ta vitesse de clic moyenne sur 6 secondes, affichée en direct sous le bouton CLIC. Tu veux mesurer ton CPS sans rien installer ? Ce jeu de clic sert aussi de compteur de clics par seconde en ligne, gratuit.</p>
    <h2>Astuces pour monter en CPS</h2>
    <ul>
      <li>Échauffe tes doigts 30 secondes avant une série.</li>
      <li>Alterne les doigts plutôt que d’en martyriser un seul.</li>
      <li>Vise le centre du bouton.</li>
      <li>Fais des sessions courtes et régulières — le record est sauvegardé dans ton navigateur.</li>
      <li>Investis dans la boutique dès que ta valeur par clic la justifie.</li>
    </ul>`,
  },
  es: {
    title: 'Clicker Game - Juego de Clics Gratis',
    description:
      'Clicker Game es un juego de clics gratuito y adictivo en línea. Mide tus clics por segundo (CPS) y desbloquea mejoras para avanzar cada vez más.',
    ogTitle: 'Clicker Game - Juego de Clics Gratis',
    ogDescription:
      'Mide tu CPS, desbloquea mejoras y conviértete en el mejor en Clicker Game',
    keywords:
      'clicker game, juego de clics, juego de clicks, juego para hacer clics, medir cps, cps test, recompensas, mejoras, progreso, juego navegador, juego casual, desafio clicker',
    ogLocale: 'es_ES',
    inLanguage: 'es',
    section: `
    <h2>Juego de clicks gratis — mide tu CPS</h2>
    <p>Clicker Game es un juego de clics gratis y adictivo al que puedes jugar directamente en tu navegador: sin descargas, sin registro y con una partida inmediata. Tu récord se guarda en tu dispositivo para seguir superándolo.</p>
    <h2>¿Cómo jugar?</h2>
    <p>Haz clic lo más rápido posible en el gran botón CLIC para ganar monedas, compra mejoras en la tienda y desbloquea bonus al alcanzar cada nivel de CPS: monedas extra por clic, descuento en tu próxima compra o monedas instantáneas.</p>
    <h2>¿Qué es el CPS?</h2>
    <p>CPS significa «clicks per second» (clics por segundo): es tu velocidad media de clics durante 6 segundos, mostrada en tiempo real bajo el botón CLIC. ¿Buscas medir tu CPS sin instalar nada? Este juego de clicks funciona además como contador gratuito de clics por segundo online.</p>
    <h2>Consejos para subir tu CPS</h2>
    <ul>
      <li>Calienta los dedos 30 segundos antes de cada partida.</li>
      <li>Alterna los dedos en lugar de martirizar uno solo.</li>
      <li>Apunta al centro del botón.</li>
      <li>Juega partidas cortas y frecuentes — el récord se guarda en el navegador.</li>
      <li>Compra mejoras en cuanto tu valor por clic lo justifique.</li>
    </ul>`,
  },
  zh: {
    title: 'Clicker Game - 免费在线点击游戏',
    description: 'Clicker Game 是一款免费在线点击游戏。追踪你的每秒点击数（CPS），解锁升级，不断前进！',
    ogTitle: 'Clicker Game - 免费在线点击游戏',
    ogDescription: '追踪你的CPS，解锁升级，成为Clicker Game中最强玩家',
    keywords:
      '点击游戏, clicker, 点击, cps 测试, 每秒点击数, 奖励, 升级, 进度, 策略, 浏览器游戏, 休闲游戏, 点击挑战',
    ogLocale: 'zh_CN',
    inLanguage: 'zh',
    section: `
    <h2>免费在线点击游戏 — 测量你的 CPS</h2>
    <p>Clicker Game 是一款免费在线、即开即玩的点击游戏：无需下载、无需注册，打开浏览器就能开始游戏。你的纪录保存在本地设备上，随时可以继续刷新。</p>
    <h2>怎么玩？</h2>
    <p>尽可能快速点击巨大的 CLIC 按钮赚取金币，在商店购买升级，并在达到 CPS 里程碑时解锁加成：每次点击金币提升、下次购买折扣或即时金币奖励。</p>
    <h2>什么是 CPS？</h2>
    <p>CPS 即「每秒点击数」：你的平均点击速度（6 秒平均值），实时显示在按钮下方。想在不安装任何东西的情况下测试自己的手速？这款点击游戏同时也是一个免费的在线每秒点击计数器。</p>
    <h2>提升 CPS 的技巧</h2>
    <ul>
      <li>开局前活动手指 30 秒。</li>
      <li>双手交替点击，而不是只用一根手指。</li>
      <li>瞄准按钮中心。</li>
      <li>进行短时高频的练习——纪录保存在浏览器中。</li>
      <li>当每击收益值得投入时，及时购买升级。</li>
    </ul>`,
  },
}

/* Help-page-only copy (game copy lives in src/i18n/translations.ts) */
const HELP: Record<string, { title: string; description: string; h1: string; sub: string; back: string }> = {
  en: {
    title: 'How to Play Clicker Game — CPS Guide and Tips',
    description:
      'Learn how to play Clicker Game: what CPS (clicks per second) means, how to earn coins, buy upgrades and unlock boosts, plus tips to beat your own record.',
    h1: 'How to play Clicker Game',
    sub: 'A quick guide to this free clicker game: what CPS is, how to progress, and tips to beat your own record.',
    back: 'Back',
  },
  fr: {
    title: 'Comment jouer à Clicker Game — Guide du CPS et astuces',
    description:
      'Guide complet de Clicker Game : ce que veut dire CPS (clics par seconde), comment gagner des pièces, acheter des améliorations, débloquer des bonus, et astuces pour battre votre record.',
    h1: 'Comment jouer à Clicker Game',
    sub: 'Guide rapide de ce jeu de clic gratuit : ce qu’est le CPS, comment progresser, et astuces pour battre votre record.',
    back: 'Retour',
  },
  es: {
    title: 'Cómo jugar a Clicker Game — Guía de CPS y consejos',
    description:
      'Guía completa de Clicker Game: qué significa CPS (clics por segundo), cómo ganar monedas, comprar mejoras, desbloquear bonus y consejos para superar tu récord.',
    h1: 'Cómo jugar a Clicker Game',
    sub: 'Guía rápida de este juego de clicks gratis: qué es el CPS, cómo progresar y consejos para superar tu récord.',
    back: 'Volver',
  },
  zh: {
    title: 'Clicker Game 玩法指南 — CPS 技巧与攻略',
    description:
      'Clicker Game 完整指南：CPS（每秒点击数）是什么、如何赚取金币、购买升级、解锁加成，以及刷新自己纪录的技巧。',
    h1: 'Clicker Game 玩法指南',
    sub: '本免费在线点击游戏的快速指南：CPS 是什么、如何进步、刷新纪录的技巧。',
    back: '返回',
  },
}

const STYLES = `
  /* Game pages: static help pill (bottom-left, links to the help page). */
  .help-btn { position: fixed; left: 14px; bottom: 14px; z-index: 1000;
    background: rgba(13,17,23,.6); border: 1px solid rgba(201,209,217,.22); color: #8b949e;
    font-size: 12px; line-height: 1; padding: 8px 14px; border-radius: 999px;
    cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
    font-family: inherit; text-decoration: none;
    transition: color .15s, border-color .15s; }
  .help-btn:hover { color: #e6edf3; border-color: rgba(201,209,217,.5); }

  /* Help pages: regular document, normal scroll. */
  body.help { overflow: visible; height: auto; }
  .back-btn { position: fixed; top: 14px; left: 14px; z-index: 1000;
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(13,17,23,.6); border: 1px solid rgba(201,209,217,.22); color: #8b949e;
    text-decoration: none; font-size: 13px; padding: 8px 14px; border-radius: 999px;
    font-family: inherit; transition: color .15s, border-color .15s; }
  .back-btn:hover { color: #e6edf3; border-color: rgba(201,209,217,.5); }
  .back-btn .arrow { font-size: 16px; line-height: 1; }
  .help-lang { position: fixed; top: 14px; right: 14px; z-index: 1000; font-family: inherit; }
  .help-lang > summary { list-style: none; cursor: pointer;
    background: rgba(13,17,23,.6); border: 1px solid rgba(201,209,217,.22); color: #8b949e;
    font-size: 13px; padding: 8px 14px; border-radius: 999px; }
  .help-lang[open] > summary { color: #e6edf3; border-color: rgba(201,209,217,.5); }
  .help-lang .opts { margin-top: 8px; background: #0d1117; border: 1px solid #30363d;
    border-radius: 10px; padding: 6px; min-width: 150px; }
  .help-lang .opts a { display: block; color: #c9d1d9; text-decoration: none;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; }
  .help-lang .opts a.active { background: #1f6feb; color: #fff; }
  .help-lang .opts a:hover { background: #21262d; }
  .help-page { max-width: 760px; margin: 0 auto; padding: 84px 20px 96px;
    color: #c9d1d9; line-height: 1.65; font-size: 15px; user-select: text; }
  .help-page h1 { color: #e6edf3; font-size: 26px; margin: 0 0 6px; }
  .help-page .subtitle { color: #8b949e; margin: 0 0 12px; }
  .help-page h2 { color: #e6edf3; font-size: 20px; margin: 26px 0 8px; }
  .help-page p { margin: 8px 0; }
  .help-page ul { margin: 8px 0 8px 22px; }
  .help-page li { margin: 4px 0; }
`

function setAttr(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, (_m, head: string) => head + value + '"')
}

function gameSchema(lang: string): string {
  const m = META[lang]
  const game = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: m.title,
    description: m.description,
    url: `${BASE}/${lang}`,
    inLanguage: m.inLanguage,
    playMode: 'https://schema.org/BrowserMode',
    genre: 'Casual',
    applicationCategory: 'Game',
    operatingSystem: 'Web browser',
    author: { '@type': 'Person', name: 'Levashi', url: 'https://github.com/levashi' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  }
  return `<script type="application/ld+json">${JSON.stringify(game)}</script>`
}

function rootSchema(): string {
  const game = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: META.en.title,
    description: META.en.description,
    url: `${BASE}/`,
    inLanguage: 'en',
    playMode: 'https://schema.org/BrowserMode',
    genre: 'Casual',
    applicationCategory: 'Game',
    operatingSystem: 'Web browser',
    author: { '@type': 'Person', name: 'Levashi', url: 'https://github.com/levashi' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  }
  return `<script type="application/ld+json">${JSON.stringify(game)}</script>`
}

function breadcrumbSchema(lang: string): string {
  const h = HELP[lang]
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: META[lang].ogTitle, item: `${BASE}/${lang}` },
      { '@type': 'ListItem', position: 2, name: h.h1, item: `${BASE}/${lang}/help` },
    ],
  }
  return `<script type="application/ld+json">${JSON.stringify(crumbs)}</script>`
}

function langSwitcher(current: Language): string {
  const links = LANGS.map(l =>
    `      <a href="/${l}/help"${l === current ? ' class="active" aria-current="page"' : ''}>${LANGUAGES[l].flag} ${LANGUAGES[l].native}</a>`
  ).join('\n')
  return `<details class="help-lang"><summary aria-label="Language">🌐</summary>\n    <div class="opts">\n${links}\n    </div>\n  </details>`
}

/** Game variants: dist/{lang}.html — localized meta + VideoGame schema + help pill link. */
function localize(base: string, lang: Language): string {
  const m = META[lang]
  const url = `${BASE}/${lang}`
  let html = base

  html = html.replace('<html lang="en">', `<html lang="${m.inLanguage}">`)
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`)
  html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, m.description)
  html = setAttr(html, /(<meta name="keywords" content=")[^"]*(")/, m.keywords)
  html = setAttr(html, /(<meta name="language" content=")[^"]*(")/, m.inLanguage)
  html = setAttr(html, /(<meta property="og:title" content=")[^"]*(")/, m.ogTitle)
  html = setAttr(html, /(<meta property="og:description" content=")[^"]*(")/, m.ogDescription)
  html = setAttr(html, /(<meta name="twitter:title" content=")[^"]*(")/, m.ogTitle)
  html = setAttr(html, /(<meta name="twitter:description" content=")[^"]*(")/, m.ogDescription)

  html = setAttr(html, /(<meta property="og:url" content=")[^"]*(")/, url)
  html = setAttr(html, /(<meta property="og:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)
  html = setAttr(html, /(<meta name="twitter:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${url}">\n  <meta property="og:locale" content="${m.ogLocale}">\n  <style>${STYLES}</style>\n</head>`
  )
  // x-default must point at /en (the real default page) — / is now a 301 to /en
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*"\/?>/,
    `<link rel="alternate" hreflang="x-default" href="${BASE}/en">`
  )

  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, gameSchema(lang))

  const helpLabel = translations[lang].help
  const pill = `<a class="help-btn" href="/${lang}/help">${helpLabel}</a>`
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n  ${pill}`)
  return html
}

/** Help pages: dist/{lang}/help.html — standalone guide page, no app JS. */
function helpPage(base: string, lang: Language): string {
  const m = META[lang]
  const h = HELP[lang]
  const url = `${BASE}/${lang}/help`
  let html = base

  html = html.replace('<html lang="en">', `<html lang="${m.inLanguage}">`)
  html = html.replace('<body>', '<body class="help">')
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${h.title}</title>`)
  html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, h.description)
  html = setAttr(html, /(<meta name="language" content=")[^"]*(")/, m.inLanguage)
  html = setAttr(html, /(<meta property="og:title" content=")[^"]*(")/, h.title)
  html = setAttr(html, /(<meta property="og:description" content=")[^"]*(")/, h.description)
  html = setAttr(html, /(<meta name="twitter:title" content=")[^"]*(")/, h.title)
  html = setAttr(html, /(<meta name="twitter:description" content=")[^"]*(")/, h.description)
  html = setAttr(html, /(<meta property="og:url" content=")[^"]*(")/, url)
  html = setAttr(html, /(<meta property="og:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)
  html = setAttr(html, /(<meta name="twitter:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)

  // help-cluster hreflang replaces the game-cluster alternates
  html = html.replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+"\/?>\s*\n?/g, '')
  const alts = LANGS.map(l =>
    `  <link rel="alternate" hreflang="${l}" href="${BASE}/${l}/help">`
  ).join('\n')
  html = html.replace(
    '</head>',
    `${alts}\n  <link rel="alternate" hreflang="x-default" href="${BASE}/en/help">\n  <link rel="canonical" href="${url}">\n  <meta property="og:locale" content="${m.ogLocale}">\n  <style>${STYLES}</style>\n</head>`
  )

  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, breadcrumbSchema(lang))

  // no app bundle, no root div, no client redirect on help pages.
  // NB: the redirect-script regex must not cross </script> boundaries, else it
  // swallows the gtag block and the whole <head> (non-greedy *? spans blocks).
  html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, '')
  html = html.replace(/<script>(?:(?!<\/script>)[\s\S])*location\.replace(?:(?!<\/script>)[\s\S])*<\/script>/, '')
  html = html.replace('<div id="root"></div>', '')

  const chrome = `<a class="back-btn" href="/${lang}"><span class="arrow" aria-hidden="true">←</span> ${h.back}</a>\n  ${langSwitcher(lang)}\n  <main class="help-page">\n    <h1>${h.h1}</h1>\n    <p class="subtitle">${h.sub}</p>${m.section}\n  </main>`
  html = html.replace('<body class="help">', `<body class="help">\n  ${chrome}`)
  return html
}

function sitemapXml(): string {
  const x = (loc: string, alts: string, xdefault: string) =>
    `  <url>\n    <loc>${loc}</loc>\n${alts}    <xhtml:link rel="alternate" hreflang="x-default" href="${xdefault}"/>\n  </url>\n`
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n`
  for (const l of LANGS) {
    const alts = LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${a}" href="${BASE}/${a}"/>`).join('\n')
    xml += x(`${BASE}/${l}`, `${alts}\n`, `${BASE}/en`)
  }
  xml += '\n'
  for (const l of LANGS) {
    const alts = LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${a}" href="${BASE}/${a}/help"/>`).join('\n')
    xml += x(`${BASE}/${l}/help`, `${alts}\n`, `${BASE}/en/help`)
  }
  return xml + '</urlset>\n'
}

function localizedPages(): Plugin {
  return {
    name: 'localized-pages',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const dir = join(process.cwd(), 'dist')
      const base = readFileSync(join(dir, 'index.html'), 'utf8')
      writeFileSync(join(dir, 'index.html'), base.replace(
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
        rootSchema()
      ))
      for (const lang of LANGS) {
        writeFileSync(join(dir, `${lang}.html`), localize(base, lang))
        const helpDir = join(dir, lang)
        mkdirSync(helpDir, { recursive: true })
        writeFileSync(join(helpDir, 'help.html'), helpPage(base, lang))
      }
      writeFileSync(join(dir, 'sitemap.xml'), sitemapXml())
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localizedPages()],
})
