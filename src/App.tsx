import { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

interface Offer {
  name: string;
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
  title: string;
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
const EVENT_INTERVAL_MIN = 12000; // ms
const EVENT_INTERVAL_MAX = 25000; // ms

const MILESTONES: Omit<Milestone, 'reached'>[] = [
  { cps: 5, title: 'Chauffe-moteur', emoji: '🔥' },
  { cps: 10, title: 'Main en feu', emoji: '🖐️' },
  { cps: 15, title: 'Vitesse lumière', emoji: '⚡' },
  { cps: 20, title: 'Main de lumière', emoji: '✋' },
  { cps: 30, title: 'Légendaire', emoji: '🏆' },
];

const INITIAL_OFFERS: Offer[] = [
  { name: 'Déguisement', perClick: 0, perSecond: 1, price: 50, unlocked: true, count: 0, priceMultiplier: 1.15 },
  { name: 'Bonbon Maléfique', perClick: 2, perSecond: 0, price: 100, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Malédiction du Sang', perClick: 0, perSecond: 5, price: 700, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Mutation Génétique', perClick: 20, perSecond: 0, price: 1500, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Maison Hantée', perClick: 100, perSecond: 0, price: 10000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Chambre Mortuaire', perClick: 0, perSecond: 300, price: 40000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Serial Killer', perClick: 0, perSecond: 1700, price: 150000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Tricks or Treats', perClick: 5000, perSecond: 0, price: 700000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'La Mort en Boîte !!!', perClick: 50000, perSecond: 0, price: 10000000, unlocked: false, count: 0, priceMultiplier: 1.15 },
  { name: 'Apocalypse', perClick: 0, perSecond: 400000, price: 300000000, unlocked: false, count: 0, priceMultiplier: 1.15 },
];

function formatNum(n: number) {
  return Math.floor(n).toLocaleString('fr-FR');
}

function getOfferPrice(basePrice: number, multiplier: number, count: number): number {
  return Math.floor(basePrice * Math.pow(multiplier, count));
}

function loadSave() {
  try {
    const raw = localStorage.getItem('clicker-save-v3');
    if (raw) {
      const data = JSON.parse(raw);
      return {
        coins: data.coins ?? 0,
        perClick: data.perClick ?? 1,
        perSecond: data.perSecond ?? 0,
        offers: data.offers ?? INITIAL_OFFERS,
        nextIndex: data.nextIndex ?? 0,
        themeIndex: data.themeIndex ?? 0,
        time: data.time ?? 0,
        won: data.won ?? false,
        bestCoins: data.bestCoins ?? 0,
        everWon: data.everWon ?? false,
      };
    }
  } catch {}
  return null;
}

export default function App() {
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
      coins, perClick, perSecond, offers, nextIndex, themeIndex, time, won, bestCoins, everWon
    }));
  }, [coins, perClick, perSecond, offers, nextIndex, themeIndex, time, won, bestCoins, everWon]);

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

