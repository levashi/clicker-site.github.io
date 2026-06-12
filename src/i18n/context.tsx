declare function gtag(event: string, action: string, params?: Record<string, unknown>): void;

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import translations, { type Language } from './translations';

const BASE_URL = 'https://clicker-site.vercel.app';

type TFunction = (key: keyof (typeof translations)['en'], params?: Record<string, string | number>) => string;

interface I18nContextType {
  lang: Language;
  t: TFunction;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

const SUPPORTED: Language[] = ['en', 'fr', 'es', 'zh'];

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

function t(lang: Language, key: keyof (typeof translations)['en'], params?: Record<string, string | number>): string {
  const str = translations[lang]?.[key] ?? translations.en[key] ?? String(key);
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{$}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathLang = resolveLangFromPath();
  const [lang, setLangState] = useState<Language>(pathLang ?? 'en');

  useEffect(() => {
    if (!pathLang) {
      redirectIfRoot();
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    const base = window.location.pathname.match(/^\/(fr|es|zh|en)/) ? '' : '';
    window.history.pushState(null, '', `/${newLang}${base}`);
    localStorage.setItem('clicker-lang', newLang);
    gtag('event', 'language_changed', { language: newLang });
  }, []);

  const translate = useCallback<TFunction>((key, params) => t(lang, key, params), [lang]);

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
    <I18nContext.Provider value={{ lang, t: translate, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export { SUPPORTED, BASE_URL };
