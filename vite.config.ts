import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'https://clicker-site.vercel.app'

/*
 * Build-time static localization.
 *
 * The SPA updates title/description/OG client-side after hydration; search
 * engines fetching the raw HTML previously always saw the English defaults,
 * which hurt CTR on /es and /fr. At closeBundle we generate dist/{en,fr,es,zh}.html
 * with localized title/description/OG/schema and a visible "how to play" content
 * section, and vercel.json rewrites /{lang} to them.
 *
 * The meta strings below MUST stay in sync with siteTitle/siteDescription/
 * ogTitle/ogDescription/keywords in src/i18n/translations.ts.
 */

type Locale = {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  keywords: string
  ogLocale: string
  inLanguage: string
  helpLabel: string
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
    helpLabel: 'Help',
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
    helpLabel: 'Aide',
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
    helpLabel: 'Ayuda',
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
    description:
      'Clicker Game 是一款免费在线点击游戏。追踪你的每秒点击数（CPS），解锁升级，不断前进！',
    ogTitle: 'Clicker Game - 免费在线点击游戏',
    ogDescription: '追踪你的CPS，解锁升级，成为Clicker Game中最强玩家',
    keywords:
      '点击游戏, clicker, 点击, cps 测试, 每秒点击数, 奖励, 升级, 进度, 策略, 浏览器游戏, 休闲游戏, 点击挑战',
    ogLocale: 'zh_CN',
    inLanguage: 'zh',
    helpLabel: '帮助',
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

const STYLES = `
  /* Help pill + guide overlay, injected only on the localized pages.
     The game keeps its locked viewport: the guide is a fullscreen overlay
     opened from a discreet bottom-left pill (content stays in the DOM
     on load, so crawlers read it without any scroll). */
  .help-btn { position: fixed; left: 14px; bottom: 14px; z-index: 1000;
    background: rgba(13,17,23,.6); border: 1px solid rgba(201,209,217,.22); color: #8b949e;
    font-size: 12px; line-height: 1; padding: 8px 14px; border-radius: 999px;
    cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
    font-family: inherit; transition: color .15s, border-color .15s; }
  .help-btn:hover { color: #e6edf3; border-color: rgba(201,209,217,.5); }
  .seo-intro { position: fixed; inset: 0; z-index: 1001; display: none;
    background: rgba(13,17,23,.98); overflow-y: auto; -webkit-overflow-scrolling: touch;
    color: #c9d1d9; line-height: 1.65; font-size: 15px; padding: 64px 20px 48px;
    user-select: text; }
  .seo-intro.open { display: block; }
  .seo-intro-inner { max-width: 760px; margin: 0 auto; }
  .seo-intro h2 { color: #e6edf3; font-size: 20px; margin: 26px 0 8px; }
  .seo-intro h2:first-child { margin-top: 0; }
  .seo-intro p { margin: 8px 0; }
  .seo-intro ul { margin: 8px 0 8px 22px; }
  .seo-intro li { margin: 4px 0; }
  .help-close { position: fixed; top: 14px; right: 16px; width: 36px; height: 36px;
    border-radius: 50%; background: transparent; border: 1px solid rgba(201,209,217,.22);
    color: #8b949e; font-size: 16px; line-height: 1; cursor: pointer; }
  .help-close:hover { color: #e6edf3; border-color: rgba(201,209,217,.5); }
`

function schema(lang: string | null): string {
  const m = lang ? META[lang] : META.en
  const url = lang ? `${BASE}/${lang}` : `${BASE}/`
  const game = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: m.title,
    description: m.description,
    url,
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

function setAttr(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, (_m, head: string) => head + value + '"')
}

/** lang: 'en'|'fr'|'es'|'zh' for localized variants, or null for root index.html */
function localize(base: string, lang: string | null): string {
  const m = lang ? META[lang] : null
  const url = lang ? `${BASE}/${lang}` : `${BASE}/`
  let html = base

  if (m) {
    html = html.replace('<html lang="en">', `<html lang="${m.inLanguage}">`)
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`)
    html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, m.description)
    html = setAttr(html, /(<meta name="keywords" content=")[^"]*(")/, m.keywords)
    html = setAttr(html, /(<meta name="language" content=")[^"]*(")/, m.inLanguage)
    html = setAttr(html, /(<meta property="og:title" content=")[^"]*(")/, m.ogTitle)
    html = setAttr(html, /(<meta property="og:description" content=")[^"]*(")/, m.ogDescription)
    html = setAttr(html, /(<meta name="twitter:title" content=")[^"]*(")/, m.ogTitle)
    html = setAttr(html, /(<meta name="twitter:description" content=")[^"]*(")/, m.ogDescription)
  }
  // absolute URLs + canonical + og:locale for every page
  html = setAttr(html, /(<meta property="og:url" content=")[^"]*(")/, url)
  html = setAttr(html, /(<meta property="og:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)
  html = setAttr(html, /(<meta name="twitter:image" content=")[^"]*(")/, `${BASE}/preview-lors-du-partage.png`)
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${url}">\n  <meta property="og:locale" content="${(lang ? META[lang] : META.en).ogLocale}">\n  <style>${STYLES}</style>\n</head>`
  )

  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema(lang))

  if (m) {
    const help = `<button class="help-btn" aria-expanded="false" aria-controls="how-to-play">${m.helpLabel}</button>
  <section class="seo-intro" id="how-to-play" aria-label="How to play, CPS guide and tips">
    <button class="help-close" aria-label="Close">✕</button>
    <div class="seo-intro-inner">${m.section}</div>
  </section>
  <script>
    (function () {
      var btn = document.querySelector('.help-btn'), panel = document.querySelector('.seo-intro')
      if (!btn || !panel) return
      var toggle = function () {
        var open = panel.classList.toggle('open')
        btn.setAttribute('aria-expanded', String(open))
        if (open) panel.scrollTop = 0
      }
      btn.addEventListener('click', toggle)
      panel.addEventListener('click', function (e) {
        if (e.target === panel || (e.target.classList && e.target.classList.contains('help-close'))) toggle()
      })
    })()
  </script>`
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n  ${help}`)
  }
  return html
}

function localizedPages(): Plugin {
  return {
    name: 'localized-pages',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const dir = join(process.cwd(), 'dist')
      const base = readFileSync(join(dir, 'index.html'), 'utf8')
      writeFileSync(join(dir, 'index.html'), localize(base, null))
      for (const lang of Object.keys(META)) {
        writeFileSync(join(dir, `${lang}.html`), localize(base, lang))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localizedPages()],
})
