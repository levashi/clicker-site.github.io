import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import translations, { type Language } from './translations';
import { BASE_URL, SUPPORTED, I18nContext, translate, type TFunction } from './core';

declare function gtag(event: string, action: string, params?: Record<string, unknown>): void;

function detectBrowserLang(): Language {
  const browserLang = (navigator.language || 'en').toLowerCase();
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en';
}

function resolveLangFromPath(): Language | null {
  const path = window.location.pathname;
  const match = path.match(/^\/(fr|es|zh|en)(\/.*)?$/);
  if (match) return match[1] as Language;
  return null;
}

function redirectIfRoot(): void {
  if (window.location.pathname === '/' || window.location.pathname === '') {
    const lang = detectBrowserLang();
    const target = `/${lang}`;
    window.history.replaceState(null, '', target);
    window.location.href = target;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathLang = resolveLangFromPath();
  const [lang, setLangState] = useState<Language>(pathLang ?? 'en');

  useEffect(() => {
    if (!pathLang) {
      redirectIfRoot();
    }
  }, [pathLang]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    window.history.pushState(null, '', `/${newLang}`);
    localStorage.setItem('clicker-lang', newLang);
    gtag('event', 'language_changed', { language: newLang });
  }, []);

  const t = useCallback<TFunction>((key, params) => translate(lang, key, params), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    const data = translations[lang];
    if (!data) return;

    document.title = data.siteTitle;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', data.siteDescription);

    const kwMeta = document.querySelector('meta[name="keywords"]');
    if (kwMeta) kwMeta.setAttribute('content', data.keywords);

    const langMeta = document.querySelector('meta[name="language"]');
    if (langMeta) langMeta.setAttribute('content', lang);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', data.ogTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', data.ogDescription);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', data.ogTitle);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', data.ogDescription);
  }, [lang]);

  // The help button is a static anchor present in the first-render HTML (crawlable);
  // keep its label and href in sync when the language switches without a reload.
  useEffect(() => {
    const pill = document.querySelector('a.help-btn');
    if (pill) {
      pill.textContent = translate(lang, 'help');
      pill.setAttribute('href', `/${lang}/help`);
    }
  }, [lang]);

  useEffect(() => {
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    document.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
    SUPPORTED.forEach(l => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = l;
      link.href = `${BASE_URL}/${l}`;
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = `${BASE_URL}/`;
    document.head.appendChild(xDefault);
    const selfLink = document.createElement('link');
    selfLink.rel = 'canonical';
    selfLink.href = `${BASE_URL}/${lang}`;
    document.head.appendChild(selfLink);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}
