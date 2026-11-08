import { createContext } from 'react'
import translations, { type Language } from './translations'

export const BASE_URL = 'https://clicker-site.vercel.app'
export const SUPPORTED: Language[] = ['en', 'fr', 'es', 'zh']

export type TFunction = (
  key: keyof (typeof translations)['en'],
  params?: Record<string, string | number>,
) => string

export interface I18nContextType {
  lang: Language
  t: TFunction
  setLang: (lang: Language) => void
}

export const I18nContext = createContext<I18nContextType | null>(null)

export function translate(
  lang: Language,
  key: keyof (typeof translations)['en'],
  params?: Record<string, string | number>,
): string {
  const str = translations[lang]?.[key] ?? translations.en[key] ?? String(key)
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{$}`))
}
