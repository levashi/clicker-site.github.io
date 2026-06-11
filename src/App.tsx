declare function gtag(event: string, action: string, params?: Record<string, unknown>): void;

import { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useI18n, SUPPORTED } from './i18n/context';
import type { Language } from './i18n/translations';
import { LANGUAGES } from './i18n/translations';
import './App.css';

interface Offer {
  nameKey?: string;
  name?: string;
  perClick: number;
  perSecond: number;
  price: number;
  unlocked: boolean;
  count: number;
  priceMultiplier: number;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  value: string;
}

interface Milestone {
  cps: number;
  titleKey: string;
  emoji: string;
  reached: boolean;
}

interface GameEvent {
  id: number;
  type: 'boost' | 'discount' | 'windfall';
  title: string;
  desc: string;
  cost: number;
  timeLeft: number;
  icon: string;
}

function getDevCode(): number {
  const now = new Date();
  const day = now.getDate();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  if (week % 2 === 0) return day * 100 + week;
  return week * 100 + day;
}

const CODE = getDevCode();
const EVENT_DURATION = 8;
const EVENT_INTERVAL_MIN = 12000;
const EVENT_INTERVAL_MAX = 25000;

const MILESTONES: Omit<Milestone, 'reached'>[] = [
  { cps: 5, titleKey: 'milestoneChauffeMoteur', emoji: '🔥' },
  { cps: 10, titleKey: 'milestoneMainEnFeu', emoji: '🖐️' },
  { cps: 15, titleKey: 'milestoneVitesseLumiere', emoji: '⚡' },
  { cps: 20, titleKey: 'milestoneMainDeLumiere', emoji: '✋' },
  { cps: 30, titleKey: 'milestoneLegendaire', emoji: '🏆' },
];