// Coins record tracking (uses ref to avoid re-render loop)
  useEffect(() => {
    if (coins > bestCoinsRef.current) {
      bestCoinsRef.current = coins;
      setBestCoins(coins);
      localStorage.setItem('clicker-best-coins', String(coins));
      // Flash/blink only after first win
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

      // Check milestones
      milestones.forEach(m => {
        if (!m.reached && avg >= m.cps) {
          m.reached = true;
          setActiveMilestone(m);
          setShowMilestonePopup(true);
          setMilestoneReady(false);
          setTimeout(() => setMilestoneReady(true), 1000);
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
      case 'boost':
        event = {
          id: Date.now(),
          type: 'boost',
          title: 'Boost de clic !',
          desc: `+${Math.max(1, Math.floor(perClickRef.current * 0.3))}/clic pendant 30s`,
          cost: baseCost,
          timeLeft: EVENT_DURATION,
          icon: '⚡',
        };
        break;
      case 'discount':
        event = {
          id: Date.now(),
          type: 'discount',
          title: 'Réduction !',
          desc: '-30% sur le prochain achat',
          cost: Math.floor(baseCost * 0.5),
          timeLeft: EVENT_DURATION,
          icon: '🏷️',
        };
        break;
      case 'windfall':
        event = {
          id: Date.now(),
          type: 'windfall',
          title: 'Aubaine !',
          desc: `+${Math.max(1, Math.floor(perSecondRef.current * 10))} coins instantanés`,
          cost: Math.floor(baseCost * 0.3),
          timeLeft: EVENT_DURATION,
          icon: '💎',
        };
        break;
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
  }, []);

  // Schedule random events
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptEvent = () => {
    if (!activeEvent || coinsRef.current < activeEvent.cost) return;
    setCoins(c => c - activeEvent.cost);

    switch (activeEvent.type) {
      case 'boost': {
        const bonus = Math.max(1, Math.floor(perClickRef.current * 0.3));
        setClickBoost(prev => prev + bonus);
        const id = `boost_${Date.now()}`;
        const expiresAt = Date.now() + 30000;
        setActiveBoosts(prev => [...prev, { id, label: `+${bonus}/clic 30s`, expiresAt }]);
        setTimeout(() => {
          setClickBoost(b => b - bonus);
          setActiveBoosts(prev => prev.filter(b => b.id !== id));
        }, 30000);
        break;
      }
      case 'discount': {
        setNextBuyDiscount(0.3);
        const id = `discount_${Date.now()}`;
        setActiveBoosts(prev => [...prev, { id, label: '-30% prochain achat', expiresAt: 0 }]);
        break;
      }
      case 'windfall':
        setCoins(c => c + Math.max(1, Math.floor(perSecondRef.current * 10)));
        break;
    }

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
      value: `+${perClick}`,
    };
    setFloatTexts(prev => [...prev.slice(-5), ft]);
    setTimeout(() => {
      setFloatTexts(prev => prev.filter(f => f.id !== ft.id));
    }, 800);

    setBtnPulse(true);
    setTimeout(() => setBtnPulse(false), 150);
  }, [perClick]);

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
      bestCoinsRef.current = coins;
      setBestCoins(coins);
      localStorage.setItem('clicker-best-coins', String(coins));
      setEverWon(true);
    }
  };

  // Milestone rewards
  const rewardCoins = Math.round(coins * 0.2);
  const rewardPerSecond = Math.max(1, Math.round(perSecond * 0.15));
  const rewardPerClick = Math.max(1, Math.round(perClick * 0.25));

  const pickReward = (type: string) => {
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
    setShowMilestonePopup(false);
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  const restartGame = () => {
    setCoins(0);
    setPerClick(1);
    setPerSecond(0);
    setOffers(INITIAL_OFFERS);
    setNextIndex(0);
    setTime(0);
    setWon(false);
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

  return (
    <div className={`game theme-${themeClass}`}>
      <Analytics mode="production" />
      {/* Record flash animation */}
      {recordFlashTime != null && (
        <div className="record-flash">
          <div className="record-flash-text">🏆 NOUVEAU RECORD COINS ! 🏆</div>
        </div>
      )}
      {/* Event toast — fixed overlay, no layout shift */}
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
            <span className="best-time-label">Record:</span>
            <span className="best-time-value">
              {isBlinking ? formatNum(coins) : formatNum(bestCoins)}
            </span>
          </div>
        )}
        <div className="stats-group">
          <div className="stat">
            <span className="stat-label">Coins</span>
            <span className="stat-value gold">{formatNum(coins)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Coins/s</span>
            <span className="stat-value cyan">{formatNum(perSecond)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Par clic</span>
            <span className="stat-value purple">{formatNum(perClick)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Temps</span>
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
          <span className="btn-text">CLICK</span>
          {floatTexts.map(ft => (
            <span key={ft.id} className="float-text" style={{ left: ft.x, top: ft.y }}>
              {ft.value}
            </span>
          ))}
        </button>

        {/* CPS display */}
        <div className="cps-display">
          <div className="cps-tooltip">
            Ta vitesse de clic — clics par seconde (moyenne sur 6s)
          </div>
          <span className="cps-value">{cpsDisplay.toFixed(1)}</span>
          <div className="cps-label">CPS</div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="bottom-bar">
        <button className="icon-btn" onClick={() => setShowShop(!showShop)}>🛒</button>
        <button className="icon-btn" onClick={() => setThemeIndex(i => (i + 1) % THEMES.length)} title="Changer de theme">{themeEmoji}</button>
        <button className="icon-btn" onClick={() => setShowDevCode(!showDevCode)}>🕵️</button>
        <button className="icon-btn restart-btn" onClick={() => { if (confirm('Recommencer la partie ?')) restartGame(); }}>↺</button>
      </div>

      {/* Shop */}
      {showShop && (
        <div className="shop-overlay" onClick={() => setShowShop(false)}>
          <div className="shop-panel" onClick={e => e.stopPropagation()}>
            <div className="shop-header">
              <h2>Boutique</h2>
              <button className="close-btn" onClick={() => setShowShop(false)}>✕</button>
            </div>
            <div className="shop-coins">
              Solde : <span className="gold">{formatNum(coins)} 🪙</span>
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
                        {offer.name}
                      </span>
                      <span className="shop-item-desc">
                        {offer.perClick ? `+${offer.perClick} / clic` : `+${formatNum(offer.perSecond)} / s`}
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
            <h2>{activeMilestone.title}</h2>
            <p className="milestone-subtitle">CPS {activeMilestone.cps} atteint ! Choisis ta récompense :</p>
            <div className={`milestone-choices ${milestoneReady ? '' : 'locked'}`}>
              <button className="choice-btn gold" onClick={() => pickReward('coins')}>
                +{formatNum(rewardCoins)} coins
              </button>
              <button className="choice-btn cyan" onClick={() => pickReward('perSecond')}>
                +{rewardPerSecond} coins/s
              </button>
              <button className="choice-btn purple" onClick={() => pickReward('perClick')}>
                +{rewardPerClick} / clic
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
              <h3>Accès restreint</h3>
              <span className="dev-badge">Admin</span>
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
                  alert('Code incorrect');
                }
              }}
              placeholder="••••"
              autoFocus
            />
            <div className="dev-hint">
              Code quotidien. Révélé quand tu possèdes tout.
              {allOwned && <><br /><strong>Code : {CODE}</strong></>}
            </div>
            <div className="btn-group">
              <button onClick={() => setShowDevCode(false)}>Annuler</button>
              <button className="primary" onClick={() => {
                if (parseInt(devCode) === CODE) {
                  setDevMode(true);
                  setShowDevCode(false);
                } else alert('Code incorrect');
              }}>Valider</button>
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
              <h3>Dev Console</h3>
              <span className="dev-badge">Actif</span>
            </div>
            <button onClick={() => setCoins(c => c + 10000000)}>+10 000 000 Coins</button>
            <button onClick={() => setPerSecond(s => s + 100)}>+100 Coins/s</button>
            <button onClick={() => setPerClick(p => p + 50)}>+50 Clic</button>
            <button onClick={() => {
              setCoins(0); setPerClick(1); setPerSecond(0);
              setOffers(INITIAL_OFFERS); setNextIndex(0);
              setWon(false); setTime(0);
            }}>Réinitialiser la partie</button>
            <button onClick={() => setDevMode(false)}>Fermer</button>
          </div>
        </div>
      )}

      {/* Victory */}
      {won && (
        <div className="victory-overlay">
          <div className="victory-panel">
            <div className="trophy">🏆</div>
            <h1>APOCALYPSE!</h1>
            <p>Tu as tout débloqué !</p>
            <p className="time-text">Temps : {minutes}:{seconds.toString().padStart(2, '0')}</p>
            <p className="coins-text">Coins max : <span className="gold">{formatNum(coins)}</span></p>
            <div className="dev-revealed">
              <p>Code accès restreint</p>
              <code>{CODE}</code>
            </div>
            <button onClick={() => setWon(false)}>Continuer</button>
          </div>
        </div>
      )}
    </div>
  );
}