const INITIAL_OFFERS: Offer[] = [
  { nameKey: 'offerDeguisement', perClick: 0, perSecond: 1, price: 50, unlocked: true, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerBonbonMalefique', perClick: 2, perSecond: 0, price: 100, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerMaledictionSang', perClick: 0, perSecond: 5, price: 700, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerMutationGenetique', perClick: 20, perSecond: 0, price: 1500, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerMaisonHantee', perClick: 100, perSecond: 0, price: 10000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerChambreMortuaire', perClick: 0, perSecond: 300, price: 40000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerSerialKiller', perClick: 0, perSecond: 1700, price: 150000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerTricksOrTreats', perClick: 5000, perSecond: 0, price: 700000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerMortEnBoite', perClick: 50000, perSecond: 0, price: 10000000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { nameKey: 'offerApocalypse', perClick: 0, perSecond: 400000, price: 300000000, unlocked: false, count: 0, priceMultiplier: 1.15 },
];

function getOfferPrice(basePrice: number, multiplier: number, count: number): number {
  return Math.floor(basePrice * Math.pow(multiplier, count));
}

const NAME_TO_KEY: Record<string, string> = {
  'Déguisement': 'offerDeguisement',
  'Bonbon Maléfique': 'offerBonbonMalefique',
  'Malédiction du Sang': 'offerMaledictionSang',
  'Mutation Génétique': 'offerMutationGenetique',
  'Maison Hantée': 'offerMaisonHantee',
  'Chambre Mortuaire': 'offerChambreMortuaire',
  'Serial Killer': 'offerSerialKiller',
  'Tricks or Treats': 'offerTricksOrTreats',
  'La Mort en Boîte !!!': 'offerMortEnBoite',
  'Apocalypse': 'offerApocalypse',
};

function migrateOffers(raw: Offer[]): Offer[] {
  return raw.map((o, i) => {
    if (o.nameKey) return o;
    if (o.name) {
      const key = NAME_TO_KEY[o.name] ?? INITIAL_OFFERS[i]?.nameKey;
      if (key) return { ...o, nameKey: key };
    }
    return INITIAL_OFFERS[i] ?? o;
  });
}

function loadSave() {
  try {
    const raw = localStorage.getItem('clicker-save-v3');
    if (raw) {
      const data = JSON.parse(raw);
      const offers = migrateOffers(data.offers ?? INITIAL_OFFERS);
      return {
        coins: data.coins ?? 0,
        perClick: data.perClick ?? 1,
        perSecond: data.perSecond ?? 0,
        offers,
        nextIndex: data.nextIndex ?? 0,
        themeIndex: data.themeIndex ?? 0,
        time: data.time ?? 0,
        won: data.won ?? false,
        showVictory: data.showVictory ?? false,
        bestCoins: data.bestCoins ?? 0,
        everWon: data.everWon ?? false,
      };
    }
  } catch {}
  return null;
}

export default function App() {
  const { lang, t, setLang } = useI18n();
  const save = loadSave();

  const [coins, setCoins] = useState(save?.coins ?? 0);
  const [perClick, setPerClick] = useState(save?.perClick ?? 1);
  const [perSecond, setPerSecond] = useState(save?.perSecond ?? 0);
  const [offers, setOffers] = useState<Offer[]>(save?.offers ?? INITIAL_OFFERS);
  const [nextIndex, setNextIndex] = useState(save?.nextIndex ?? 0);
  const [showShop, setShowShop] = useState(false);
  const [themeIndex, setThemeIndex] = useState(save?.themeIndex ?? 0);
  const [devMode, setDevMode] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [showDevCode, setShowDevCode] = useState(false);
  const [time, setTime] = useState(save?.time ?? 0);
  const [won, setWon] = useState(save?.won ?? false);
  const [showVictory, setShowVictory] = useState(save?.showVictory ?? false);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [btnPulse, setBtnPulse] = useState(false);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [nextBuyDiscount, setNextBuyDiscount] = useState(0);
  const [clickBoost, setClickBoost] = useState(0);
  const [activeBoosts, setActiveBoosts] = useState<{id: string; label: string; expiresAt: number}[]>([]);
  const [bestCoins, setBestCoins] = useState(save?.bestCoins ?? 0);
  const [everWon, setEverWon] = useState(save?.everWon ?? false);
  const [recordFlashTime, setRecordFlashTime] = useState<number | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // CPS tracking
  const cpsBufferRef = useRef<number[]>([]);
  const [cpsDisplay, setCpsDisplay] = useState(0);
  const prevCpsRef = useRef(0);
  const clicksThisTickRef = useRef(0);

  // Milestones
  const [milestones] = useState<Milestone[]>(
    MILESTONES.map(m => ({ ...m, reached: false }))
  );
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [milestoneReady, setMilestoneReady] = useState(false);

  const floatId = useRef(0);
  const recordFlashShown = useRef(false);
  const bestCoinsRef = useRef(save?.bestCoins ?? 0);

  // Save
  useEffect(() => {
    localStorage.setItem('clicker-save-v3', JSON.stringify({
      coins, perClick, perSecond, offers, nextIndex, themeIndex, time, won, showVictory, bestCoins, everWon
    }));
  }, [coins, perClick, perSecond, offers, nextIndex, themeIndex, time, won, showVictory, bestCoins, everWon]);

  // Game loop
  useEffect(() => {
    const id = setInterval(() => {
      if (perSecond > 0) {
        setCoins(c => c + perSecond);
      }
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [perSecond]);

  // Coins record tracking
  useEffect(() => {
    if (coins > bestCoinsRef.current) {
      bestCoinsRef.current = coins;
      setBestCoins(coins);
      localStorage.setItem('clicker-best-coins', String(coins));
      if (everWon && !recordFlashShown.current) {
        setIsBlinking(true);
        setRecordFlashTime(Date.now());
        setTimeout(() => setRecordFlashTime(null), 4000);
        recordFlashShown.current = true;
      }
    } else {
      setIsBlinking(false);
    }
  }, [coins, everWon]);

  // CPS loop
  useEffect(() => {
    const pushId = setInterval(() => {
      cpsBufferRef.current = [...cpsBufferRef.current, clicksThisTickRef.current].slice(-6);
      clicksThisTickRef.current = 0;
    }, 1000);
    const displayId = setInterval(() => {
      const buf = cpsBufferRef.current;
      const avg = buf.length > 0
        ? buf.reduce((a, b) => a + b, 0) / buf.length
        : 0;
      setCpsDisplay(avg);
      prevCpsRef.current = avg;

      milestones.forEach(m => {
        if (!m.reached && avg >= m.cps) {
          m.reached = true;
          setActiveMilestone(m);
          setShowMilestonePopup(true);
          setMilestoneReady(false);
          setTimeout(() => setMilestoneReady(true), 1000);
          gtag('event', 'milestone_reached', { title: m.titleKey, cps: m.cps });
        }
      });
    }, 200);
    return () => { clearInterval(pushId); clearInterval(displayId); };
  }, [milestones]);

  // Event system
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinsRef = useRef(coins);
  const perClickRef = useRef(perClick);
  const perSecondRef = useRef(perSecond);
  coinsRef.current = coins;
  perClickRef.current = perClick;
  perSecondRef.current = perSecond;

  const triggerEvent = useCallback(() => {
    const types: Array<'boost' | 'discount' | 'windfall'> = ['boost', 'discount', 'windfall'];
    const type = types[Math.floor(Math.random() * types.length)];
    const baseCost = Math.max(10, Math.floor(coinsRef.current * 0.05));

    let event: GameEvent;
    switch (type) {
      case 'boost': {
        const bonus = Math.max(1, Math.floor(perClickRef.current * 0.3));
        event = {
          id: Date.now(),
          type: 'boost',
          title: t('boostTitle'),
          desc: t('boostDesc', { bonus }),
          cost: baseCost,
          timeLeft: EVENT_DURATION,
          icon: '⚡',
        };
        break;
      }
      case 'discount':
        event = {
          id: Date.now(),
          type: 'discount',
          title: t('discountTitle'),
          desc: t('discountDesc'),
          cost: Math.floor(baseCost * 0.5),
          timeLeft: EVENT_DURATION,
          icon: '🏷️',
        };
        break;
      case 'windfall': {
        const amount = Math.max(1, Math.floor(perSecondRef.current * 10));
        event = {
          id: Date.now(),
          type: 'windfall',
          title: t('windfallTitle'),
          desc: t('windfallDesc', { amount }),
          cost: Math.floor(baseCost * 0.3),
          timeLeft: EVENT_DURATION,
          icon: '💎',
        };
        break;
      }
    }

    setActiveEvent(event);

    if (eventCountdownRef.current) clearInterval(eventCountdownRef.current);
    eventCountdownRef.current = setInterval(() => {
      setActiveEvent(prev => {
        if (!prev) return null;
        const remaining = prev.timeLeft - 1;
        if (remaining <= 0) {
          if (eventCountdownRef.current) clearInterval(eventCountdownRef.current);
          return null;
        }
        return { ...prev, timeLeft: remaining };
      });
    }, 1000);

    setTimeout(() => {
      setActiveEvent(null);
      if (eventCountdownRef.current) clearInterval(eventCountdownRef.current);
    }, EVENT_DURATION * 1000);
  }, [t]);

  useEffect(() => {
    const initialDelay = 5000 + Math.random() * 5000;
    eventTimerRef.current = setTimeout(() => {
      triggerEvent();
      const scheduleNext = () => {
        const delay = EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
        eventTimerRef.current = setTimeout(() => {
          triggerEvent();
          scheduleNext();
        }, delay);
      };
      scheduleNext();
    }, initialDelay);
    return () => {
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    };
  }, [triggerEvent]);

  const acceptEvent = () => {
    if (!activeEvent || coinsRef.current < activeEvent.cost) return;
    setCoins(c => c - activeEvent.cost);

    switch (activeEvent.type) {
      case 'boost': {
        const bonus = Math.max(1, Math.floor(perClickRef.current * 0.3));
        setClickBoost(prev => prev + bonus);
        const id = `boost_${Date.now()}`;
        const expiresAt = Date.now() + 30000;
        setActiveBoosts(prev => [...prev, { id, label: t('boostBadge', { bonus }), expiresAt }]);
        setTimeout(() => {
          setClickBoost(b => b - bonus);
          setActiveBoosts(prev => prev.filter(b => b.id !== id));
        }, 30000);
        break;
      }
      case 'discount': {
        setNextBuyDiscount(0.3);
        const id = `discount_${Date.now()}`;
        setActiveBoosts(prev => [...prev, { id, label: t('discountBadge'), expiresAt: 0 }]);
        break;
      }
      case 'windfall':
        setCoins(c => c + Math.max(1, Math.floor(perSecondRef.current * 10)));
        break;
    }

     gtag('event', 'event_accepted', { type: activeEvent.type, cost: activeEvent.cost });
    setActiveEvent(null);
    if (eventCountdownRef.current) clearInterval(eventCountdownRef.current);
  };

  const allOwned = offers.every(o => o.count > 0);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoins(c => c + perClick + clickBoost);
    clicksThisTickRef.current += 1;

    const ft: FloatText = {
      id: floatId.current++,
      x,
      y,
      value: `+${perClick + clickBoost}`,
    };
    setFloatTexts(prev => [...prev.slice(-5), ft]);
    setTimeout(() => {
      setFloatTexts(prev => prev.filter(f => f.id !== ft.id));
    }, 800);

    setBtnPulse(true);
    setTimeout(() => setBtnPulse(false), 150);
  }, [perClick, clickBoost]);

  const buyOffer = (index: number) => {
    const offer = offers[index];
    if (!offer.unlocked) return;

    let currentPrice = getOfferPrice(offer.price, offer.priceMultiplier, offer.count);
    if (nextBuyDiscount > 0) {
      currentPrice = Math.floor(currentPrice * (1 - nextBuyDiscount));
      setNextBuyDiscount(0);
      setActiveBoosts(prev => prev.filter(b => !b.id.startsWith('discount_')));
    }
    if (coins < currentPrice) return;

    setCoins(c => c - currentPrice);
    setPerClick(p => p + offer.perClick);
    setPerSecond(s => s + offer.perSecond);
    gtag('event', 'purchase', { offer: offer.nameKey, price: currentPrice, index });

    const newOffers = [...offers];
    newOffers[index] = { ...offer, count: offer.count + 1 };
    setOffers(newOffers);

    const next = index + 1;
    if (next < newOffers.length && !newOffers[next].unlocked) {
      newOffers[next] = { ...newOffers[next], unlocked: true };
      setNextIndex(next);
    }

    if (!won && newOffers.every(o => o.count > 0)) {
      setWon(true);
      setShowVictory(true);
      bestCoinsRef.current = coins;
      setBestCoins(coins);
      localStorage.setItem('clicker-best-coins', String(coins));
      setEverWon(true);
      gtag('event', 'victory', { time, coins });
    }
  };

  const rewardCoins = Math.round(coins * 0.2);
  const rewardPerSecond = Math.max(1, Math.round(perSecond * 0.15));
  const rewardPerClick = Math.max(1, Math.round(perClick * 0.25));

  const pickReward = (type: string) => {
    const amount = type === 'coins' ? rewardCoins : type === 'perSecond' ? rewardPerSecond : rewardPerClick;
    switch (type) {
      case 'coins':
        setCoins(c => c + rewardCoins);
        break;
      case 'perSecond':
        setPerSecond(s => s + rewardPerSecond);
        break;
      case 'perClick':
        setPerClick(p => p + rewardPerClick);
        break;
    }
    gtag('event', 'reward_chosen', { type, amount });
    setShowMilestonePopup(false);
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  const restartGame = () => {
    gtag('event', 'game_restarted', { coins, time, perClick, perSecond });
    setCoins(0);
    setPerClick(1);
    setPerSecond(0);
    setOffers(INITIAL_OFFERS);
    setNextIndex(0);
    setTime(0);
    setWon(false);
    setShowVictory(false);
    setClickBoost(0);
    setActiveBoosts([]);
    setCpsDisplay(0);
    setIsBlinking(false);
    cpsBufferRef.current = [];
    setShowMilestonePopup(false);
    setActiveEvent(null);
    recordFlashShown.current = false;
    bestCoinsRef.current = bestCoins;
  };

  const THEMES = ['default', 'rainbow', 'neon', 'matrix', 'disco', 'fire'];
  const themeClass = THEMES[themeIndex % THEMES.length];
  const themeEmoji = ['🌑', '🌈', '💜', '🟢', '🪩', '🔥'][themeIndex % THEMES.length];

  const numLocale: Intl.LocalesArgument = lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : 'en-US';

  function formatNum(n: number) {
    return Math.floor(n).toLocaleString(numLocale);
  }

  // Close lang menu on outside click
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = () => setShowLangMenu(false);
    const t2 = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(t2); document.removeEventListener('click', handler); };
  }, [showLangMenu]);

  return (
    <div className={`game theme-${themeClass}`}>
      <Analytics mode="production" />
      {/* Record flash animation */}
      {recordFlashTime != null && (
        <div className="record-flash">
          <div className="record-flash-text">{t('recordFlash')}</div>
        </div>
      )}
      {/* Event toast */}
      {activeEvent && (
        <div className="event-toast">
          <div className="event-toast-timer">
            <div className="event-toast-fill" style={{ width: `${(activeEvent.timeLeft / EVENT_DURATION) * 100}%` }} />
          </div>
          <div className="event-toast-body">
            <span className="event-toast-icon">{activeEvent.icon}</span>
            <div className="event-toast-info">
              <span className="event-toast-title">{activeEvent.title}</span>
              <span className="event-toast-desc">{activeEvent.desc}</span>
            </div>
            <button
              className={`event-toast-btn ${coins >= activeEvent.cost ? 'affordable' : ''}`}
              onClick={acceptEvent}
              disabled={coins < activeEvent.cost}
            >
              {activeEvent.cost} 🪙
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="stats-bar">
        {bestCoins != null && (
          <div className={`best-time ${isBlinking ? 'blinking' : ''}`}>
            <span className="best-time-icon">🏆</span>
            <span className="best-time-label">{t('record')}</span>
            <span className="best-time-value">
              {isBlinking ? formatNum(coins) : formatNum(bestCoins)}
            </span>
          </div>
        )}
        <div className="stats-group">
          <div className="stat">
            <span className="stat-label">{t('coins')}</span>
            <span className="stat-value gold">{formatNum(coins)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('coinsPerSecond')}</span>
            <span className="stat-value cyan">{formatNum(perSecond)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('perClick')}</span>
            <span className="stat-value purple">{formatNum(perClick)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('time')}</span>
            <span className="stat-value orange">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
        </div>
        {activeBoosts.length > 0 && (
          <div className="boosts-inline">
            {activeBoosts.map(b => (
              <span key={b.id} className="boost-badge">{b.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Click area */}
      <div className="click-area">
        <button
          className={`click-btn ${btnPulse ? 'clicked' : ''}`}
          onClick={handleClick}
        >
          <span className="btn-text">{t('click')}</span>
          {floatTexts.map(ft => (
            <span key={ft.id} className="float-text" style={{ left: ft.x, top: ft.y }}>
              {ft.value}
            </span>
          ))}
        </button>

        {/* CPS display */}
        <div className="cps-display">
          <div className="cps-tooltip">
            {t('cpsTooltip')}
          </div>
          <span className="cps-value">{cpsDisplay.toFixed(1)}</span>
          <div className="cps-label">{t('cps')}</div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="bottom-bar">
        <button className="icon-btn" onClick={() => setShowShop(!showShop)}>🛒</button>
        <button className="icon-btn" onClick={() => { const next = (themeIndex + 1) % THEMES.length; setThemeIndex(next); gtag('event', 'theme_changed', { theme: THEMES[next], index: next }); }} title={t('themeTitle')}>{themeEmoji}</button>
        <button className="icon-btn" onClick={() => setShowDevCode(!showDevCode)}>🕵️</button>
        <button className="icon-btn restart-btn" onClick={() => { if (confirm(t('restartConfirm'))) restartGame(); }}>↺</button>
      </div>

      {/* Language selector - bottom right */}
      <div className="lang-selector-wrap" onClick={e => e.stopPropagation()}>
        <button
          className="lang-btn-flag"
          onClick={() => setShowLangMenu(!showLangMenu)}
          title={LANGUAGES[lang].label}
        >
          {LANGUAGES[lang].flag}
        </button>
        {showLangMenu && (
          <div className="lang-dropdown">
            {SUPPORTED.map((l: Language) => (
              <button
                key={l}
                className={`lang-option ${lang === l ? 'active' : ''}`}
                onClick={() => { setLang(l); setShowLangMenu(false); }}
              >
                {LANGUAGES[l].flag} {LANGUAGES[l].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shop */}
      {showShop && (
        <div className="shop-overlay" onClick={() => setShowShop(false)}>
          <div className="shop-panel" onClick={e => e.stopPropagation()}>
            <div className="shop-header">
              <h2>{t('shop')}</h2>
              <button className="close-btn" onClick={() => setShowShop(false)}>✕</button>
            </div>
            <div className="shop-coins">
              {t('balance')} <span className="gold">{formatNum(coins)} 🪙</span>
            </div>
            <div className="shop-list">
              {offers.map((offer, i) => {
                const currentPrice = getOfferPrice(offer.price, offer.priceMultiplier, offer.count);
                const canAfford = coins >= currentPrice;
                const isLocked = !offer.unlocked;

                return (
                  <button
                    key={i}
                    className={`shop-item ${isLocked ? 'locked' : ''} ${canAfford && !isLocked ? 'affordable' : ''}`}
                    onClick={() => buyOffer(i)}
                    disabled={isLocked || !canAfford}
                  >
                    <div className="shop-item-info">
                      <span className="shop-item-name">
                        <span className="icon">{isLocked ? '🔒' : offer.perClick ? '⚡' : '💰'}</span>
                        {t(offer.nameKey as any)}
                      </span>
                      <span className="shop-item-desc">
                        {offer.perClick
                          ? `+${offer.perClick} ${t('perClickSuffix')}`
                          : `+${formatNum(offer.perSecond)} ${t('perSecondSuffix')}`}
                      </span>
                    </div>
                    <div className="shop-item-right">
                      <span className={`shop-item-price ${canAfford ? 'gold' : 'gray'}`}>
                        {formatNum(currentPrice)}
                      </span>
                      {offer.count > 0 && (
                        <span className="shop-item-count">×{offer.count}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Milestone popup */}
      {showMilestonePopup && activeMilestone && (
        <div className="milestone-overlay" onClick={() => setShowMilestonePopup(false)}>
          <div className="milestone-panel" onClick={e => e.stopPropagation()}>
            <div className="milestone-confetti">
              {'🎉🎊✨🎉🎊✨🎉🎊✨🎉🎊✨'.split('').map((c, i) => (
                <span key={i} className="confetti-piece" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}>{c}</span>
              ))}
            </div>
            <div className="milestone-emoji">{activeMilestone.emoji}</div>
            <h2>{t(activeMilestone.titleKey as any)}</h2>
            <p className="milestone-subtitle">{t('milestoneSubtitle', { cps: activeMilestone.cps })}</p>
            <div className={`milestone-choices ${milestoneReady ? '' : 'locked'}`}>
              <button className="choice-btn gold" onClick={() => pickReward('coins')}>
                {t('rewardCoins', { amount: formatNum(rewardCoins) })}
              </button>
              <button className="choice-btn cyan" onClick={() => pickReward('perSecond')}>
                {t('rewardPerSecond', { amount: rewardPerSecond })}
              </button>
              <button className="choice-btn purple" onClick={() => pickReward('perClick')}>
                {t('rewardPerClick', { amount: rewardPerClick })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev code */}
      {showDevCode && (
        <div className="dev-overlay" onClick={() => setShowDevCode(false)}>
          <div className="dev-panel" onClick={e => e.stopPropagation()}>
            <div className="dev-panel-header">
              <span>🕵️</span>
              <h3>{t('restrictedAccess')}</h3>
              <span className="dev-badge">{t('admin')}</span>
            </div>
            <input
              type="password"
              value={devCode}
              onChange={e => setDevCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && parseInt(devCode) === CODE) {
                  setDevMode(true);
                  setShowDevCode(false);
                } else if (e.key === 'Enter') {
                  alert(t('wrongCode'));
                }
              }}
              placeholder="••••"
              autoFocus
            />
            <div className="dev-hint">
              {t('devHint')}
              {allOwned && <><br /><strong>{t('codeLabel')} {CODE}</strong></>}
            </div>
            <div className="btn-group">
              <button onClick={() => setShowDevCode(false)}>{t('cancel')}</button>
              <button className="primary" onClick={() => {
                if (parseInt(devCode) === CODE) {
                  setDevMode(true);
                  setShowDevCode(false);
                } else alert(t('wrongCode'));
              }}>{t('validate')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Dev console */}
      {devMode && (
        <div className="dev-overlay" onClick={() => setDevMode(false)}>
          <div className="dev-panel" onClick={e => e.stopPropagation()}>
            <div className="dev-panel-header">
              <span>⚡</span>
              <h3>{t('devConsole')}</h3>
              <span className="dev-badge">{t('active')}</span>
            </div>
            <button onClick={() => setCoins(c => c + 10000000)}>{t('cheatCoins')}</button>
            <button onClick={() => setPerSecond(s => s + 100)}>{t('cheatPerSecond')}</button>
            <button onClick={() => setPerClick(p => p + 50)}>{t('cheatPerClick')}</button>
            <button onClick={() => {
              setCoins(0); setPerClick(1); setPerSecond(0);
              setOffers(INITIAL_OFFERS); setNextIndex(0);
              setWon(false); setShowVictory(false); setTime(0);
            }}>{t('resetGame')}</button>
            <button onClick={() => setDevMode(false)}>{t('close')}</button>
          </div>
        </div>
      )}

      {/* Victory */}
      {showVictory && (
        <div className="victory-overlay">
          <div className="victory-panel">
            <div className="trophy">🏆</div>
            <h1>{t('apocalypse')}</h1>
            <p>{t('unlockedAll')}</p>
            <p className="time-text">{t('timeLabel')} {minutes}:{seconds.toString().padStart(2, '0')}</p>
            <p className="coins-text">{t('coinsMax')} <span className="gold">{formatNum(coins)}</span></p>
            <div className="dev-revealed">
              <p>{t('devCodeLabel')}</p>
              <code>{CODE}</code>
            </div>
            <button onClick={() => setShowVictory(false)}>{t('continue')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
